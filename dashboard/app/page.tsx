"use client"

import { useEffect, useRef, useState, CSSProperties } from "react"
import { io } from "socket.io-client"

const API_BASE = process.env.NEXT_PUBLIC_MISSION_CONTROL_API ?? "http://localhost:4000"
const SOCKET_BASE = process.env.NEXT_PUBLIC_MISSION_CONTROL_SOCKET ?? "http://localhost:4000"

type Agent = {
  id: string
  name: string
  department: string
  role: string
  status: string
  current_task: string
  progress_stage?: string
  last_update: string
  avatarSymbol?: string
}

type ActivityEvent = {
  type: string
  agent_id?: string | null
  status?: string | null
  task?: string | null
  description?: string | null
  timestamp: string
}

type HealthPayload = {
  mission_control: string
  agent_count: number
  openclaw_gateway: string
  last_gateway_heartbeat?: string | null
  timestamp: string
}

type SystemSummary = {
  timestamp: string
  agent_count: number
  status_counts: Record<string, number>
}

type TaskAssignment = {
  agent_id: string
  assigned_by: string
  assigned_to: string
  task_id: string
  task_description: string
  timestamp: string
}

type MissionTask = {
  id: string
  task_description: string
  priority: string
  agent_id?: string | null
  assigned_by?: string
  state: string
  created_at: string
  updated_at: string
}

type MissionEventPayload = {
  event_type: string
  agent_id?: string | null
  task_id?: string | null
  timestamp: string
  metadata?: Record<string, any>
}

