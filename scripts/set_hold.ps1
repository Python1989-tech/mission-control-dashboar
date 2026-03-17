param(
    [string[]]$Agents,
    [string]$Status,
    [string]$Task = $null,
    [string]$Description = $null
)

foreach ($agent in $Agents) {
    $payload = @{agent_id=$agent; status=$Status}
    if ($Task) { $payload.current_task = $Task }
    if ($Description) { $payload.description = $Description }
    $body = $payload | ConvertTo-Json -Compress
    Invoke-WebRequest -Uri 'http://localhost:4000/agent-update' -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing | Out-Null
}
