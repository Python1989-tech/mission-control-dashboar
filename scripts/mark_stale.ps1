$agents = @('deckwright','marketpulse','gameplaysystems','shoploop','hypeforge','moneymachine','cryptosentinel')
foreach ($agent in $agents) {
    $body = @{agent_id=$agent; status='STALE'; description='No progress update >20 minutes - resetting task'} | ConvertTo-Json -Compress
    Invoke-WebRequest -Uri 'http://localhost:4000/agent-update' -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing | Out-Null
}