const tabConfig = [
  { id: "overview", label: "Overview" },
  { id: "floor", label: "Agent Floor" },
  { id: "activity", label: "Activity" },
  { id: "tasks", label: "Tasks" }
] as const

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [taskQueue, setTaskQueue] = useState<MissionTask[]>([])
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [systemSummary, setSystemSummary] = useState<SystemSummary | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState<number>(Date.now())
  const [agentMotion, setAgentMotion] = useState<Record<string, { x: number; y: number }>>({})
  const [followAgentId, setFollowAgentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<typeof tabConfig[number]["id"]>("overview")
  const motionTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({})
  const agentsRef = useRef<Agent[]>([])

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const [agentsRes, activityRes, healthRes, systemRes, queueRes] = await Promise.all([
          fetch(`${API_BASE}/agents`),
          fetch(`${API_BASE}/activity`),
          fetch(`${API_BASE}/health`),
          fetch(`${API_BASE}/system`),
          fetch(`${API_BASE}/tasks/queue`)
        ])

        if (!agentsRes.ok || !activityRes.ok || !healthRes.ok || !systemRes.ok || !queueRes.ok) {
          throw new Error("API request failed")
        }

        const [agentsData, activityData, healthData, systemData, queueData] = await Promise.all([
          agentsRes.json(),
          activityRes.json(),
          healthRes.json(),
          systemRes.json(),
          queueRes.json()
        ])

        if (!isMounted) return

        setAgents(agentsData)
        setActivity(activityData)
        setHealth(healthData)
        setSystemSummary(systemData)
        setTaskQueue(queueData)
        setError(null)
      } catch (err) {
        console.error(err)
        if (isMounted) setError("Unable to reach Mission Control API")
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 6000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setAgentMotion((prev) => {
      const next = { ...prev }
      agents.forEach((agent) => {
        if (!next[agent.id]) {
          next[agent.id] = getAvatarRestPosition(agent.id)
        }
      })
      return next
    })
  }, [agents])

  useEffect(() => {
    if (!selectedAgent && agents.length > 0) {
      setSelectedAgent(agents[0])
    }
  }, [agents, selectedAgent])

  useEffect(() => {
    const socket = io(SOCKET_BASE, { transports: ["websocket"] })

    socket.on("mission.agent_snapshot", (snapshot: Agent[]) => {
      setAgents(snapshot)
    })

    socket.on("mission.agent_update", (agentUpdate: Agent) => {
      console.log("socket agent_update received", agentUpdate.id)
      setAgents((prev) => {
        const exists = prev.some((agent) => agent.id === agentUpdate.id)
        if (exists) {
          return prev.map((agent) => (agent.id === agentUpdate.id ? { ...agent, ...agentUpdate } : agent))
        }
        return [...prev, agentUpdate]
      })
    })

    socket.on("mission.activity_event", (event: ActivityEvent) => {
      setActivity((prev) => [...prev, event].slice(-100))
      if (event.type === "task_completed" && event.agent_id) {
        setAgents((prev) =>
          prev.map((agent) =>
            agent.id === event.agent_id
              ? { ...agent, progress_stage: "Complete", status: "COMPLETE", last_update: event.timestamp }
              : agent
          )
        )
      }
    })

    socket.on("mission.task_assigned", (assignment: TaskAssignment) => {
      setAssignments((prev) => [...prev, assignment].slice(-50))
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === assignment.agent_id
            ? {
                ...agent,
                current_task: assignment.task_description,
                status: "WORKING",
                progress_stage: "Assigned",
                last_update: assignment.timestamp
              }
            : agent
        )
      )
    })

    socket.on("mission.event", (missionEvent: MissionEventPayload) => {
      handleMissionEvent(missionEvent)
    })

    socket.on("mission.task_queue", (queue: MissionTask[]) => {
      setTaskQueue(queue)
    })

    socket.on("mission.gateway_status", (payload: HealthPayload) => {
      setHealth(payload)
    })

    return () => {
      socket.off("mission.event", handleMissionEvent)
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    agentsRef.current = agents
  }, [agents])

  useEffect(() => () => {
    Object.values(motionTimeouts.current).forEach((timeouts) => timeouts.forEach((t) => clearTimeout(t)))
  }, [])

  const statusColor = (status: string) => {
    const normalized = (status ?? "").toLowerCase()
    const mapping: Record<string, string> = {
      online: "#22c55e",
      working: "#22c55e",
      progress: "#22c55e",
      waiting: "#f97316",
      idle: "#facc15",
      complete: "#38bdf8",
      stopped: "#f87171",
      blocked: "#f87171",
      offline: "#94a3b8",
      thinking: "#3b82f6",
      error: "#f87171"
    }
    return mapping[(status ?? "").toLowerCase()] ?? "#38bdf8"
  }

  const statusPulse = (status: string): CSSProperties => {
    const normalized = (status ?? "").toLowerCase()
    const pulses: Record<string, CSSProperties> = {
      thinking: { borderColor: "rgba(59,130,246,0.5)", animation: "pulseBlue 2s infinite", boxShadow: "0 0 25px rgba(59,130,246,0.35)" },
      working: { borderColor: "rgba(34,197,94,0.5)", animation: "pulseGreen 2s infinite", boxShadow: "0 0 25px rgba(34,197,94,0.35)" },
      complete: { borderColor: "rgba(56,189,248,0.5)", animation: "pulseCyan 2.2s infinite", boxShadow: "0 0 22px rgba(56,189,248,0.35)" },
      error: { borderColor: "rgba(248,113,113,0.5)", animation: "pulseRed 1.8s infinite", boxShadow: "0 0 25px rgba(248,113,113,0.4)" }
    }
    return pulses[normalized] ?? {}
  }

  const queuedTasks = taskQueue.filter((task) => task.state === "QUEUED")
  const activeTasks = taskQueue.filter((task) => task.state === "IN_PROGRESS")
  const completedTasks = taskQueue.filter((task) => task.state === "COMPLETE")

  const formatRelativeTime = (value?: string) => {
    if (!value) return "�"
    const updated = new Date(value).getTime()
    const diff = now - updated
    if (Number.isNaN(diff)) return value
    if (diff < 60_000) return "just now"
    if (diff < 3_600_000) {
      const mins = Math.floor(diff / 60_000)
      return `${mins}m ago`
    }
    const hours = Math.floor(diff / 3_600_000)
    return `${hours}h ago`
  }

  const workerDeskPositions: Record<string, { x: number; y: number }> = {
    deckwright: { x: 20, y: 30 },
    gameplaysystems: { x: 40, y: 30 },
    shoploop: { x: 60, y: 30 },
    marketpulse: { x: 80, y: 30 },
    hypeforge: { x: 20, y: 70 },
    moneymachine: { x: 40, y: 70 },
    cryptosentinel: { x: 60, y: 70 },
    open_slot: { x: 80, y: 70 }
  }

  const CEO_DESK_POSITION = { x: 50, y: 10 }
  const CEO_AVATAR_POSITION = { x: 50, y: 20 }
  const MEETING_POSITION = { x: 50, y: 50 }
  const MEETING_OFFSETS = [
    { x: -12, y: -4 },
    { x: -4, y: -6 },
    { x: 6, y: -4 },
    { x: -12, y: 6 },
    { x: -2, y: 8 },
    { x: 8, y: 6 }
  ]
  const ceoOffsets: Record<string, { x: number; y: number }> = {
    deckwright: { x: -12, y: 0 },
    gameplaysystems: { x: -6, y: 2 },
    shoploop: { x: 6, y: 2 },
    marketpulse: { x: 12, y: 0 },
    hypeforge: { x: -10, y: 8 },
    moneymachine: { x: 0, y: 8 },
    cryptosentinel: { x: 10, y: 8 }
  }
  const avatarOffsets: Record<string, { x: number; y: number }> = {
    default: { x: 0, y: 8 },
    ceo_treasurer: { x: 0, y: 10 }
  }

  const getDeskPosition = (agentId: string) => {
    if (agentId.toLowerCase() === "ceo_treasurer") return CEO_DESK_POSITION
    return workerDeskPositions[agentId.toLowerCase()] ?? workerDeskPositions.open_slot
  }

  const getAvatarRestPosition = (agentId: string) => {
    if (agentId.toLowerCase() === "ceo_treasurer") return CEO_AVATAR_POSITION
    const desk = workerDeskPositions[agentId.toLowerCase()] ?? workerDeskPositions.open_slot
    const offset = avatarOffsets[agentId.toLowerCase()] ?? avatarOffsets.default
    return { x: desk.x + offset.x, y: desk.y + offset.y }
  }

  const getCeoTarget = (agentId: string) => {
    const offset = ceoOffsets[agentId.toLowerCase()] ?? { x: 0, y: 0 }
    return { x: CEO_AVATAR_POSITION.x + offset.x, y: CEO_AVATAR_POSITION.y + offset.y }
  }
  const getPathDelay = (agentId: string) => (agentId.charCodeAt(0) % 3) * 150

  const queueMotion = (agentId: string, sequence: { x: number; y: number }[], initialDelay = 0) => {
    if (motionTimeouts.current[agentId]) motionTimeouts.current[agentId].forEach((t) => clearTimeout(t))
    motionTimeouts.current[agentId] = sequence.map((coords, index) =>
      setTimeout(() => setAgentMotion((prev) => ({ ...prev, [agentId]: coords })), initialDelay + index * 700)
    )
  }

  const runDeskToCeoLoop = (agentId: string) => {
    const ceo = getCeoTarget(agentId)
    const desk = getAvatarRestPosition(agentId)
    queueMotion(agentId, [ceo, ceo, desk], getPathDelay(agentId))
  }

  const returnAgentToDesk = (agentId: string) => {
    queueMotion(agentId, [getAvatarRestPosition(agentId)], getPathDelay(agentId))
  }

  const moveAgentsToMeeting = (participants: string[]) => {
    const fallback = agentsRef.current.map((agent) => agent.id)
    const targetList = participants.length > 0 ? participants : fallback
    targetList.forEach((agentId, index) => {
      const offset = MEETING_OFFSETS[index % MEETING_OFFSETS.length]
      const gather = { x: MEETING_POSITION.x + offset.x, y: MEETING_POSITION.y + offset.y }
      queueMotion(agentId, [gather, gather, getAvatarRestPosition(agentId)], getPathDelay(agentId))
    })
  }

  const handleMissionEvent = (missionEvent: MissionEventPayload) => {
    if (!missionEvent || !missionEvent.event_type) return
    const agentId = missionEvent.agent_id ?? undefined
    switch (missionEvent.event_type) {
      case "task_assigned":
        if (agentId) runDeskToCeoLoop(agentId)
        break
      case "task_started":
        if (agentId) returnAgentToDesk(agentId)
        break
      case "task_completed":
        if (agentId) queueMotion(agentId, [getCeoTarget(agentId), getAvatarRestPosition(agentId)], getPathDelay(agentId))
        break
      case "team_meeting_event": {
        const rawAgents = Array.isArray(missionEvent.metadata?.agents) ? missionEvent.metadata?.agents : null
        const participants = rawAgents ? rawAgents.map((value) => `${value}`) : []
        moveAgentsToMeeting(participants)
        break
      }
      case "probe_move": {
        const target = missionEvent.metadata?.target
        if (agentId && target) {
          queueMotion(agentId, [{ x: target.x, y: target.y }, getAvatarRestPosition(agentId)], 0)
        }
        break
      }
      case "agent_stale":
        if (agentId) returnAgentToDesk(agentId)
        break
      default:
        if (agentId) queueMotion(agentId, [getAvatarRestPosition(agentId)])
        break
    }
  }

  const floorAgents = agents.map((agent) => {
    const motion = agentMotion[agent.id] ?? getAvatarRestPosition(agent.id)
    const isAtCEO = Math.abs(motion.x - CEO_AVATAR_POSITION.x) < 4 && Math.abs(motion.y - CEO_AVATAR_POSITION.y) < 4
    const zoneKey = isAtCEO ? "command" : deriveZone(agent.id)
    return {
      agent,
      zoneKey,
      x: motion.x,
      y: motion.y
    }
  })

  const ceoAgent = agents.find((agent) => agent.id.toLowerCase() === "ceo_treasurer")

  const deskNodes = Object.entries(workerDeskPositions).map(([deskId, coords]) => {
    if (deskId === "open_slot") {
      return {
        id: deskId,
        label: "Open Desk",
        x: coords.x,
        y: coords.y,
        status: "IDLE",
        isActive: false
      }
    }
    const agent = agents.find((entry) => entry.id === deskId)
    const normalizedStatus = (agent?.status ?? "").toLowerCase()
    return {
      id: deskId,
      label: agent?.name ?? deskId,
      x: coords.x,
      y: coords.y,
      status: agent?.status ?? "IDLE",
      isActive: normalizedStatus.includes("work") || normalizedStatus.includes("progress")
    }
  })

  const followedAgent = followAgentId ? floorAgents.find((entry) => entry.agent.id === followAgentId) : null
  const floorTransform = followedAgent
    ? `translate(${(50 - followedAgent.x) / 2}%, ${(50 - followedAgent.y) / 2}%) scale(1.28)`
    : "none"

  const missionActivityMeta = (event: ActivityEvent) => {
    const type = event.type?.toLowerCase() ?? ""
    if (type.includes("assigned")) return { color: "#38bdf8", icon: "??", label: "Task Assigned" }
    if (type.includes("started") || type.includes("working")) return { color: "#facc15", icon: "??", label: "Working" }
    if (type.includes("complete")) return { color: "#22c55e", icon: "??", label: "Complete" }
    if (type.includes("failed") || type.includes("error")) return { color: "#f87171", icon: "??", label: "Error" }
    return { color: "#94a3b8", icon: "�", label: event.type }
  }

  const recentActivity = activity.slice(-12).reverse()
  const completedEvents = activity.filter((event) => event.type === "task_completed").slice(-6).reverse()
  const inspectorEvents = selectedAgent ? activity.filter((event) => event.agent_id === selectedAgent.id).slice(-5).reverse() : []

  return (
    <>
      <main className="mc-shell">
        <div className="build-banner">NEW BUILD ACTIVE</div>
        <header className="mc-header">
          <div>
            <h1>BeastGaming Mission Control</h1>
            <p>Live AI operations dashboard</p>
          </div>
          {systemSummary && (
            <div className="mc-stats">
              <span>Agents: {systemSummary.agent_count}</span>
              <span>Status: {Object.entries(systemSummary.status_counts).map(([key, value]) => `${key}: ${value}`).join(" - ")}</span>
              {health && <span>Gateway: {health.openclaw_gateway}</span>}
            </div>
          )}
          {error && <div className="mc-error">{error}</div>}
        </header>

        <nav className="tab-bar">
          {tabConfig.map((tab) => (
            <button key={tab.id} className={tab.id === activeTab ? "tab active" : "tab"} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" && (
          <div className="tab-content">
            {assignments.length > 0 && (
              <section className="panel">
                <div className="panel-header">
                  <h3>Recent Task Assignments</h3>
                </div>
                <div className="panel-list">
                  {assignments.slice().reverse().map((assignment, idx) => (
                    <div key={`${assignment.task_id}-${idx}`} className="panel-card">
                      <div className="panel-meta">
                        <span>{new Date(assignment.timestamp).toLocaleTimeString()}</span>
                        <span>ID: {assignment.task_id}</span>
                      </div>
                      <div className="panel-title">{assignment.task_description}</div>
                      <div className="panel-sub">Assigned by {assignment.assigned_by} ? {assignment.assigned_to}</div>
                      <div className="panel-sub">Agent: {assignment.agent_id}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="agent-grid">
              {agents.map((agent) => {
                const portraitSrc = `/assets/${agent.id}.png`
                return (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgent(agent)
                      setActiveTab("floor")
                    }}
                    className="agent-card"
                    style={{
                      borderColor: selectedAgent?.id === agent.id ? "rgba(94,234,212,0.8)" : "rgba(148,163,184,0.2)",
                      ...(statusPulse(agent.status))
                    }}
                  >
                    <div className="agent-card__header">
                      <div className="agent-card__avatar">
                        <img
                          src={portraitSrc}
                          alt={`${agent.name} portrait`}
                          onError={(event) => {
                            event.currentTarget.onerror = null
                            event.currentTarget.src = "/assets/default-avatar.png"
                          }}
                        />
                      </div>
                      <div>
                        <h2>{agent.name}</h2>
                        <p>{agent.role}</p>
                      </div>
                      <span className="agent-card__dot" style={{ backgroundColor: statusColor(agent.status) }} />
                    </div>
                    <p className="agent-card__task">{agent.current_task || "Awaiting assignment"}</p>
                    <p className="agent-card__stage">Stage: {agent.progress_stage ?? "Not set"}</p>
                    <p className="agent-card__time">Updated - {formatRelativeTime(agent.last_update)}</p>
                  </button>
                )
              })}
            </section>
          </div>
        )}

        {activeTab === "floor" && (
          <div className="floor-layout">
            <aside className="floor-controls">
              <h3>Floor Controls</h3>
              <div className="floor-controls__section">
                <p className="label">Follow Mode</p>
                <p>{followAgentId ? `Tracking ${followAgentId}` : "No agent selected"}</p>
                {followAgentId && (
                  <button className="control-btn" onClick={() => setFollowAgentId(null)}>Clear Follow</button>
                )}
              </div>
              <div className="floor-controls__section">
                <p className="label">Active Agents</p>
                <ul>
                  {agents
                    .filter((agent) => (agent.status ?? "").toLowerCase().includes("work"))
                    .slice(0, 4)
                    .map((agent) => (
                      <li key={`active-${agent.id}`}>{agent.name}</li>
                    ))}
                  {agents.filter((agent) => (agent.status ?? "").toLowerCase().includes("work")).length === 0 && (
                    <li>No one is working</li>
                  )}
                </ul>
              </div>
            </aside>
            <section className="floor-panel">
              <div className="floor-room" onClick={() => setFollowAgentId(null)}>
                <div className="floor-room__banner">COORDINATE SYSTEM ACTIVE</div>
                <div className="floor-room__panel floor-room__panel--left" />
                <div className="floor-room__panel floor-room__panel--right" />
                <div className="floor-room__plant floor-room__plant--tl" />
                <div className="floor-room__plant floor-room__plant--tr" />
                <div className="floor-room__plant floor-room__plant--bl" />
                <div className="floor-room__plant floor-room__plant--br" />
                <div className="floor-room__meeting">
                  <div className="floor-room__table-top" />
                </div>
                <div className="floor-room__ceo" style={{ left: `${CEO_DESK_POSITION.x}%`, top: `${CEO_DESK_POSITION.y}%` }}>
                  <div className="floor-room__ceo-desk" />
                  <span>CEO STATION</span>
                </div>
                {deskNodes.map((desk) => (
                  <div
                    key={`desk-${desk.id}`}
                    className={`floor-desk ${desk.isActive ? "floor-desk--active" : ""} ${selectedAgent?.id === desk.id ? "floor-desk--selected" : ""}`}
                    style={{ left: `${desk.x}%`, top: `${desk.y}%` }}
                  >
                    <span className="floor-desk__surface" />
                    <span className="floor-desk__monitor" />
                    <span className="floor-desk__chair" />
                    <span className="floor-desk__label">{desk.label}</span>
                    <span className="floor-desk__status" style={{ backgroundColor: statusColor(desk.status ?? "IDLE") }} />
                  </div>
                ))}
                {floorAgents.map(({ agent, zoneKey, x, y }) => (
                  <div
                    key={agent.id}
                    className={`floor-avatar floor-avatar--${zoneKey} ${followAgentId === agent.id ? "floor-avatar--selected" : ""}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    data-tooltip={`${agent.name} � ${agent.current_task || "Idle"}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setFollowAgentId(agent.id)
                      setSelectedAgent(agent)
                    }}
                  >
                    <div className="floor-avatar__ring" style={{ borderColor: statusColor(agent.status) }}>
                      <div className="floor-avatar__sprite">
                        <img src={`/assets/${agent.id}.png`} alt={agent.name} />
                      </div>
                      <span className="floor-avatar__status-dot" style={{ backgroundColor: statusColor(agent.status) }} />
                      <span className="floor-avatar__base" />
                    </div>
                    <div className="floor-avatar__label">
                      <p className="floor-avatar__name">{agent.name}</p>
                      <p className="floor-avatar__task">{agent.current_task || "Idle"}</p>
                      {followAgentId === agent.id && <span className="floor-avatar__tag">FOLLOWING</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <aside className="inspector">
              <h3>Agent Inspector</h3>
              {selectedAgent ? (
                <div className="inspector-body">
                  <div className="inspector-row">
                    <div>
                      <p className="label">Name</p>
                      <p>{selectedAgent.name}</p>
                    </div>
                    <div>
                      <p className="label">Department</p>
                      <p>{selectedAgent.department}</p>
                    </div>
                  </div>
                  <div>
                    <p className="label">Role</p>
                    <p>{selectedAgent.role}</p>
                  </div>
                  <div>
                    <p className="label">Status</p>
                    <p>{selectedAgent.status}</p>
                  </div>
                  <div>
                    <p className="label">Reasoning</p>
                    <p>{selectedAgent.current_task ? `Focused on ${selectedAgent.current_task}` : "Awaiting assignment"}</p>
                  </div>
                  <div>
                    <p className="label">Stage</p>
                    <p>{selectedAgent.progress_stage ?? "Not set"}</p>
                  </div>
                  <div>
                    <p className="label">Last Update</p>
                    <p>{new Date(selectedAgent.last_update).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="label">Recent Activity</p>
                    {inspectorEvents.length > 0 ? (
                      <ul className="inspector-events">
                        {inspectorEvents.map((event, idx) => (
                          <li key={`${event.timestamp}-${idx}`}>
                            <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                            <span>{event.type.replace(/_/g, " ")}</span>
                            {event.task && <span>{event.task}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="panel-sub">No recent events</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="inspector-empty">Select an agent to inspect.</p>
              )}
            </aside>
          </div>
        )}

        {activeTab === "activity" && (
          <section className="panel">
            <div className="panel-header">
              <h3>Mission Activity</h3>
            </div>
            <div className="timeline">
              {recentActivity.map((event, idx) => {
                const meta = missionActivityMeta(event)
                return (
                  <div key={`${event.timestamp}-${idx}`} className="timeline-row">
                    <div className="timeline-time">{new Date(event.timestamp).toLocaleTimeString()}</div>
                    <div className="timeline-card">
                      <div className="timeline-title" style={{ color: meta.color }}>
                        {meta.icon} {meta.label}
                      </div>
                      <div className="timeline-body">{event.task ?? event.description ?? event.type}</div>
                      {event.agent_id && <div className="timeline-meta">Agent: {event.agent_id}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {activeTab === "tasks" && (
          <section className="panel">
            <div className="panel-header">
              <h3>Mission Task Board</h3>
            </div>
            <div className="task-board">
              <div>
                <h4>Queued</h4>
                {queuedTasks.length === 0 && <p className="panel-sub">No queued tasks</p>}
                {queuedTasks.map((task) => (
                  <div key={task.id} className="task-card queued">
                    <p className="panel-title">{task.task_description}</p>
                    <p className="panel-sub">Priority � {task.priority}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4>In Progress</h4>
                {activeTasks.length === 0 && <p className="panel-sub">No active tasks</p>}
                {activeTasks.map((task) => (
                  <div key={task.id} className="task-card active">
                    <p className="panel-title">{task.task_description}</p>
                    <p className="panel-sub">Agent � {task.agent_id ?? "Unassigned"}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4>Completed</h4>
                {completedTasks.length === 0 && <p className="panel-sub">No completed tasks</p>}
                {completedTasks.slice(-5).map((task) => (
                  <div key={task.id} className="task-card done">
                    <p className="panel-title">{task.task_description}</p>
                    <p className="panel-sub">Agent � {task.agent_id ?? "Unassigned"}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <style jsx global>{`
        body {
          margin: 0;
          background: #010818;
          color: #f8fafc;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow-x: hidden;
        }
        body::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -2;
          background:
            radial-gradient(circle at 10% 20%, rgba(94, 234, 212, 0.15), transparent 40%),
            radial-gradient(circle at 80% 30%, rgba(59, 130, 246, 0.12), transparent 45%),
            radial-gradient(circle at 50% 80%, rgba(248, 113, 113, 0.12), transparent 40%),
            #010818;
        }
        body::after {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -1;
          opacity: 0.35;
          background-image:
            linear-gradient(110deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(200deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 200px 200px, 260px 260px;
          animation: gridDrift 40s linear infinite;
          pointer-events: none;
        }
        .mc-shell {
          min-height: 100vh;
          padding: 32px;
          background: rgba(2, 6, 23, 0.9);
          backdrop-filter: blur(6px);
        }
        .build-banner {
          position: fixed;
          top: 18px;
          left: 18px;
          z-index: 1000;
          background: rgba(248, 113, 113, 0.92);
          color: #0f172a;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 6px 12px;
          border-radius: 8px;
          box-shadow: 0 12px 20px rgba(0, 0, 0, 0.45);
        }
        .mc-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .mc-header h1 {
          margin: 0;
          font-size: 32px;
        }
        .mc-header p {
          margin: 0;
          color: #94a3b8;
        }
        .mc-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 14px;
          color: #94a3b8;
        }
        .mc-error {
          padding: 12px;
          border-radius: 10px;
          border: 1px solid rgba(248, 113, 113, 0.4);
          background: rgba(248, 113, 113, 0.15);
        }
        .tab-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .tab {
          padding: 10px 18px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
        }
        .tab.active {
          background: rgba(94, 234, 212, 0.15);
          border-color: rgba(94, 234, 212, 0.6);
          color: #f8fafc;
        }
        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .panel {
          padding: 20px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(15, 23, 42, 0.75);
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .panel-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .panel-card {
          padding: 10px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(30, 41, 59, 0.7);
        }
        .panel-meta {
          display: flex;
          justify-content: space-between;
          color: #94a3b8;
          font-size: 13px;
        }
        .panel-title {
          font-size: 15px;
          font-weight: 600;
        }
        .panel-sub {
          font-size: 12px;
          color: #94a3b8;
        }
        .agent-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .agent-card {
          text-align: left;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(15, 23, 42, 0.6);
          cursor: pointer;
          transition: border-color 0.3s ease, transform 0.3s ease;
        }
        .agent-card__header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .agent-card__avatar {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }
        .agent-card__avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .agent-card__header h2 {
          margin: 0;
          font-size: 18px;
        }
        .agent-card__header p {
          margin: 0;
          color: #94a3b8;
          font-size: 12px;
        }
        .agent-card__dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .agent-card__task {
          color: #e2e8f0;
          font-size: 14px;
          margin: 0 0 6px 0;
        }
        .agent-card__stage,
        .agent-card__time {
          color: #94a3b8;
          font-size: 12px;
          margin: 0;
        }
        .floor-layout {
          display: grid;
          grid-template-columns: 220px minmax(0, 2fr) minmax(280px, 360px);
          gap: 20px;
          align-items: stretch;
        }
        .floor-controls {
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(15, 23, 42, 0.7);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .floor-controls__section ul {
          list-style: none;
          padding: 0;
          margin: 6px 0 0 0;
          font-size: 13px;
          color: #e2e8f0;
        }
        .control-btn {
          margin-top: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(94, 234, 212, 0.6);
          background: transparent;
          color: #f8fafc;
          cursor: pointer;
        }
        .floor-panel {
          padding: 24px 0;
          border-radius: 24px;
          border: 1px solid rgba(15, 23, 42, 0.65);
          background: linear-gradient(135deg, rgba(8, 13, 28, 0.95), rgba(3, 6, 16, 0.95));
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .floor-room {
          position: relative;
          width: 900px;
          height: 500px;
          border-radius: 22px;
          background:
            radial-gradient(circle at 10% 20%, rgba(94, 234, 212, 0.08), transparent 55%),
            radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.08), transparent 50%),
            repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.08) 0px, rgba(148, 163, 184, 0.08) 2px, transparent 2px, transparent 60px),
            repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.08) 0px, rgba(148, 163, 184, 0.08) 2px, transparent 2px, transparent 60px),
            #050b16;
          box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.65);
          overflow: hidden;
        }
        .floor-room__banner {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 11px;
          letter-spacing: 0.2em;
          background: rgba(248, 113, 113, 0.9);
          color: #0f172a;
          font-weight: 700;
          z-index: 5;
        }
        .floor-room__panel {
          position: absolute;
          width: 24px;
          height: 200px;
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.25), rgba(94, 234, 212, 0.25));
          opacity: 0.6;
        }
        .floor-room__panel--left { left: 3%; top: 50%; transform: translate(-50%, -50%); }
        .floor-room__panel--right { right: 3%; top: 50%; transform: translate(50%, -50%); }
        .floor-room__plant {
          position: absolute;
          width: 28px;
          height: 60px;
          border-radius: 18px;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.8), rgba(5, 46, 22, 0.95));
          border: 1px solid rgba(16, 185, 129, 0.4);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.45);
        }
        .floor-room__plant--tl { left: 5%; top: 10%; transform: translate(-50%, -50%); }
        .floor-room__plant--tr { left: 95%; top: 10%; transform: translate(-50%, -50%); }
        .floor-room__plant--bl { left: 5%; top: 90%; transform: translate(-50%, -50%); }
        .floor-room__plant--br { left: 95%; top: 90%; transform: translate(-50%, -50%); }
        .floor-room__meeting {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(59, 130, 246, 0.25), rgba(15, 23, 42, 0.95));
          border: 1px solid rgba(148, 163, 184, 0.3);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .floor-room__table-top {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: rgba(9, 14, 30, 0.9);
          border: 1px solid rgba(94, 234, 212, 0.2);
        }
        .floor-room__ceo {
          position: absolute;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #cbd5f5;
          font-size: 11px;
          letter-spacing: 0.2em;
        }
        .floor-room__ceo-desk {
          width: 160px;
          height: 60px;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(18, 43, 59, 0.95), rgba(4, 12, 22, 0.95));
          border: 1px solid rgba(94, 234, 212, 0.4);
          margin-bottom: 4px;
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.45);
        }
        .floor-desk {
          position: absolute;
          width: 90px;
          height: 54px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: linear-gradient(180deg, rgba(24, 32, 54, 0.95), rgba(11, 16, 32, 0.95));
          transform: translate(-50%, -50%);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.45);
        }
        .floor-desk__surface {
          position: absolute;
          inset: 8px;
          border-radius: 10px;
          background: rgba(8, 13, 24, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }
        .floor-desk__monitor {
          position: absolute;
          top: 6px;
          left: 50%;
          width: 40px;
          height: 12px;
          border-radius: 6px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.5), rgba(94, 234, 212, 0.35));
        }
        .floor-desk__chair {
          position: absolute;
          bottom: 6px;
          left: 50%;
          width: 45px;
          height: 10px;
          border-radius: 999px;
          transform: translateX(-50%);
          background: rgba(4, 6, 14, 0.85);
        }
        .floor-desk__label {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          letter-spacing: 0.08em;
          color: #e2e8f0;
        }
        .floor-desk__status {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 12px currentColor;
        }
        .floor-desk--active {
          border-color: rgba(94, 234, 212, 0.7);
          box-shadow: 0 18px 34px rgba(94, 234, 212, 0.26);
        }
        .floor-desk--selected {
          border-color: rgba(148, 163, 184, 0.85);
          box-shadow: 0 20px 38px rgba(148, 163, 184, 0.35);
        }
        .floor-avatar {
          position: absolute;
          display: flex;
          align-items: center;
          transform: translate(-50%, -50%);
          gap: 8px;
          transition: transform 0.6s ease, filter 0.3s ease;
          cursor: pointer;
        }
        .floor-avatar__ring {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid rgba(148, 163, 184, 0.5);
          display: grid;
          place-items: center;
          position: relative;
          background: rgba(4, 8, 19, 0.95);
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.55);
        }
        .floor-avatar__sprite {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid rgba(15, 23, 42, 0.9);
        }
        .floor-avatar__sprite img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .floor-avatar__status-dot {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 12px currentColor;
        }
        .floor-avatar__base {
          position: absolute;
          inset: auto auto -10px;
          left: 50%;
          width: 26px;
          height: 8px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.45);
          filter: blur(2px);
          transform: translateX(-50%);
        }
        .floor-avatar__label {
          background: rgba(6, 10, 20, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 12px;
          padding: 4px 10px;
          min-width: 120px;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
        }
        .floor-avatar__name {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
        }
        .floor-avatar__task {
          margin: 2px 0 0 0;
          font-size: 10px;
          color: #cbd5f5;
        }
        .floor-avatar__tag {
          margin-top: 4px;
          display: inline-flex;
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 9px;
          letter-spacing: 0.08em;
          background: rgba(94, 234, 212, 0.18);
          color: #67e8f9;
        }
        .floor-avatar[data-tooltip]:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          top: -26px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(8, 13, 28, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.4);
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 10px;
          white-space: nowrap;
        }
        .floor-avatar--selected {
          filter: drop-shadow(0 0 12px rgba(94, 234, 212, 0.5));
        }
        .inspector {
          padding: 20px;
          border-radius: 16px;
          border: 1px solid rgba(94, 234, 212, 0.2);
          background: rgba(6, 78, 59, 0.15);
        }
        .inspector h3 {
          margin-top: 0;
        }
        .inspector-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .inspector-row {
          display: flex;
          gap: 16px;
        }
        .label {
          font-size: 11px;
          color: #94a3b8;
          margin: 0 0 4px 0;
        }
        .inspector-empty {
          color: #94a3b8;
        }
        .inspector-events {
          list-style: none;
          padding: 0;
          margin: 8px 0 0 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          color: #cbd5f5;
        }
        .inspector-events li {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 6px;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.6);
        }
        .inspector-events span:first-child {
          color: #94a3b8;
        }
        .timeline {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .timeline-row {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 12px;
          align-items: center;
        }
        .timeline-time {
          font-size: 12px;
          color: #94a3b8;
        }
        .timeline-card {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(30, 41, 59, 0.8);
          animation: activityEnter 0.5s ease;
        }
        .timeline-title {
          font-size: 14px;
          font-weight: 600;
        }
        .timeline-body {
          font-size: 13px;
          color: #e2e8f0;
        }
        .timeline-meta {
          font-size: 12px;
          color: #94a3b8;
        }
        .task-board {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .task-card {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(30, 41, 59, 0.7);
        }
        .task-card.queued {
          border-style: dashed;
        }
        .task-card.active {
          border-color: rgba(34, 197, 94, 0.4);
          background: rgba(6, 78, 59, 0.2);
        }
        .task-card.done {
          border-color: rgba(56, 189, 248, 0.3);
          background: rgba(15, 23, 42, 0.4);
        }
        @keyframes starPulse {
          0% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        @keyframes gridDrift {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-200px, -140px, 0); }
        }
        @keyframes pulseBlue {
          0% { box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
          50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.45); }
          100% { box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
        }
        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 rgba(34, 197, 94, 0); }
          50% { box-shadow: 0 0 25px rgba(34, 197, 94, 0.45); }
          100% { box-shadow: 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes pulseRed {
          0% { box-shadow: 0 0 0 rgba(248, 113, 113, 0); }
          50% { box-shadow: 0 0 25px rgba(248, 113, 113, 0.55); }
          100% { box-shadow: 0 0 0 rgba(248, 113, 113, 0); }
        }
        @keyframes pulseCyan {
          0% { box-shadow: 0 0 0 rgba(56, 189, 248, 0); }
          50% { box-shadow: 0 0 22px rgba(56, 189, 248, 0.5); }
          100% { box-shadow: 0 0 0 rgba(56, 189, 248, 0); }
        }
        @keyframes activityEnter {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 900px) {
          .floor-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}

function deriveZone(agentId: string): "command" | "analysis" | "development" | "creative" | "deployment" | "idle" {
  const id = agentId.toLowerCase()
  if (id === "ceo_treasurer") return "command"
  if (id === "cryptosentinel" || id === "marketpulse") return "analysis"
  if (id === "deckwright" || id === "gameplaysystems" || id === "shoploop") return "development"
  if (id === "hypeforge") return "creative"
  if (id === "moneymachine") return "deployment"
  return "idle"
}









