param(
  [switch]$WhatIfOnly
)

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  try {
    $gitRoot = (& git rev-parse --show-toplevel 2>$null)
    if ($LASTEXITCODE -eq 0 -and $gitRoot) { return $gitRoot.Trim() }
  } catch {}
  return $PSScriptRoot
}

$repoRoot = Get-RepoRoot
$baseRel = 'docs/update-history'
$groups = @(
  [pscustomobject]@{ Name='part-file-lists'; Pattern='^PART\d+_UPDATE_FILE_LIST.*\.json$'; Description='PART update file lists' },
  [pscustomobject]@{ Name='checksums';      Pattern='^SHA256SUMS_PART\d+.*$';              Description='PART checksum files' },
  [pscustomobject]@{ Name='part-notes';      Pattern='^README_PART\d+.*$';                  Description='PART README / notes' },
  [pscustomobject]@{ Name='legacy';          Pattern='^LEGACY_FILENAME_MAP(?:\.txt)?$';      Description='Legacy filename map' },
  [pscustomobject]@{ Name='release-checksums'; Pattern='^SHA256SUMS_v\d+\.\d+\.\d+.*\.txt$'; Description='Versioned release checksum files' },
  [pscustomobject]@{ Name='release-instructions'; Pattern='^UPDATE_INSTRUCTIONS_v\d+\.\d+\.\d+.*\.txt$'; Description='Versioned update instructions' }
)

Write-Host 'SKDG update-history organizer' -ForegroundColor Cyan
Write-Host "Repository: $repoRoot"
Write-Host "Destination: $baseRel"
Write-Host ''

function Ensure-Directory([string]$rel) {
  $path = Join-Path $repoRoot ($rel -replace '/', [IO.Path]::DirectorySeparatorChar)
  if (-not (Test-Path -LiteralPath $path)) {
    if ($WhatIfOnly) { Write-Host "[WHATIF] Create: $rel" }
    else { New-Item -ItemType Directory -Force -Path $path | Out-Null }
  }
  return $path
}

function Test-GitTracked([string]$rel) {
  try {
    & git -C $repoRoot ls-files --error-unmatch -- $rel *> $null
    return ($LASTEXITCODE -eq 0)
  } catch { return $false }
}

function Move-HistoryFile($file, [string]$targetRel, [string]$targetPath) {
  $srcRel = $file.Name
  $dstRel = "$targetRel/$($file.Name)"
  $dst = Join-Path $targetPath $file.Name

  if ($WhatIfOnly) {
    Write-Host "[WHATIF] $srcRel -> $dstRel"
    return
  }

  $tracked = Test-GitTracked $srcRel
  if ($tracked -and -not (Test-Path -LiteralPath $dst)) {
    & git -C $repoRoot mv -- $srcRel $dstRel
    if ($LASTEXITCODE -ne 0) { throw "git mv failed: $srcRel" }
  } else {
    # Existing destination or untracked source: overwrite safely.
    # 'git add -A' afterwards records move/delete/add correctly.
    Move-Item -LiteralPath $file.FullName -Destination $dst -Force
  }
  Write-Host "Moved: $srcRel -> $dstRel"
}

$total = 0
$summary = @()

foreach ($group in $groups) {
  $targetRel = "$baseRel/$($group.Name)"
  $targetPath = Ensure-Directory $targetRel
  $files = @(Get-ChildItem -LiteralPath $repoRoot -File | Where-Object { $_.Name -match $group.Pattern } | Sort-Object Name)

  if ($files.Count -gt 0) {
    Write-Host ("{0}: {1} file(s)" -f $group.Description, $files.Count) -ForegroundColor Green
    foreach ($file in $files) {
      Move-HistoryFile $file $targetRel $targetPath
      $total++
    }
  }

  $existing = @()
  if (Test-Path -LiteralPath $targetPath) {
    $existing = @(Get-ChildItem -LiteralPath $targetPath -File | Sort-Object Name | ForEach-Object { $_.Name })
  }
  $summary += [ordered]@{
    category = $group.Name
    folder = $targetRel
    fileCount = $existing.Count
    files = $existing
  }
}

if (-not $WhatIfOnly) {
  $basePath = Ensure-Directory $baseRel
  $index = [ordered]@{
    generatedAt = (Get-Date).ToString('o')
    purpose = 'SKDG development/update history files moved out of repository root.'
    movedThisRun = $total
    categories = $summary
    rootFilesKept = @(
      'index.html',
      'VERSION.json',
      'release-manifest.json',
      'SHA256SUMS',
      'SHA256SUMS.txt'
    )
  }
  $indexPath = Join-Path $basePath 'UPDATE_HISTORY_INDEX.json'
  $index | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $indexPath -Encoding UTF8

  # Keep the old file-list-only index for compatibility if the folder exists.
  $partListPath = Join-Path $basePath 'part-file-lists'
  if (Test-Path -LiteralPath $partListPath) {
    $partFiles = @(Get-ChildItem -LiteralPath $partListPath -File -Filter 'PART*_UPDATE_FILE_LIST*.json' | Sort-Object Name)
    $partIndex = [ordered]@{
      generatedAt = (Get-Date).ToString('o')
      folder = "$baseRel/part-file-lists"
      fileCount = $partFiles.Count
      files = @($partFiles | ForEach-Object { $_.Name })
    }
    $partIndex | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $partListPath 'PART_FILE_LIST_INDEX.json') -Encoding UTF8
  }

  Write-Host ''
  if ($total -eq 0) {
    Write-Host 'No matching update-history files remained in the repository root.' -ForegroundColor Yellow
  } else {
    Write-Host ("Organization complete: {0} file(s) moved." -f $total) -ForegroundColor Cyan
  }
  Write-Host 'Root files intentionally kept: SHA256SUMS / release-manifest / current system files.'
  Write-Host ''
  Write-Host 'Next commands:'
  Write-Host '  git status'
  Write-Host '  git add -A'
  Write-Host '  git commit -m "Organize SKDG update history files"'
  Write-Host '  git push origin main'
}
