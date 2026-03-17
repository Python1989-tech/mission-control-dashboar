$agents = @('hypeforge','gameplaysystems','shoploop','marketpulse','deckwright','moneymachine','cryptosentinel')
foreach ($agent in $agents) {
    $body = @{agent_id=$agent; status='WORKING'; description='CEO directive: resume current task'} | ConvertTo-Json -Compress
    Invoke-WebRequest -Uri 'http://localhost:4000/agent-update' -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing | Out-Null
}
