#!/bin/bash
# joshua Mac에서 실행 — 직원 셋업용 임시 server.
# 사용: bash scripts/team-onboard-host.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  👥 ARK Tools 팀 셋업 - 호스트 (joshua)      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 1) .env.local 가져옴 (Vercel CLI)
echo "[1/3] Vercel에서 dev 환경변수 받는 중..."
npx -y vercel@latest env pull .env.local --environment=development 2>&1 | tail -3

if [ ! -f .env.local ]; then
  echo "❌ .env.local 생성 실패. vercel CLI 인증 상태 확인."
  exit 1
fi
echo "✓ .env.local 준비됨 ($(wc -l < .env.local) lines)"

# 2) 같은 와이파이 IP 출력
echo ""
echo "[2/3] Mac IP 주소..."
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "?")
echo "  Mac IP: ${LOCAL_IP}"

if [ "$LOCAL_IP" = "?" ]; then
  echo "  ⚠️  자동 감지 실패. 시스템 설정 → Wi-Fi에서 직접 확인하세요."
fi

# 3) 직원에게 보낼 한 줄 명령 출력
SCRIPT_URL="http://${LOCAL_IP}:8000/scripts/team-setup.ps1"
ENV_URL="http://${LOCAL_IP}:8000/.env.local"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  📨 직원에게 카톡/슬랙으로 보낼 명령:        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Windows PowerShell에 그대로 붙여넣고 Enter:"
echo ""
echo "  \$env:ARK_ENV_URL='${ENV_URL}'; iwr ${SCRIPT_URL} -OutFile setup.ps1; powershell -ExecutionPolicy Bypass -File setup.ps1"
echo ""
echo "(직원 PC에서 한 줄만 실행하면 자동으로 다 셋업됩니다)"
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  [3/3] HTTP server 시작 - Ctrl+C로 종료       ║"
echo "║  (직원 두 명 다 받으면 종료하세요)            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 4) 같은 디렉토리에서 http server
python3 -m http.server 8000
