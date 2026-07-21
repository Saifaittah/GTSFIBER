$ErrorActionPreference = "Stop"

# Requires ImageMagick installed and available as `magick`.
# Download: https://imagemagick.org/script/download.php

$root = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $root "assets/images/prducts-applications/_src"
$outDir = Join-Path $root "assets/images/prducts-applications"

if (!(Test-Path $srcDir)) {
  New-Item -ItemType Directory -Path $srcDir | Out-Null
  Write-Host "Created source folder: $srcDir"
  Write-Host "Add source images there, then re-run this script."
  exit 0
}

$targets = @(
  @{ name = "industrial-floors";       pattern = "industrial*|floor*|warehouse*|logistics*" },
  @{ name = "roads-pavements";         pattern = "road*|pavement*|hardstand*|external*" },
  @{ name = "precast-concrete";        pattern = "precast*|factory*|production*" },
  @{ name = "shotcrete-repairs";       pattern = "shotcrete*|repair*|overlay*|spray*" },
  @{ name = "infrastructure-works";    pattern = "infrastructure*|civil*|bridge*|tunnel*" },
  @{ name = "high-load-areas";         pattern = "high*load*|heavy*|forklift*|impact*" }
)

function Ensure-Magick {
  try {
    & magick -version | Out-Null
  } catch {
    throw "ImageMagick not found. Install it and ensure `magick` is on PATH."
  }
}

Ensure-Magick

Write-Host "Source: $srcDir"
Write-Host "Output: $outDir"

# Settings tuned for high-quality background images:
# - Resize to max 2400px wide (keeps quality, avoids huge downloads)
# - WebP quality 82 (high-quality), strip metadata
# - Mild sharpening to keep industrial textures crisp
$maxWidth = 2400
$quality = 82

Get-ChildItem -Path $srcDir -File | ForEach-Object {
  $src = $_.FullName
  $lower = $_.Name.ToLowerInvariant()

  $matched = $null
  foreach ($t in $targets) {
    if ($lower -match $t.pattern) { $matched = $t; break }
  }

  if ($null -eq $matched) {
    Write-Host "Skipping (no match): $($_.Name)"
    return
  }

  $out = Join-Path $outDir ("{0}.webp" -f $matched.name)
  Write-Host "→ $($_.Name)  =>  $(Split-Path -Leaf $out)"

  & magick $src `
    -auto-orient `
    -strip `
    -resize ("{0}x>" -f $maxWidth) `
    -colorspace sRGB `
    -unsharp 0x0.6+0.6+0.02 `
    -define webp:method=6 `
    -quality $quality `
    $out
}

Write-Host "Done."
Write-Host "Verify outputs in: $outDir"

