$agents = Get-Content "../server/agent_state.json" | ConvertFrom-Json
foreach ($agent in $agents) {
    $stage = if ($agent.progress_stage) { $agent.progress_stage } else { "Assigned" }
    & "../telemetry_update.ps1" -AgentId $agent.id -Status $agent.status -Task $agent.current_task -ProgressStage $stage
}
