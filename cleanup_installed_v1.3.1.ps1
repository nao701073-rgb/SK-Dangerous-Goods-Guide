$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-SkdgRoot([string]$Path) {
  return (Test-Path (Join-Path $Path "index.html")) -and
         (Test-Path (Join-Path $Path "assets")) -and
         (Test-Path (Join-Path $Path "pages"))
}

function Get-DirectoryBytes([string]$Path) {
  if(-not (Test-Path -LiteralPath $Path)) { return 0L }
  $sum = (Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum
  if($null -eq $sum) { return 0L }
  return [int64]$sum
}

function Get-FileBytes([string]$Path) {
  if(-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return 0L }
  return [int64](Get-Item -LiteralPath $Path -Force).Length
}

# Find the SKDG root either in this folder or one level above.
$Root = $null
$candidates = @($ScriptDir)
$parent = Split-Path $ScriptDir -Parent
if($parent -and $parent -ne $ScriptDir) { $candidates += $parent }
foreach($c in $candidates) {
  if(Test-SkdgRoot $c) { $Root = $c; break }
}
if(-not $Root) {
  Write-Host "SKDGのルートフォルダーを見つけられません。" -ForegroundColor Red
  Write-Host "CLEAN_INSTALLED_v1.3.1.cmd と cleanup_installed_v1.3.1.ps1 を、index.html / assets / pages があるフォルダーへ置いてください。"
  Read-Host "Enterで終了"
  exit 1
}

# Confirm that the installed application is v1.3.1 before deleting anything.
$versionOk = $false
$versionText = ""
$versionFile = Join-Path $Root "VERSION.json"
if(Test-Path -LiteralPath $versionFile) {
  try {
    $vj = Get-Content -LiteralPath $versionFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $versionText = [string]$vj.version
    if($versionText -eq "v1.3.1") { $versionOk = $true }
  } catch { }
}

# Fallback for installations where VERSION.json was not overwritten correctly,
# but the v1.3.1 runtime files are present.
if(-not $versionOk) {
  $required = @(
    "assets/css/v131-ui.css",
    "assets/js/v131-ctu.js",
    "assets/js/v131-intake.js"
  )
  $missing = @($required | Where-Object { -not (Test-Path -LiteralPath (Join-Path $Root $_)) })
  if($missing.Count -eq 0) {
    $versionOk = $true
    $versionText = "v1.3.1 runtime files detected"
  }
}

if(-not $versionOk) {
  Write-Host "v1.3.1の導入確認ができないため、何も削除しません。" -ForegroundColor Red
  if($versionText) { Write-Host ("検出されたVERSION: " + $versionText) }
  Read-Host "Enterで終了"
  exit 2
}

Write-Host ""
Write-Host "SKDG v1.3.1 導入済みフォルダーを確認しました。" -ForegroundColor Green
Write-Host ("対象: " + $Root)

# Exact duplicate pairs already audited for v1.3.1.
# The first path is removed ONLY when its SHA-256 is identical to the second path.
$pairs = @(
  @('assets/images/login-port-day-v365.jpg','assets/images/login-port-day.jpg'),
  @('assets/images/login-port-morning-v365.jpg','assets/images/login-port-morning.jpg'),
  @('assets/images/login-port-evening-v365.jpg','assets/images/login-port-evening.jpg'),
  @('assets/images/login-port-night-v365.jpg','assets/images/login-port-night.jpg'),
  @('assets/domestic-law-pages/notification/page-205-205.png','assets/domestic-law-pages/notification/page-205.png'),
  @('assets/domestic-law-pages/notification/page-214-214.png','assets/domestic-law-pages/notification/page-214.png'),
  @('assets/domestic-law-pages/notification/page-215-215.png','assets/domestic-law-pages/notification/page-215.png'),
  @('assets/domestic-law-pages/notification/page-177-177.png','assets/domestic-law-pages/notification/page-177.png'),
  @('assets/domestic-law-pages/notification/page-142-142.png','assets/domestic-law-pages/notification/page-142.png'),
  @('assets/domestic-law-pages/notification/page-184-184.png','assets/domestic-law-pages/notification/page-184.png'),
  @('assets/domestic-law-pages/notification/page-148-148.png','assets/domestic-law-pages/notification/page-148.png'),
  @('assets/domestic-law-pages/notification/page-149-149.png','assets/domestic-law-pages/notification/page-149.png'),
  @('assets/domestic-law-pages/notification/page-139-139.png','assets/domestic-law-pages/notification/page-139.png')
)

# Updater / release metadata no longer needed after v1.3.1 has been installed.
$obsoleteFiles = @(
  'RUNTIME_CLEANUP_v1.3.ps1',
  'payload_v1.3.1.zip',
  'APPLY_v1.3.1.cmd',
  'apply_v1.3.1.ps1',
  'APPLY_v1.3.1_FIXED.cmd',
  'apply_v1.3.1_fixed.ps1',
  'SHA256SUMS_v1.0.txt',
  'UPDATE_INSTRUCTIONS_v1.0.txt',
  'V1_UPDATE_FILE_LIST.json',
  'SHA256SUMS_v1.0.1.txt',
  'UPDATE_INSTRUCTIONS_v1.0.1.txt',
  'V101_UPDATE_FILE_LIST.json',
  'SHA256SUMS_v1.1.txt',
  'UPDATE_INSTRUCTIONS_v1.1.txt',
  'V11_UPDATE_FILE_LIST.json',
  'SHA256SUMS_v1.2.txt',
  'UPDATE_INSTRUCTIONS_v1.2.txt',
  'V12_UPDATE_FILE_LIST.json',
  'SHA256SUMS_v1.3.txt',
  'UPDATE_INSTRUCTIONS_v1.3.txt',
  'UPDATE_FILE_LIST_v1.3.json',
  'SHA256SUMS_v1.3.1.txt',
  'UPDATE_INSTRUCTIONS_v1.3.1.txt',
  'SKDG_v1.3_Update.zip',
  'SKDG_v1.3_Update.zip.sha256',
  'SKDG_v1.3.1_Update.zip',
  'SKDG_v1.3.1_Update.zip.sha256',
  'SKDG_v1.3.1_Clean_Updater.zip',
  'SKDG_v1.3.1_Clean_Updater.zip.sha256',
  'SKDG_v1.3.1_Clean_Updater_FIXED.zip',
  'SKDG_v1.3.1_Clean_Updater_FIXED.zip.sha256'
)

# Find updater-created rollback backups. These are safe to remove only after v1.3.1 is detected.
$backupDirs = @(Get-ChildItem -LiteralPath $Root -Directory -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like '_backup_v1.3.1_*' })

