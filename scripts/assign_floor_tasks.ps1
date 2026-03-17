$tasks = @(
    @{ agent_id='hypeforge'; description='Floor sprite & prop styling pass'; priority='high' },
    @{ agent_id='gameplaysystems'; description='Floor rendering logic sync'; priority='high' },
    @{ agent_id='shoploop'; description='Floor integration + event wiring'; priority='high' },
    @{ agent_id='marketpulse'; description='Floor layout QA & verification'; priority='normal' }
)

foreach ($task in $tasks) {
    $body = @{
        agent_id = $task.agent_id
        task_description = $task.description
        assigned_by = 'CEO_Treasurer'
        assigned_to = $task.agent_id
        priority = $task.priority
    } | ConvertTo-Json -Compress

    Invoke-WebRequest -Uri 'http://localhost:4000/tasks/assign' -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing | Out-Null
}
