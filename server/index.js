const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "activity.log");
const STATE_FILE = path.join(__dirname, "agent_state.json");
const ASSET_DIR = path.join(__dirname, "..", "dashboard", "public", "assets");
const GENERATOR_SCRIPT = path.join(__dirname, "..", "scripts", "generate_agent_portrait.ps1");
const TASK_QUEUE_FILE = path.join(__dirname, "task_queue.json");
const LOG_LIMIT = 1000;
const STALE_THRESHOLD_MS = Number(process.env.STALE_THRESHOLD_MS ?? 20 * 60 * 1000);
const STALE_CHECK_INTERVAL_MS = 60 * 1000;

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(ASSET_DIR)) {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
}

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000" }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
let isShuttingDown = false;

const agentDefinitions = [
  { id: "ceo_treasurer", name: "CEO_Treasurer", department: "Executive", role: "CEO / Treasurer", avatarSymbol: "👤" },
  { id: "deckwright", name: "Deckwright", department: "Design", role: "Gameplay Systems Director", avatarSymbol: "🃏" },
  { id: "marketpulse", name: "MarketPulse", department: "Economy", role: "Economy & Balance", avatarSymbol: "📈" },
  { id: "gameplaysystems", name: "GameplaySystems", department: "Engineering", role: "Systems Engineer", avatarSymbol: "🛠️" },
  { id: "shoploop", name: "ShopLoop", department: "Operations", role: "Simulation Operator", avatarSymbol: "📦" },
  { id: "hypeforge", name: "HypeForge", department: "Creative", role: "Creative Director", avatarSymbol: "🎨" },
  { id: "moneymachine", name: "MoneyMachine", department: "Product & Revenue Systems", role: "Product Development Agent", avatarSymbol: "💰" },
  { id: "cryptosentinel", name: "CryptoSentinel", department: "Blockchain Intelligence", role: "Crypto Research & Development Agent", avatarSymbol: "🛰️" }
];

let agents = agentDefinitions.map((def) => ({
  ...def,
  status: "idle",
  current_task: "Awaiting assignment",
  progress_stage: "Idle",
  last_update: new Date().toISOString()
}));

agents = loadAgentState(agents);

Promise.all(agentDefinitions.map((agent) => ensurePortrait(agent))).catch((err) => {
  console.error("Portrait bootstrap failed", err.message);
});

let openClawGatewayState = "standby";
let lastGatewayHeartbeat = null;
let activeGatewayConnections = 0;
let activityLog = loadActivityLog();
let taskQueue = loadTaskQueue();
broadcastTaskQueue();
const agentListeners = {};
const eventSubscribers = {};

function registerAgent(name, handler) {
  agentListeners[name] = handler;
}

function dispatchTask(agentName, task) {
  console.log(`Dispatching task to ${agentName}`);
  const listener = agentListeners[agentName];
  if (listener) {
    listener(task);
  } else {
    console.warn(`No listener registered for ${agentName}`);
  }
}

function subscribeToEvent(eventType, subscriberId, handler) {
  if (!eventSubscribers[eventType]) {
    eventSubscribers[eventType] = [];
  }
  eventSubscribers[eventType].push({ subscriberId, handler });
}

function emitMissionEvent(event) {
  const enriched = {
    timestamp: event.timestamp ?? new Date().toISOString(),
    event_type: event.event_type,
    agent_id: event.agent_id ?? null,
    task_id: event.task_id ?? null,
    metadata: event.metadata ?? {}
  };

  recordEvent({
    type: enriched.event_type,
    agent_id: enriched.agent_id,
    status: enriched.metadata.status ?? null,
    task: enriched.task_id ?? enriched.metadata.task_description ?? null,
    description: Object.keys(enriched.metadata).length ? JSON.stringify(enriched.metadata) : null
  });

  io.emit("mission.event", enriched);

  const listeners = eventSubscribers[enriched.event_type] ?? [];
  listeners.forEach(({ handler }) => {
    try {
      handler(enriched);
    } catch (err) {
      console.error("Event subscriber error", err);
    }
  });
}

function loadActivityLog() {
  if (!fs.existsSync(LOG_FILE)) return [];
  try {
    const lines = fs
      .readFileSync(LOG_FILE, "utf-8")
      .split("\n")
      .filter(Boolean);
    const entries = lines.map((line) => JSON.parse(line));
    return entries.slice(-LOG_LIMIT);
  } catch (err) {
    console.error("Failed to load activity log", err);
    return [];
  }
}