# Calculate reclaimable space before asking the user.
$duplicateBytes = 0L
$duplicateCount = 0
foreach($p in $pairs) {
  $old = Join-Path $Root $p[0]
  $keep = Join-Path $Root $p[1]
  if((Test-Path -LiteralPath $old -PathType Leaf) -and (Test-Path -LiteralPath $keep -PathType Leaf)) {
    try {
      $h1 = (Get-FileHash -Algorithm SHA256 -LiteralPath $old).Hash
      $h2 = (Get-FileHash -Algorithm SHA256 -LiteralPath $keep).Hash
      if($h1 -eq $h2) {
        $duplicateBytes += Get-FileBytes $old
        $duplicateCount++
      }
    } catch { }
  }
}

$obsoleteBytes = 0L
$obsoleteCount = 0
foreach($rel in $obsoleteFiles) {
  $p = Join-Path $Root $rel
  if(Test-Path -LiteralPath $p -PathType Leaf) {
    $obsoleteBytes += Get-FileBytes $p
    $obsoleteCount++
  }
}

# Remove README_FIRST.txt only when it is clearly the v1.3.1 updater README.
$updaterReadme = Join-Path $Root 'README_FIRST.txt'
$removeUpdaterReadme = $false
if(Test-Path -LiteralPath $updaterReadme -PathType Leaf) {
  try {
    $head = Get-Content -LiteralPath $updaterReadme -Raw -Encoding UTF8
    if(($head -match 'v1\.3\.1') -and ($head -match 'Updater|アップデータ|payload')) {
      $removeUpdaterReadme = $true
      $obsoleteBytes += Get-FileBytes $updaterReadme
      $obsoleteCount++
    }
  } catch { }
}

$backupBytes = 0L
foreach($d in $backupDirs) { $backupBytes += Get-DirectoryBytes $d.FullName }
$totalCandidate = $duplicateBytes + $obsoleteBytes + $backupBytes

