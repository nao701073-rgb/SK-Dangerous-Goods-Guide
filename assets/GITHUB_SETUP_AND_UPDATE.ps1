$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Wait-And-Exit([string]$Message, [int]$Code) {
    Write-Host ""
    Write-Host $Message
    [void](Read-Host "Press Enter to close")
    exit $Code
}

Write-Host "=============================================="
Write-Host " SKDG GitHub Update Helper v2"
Write-Host "=============================================="
Write-Host ("Project: " + $PSScriptRoot)
Write-Host ""

# Check Git
& git --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Wait-And-Exit "Git was not found. Install Git for Windows first." 1
}

# Initialize repository only when needed
& git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git repository not initialized. Running git init..."
    & git init
    if ($LASTEXITCODE -ne 0) { Wait-And-Exit "git init failed." 1 }
    & git branch -M main
}

# Configure user identity when missing
$name = (& git config user.name 2>$null | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($name)) {
    $name = Read-Host "Git user name"
    if ([string]::IsNullOrWhiteSpace($name)) { Wait-And-Exit "User name is required." 1 }
    & git config user.name $name
    if ($LASTEXITCODE -ne 0) { Wait-And-Exit "Failed to set git user.name." 1 }
}

$email = (& git config user.email 2>$null | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($email)) {
    $email = Read-Host "Git email"
    if ([string]::IsNullOrWhiteSpace($email)) { Wait-And-Exit "Email is required." 1 }
    & git config user.email $email
    if ($LASTEXITCODE -ne 0) { Wait-And-Exit "Failed to set git user.email." 1 }
}

# Check or set origin
$remote = (& git remote get-url origin 2>$null | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($remote)) {
    Write-Host ""
    Write-Host "No GitHub origin is configured."
    Write-Host "Example: https://github.com/USERNAME/REPOSITORY.git"
    $remote = Read-Host "GitHub repository URL"
    if ([string]::IsNullOrWhiteSpace($remote)) { Wait-And-Exit "Repository URL is required." 1 }
    & git remote add origin $remote
    if ($LASTEXITCODE -ne 0) { Wait-And-Exit "Failed to add origin." 1 }
}
Write-Host ("Origin: " + $remote)

# Ensure current branch exists
$branch = (& git branch --show-current 2>$null | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
    & git checkout -B main
    if ($LASTEXITCODE -ne 0) { Wait-And-Exit "Failed to create main branch." 1 }
    $branch = 'main'
}
Write-Host ("Branch: " + $branch)

Write-Host ""
Write-Host "========== Changes that may be uploaded =========="
$status = & git status --short
if ($LASTEXITCODE -ne 0) { Wait-And-Exit "git status failed." 1 }
if ($status) {
    $status | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "No uncommitted local changes."
}
Write-Host "=================================================="
Write-Host ""
Write-Host "IMPORTANT: Check that no confidential/internal-only files are included."
$answer = Read-Host "Continue with add/commit/push? (Y/N)"
if ($answer -notmatch '^[Yy]$') {
    Wait-And-Exit "Cancelled. Nothing was pushed." 0
}

# Stage and commit when there are local changes
if ($status) {
    & git add -A
    if ($LASTEXITCODE -ne 0) { Wait-And-Exit "git add failed." 1 }

    Write-Host ""
    Write-Host "========== Staged summary =========="
    & git diff --cached --stat
    Write-Host "===================================="

    $version = 'current'
    $versionFile = Join-Path $PSScriptRoot 'VERSION.json'
    if (Test-Path -LiteralPath $versionFile) {
        try {
            $json = Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json
            if ($null -ne $json.version -and -not [string]::IsNullOrWhiteSpace([string]$json.version)) {
                $version = [string]$json.version
            }
        } catch {
            $version = 'current'
        }
    }

    $defaultMessage = "Update SKDG v$version"
    $message = Read-Host ("Commit message [Enter = " + $defaultMessage + "]")
    if ([string]::IsNullOrWhiteSpace($message)) { $message = $defaultMessage }

    & git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        & git commit -m $message
        if ($LASTEXITCODE -ne 0) { Wait-And-Exit "git commit failed." 1 }
    }
}

Write-Host ""
Write-Host "Pushing to GitHub..."
& git push -u origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Push failed. Do NOT force-push."
    Write-Host "The remote may contain commits that are not in this local copy."
    Wait-And-Exit "Take a screenshot of this window and share it before continuing." 1
}

Write-Host ""
Write-Host "=============================================="
Write-Host " GitHub update completed successfully."
Write-Host (" Origin: " + $remote)
Write-Host (" Branch: " + $branch)
Write-Host "=============================================="
[void](Read-Host "Press Enter to close")
