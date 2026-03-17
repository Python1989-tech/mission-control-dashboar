const { io } = require("socket.io-client")

const socket = io("http://localhost:4000", {
  transports: ["websocket"],
  timeout: 5000
})

socket.on("connect", () => {
  console.log("Mission Control socket connected", socket.id)
})

socket.on("mission.agent_update", (agent) => {
  console.log("mission.agent_update received", agent.id, agent.status, agent.current_task)
  socket.close()
})

socket.on("connect_error", (err) => {
  console.error("Socket connection error", err.message)
})

setTimeout(() => {
  console.error("Socket probe timeout")
  socket.close()
}, 10000)