Write-Host ""
Write-Host "整理候補" -ForegroundColor Cyan
Write-Host ("  完全一致の重複: {0} ファイル / {1:N2} MiB" -f $duplicateCount, ($duplicateBytes/1MB))
Write-Host ("  更新用の残り:     {0} ファイル / {1:N2} MiB" -f $obsoleteCount, ($obsoleteBytes/1MB))
Write-Host ("  v1.3.1バックアップ: {0} フォルダー / {1:N2} MiB" -f $backupDirs.Count, ($backupBytes/1MB))
Write-Host ("  合計候補: {0:N2} MiB" -f ($totalCandidate/1MB)) -ForegroundColor Yellow
Write-Host ""
Write-Host "※ VERSION.json、v1.3.1本体、危険物データ、法令・IMDG・標札、案件・写真データは削除しません。"
Write-Host "※ _backup_v1.3.1_* は更新時のロールバック用コピーです。削除後はこのバックアップから戻せません。" -ForegroundColor Yellow

if($totalCandidate -le 0) {
  Write-Host "整理するファイルはありません。すでにクリーンな状態です。" -ForegroundColor Green
  Read-Host "Enterで終了"
  exit 0
}

$answer = Read-Host "この内容で整理しますか？ [Y/N]"
if($answer -notmatch '^[Yy]$') {
  Write-Host "キャンセルしました。何も削除していません。"
  exit 0
}

$deletedBytes = 0L
$deletedCount = 0
$skipped = 0

# 1) Exact duplicates: re-hash immediately before each deletion.
foreach($p in $pairs) {
  $old = Join-Path $Root $p[0]
  $keep = Join-Path $Root $p[1]
  if(!(Test-Path -LiteralPath $old -PathType Leaf) -or !(Test-Path -LiteralPath $keep -PathType Leaf)) { continue }
  try {
    $h1 = (Get-FileHash -Algorithm SHA256 -LiteralPath $old).Hash
    $h2 = (Get-FileHash -Algorithm SHA256 -LiteralPath $keep).Hash
    if($h1 -ne $h2) {
      Write-Host ("保持（ハッシュ不一致）: " + $p[0]) -ForegroundColor Yellow
      $skipped++
      continue
    }
    $len = Get-FileBytes $old
    Remove-Item -LiteralPath $old -Force
    $deletedBytes += $len
    $deletedCount++
    Write-Host ("重複削除: " + $p[0])
  } catch {
    Write-Host ("保持（削除できません）: " + $p[0]) -ForegroundColor Yellow
    $skipped++
  }
}

# 2) Old updater and semantic-release metadata.
foreach($rel in $obsoleteFiles) {
  $p = Join-Path $Root $rel
  if(Test-Path -LiteralPath $p -PathType Leaf) {
    try {
      $len = Get-FileBytes $p
      Remove-Item -LiteralPath $p -Force
      $deletedBytes += $len
      $deletedCount++
      Write-Host ("更新残り削除: " + $rel)
    } catch {
      Write-Host ("保持（削除できません）: " + $rel) -ForegroundColor Yellow
      $skipped++
    }
  }
}
if($removeUpdaterReadme -and (Test-Path -LiteralPath $updaterReadme -PathType Leaf)) {
  try {
    $len = Get-FileBytes $updaterReadme
    Remove-Item -LiteralPath $updaterReadme -Force
    $deletedBytes += $len
    $deletedCount++
    Write-Host "更新残り削除: README_FIRST.txt"
  } catch { $skipped++ }
}

# 3) Updater rollback backup folders.
foreach($d in $backupDirs) {
  if(Test-Path -LiteralPath $d.FullName -PathType Container) {
    try {
      $len = Get-DirectoryBytes $d.FullName
      Remove-Item -LiteralPath $d.FullName -Recurse -Force
      $deletedBytes += $len
      $deletedCount++
      Write-Host ("バックアップ削除: " + $d.Name)
    } catch {
      Write-Host ("保持（削除できません）: " + $d.Name) -ForegroundColor Yellow
      $skipped++
    }
  }
}

Write-Host ""
Write-Host "v1.3.1の後片付けが完了しました。" -ForegroundColor Green
Write-Host ("削除・整理: {0} 項目" -f $deletedCount)
Write-Host ("削減容量: {0:N2} MiB" -f ($deletedBytes/1MB)) -ForegroundColor Green
if($skipped -gt 0) { Write-Host ("安全のため保持した項目: {0}" -f $skipped) -ForegroundColor Yellow }
Write-Host ""
Write-Host "この CLEAN_INSTALLED_v1.3.1.cmd と cleanup_installed_v1.3.1.ps1 自体は、処理後に削除して構いません。"
Read-Host "Enterで終了"
exit 0
