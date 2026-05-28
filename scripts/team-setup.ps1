# ARK Tools - Windows Team Auto-Setup
# Usage: one-line command from joshua's Mac, paste into PowerShell

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Force UTF-8 console
chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  ARK Tools Auto-Setup (5-10 min)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---------- Step 1: Install tools ----------
Write-Host "[1/5] Installing GitHub CLI + Node.js..." -ForegroundColor Yellow

function Install-IfMissing($id, $name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host ("  -> Installing {0}..." -f $name)
        winget install --id $id -e --silent --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null
    } else {
        Write-Host ("  OK {0} already installed" -f $name)
    }
}

Install-IfMissing "GitHub.cli" "gh"
Install-IfMissing "OpenJS.NodeJS.LTS" "node"

# Refresh PATH (current session)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")

# ---------- Step 2: GitHub login ----------
Write-Host ""
Write-Host "[2/5] GitHub login..." -ForegroundColor Yellow
Write-Host "  -> Browser will open. Sign in with your GitHub account." -ForegroundColor Cyan

$ghStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    gh auth login --hostname github.com --git-protocol https --web
} else {
    Write-Host "  OK already logged in"
}

# ---------- Step 3: Clone repo ----------
Write-Host ""
Write-Host "[3/5] Cloning arkvvs-tools repo..." -ForegroundColor Yellow

# Use Join-Path to avoid PowerShell escape-sequence issues (e.g.  being interpreted)
$REPO_DIR = Join-Path -Path $HOME -ChildPath "arkvvs-tools"
Write-Host ("  -> Repo path: {0}" -f $REPO_DIR)

if (Test-Path -Path $REPO_DIR) {
    Write-Host "  -> Already exists. Pulling latest..."
    Set-Location -Path $REPO_DIR
    git pull origin main
} else {
    gh repo clone inhwan0988/arkvvs-tools $REPO_DIR
    Set-Location -Path $REPO_DIR
}

# ---------- Step 4: npm install ----------
Write-Host ""
Write-Host "[4/5] npm install (takes 1-3 min)..." -ForegroundColor Yellow
npm install --no-audit --no-fund

# ---------- Step 5: .env.local ----------
Write-Host ""
Write-Host "[5/5] Downloading .env.local..." -ForegroundColor Yellow

$ENV_URL = $env:ARK_ENV_URL
if ([string]::IsNullOrEmpty($ENV_URL)) {
    Write-Host "  WARNING: ARK_ENV_URL not set." -ForegroundColor Red
    Write-Host "     Ask joshua for the URL (e.g. http://192.168.0.57:8000/.env.local):"
    $ENV_URL = Read-Host "  URL"
}

$ENV_TARGET = Join-Path -Path $REPO_DIR -ChildPath ".env.local"

try {
    Invoke-WebRequest -Uri $ENV_URL -OutFile $ENV_TARGET -UseBasicParsing
    Write-Host "  OK .env.local downloaded"
} catch {
    Write-Host ("  ERROR: Failed - {0}" -f $_) -ForegroundColor Red
    Write-Host "     Ask joshua for the URL again"
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  DONE!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host ""
Write-Host "  1) Open a NEW PowerShell window" -ForegroundColor White
Write-Host ("  2) cd {0}" -f $REPO_DIR) -ForegroundColor White
Write-Host "  3) claude  (start Claude Code)" -ForegroundColor White
Write-Host ""
Write-Host "Web app test:" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor White
Write-Host "  -> http://localhost:3000" -ForegroundColor White
Write-Host "  -> Sign in with your Google account" -ForegroundColor White
Write-Host "  -> Ask joshua to approve your account" -ForegroundColor White
Write-Host ""
Write-Host "Stuck? Ask in #dev channel!" -ForegroundColor Cyan
