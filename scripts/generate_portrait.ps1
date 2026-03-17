param(
    [Parameter(Mandatory=$true)][string]$Id,
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$Glyph,
    [string]$PrimaryColor = "#0f172a",
    [string]$AccentColor = "#38bdf8"
)

Add-Type -AssemblyName System.Drawing
$width = 512
$height = 512
$bmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$primary = [System.Drawing.ColorTranslator]::FromHtml($PrimaryColor)
$accent = [System.Drawing.ColorTranslator]::FromHtml($AccentColor)
$backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.Rectangle]::new(0,0,$width,$height),
    $primary,
    $accent,
    45
)
$graphics.FillRectangle($backgroundBrush, 0,0,$width,$height)

$circleRect = [System.Drawing.Rectangle]::new(56,56,400,400)
$circlePen = New-Object System.Drawing.Pen($accent,8)
$graphics.DrawEllipse($circlePen, $circleRect)

$glyphFont = New-Object System.Drawing.Font("Segoe UI Emoji", 64, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$glyphSize = $graphics.MeasureString($Glyph, $glyphFont)
$graphics.DrawString($Glyph, $glyphFont, [System.Drawing.Brushes]::White, ($width - $glyphSize.Width)/2, 150)

$nameFont = New-Object System.Drawing.Font("Segoe UI Semibold", 28)
$deptFont = New-Object System.Drawing.Font("Segoe UI", 18)
$graphics.DrawString($Name, $nameFont, [System.Drawing.Brushes]::White, 40, 360)
$graphics.DrawString("BeastGaming", $deptFont, [System.Drawing.Brushes]::White, 40, 406)

$outDir = "C:\\Users\\heave\\mission-control\\dashboard\\public\\portraits"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$path = Join-Path $outDir "$($Id).png"
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
Write-Host "Saved portrait -> $path"
