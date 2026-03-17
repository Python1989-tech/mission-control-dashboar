param(
    [Parameter(Mandatory=$true)][string]$AgentId,
    [Parameter(Mandatory=$true)][string]$Status,
    [Parameter()][string]$Task = "",
    [Parameter()][string]$ProgressStage = ""
)

$body = @{ 
    status = $Status
    current_task = $Task
    last_update = (Get-Date).ToString("o")
}
if ($ProgressStage) { $body.progress_stage = $ProgressStage }

Invoke-WebRequest -Uri "http://localhost:4000/agents/$AgentId" -Method Post -Body ($body | ConvertTo-Json) -ContentType "application/json" -UseBasicParsing | Out-Null
