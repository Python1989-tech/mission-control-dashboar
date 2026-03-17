Add-Type -AssemblyName System.Drawing
$width = 600
$height = 600
$bmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.Rectangle]::new(0,0,$width,$height),
    [System.Drawing.ColorTranslator]::FromHtml("#020617"),
    [System.Drawing.ColorTranslator]::FromHtml("#0ea5e9"),
    65)
$graphics.FillRectangle($bgBrush, 0,0,$width,$height)

# draw circuitry arcs
$circuitPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#38bdf8"), 4)
$circuitPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$graphics.DrawArc($circuitPen, 40, 40, 520, 520, 30, 120)
$graphics.DrawArc($circuitPen, 60, 80, 480, 480, 200, 140)

# avatar armor silhouette
$armorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1f2937"))
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#67e8f9"))
$graphics.FillEllipse($armorBrush, 210, 150, 180, 180) # helmet
$graphics.FillRectangle($armorBrush, 240, 280, 120, 200)
$graphics.FillPolygon($armorBrush, ([System.Drawing.Point[]]@([System.Drawing.Point]::new(210, 320), [System.Drawing.Point]::new(150, 430), [System.Drawing.Point]::new(240, 430))))
$graphics.FillPolygon($armorBrush, ([System.Drawing.Point[]]@([System.Drawing.Point]::new(390, 320), [System.Drawing.Point]::new(450, 430), [System.Drawing.Point]::new(360, 430))))

# visor glow
$graphics.FillRectangle($accentBrush, 250, 210, 100, 24)

# chest sigil
$graphics.FillEllipse($accentBrush, 280, 360, 40, 40)
$graphics.FillEllipse([System.Drawing.Brushes]::Black, 290, 370, 20, 20)

# crypto glyphs
$glyphFont = New-Object System.Drawing.Font("Segoe UI Symbol", 80)
$graphics.DrawString("₿", $glyphFont, $accentBrush, 70, 80)
$graphics.DrawString("Ξ", $glyphFont, $accentBrush, 420, 100)
$graphics.DrawString("Φ", $glyphFont, $accentBrush, 90, 420)
$graphics.DrawString("Ø", $glyphFont, $accentBrush, 420, 420)

# name label
$nameFont = New-Object System.Drawing.Font("Orbitron", 28, [System.Drawing.FontStyle]::Bold)
$graphics.DrawString("CryptoSentinel", $nameFont, [System.Drawing.Brushes]::White, 150, 40)

$outPath = "C:\\Users\\heave\\mission-control\\dashboard\\public\\portraits\\cryptosentinel.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
Write-Host "Wrote $outPath"
