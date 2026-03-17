param([string[]]$Agents)
Add-Type -AssemblyName System.Drawing
$dir = "C:\\Users\\heave\\mission-control\\dashboard\\public\\assets"
foreach ($agent in $Agents) {
  $path = Join-Path $dir "$agent.png"
  if (Test-Path $path) {
    $img = [System.Drawing.Image]::FromFile($path)
    $info = Get-Item $path
    Write-Host "$($agent): $($img.Width)x$($img.Height), $([math]::Round($info.Length/1KB,2)) KB"
    $img.Dispose()
  } else {
    Write-Host "$($agent): MISSING"
  }
}
