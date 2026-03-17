param(
    [Parameter(Mandatory=$true)][string]$Id,
    [Parameter(Mandatory=$true)][string]$Name,
    [string]$Primary = "#0b1120",
    [string]$Accent = "#38bdf8",
    [string]$Badge = "#facc15",
    [string]$PropSymbol = ""
)

Add-Type -AssemblyName System.Drawing
$width = 600
$height = 600
$bmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$primaryColor = [System.Drawing.ColorTranslator]::FromHtml($Primary)
$accentColor = [System.Drawing.ColorTranslator]::FromHtml($Accent)
$badgeColor = [System.Drawing.ColorTranslator]::FromHtml($Badge)
$background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.Rectangle]::new(0,0,$width,$height),
    $primaryColor,
    $accentColor,
    45
)
$graphics.FillRectangle($background, 0,0,$width,$height)

# floor shadow
$shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(80,0,0,0))
$graphics.FillEllipse($shadowBrush, 150, 430, 300, 80)

# desk
$deskBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1f2937"))
$graphics.FillRectangle($deskBrush, 100, 380, 400, 120)

# body
$bodyBrush = New-Object System.Drawing.SolidBrush($accentColor)
$graphics.FillRectangle($bodyBrush, 250, 250, 100, 160)

# head
$headBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#fde68a"))
$graphics.FillEllipse($headBrush, 235, 180, 130, 130)

# arms
$armPen = New-Object System.Drawing.Pen($accentColor, 20)
$graphics.DrawLine($armPen, 250, 280, 170, 340)
$graphics.DrawLine($armPen, 350, 280, 430, 340)

# badge / accessory
$badgeBrush = New-Object System.Drawing.SolidBrush($badgeColor)
$graphics.FillEllipse($badgeBrush, 280, 300, 40, 40)

if ($PropSymbol -ne "") {
    $propFont = New-Object System.Drawing.Font("Segoe UI Symbol", 48)
    $graphics.DrawString($PropSymbol, $propFont, [System.Drawing.Brushes]::White, 200, 420)
}

# name label
$nameFont = New-Object System.Drawing.Font("Segoe UI Semibold", 26)
$graphics.DrawString($Name, $nameFont, [System.Drawing.Brushes]::White, 32, 32)

$outDir = "C:\\Users\\heave\\mission-control\\dashboard\\public\\portraits"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$path = Join-Path $outDir "$($Id).png"
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
Write-Host "Saved portrait -> $path"
