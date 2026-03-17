param(
    [Parameter(Mandatory=$true)][string]$AgentId,
    [Parameter(Mandatory=$true)][string]$Status,
    [Parameter(Mandatory=$true)][string]$Task
)

$body = @{ 
    status = $Status
    current_task = $Task
    last_update = (Get-Date).ToString("o")
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4000/agents/$AgentId" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing | Out-Null
