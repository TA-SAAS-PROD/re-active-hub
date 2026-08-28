param(
  [string]$In,
  [string]$Out,
  [int]$W,
  [int]$H,
  [int]$Quality = 82,
  [double]$FocusY = 0.5   # 0 = crop from top, .5 = centre, 1 = bottom
)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))

# cover-crop: scale so the target is fully covered, then centre-crop
$scale = [Math]::Max($W / $src.Width, $H / $src.Height)
$sw = [int]([Math]::Ceiling($src.Width * $scale))
$sh = [int]([Math]::Ceiling($src.Height * $scale))
$offX = [int](($sw - $W) / 2)
$offY = [int](($sh - $H) * $FocusY)

$canvas = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode  = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode    = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($src, (New-Object System.Drawing.Rectangle (-$offX), (-$offY), $sw, $sh))
$g.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$p = New-Object System.Drawing.Imaging.EncoderParameters 1
$p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), $Quality
$canvas.Save($Out, $codec, $p)

$bytes = (Get-Item $Out).Length
Write-Output ("{0}  {1}x{2}  {3} KB" -f (Split-Path $Out -Leaf), $W, $H, [Math]::Round($bytes / 1KB))
$canvas.Dispose(); $src.Dispose()
