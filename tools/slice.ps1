param(
  [string]$In,
  [string]$OutDir,
  [string]$Prefix = "slice",
  [int]$SliceH = 1100,
  [int]$MaxW = 1000
)
Add-Type -AssemblyName System.Drawing
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force $OutDir | Out-Null }
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
$w = $src.Width; $h = $src.Height
$n = [Math]::Ceiling($h / $SliceH)
$scale = 1.0
if ($w -gt $MaxW) { $scale = $MaxW / $w }
for ($i = 0; $i -lt $n; $i++) {
  $y = $i * $SliceH
  $hh = [Math]::Min($SliceH, $h - $y)
  $rect = New-Object System.Drawing.Rectangle 0, $y, $w, $hh
  $crop = New-Object System.Drawing.Bitmap $w, $hh
  $g = [System.Drawing.Graphics]::FromImage($crop)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0,0,$w,$hh), $rect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $ow = [int]($w * $scale); $oh = [int]($hh * $scale)
  $out = New-Object System.Drawing.Bitmap $ow, $oh
  $g2 = [System.Drawing.Graphics]::FromImage($out)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.DrawImage($crop, 0, 0, $ow, $oh)
  $g2.Dispose()
  $p = Join-Path $OutDir ("{0}-{1:d2}.png" -f $Prefix, $i)
  $out.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose(); $crop.Dispose()
  Write-Output "$p  ${ow}x${oh}  (src y=$y)"
}
$src.Dispose()
