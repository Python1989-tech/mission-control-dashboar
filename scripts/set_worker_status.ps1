param(
    [string[]]$Agents,
    [string]$Status,
    [string]$Task,
    [string]$Stage
)

foreach ($agent in $Agents) {
    $payload = @{agent_id=$agent; status=$Status; current_task=$Task; progress_stage=$Stage} | ConvertTo-Json -Compress
    Invoke-WebRequest -Uri 'http://localhost:4000/agent-update' -Method Post -Body $payload -ContentType 'application/json' -UseBasicParsing | Out-Null
}
