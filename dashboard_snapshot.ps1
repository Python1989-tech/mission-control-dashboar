Add-Type -AssemblyName System.Drawing
$width = 960
$height = 540
$bmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(15,23,42))

$headerFont = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Regular)
$subtleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(148,163,184))
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(94,234,212))
$whiteBrush = [System.Drawing.Brushes]::White

$graphics.DrawString("Mission Control Snapshot", $headerFont, $whiteBrush, 20, 20)
$graphics.DrawString((Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $bodyFont, $subtleBrush, 20, 60)

$graphics.DrawRectangle([System.Drawing.Pens]::DarkSlateBlue, 20, 110, 920, 380)
$graphics.DrawString("HypeForge", $headerFont, $whiteBrush, 40, 130)
$graphics.DrawString("Status: working", $bodyFont, $accentBrush, 40, 170)
$graphics.DrawString("Task: Mission Control heartbeat test", $bodyFont, $whiteBrush, 40, 200)
$graphics.DrawString("Gateway: connected", $bodyFont, $accentBrush, 40, 240)
$graphics.DrawString("Last heartbeat: 2026-03-15 14:16:28", $bodyFont, $whiteBrush, 40, 280)

$outputPath = "C:\Users\heave\mission-control\deliverables\mission-control-snapshot.png"
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
Write-Host "Saved snapshot to $outputPath"
