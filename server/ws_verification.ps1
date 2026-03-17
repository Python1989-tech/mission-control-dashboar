$serverLog = "C:\\Users\\heave\\mission-control\\server\\logs\\ws_server.log"
$serverErr = "C:\\Users\\heave\\mission-control\\server\\logs\\ws_server.err"
$clientLog = "C:\\Users\\heave\\mission-control\\server\\logs\\ws_client.log"
$clientErr = "C:\\Users\\heave\\mission-control\\server\\logs\\ws_client.err"
$payloadPath = "C:\\Users\\heave\\mission-control\\server\\ws_payload.json"

'{
  "status": "active",
  "current_task": "websocket test"
}' | Out-File -FilePath $payloadPath -Encoding utf8

Remove-Item $serverLog,$serverErr,$clientLog,$clientErr -ErrorAction SilentlyContinue

$server = Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory "C:\\Users\\heave\\mission-control\\server" -PassThru -RedirectStandardOutput $serverLog -RedirectStandardError $serverErr
Start-Sleep -Seconds 3

$client = Start-Process -FilePath "node" -ArgumentList "..\\dashboard\\scripts\\socket_probe.js" -WorkingDirectory "C:\\Users\\heave\\mission-control" -PassThru -RedirectStandardOutput $clientLog -RedirectStandardError $clientErr
Start-Sleep -Seconds 1

curl.exe -X POST -H "Content-Type: application/json" --data-binary "@$payloadPath" http://localhost:4000/agents/deckwright

if ($client -ne $null) {
  Wait-Process -Id $client.Id -Timeout 10 | Out-Null
}

Stop-Process -Id $server.Id -ErrorAction SilentlyContinue

"--- Server Log ---"
Get-Content $serverLog
"--- Client Log ---"
Get-Content $clientLog
