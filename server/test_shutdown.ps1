$stdout = "C:\\Users\\heave\\mission-control\\server\\logs\\shutdown_test.out"
$stderr = "C:\\Users\\heave\\mission-control\\server\\logs\\shutdown_test.err"
Remove-Item $stdout,$stderr -ErrorAction SilentlyContinue
$server = Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory "C:\\Users\\heave\\mission-control\\server" -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
Start-Sleep -Seconds 3
$pid = $server.Id
node -e "process.kill($pid, 'SIGINT')"
Start-Sleep -Seconds 2
"--- STDOUT ---"
Get-Content $stdout
"--- STDERR ---"
Get-Content $stderr
