$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Pause-Exit([string]$Message) {
    Write-Host ""
    Write-Host $Message -ForegroundColor Yellow
    Read-Host "Enterキーで終了"
    exit 1
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " SKDG GitHub 更新ツール" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "対象フォルダ: $PSScriptRoot"
Write-Host ""

# Git確認
try {
    $gitVersion = git --version 2>$null
} catch {
    Pause-Exit "Gitが見つかりません。先にGit for Windowsをインストールしてください。"
}
if (-not $gitVersion) { Pause-Exit "Gitが見つかりません。" }
Write-Host "Git: $gitVersion" -ForegroundColor Green

# Gitリポジトリ初期化
$inside = $false
try {
    $inside = ((git rev-parse --is-inside-work-tree 2>$null) -eq 'true')
} catch { $inside = $false }
if (-not $inside) {
    Write-Host "Gitリポジトリが未初期化です。git init を実行します。" -ForegroundColor Yellow
    git init
    git branch -M main
}

# ユーザー情報
$name = git config user.name
$email = git config user.email
if ([string]::IsNullOrWhiteSpace($name)) {
    $name = Read-Host "GitHubで使用する名前を入力してください"
    if ([string]::IsNullOrWhiteSpace($name)) { Pause-Exit "名前が入力されていません。" }
    git config user.name "$name"
}
if ([string]::IsNullOrWhiteSpace($email)) {
    $email = Read-Host "GitHubで使用するメールアドレスを入力してください"
    if ([string]::IsNullOrWhiteSpace($email)) { Pause-Exit "メールアドレスが入力されていません。" }
    git config user.email "$email"
}

# origin確認・設定
$remote = $null
try { $remote = git remote get-url origin 2>$null } catch { $remote = $null }
if ([string]::IsNullOrWhiteSpace($remote)) {
    Write-Host ""
    Write-Host "GitHubリポジトリのURLがまだ登録されていません。" -ForegroundColor Yellow
    Write-Host "例: https://github.com/USERNAME/REPOSITORY.git"
    $remote = Read-Host "GitHubリポジトリURLを貼り付けてください"
    if ([string]::IsNullOrWhiteSpace($remote)) { Pause-Exit "リポジトリURLが入力されていません。" }
    git remote add origin "$remote"
}
Write-Host "GitHub: $remote" -ForegroundColor Green

# ブランチ確認
$branch = (git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
    git checkout -B main
    $branch = 'main'
}
Write-Host "ブランチ: $branch" -ForegroundColor Green

# 変更確認
Write-Host ""
Write-Host "========== GitHubへ送る変更候補 ==========" -ForegroundColor Cyan
$status = git status --short
if ($status) {
    $status | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "ローカルの未コミット変更はありません。" -ForegroundColor Green
}
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "注意: GitHub Pagesを有効にするとWeb公開される場合があります。" -ForegroundColor Yellow
Write-Host "data / database / references 等に公開してはいけない情報がないか、上の一覧を確認してください。" -ForegroundColor Yellow
Write-Host ""
$answer = Read-Host "上記を確認し、GitHubへ更新しますか？ (Y/N)"
if ($answer -notmatch '^[Yy]$') {
    Write-Host "キャンセルしました。ファイルは変更していません。" -ForegroundColor Yellow
    Read-Host "Enterキーで終了"
    exit 0
}

# ステージ
if ($status) {
    git add -A
    Write-Host ""
    Write-Host "========== ステージ済み変更 ==========" -ForegroundColor Cyan
    git diff --cached --stat
    Write-Host "=======================================" -ForegroundColor Cyan

    # バージョン取得
    $version = 'current'
    $versionFile = Join-Path $PSScriptRoot 'VERSION.json'
    if (Test-Path $versionFile) {
        try {
            $json = Get-Content $versionFile -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($json.version) { $version = $json.version }
        } catch {}
    }
    $defaultMessage = "Update SKDG v$version"
    $message = Read-Host "コミットメッセージ（空欄なら '$defaultMessage'）"
    if ([string]::IsNullOrWhiteSpace($message)) { $message = $defaultMessage }

    # staged changeがある場合だけcommit
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m "$message"
    }
}

# push
Write-Host ""
Write-Host "GitHubへpushします..." -ForegroundColor Cyan
try {
    git push -u origin "$branch"
} catch {
    Write-Host ""
    Write-Host "pushに失敗しました。GitHub側に先行コミットがある可能性があります。" -ForegroundColor Red
    Write-Host "自動で強制pushは行いません。画面をスクリーンショットで共有してください。" -ForegroundColor Yellow
    Read-Host "Enterキーで終了"
    exit 1
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host " GitHubへの更新が完了しました。" -ForegroundColor Green
Write-Host " Remote : $remote" -ForegroundColor Green
Write-Host " Branch : $branch" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Read-Host "Enterキーで終了"
