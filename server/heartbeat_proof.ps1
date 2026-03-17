$server = Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory "C:\Users\heave\mission-control\server" -PassThru
Start-Sleep -Seconds 2

Write-Host "--- curl POST http://localhost:4000/agents/hypeforge ---"
curl.exe -X POST -H "Content-Type: application/json" --data "@C:\Users\heave\mission-control\server\heartbeat_payload.json" http://localhost:4000/agents/hypeforge

Write-Host "--- curl http://localhost:4000/activity ---"
curl.exe http://localhost:4000/activity

Write-Host "--- curl http://localhost:4000/health ---"
curl.exe http://localhost:4000/health

Stop-Process -Id $server.Id
