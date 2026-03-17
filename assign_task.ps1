param(
    [Parameter(Mandatory=$true)][string]$AgentId,
    [Parameter(Mandatory=$true)][string]$TaskDescription,
    [Parameter(Mandatory=$true)][string]$AssignedBy,
    [Parameter(Mandatory=$true)][string]$AssignedTo,
    [Parameter()][string]$TaskId
)

$body = @{ 
    agent_id = $AgentId
    task_description = $TaskDescription
    assigned_by = $AssignedBy
    assigned_to = $AssignedTo
}

if ($TaskId) {
    $body.task_id = $TaskId
}

$payload = $body | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4000/tasks/assign" -Method Post -Body $payload -ContentType "application/json" -UseBasicParsing | Out-Null
