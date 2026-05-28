# ARK Tools — Windows 직원 자동 셋업 스크립트
# 사용: PowerShell에서 joshua가 준 한 줄 명령으로 다운로드 + 실행됨

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "" -ForegroundColor Cyan
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🎬 ARK Tools 자동 셋업 (5-10분)             ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ━ Step 1: 필수 도구 설치 ━
Write-Host "[1/5] GitHub CLI + Node.js 설치 중..." -ForegroundColor Yellow

function Install-IfMissing($id, $name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "  → $name 설치 중..."
        winget install --id $id -e --silent --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null
    } else {
        Write-Host "  ✓ $name 이미 있음"
    }
}

Install-IfMissing "GitHub.cli" "gh"
Install-IfMissing "OpenJS.NodeJS.LTS" "node"

# PATH 갱신 (현재 세션)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")

# ━ Step 2: GitHub 로그인 ━
Write-Host ""
Write-Host "[2/5] GitHub 로그인..." -ForegroundColor Yellow
Write-Host "  → 브라우저에서 본인 GitHub 계정으로 인증해주세요" -ForegroundColor Cyan

$ghStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    gh auth login --hostname github.com --git-protocol https --web
} else {
    Write-Host "  ✓ 이미 로그인됨"
}

# ━ Step 3: repo clone ━
Write-Host ""
Write-Host "[3/5] arkvvs-tools repo 받기..." -ForegroundColor Yellow

$REPO_DIR = "$HOME\arkvvs-tools"
if (Test-Path $REPO_DIR) {
    Write-Host "  → 이미 있음. git pull로 최신화..."
    Set-Location $REPO_DIR
    git pull origin main
} else {
    gh repo clone inhwan0988/arkvvs-tools $REPO_DIR
    Set-Location $REPO_DIR
}

# ━ Step 4: 의존성 설치 ━
Write-Host ""
Write-Host "[4/5] npm install (시간 좀 걸려요, 1-3분)..." -ForegroundColor Yellow
npm install --no-audit --no-fund

# ━ Step 5: .env.local 받기 ━
Write-Host ""
Write-Host "[5/5] 환경변수 (.env.local) 받기..." -ForegroundColor Yellow

$ENV_URL = $env:ARK_ENV_URL
if ([string]::IsNullOrEmpty($ENV_URL)) {
    Write-Host "  ⚠️  ARK_ENV_URL 환경변수가 없어요." -ForegroundColor Red
    Write-Host "     joshua가 알려준 URL을 입력하세요 (예: http://192.168.0.15:8000/.env.local):"
    $ENV_URL = Read-Host "  URL"
}

try {
    Invoke-WebRequest -Uri $ENV_URL -OutFile "$REPO_DIR\.env.local" -UseBasicParsing
    Write-Host "  ✓ .env.local 받음"
} catch {
    Write-Host "  ❌ 받기 실패: $_" -ForegroundColor Red
    Write-Host "     joshua에게 다시 URL 확인 요청하세요"
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ 셋업 완료!                                ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  다음:                                       ║" -ForegroundColor Green
Write-Host "║                                              ║" -ForegroundColor Green
Write-Host "║  1) 새 PowerShell 창 열기                    ║" -ForegroundColor Green
Write-Host "║  2) cd ~/arkvvs-tools                        ║" -ForegroundColor Green
Write-Host "║  3) claude  ← Claude Code 실행                ║" -ForegroundColor Green
Write-Host "║                                              ║" -ForegroundColor Green
Write-Host "║  자동으로 CLAUDE.md 로드돼서                 ║" -ForegroundColor Green
Write-Host "║  ARK Tools 도메인 컨벤션 적용됩니다           ║" -ForegroundColor Green
Write-Host "║                                              ║" -ForegroundColor Green
Write-Host "║  웹앱 테스트:                                ║" -ForegroundColor Green
Write-Host "║   npm run dev                                ║" -ForegroundColor Green
Write-Host "║   → http://localhost:3000                    ║" -ForegroundColor Green
Write-Host "║   → 본인 Google 계정으로 로그인               ║" -ForegroundColor Green
Write-Host "║   → joshua에게 승인 요청                      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "막히는 부분 있으면 #dev 채널에서 물어봐요!" -ForegroundColor Cyan