function writeLogEntry(entry) {
  try {
    fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", (err) => {
      if (err) console.error("Failed to write activity log", err);
    });
  } catch (err) {
    console.error("Activity log append failed", err);
  }
}

function ensurePortrait(agent) {
  return new Promise((resolve, reject) => {
    const assetPath = path.join(ASSET_DIR, `${agent.id}.png`);
    if (fs.existsSync(assetPath)) {
      return resolve();
    }

    execFile(
      "powershell",
      ["-ExecutionPolicy", "Bypass", "-File", GENERATOR_SCRIPT, agent.id, agent.role],
      { cwd: path.join(__dirname, "..") },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Portrait generation failed for ${agent.id}`, stderr || error.message);
          return reject(error);
        }
        console.log(stdout.toString());
        resolve();
      }
    );
  });
}

function loadAgentState(defaultAgents) {
  if (!fs.existsSync(STATE_FILE)) return defaultAgents;
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    if (Array.isArray(parsed)) {
      return defaultAgents.map((agent) => parsed.find((saved) => saved.id === agent.id) ?? agent);
    }
  } catch (err) {
    console.error("Failed to load agent state", err);
  }
  return defaultAgents;
}

function saveAgentState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(agents, null, 2));
  } catch (err) {
    console.error("Failed to persist agent state", err);
  }
}

function loadTaskQueue() {
  if (!fs.existsSync(TASK_QUEUE_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(TASK_QUEUE_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to load task queue", err);
    return [];
  }
}

function saveTaskQueue() {
  try {
    fs.writeFileSync(TASK_QUEUE_FILE, JSON.stringify(taskQueue, null, 2));
  } catch (err) {
    console.error("Failed to persist task queue", err);
  }
}

function broadcastTaskQueue() {
  io.emit("mission.task_queue", taskQueue);
}

function ensureTask(taskId, data = {}) {
  const now = new Date().toISOString();
  if (!taskId) {
    taskId = `task_${Date.now()}`;
  }

  let task = taskQueue.find((entry) => entry.id === taskId);
  if (!task) {
    task = {
      id: taskId,
      task_description: data.task_description ?? "Untitled task",
      priority: data.priority ?? "normal",
      agent_id: data.agent_id ?? null,
      assigned_by: data.assigned_by ?? "CEO_Treasurer",
      state: data.state ?? "QUEUED",
      created_at: now,
      updated_at: now
    };
    taskQueue.push(task);
  } else {
    Object.assign(task, Object.fromEntries(Object.entries(data).filter(([, value]) => typeof value !== "undefined")));
    task.updated_at = now;
  }

  saveTaskQueue();
  broadcastTaskQueue();
  return task;
}

function setTaskState(taskId, state, agentId) {
  const task = ensureTask(taskId, {});
  task.state = state;
  if (agentId) task.agent_id = agentId;
  task.updated_at = new Date().toISOString();
  saveTaskQueue();
  broadcastTaskQueue();

  let eventType = "task_state_changed";
  if (state === "IN_PROGRESS") eventType = "task_started";
  if (state === "COMPLETE") eventType = "task_completed";
  if (state === "FAILED") eventType = "task_failed";

  recordEvent({
    type: eventType,
    agent_id: task.agent_id,
    status: task.id,
    task: task.task_description,
    description: `Task ${state}`
  });

  return task;
}

function claimNextTask(agentId) {
  const task = taskQueue.find((entry) => entry.state === "QUEUED" && (!entry.agent_id || entry.agent_id === agentId));
  if (!task) return null;
  return setTaskState(task.id, "IN_PROGRESS", agentId);
}

function recordEvent({ type, agent_id, status, task, description }) {
  const entry = {
    type,
    agent_id: agent_id ?? null,
    status: status ?? null,
    task: task ?? null,
    description: description ?? null,
    timestamp: new Date().toISOString()
  };

  activityLog.push(entry);
  if (activityLog.length > LOG_LIMIT) {
    activityLog = activityLog.slice(-LOG_LIMIT);
  }

  writeLogEntry(entry);
  console.log(`Emitting mission.activity_event: ${entry.type}`);
  io.emit("mission.activity_event", entry);
  return entry;
}

function buildHealthPayload() {
  return {
    mission_control: "online",
    agent_count: agents.length,
    openclaw_gateway: openClawGatewayState,
    last_gateway_heartbeat: lastGatewayHeartbeat,
    timestamp: new Date().toISOString()
  };
}

function buildSystemSummary() {
  const statusCounts = agents.reduce((acc, agent) => {
    acc[agent.status] = (acc[agent.status] || 0) + 1;
    return acc;
  }, {});

  return {
    timestamp: new Date().toISOString(),
    agent_count: agents.length,
    status_counts: statusCounts
  };
}

function resolveAgentId(identifier) {
  if (!identifier) return null;
  const lowered = identifier.toLowerCase();
  const match = agents.find((agent) => agent.id.toLowerCase() === lowered || agent.name.toLowerCase() === lowered);
  return match ? match.id : null;
}

function upsertAgent(update) {
  const index = agents.findIndex(
    (agent) => agent.id === update.id || agent.name === update.name
  );

  if (index === -1) return null;

  const agent = agents[index];
  const updated = {
    ...agent,
    ...update,
    last_update: new Date().toISOString()
  };

  agents[index] = updated;
  saveAgentState();

  emitMissionEvent({
    event_type: "agent_update",
    agent_id: updated.id,
    metadata: {
      status: updated.status,
      task_description: updated.current_task,
      progress_stage: updated.progress_stage ?? null
    }
  });

  console.log(`Emitting mission.agent_update: ${updated.name}`);
  io.emit("mission.agent_update", updated);
  io.emit("mission.agent_snapshot", agents);
  io.emit("mission.gateway_status", buildHealthPayload());

  return updated;
}

const registeredAgentNames = [
  "CEO_Treasurer",
  "Deckwright",
  "MarketPulse",
  "GameplaySystems",
  "ShopLoop",
  "HypeForge",
  "MoneyMachine"
];

registeredAgentNames.forEach((agentName) => {
  registerAgent(agentName, (task) => {
    console.log(`${agentName} received task:`, task);
  });
});

subscribeToEvent("agent_stale", "CEO_Treasurer", (event) => {
  dispatchTask("CEO_Treasurer", event);
});

subscribeToEvent("floor_render_complete", "MarketPulse", (event) => {
  dispatchTask("MarketPulse", event);
});

subscribeToEvent("task_assigned", "ShopLoop", (event) => {
  const description = (event.metadata?.task_description ?? "").toLowerCase();
  if (description.includes("integration")) {
    dispatchTask("ShopLoop", event);
  }
});

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Mission Control API shutting down (${signal})`);

  io.close(() => {
    server.close(() => {
      console.log("Mission Control API closed");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.warn("Mission Control API forced exit");
    process.exit(1);
  }, 5000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// initial startup event
recordEvent({ type: "system_startup", description: "Mission Control API started" });

app.get("/agents", (req, res) => {
  res.json(agents);
});

app.get("/activity", (req, res) => {
  res.json(activityLog.slice(-100));
});

app.get("/health", (req, res) => {
  res.json(buildHealthPayload());
});

app.get("/system", (req, res) => {
  res.json(buildSystemSummary());
});

app.post("/agents/:id", (req, res) => {
  const { id } = req.params;
  const { status, current_task, department, role, progress_stage } = req.body;

  const payload = { id };
  if (typeof status !== "undefined") payload.status = status;
  if (typeof current_task !== "undefined") payload.current_task = current_task;
  if (typeof progress_stage !== "undefined") payload.progress_stage = progress_stage;
  if (typeof department !== "undefined") payload.department = department;
  if (typeof role !== "undefined") payload.role = role;

  const updated = upsertAgent(payload);

  if (!updated) {
    return res.status(404).json({ error: "Agent not found" });
  }

  openClawGatewayState = "connected";
  lastGatewayHeartbeat = new Date().toISOString();

  res.json(updated);
});

app.post("/activity", (req, res) => {
  const { agent_id, description, task } = req.body;
  const entry = recordEvent({ type: "custom_event", agent_id, description, task });
  res.status(201).json(entry);
});

app.get("/tasks/queue", (req, res) => {
  res.json(taskQueue);
});

app.post("/tasks", (req, res) => {
  const { task_id, task_description, priority, agent_id, assigned_by } = req.body || {};
  if (!task_description) {
    return res.status(400).json({ error: "task_description is required" });
  }
  const task = ensureTask(task_id, {
    task_description,
    priority: priority ?? "normal",
    agent_id: agent_id ?? null,
    assigned_by: assigned_by ?? "CEO_Treasurer",
    state: "QUEUED"
  });
  recordEvent({ type: "task_queued", agent_id: task.agent_id, task: task.task_description, status: task.id, description: `Priority ${task.priority}` });
  res.status(201).json(task);
});

app.post("/tasks/:taskId/state", (req, res) => {
  const { state, agent_id } = req.body || {};
  if (!state) {
    return res.status(400).json({ error: "state is required" });
  }
  const validStates = ["QUEUED", "IN_PROGRESS", "COMPLETE", "FAILED"];
  if (!validStates.includes(state)) {
    return res.status(400).json({ error: "Invalid state" });
  }
  const task = setTaskState(req.params.taskId, state, agent_id);
  res.json(task);
});

app.post("/tasks/next", (req, res) => {
  const { agent_id } = req.body || {};
  if (!agent_id) {
    return res.status(400).json({ error: "agent_id is required" });
  }
  const task = claimNextTask(agent_id);
  if (!task) {
    return res.status(204).end();
  }
  res.json(task);
});

app.post("/agent-update", (req, res) => {
  const update = req.body || {};
  console.log("Agent update received:", update);

  const resolvedId = resolveAgentId(update.agent_id ?? update.id ?? update.target_agent);
  let persisted = null;
  if (resolvedId) {
    const mapped = {
      id: resolvedId,
      status: update.status,
      current_task: update.current_task ?? update.task,
      progress_stage: update.progress_stage,
      department: update.department,
      role: update.role
    };
    persisted = upsertAgent(Object.fromEntries(Object.entries(mapped).filter(([, value]) => typeof value !== "undefined")));
  }

  const meta = {
    status: update.status ?? persisted?.status ?? null,
    task_description: persisted?.current_task ?? update.current_task ?? update.task ?? null,
    progress_stage: persisted?.progress_stage ?? update.progress_stage ?? null,
    description: update.description ?? null
  };

  const normalizedStatus = (update.status ?? "").toUpperCase();
  if (normalizedStatus === "WORKING") {
    emitMissionEvent({ event_type: "task_started", agent_id: resolvedId, metadata: meta, task_id: update.task_id ?? null });
  } else if (normalizedStatus === "COMPLETE" || normalizedStatus === "COMPLETED") {
    emitMissionEvent({ event_type: "task_completed", agent_id: resolvedId, metadata: meta, task_id: update.task_id ?? null });
  } else if (normalizedStatus === "STALE") {
    emitMissionEvent({ event_type: "agent_stale", agent_id: resolvedId, metadata: meta, task_id: update.task_id ?? null });
  } else if (update.type && update.type !== "agent_update") {
    emitMissionEvent({ event_type: update.type, agent_id: resolvedId, metadata: meta, task_id: update.task_id ?? null });
  }

  if (update.target_agent) {
    dispatchTask(update.target_agent, update);
  }

  res.json({ status: "ok", agent: persisted });
});

app.post("/events/emit", (req, res) => {
  const { event_type, agent_id, task_id, metadata } = req.body || {};
  if (!event_type) {
    return res.status(400).json({ error: "event_type is required" });
  }
  const resolvedId = agent_id ? resolveAgentId(agent_id) ?? agent_id : null;
  emitMissionEvent({ event_type, agent_id: resolvedId, task_id: task_id ?? null, metadata });
  res.json({ status: "ok" });
});

app.post("/agents/:id/reasoning", (req, res) => {
  const agentId = req.params.id;
  const { status, step } = req.body || {};
  const payload = {
    agent_id: agentId,
    status: status ?? "REASONING",
    step,
    timestamp: new Date().toISOString()
  };

  recordEvent({ type: "agent_reasoning", agent_id: agentId, status: payload.status, description: step });
  io.emit("mission.agent_reasoning", payload);
  res.json({ status: "ok", event: payload });
});

app.post("/agent-memory", (req, res) => {
  const { agent_id, memory } = req.body || {};
  if (!agent_id || !memory) {
    return res.status(400).json({ error: "agent_id and memory are required" });
  }
  const resolvedId = resolveAgentId(agent_id);
  if (!resolvedId) {
    return res.status(404).json({ error: "Agent not found" });
  }
  const payload = {
    agent_id: resolvedId,
    memory,
    timestamp: new Date().toISOString()
  };
  emitMissionEvent({ event_type: "agent_memory_update", agent_id: resolvedId, metadata: { memory } });
  io.emit("agent_memory_update", payload);
  res.json({ status: "ok", event: payload });
});

app.post("/tasks/assign", (req, res) => {
  const { agent_id, task_description, assigned_by, assigned_to, task_id } = req.body || {};

  if (!agent_id || !task_description || !assigned_by || !assigned_to) {
    return res.status(400).json({ error: "agent_id, assigned_by, assigned_to, and task_description are required" });
  }

  const payload = {
    agent_id,
    assigned_by,
    assigned_to,
    task_id: task_id ?? `task_${Date.now()}`,
    task_description,
    priority: req.body.priority ?? "normal",
    timestamp: new Date().toISOString()
  };

  const resolvedId = resolveAgentId(agent_id);

  ensureTask(payload.task_id, {
    task_description,
    priority: payload.priority,
    agent_id: resolvedId ?? agent_id,
    assigned_by
  });
  setTaskState(payload.task_id, "IN_PROGRESS", resolvedId ?? agent_id);

  if (resolvedId) {
    upsertAgent({ id: resolvedId, status: "WORKING", current_task: task_description, progress_stage: "Assigned" });
  }

  emitMissionEvent({
    event_type: "task_assigned",
    agent_id: resolvedId ?? agent_id,
    task_id: payload.task_id,
    metadata: { assigned_by, task_description }
  });
  console.log("Emitting mission.task_assigned:", payload);
  io.emit("mission.task_assigned", payload);

  res.json({ status: "ok", task: payload });
});

io.on("connection", (socket) => {
  console.log("Mission Control socket connected:", socket.id);
  activeGatewayConnections += 1;
  openClawGatewayState = "connected";
  lastGatewayHeartbeat = new Date().toISOString();
  io.emit("mission.gateway_status", buildHealthPayload());

  socket.emit("mission.agent_snapshot", agents);
  socket.emit("mission.activity_event", activityLog.slice(-20));
  socket.emit("mission.gateway_status", buildHealthPayload());
  socket.emit("mission.task_queue", taskQueue);

  socket.on("disconnect", () => {
    console.log("Mission Control socket disconnected:", socket.id);
    activeGatewayConnections = Math.max(0, activeGatewayConnections - 1);
    if (activeGatewayConnections === 0) {
      openClawGatewayState = "standby";
      lastGatewayHeartbeat = new Date().toISOString();
      io.emit("mission.gateway_status", buildHealthPayload());
    }
  });
});

server.listen(PORT, () => {
  console.log(`Mission Control API running on port ${PORT}`);
  console.log("Mission Control WebSocket ready on port 4000");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error("Port 4000 already in use. Mission Control cannot start.");
    process.exit(1);
  } else {
    console.error("Mission Control server error", err);
  }
});

setInterval(checkForStaleAgents, STALE_CHECK_INTERVAL_MS);

function checkForStaleAgents() {
  const now = Date.now();
  agents.forEach((agent) => {
    if (!agent.last_update) return;
    if (agent.status === "STALE" || agent.status === "COMPLETE" || agent.status === "WAITING") return;
    const last = new Date(agent.last_update).getTime();
    if (Number.isNaN(last)) return;
    if (now - last > STALE_THRESHOLD_MS) {
      console.log(`Auto-marking ${agent.id} as STALE (no update > threshold)`);
      upsertAgent({ id: agent.id, status: "STALE", progress_stage: "Stalled" });
      emitMissionEvent({
        event_type: "agent_stale",
        agent_id: agent.id,
        metadata: {
          status: "STALE",
          task_description: agent.current_task,
          reason: "No /agent-update in 20 minutes"
        }
      });
      dispatchTask("CEO_Treasurer", { type: "agent_stale", agent_id: agent.id, task: agent.current_task });
    }
  });
}
