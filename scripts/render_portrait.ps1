param(
    [Parameter(Position=0,Mandatory=$true)][string]$Id,
    [Parameter(Position=1,Mandatory=$true)][string]$Role,
    [string]$CoreSymbol = "",
    [string]$Primary = "#020617",
    [string]$Neon = "#38bdf8",
    [string]$Accent = "#facc15"
)

Add-Type -AssemblyName System.Drawing
$AgentName = ($Id -replace "_", " ")
if ([string]::IsNullOrWhiteSpace($Role)) { $Role = $AgentName }
if ([string]::IsNullOrWhiteSpace($CoreSymbol)) {
  switch -Regex ($Id.ToLower()) {
    "crypto" { $CoreSymbol = "C"; break }
    "deck" { $CoreSymbol = "D"; break }
    "market" { $CoreSymbol = "M"; break }
    "gameplay" { $CoreSymbol = "G"; break }
    "shop" { $CoreSymbol = "S"; break }
    "hype" { $CoreSymbol = "H"; break }
    default { $CoreSymbol = "*" }
  }
}
$width = 700
$height = 900
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.Rectangle]::new(0,0,$width,$height),
    [System.Drawing.ColorTranslator]::FromHtml($Primary),
    [System.Drawing.ColorTranslator]::FromHtml("#0c4a6e"),
    90)
$g.FillRectangle($bgBrush, 0,0,$width,$height)

$gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, [System.Drawing.ColorTranslator]::FromHtml($Neon)), 1)
for ($x = 0; $x -le $width; $x += 70) { $g.DrawLine($gridPen, $x,0,$x,$height) }
for ($y = 0; $y -le $height; $y += 70) { $g.DrawLine($gridPen, 0,$y,$width,$y) }

$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse(100,150,500,600)
$glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
$glowBrush.CenterColor = [System.Drawing.ColorTranslator]::FromHtml($Neon)
$glowBrush.SurroundColors = ,([System.Drawing.Color]::FromArgb(0,0,0,0))
$g.FillPath($glowBrush, $glowPath)

$torsoBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#111827"))
$g.FillRectangle($torsoBrush, 280, 320, 140, 280)
$shoulderBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1f2937"))
$g.FillEllipse($shoulderBrush, 220, 320, 120, 120)
$g.FillEllipse($shoulderBrush, 360, 320, 120, 120)

$platePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($Neon), 6)
$platePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$g.DrawRectangle($platePen, 260, 300, 180, 330)

$coreBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($Accent))
$g.FillEllipse($coreBrush, 310, 430, 80, 80)
$coreFont = New-Object System.Drawing.Font("Segoe UI", 40, [System.Drawing.FontStyle]::Bold)
$coreSize = $g.MeasureString($CoreSymbol, $coreFont)
$g.DrawString($CoreSymbol, $coreFont, [System.Drawing.Brushes]::Black, 310 + (80-$coreSize.Width)/2, 430 + (80-$coreSize.Height)/2)

$helmetBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#0f172a"))
$g.FillEllipse($helmetBrush, 250, 180, 200, 200)
$visorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($Neon))
$g.FillRectangle($visorBrush, 270, 260, 160, 40)

$dataPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(160, [System.Drawing.ColorTranslator]::FromHtml($Neon)), 3)
$g.DrawArc($dataPen, 120, 120, 460, 460, 10, 80)
$g.DrawArc($dataPen, 80, 100, 540, 540, 180, 110)

$titleFont = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
$roleFont = New-Object System.Drawing.Font("Segoe UI", 20)
$g.DrawString($AgentName, $titleFont, [System.Drawing.Brushes]::White, 40, 40)
$g.DrawString($Role, $roleFont, [System.Drawing.Brushes]::White, 40, 90)

$portraitDir = "C:\\Users\\heave\\mission-control\\dashboard\\public\\portraits"
if (!(Test-Path $portraitDir)) { New-Item -ItemType Directory -Path $portraitDir | Out-Null }
$path = Join-Path $portraitDir "$($Id.ToLower()).png"
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host "Rendered $path"
