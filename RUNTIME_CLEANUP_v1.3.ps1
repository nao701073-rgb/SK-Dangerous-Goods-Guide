param([switch]$Apply)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pairs = @(
  @('assets/images/login-port-day-v365.jpg','assets/images/login-port-day.jpg'),
  @('assets/images/login-port-evening-v365.jpg','assets/images/login-port-evening.jpg'),
  @('assets/images/login-port-morning-v365.jpg','assets/images/login-port-morning.jpg'),
  @('assets/images/login-port-night-v365.jpg','assets/images/login-port-night.jpg'),
  @('assets/domestic-law-pages/notification/page-139-139.png','assets/domestic-law-pages/notification/page-139.png'),
  @('assets/domestic-law-pages/notification/page-142-142.png','assets/domestic-law-pages/notification/page-142.png'),
  @('assets/domestic-law-pages/notification/page-148-148.png','assets/domestic-law-pages/notification/page-148.png'),
  @('assets/domestic-law-pages/notification/page-149-149.png','assets/domestic-law-pages/notification/page-149.png'),
  @('assets/domestic-law-pages/notification/page-177-177.png','assets/domestic-law-pages/notification/page-177.png'),
  @('assets/domestic-law-pages/notification/page-184-184.png','assets/domestic-law-pages/notification/page-184.png'),
  @('assets/domestic-law-pages/notification/page-205-205.png','assets/domestic-law-pages/notification/page-205.png'),
  @('assets/domestic-law-pages/notification/page-214-214.png','assets/domestic-law-pages/notification/page-214.png'),
  @('assets/domestic-law-pages/notification/page-215-215.png','assets/domestic-law-pages/notification/page-215.png'),
  @('assets/reference-images/imdg-clauses/7-3-2-3-p498.jpg','assets/reference-images/imdg-clauses/7-3-4-p498.jpg'),
  @('assets/reference-images/imdg-clauses/7-3-4-p499.jpg','assets/reference-images/imdg-clauses/7-3-6-p499.jpg'),
  @('docs/Part383/legacy_5c9fbd7597.docx','docs/Part383/03_Part383_%E3%83%AA%E3%83%AA%E3%83%BC%E3%82%B9%E3%83%A1%E3%83%A2.docx'),
  @('docs/Part384/legacy_8fbe7fe07a.docx','docs/Part384/03_Part384_%E3%83%AA%E3%83%AA%E3%83%BC%E3%82%B9%E3%83%A1%E3%83%A2.docx'),
  @('UPDATE_INSTRUCTIONS_PART521_PHASE14.txt','UPDATE_INSTRUCTIONS.txt')
)
$textExt = @('.html','.htm','.js','.mjs','.css','.json')
$freed = 0L
Write-Host "SKDG v1.3 runtime cleanup - exact duplicate assets only"
Write-Host ($(if($Apply){'Mode: APPLY'}else{'Mode: DRY RUN (use -Apply to delete)'}))
foreach($pair in $pairs){
  $legacy = Join-Path $Root $pair[0]; $canonical = Join-Path $Root $pair[1]
  if(!(Test-Path $legacy) -or !(Test-Path $canonical)){ continue }
  $h1=(Get-FileHash -Algorithm SHA256 $legacy).Hash; $h2=(Get-FileHash -Algorithm SHA256 $canonical).Hash
  if($h1 -ne $h2){ Write-Host "SKIP hash differs: $($pair[0])"; continue }
  $needle = [IO.Path]::GetFileName($pair[0]); $refs=@()
  Get-ChildItem $Root -Recurse -File | Where-Object { $textExt -contains $_.Extension.ToLower() } | ForEach-Object {
    try{ if($_.Name -match 'manifest|UPDATE_FILE_LIST|SHA256SUMS|容量監査'){ return }; if(Select-String -Path $_.FullName -SimpleMatch $needle -Quiet){$refs += $_.FullName} }catch{}
  }
  if($refs.Count -gt 0){ Write-Host "KEEP referenced: $($pair[0])"; continue }
  $size=(Get-Item $legacy).Length; $freed += $size
  if($Apply){ Remove-Item -LiteralPath $legacy -Force; Write-Host "DELETED $($pair[0]) ($size bytes)" }
  else{ Write-Host "CAN DELETE $($pair[0]) ($size bytes)" }
}
Write-Host ("Reclaimable/deleted: {0:N2} MB" -f ($freed/1MB))
