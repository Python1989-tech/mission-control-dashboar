const fetch = globalThis.fetch || require('node-fetch')

const agents = [
  { id: 'deckwright', task: 'Card telemetry pass', stage: 'In progress' },
  { id: 'marketpulse', task: 'Economy balance review', stage: 'In progress' },
  { id: 'gameplaysystems', task: 'Backend reliability tuning', stage: 'In progress' },
  { id: 'shoploop', task: 'Simulation task flow', stage: 'In progress' },
  { id: 'hypeforge', task: 'Asset generation sprint', stage: 'In progress' },
  { id: 'moneymachine', task: 'Creator Lab improvements', stage: 'In progress' },
  { id: 'cryptosentinel', task: 'Crypto revenue scan', stage: 'In progress' },
  { id: 'ceo_treasurer', task: 'Operational oversight', stage: 'Delegation' }
]

async function sendUpdate(agent) {
  const body = {
    agent_id: agent.id,
    status: 'WORKING',
    current_task: agent.task,
    progress_stage: agent.stage,
    description: `heartbeat ${new Date().toISOString()}`
  }

  const response = await fetch('http://localhost:4000/agent-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('Heartbeat failed for', agent.id, text)
  }
}

async function runHeartbeat() {
  while (true) {
    for (const agent of agents) {
      try {
        await sendUpdate(agent)
      } catch (error) {
        console.error('Heartbeat error', agent.id, error)
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    await new Promise((resolve) => setTimeout(resolve, 240000))
  }
}

runHeartbeat().catch((error) => {
  console.error('Heartbeat loop crashed', error)
  process.exit(1)
})
