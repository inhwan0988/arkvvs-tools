import Link from "next/link";

// GitHub Releases 직접 다운로드 URL — 클릭 시 즉시 다운로드 시작
// ark-clipper- 레포가 public이라 비로그인 사용자도 받을 수 있음
const APP_VERSION = "0.3.1";
const DOWNLOADS = {
  mac: {
    url: `https://github.com/inhwan0988/ark-clipper-/releases/download/v${APP_VERSION}/Ark-Clipper-${APP_VERSION}-arm64.dmg`,
    available: true,
  },
  macIntel: {
    url: `https://github.com/inhwan0988/ark-clipper-/releases/download/v${APP_VERSION}/Ark-Clipper-${APP_VERSION}.dmg`,
    available: true,
  },
  windows: {
    url: `https://github.com/inhwan0988/ark-clipper-/releases/download/v${APP_VERSION}/Ark-Clipper-Setup-${APP_VERSION}.exe`,
    available: true,
  },
} as const;

// "기존 사용자가 더블클릭 1번으로 완전 삭제 + 재설치" — main 브랜치에 항상 최신본 유지
const CLEAN_INSTALL = {
  mac: "https://raw.githubusercontent.com/inhwan0988/ark-clipper-/main/scripts/clean-install.command",
  windows: "https://raw.githubusercontent.com/inhwan0988/ark-clipper-/main/scripts/clean-install.bat",
} as const;

export default function ArkClipperPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 sm:py-12">
      <div className="mb-2">
        <Link
          href="/"
          className="text-xs font-semibold text-sub hover:text-ink"
        >
          ← 대시보드
        </Link>
      </div>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-xl2 bg-dangerSoft flex items-center justify-center text-3xl">
            ✂️
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              Ark Clipper
            </h1>
            <p className="text-sm text-sub mt-0.5">
              롱폼 YouTube → AI가 알아서 쇼츠 5-6개 만들어주는 데스크탑 앱
            </p>
          </div>
        </div>
      </header>

      {/* 다운로드 섹션 */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-ink">📥 다운로드</h2>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brandSoft text-brand">
            v{APP_VERSION}
          </span>
        </div>

        {/* 변경사항 (v0.3.1 — 2026-05-26 빌드) */}
        <div className="mb-4 rounded-xl2 border border-brand/30 bg-brandSoft/40 p-4">
          <p className="text-[11px] font-bold text-brand uppercase tracking-wider mb-2">
            ✨ NEW in v{APP_VERSION} (2026-05-26 빌드)
          </p>
          <ul className="space-y-1 text-[13px] text-sub leading-relaxed">
            <li>• <b>🎬 캡컷 반자동 편집 모드 추가</b> — 우상단 버튼으로 mp3 업로드 → 자막 + 무음 컷 + 포인트 자막 + 효과음 자동 생성 (BETA)</li>
            <li>• <b>🔧 자동 업데이트 실제로 작동 fix</b> — 그동안 macOS는 .zip 누락으로 자동 업데이트가 작동 안 했어요. 이번 한 번만 수동으로 받으시면 다음부터 백그라운드 자동 업데이트 정상 동작</li>
            <li>• <b>업데이트 진행률 명확히 표시</b> — 새 버전 발견 시 다이얼로그, 별도 진행률 창, dock/taskbar progress bar</li>
            <li>• Claude 모델 fallback chain (claude-sonnet-4-5 → 3-5-latest → 3-5-20241022) — 외부 사용자 모델 404 사전 차단</li>
          </ul>
        </div>

        {/* 기존 사용자 깔끔 재설치 안내 */}
        <div className="mb-4 rounded-xl2 border border-warn/30 bg-warnSoft/40 p-4">
          <p className="text-[11px] font-bold text-warn uppercase tracking-wider mb-2">
            ⚠️ 기존 v0.2.x 사용자께
          </p>
          <p className="text-[13px] text-sub leading-relaxed mb-2">
            v0.2.x 모든 버전에서 macOS 자동 업데이트가 작동하지 않는 버그가 있었어요. <b>이번 한 번만 수동으로 받아주세요</b>. v0.3.1부터는 자동 업데이트가 정상 작동합니다.
          </p>
          <p className="text-[13px] text-sub leading-relaxed">
            깨끗하게 초기화 후 재설치하고 싶다면 아래 자동 스크립트를 다운로드 + 더블클릭하면 끝:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={CLEAN_INSTALL.mac}
              download="clean-install.command"
              className="text-[12px] font-bold px-3 py-1.5 rounded-lg bg-warn/20 text-warn hover:bg-warn/30 transition"
            >
              🍎 Mac 자동 삭제 스크립트 (.command)
            </a>
            <a
              href={CLEAN_INSTALL.windows}
              download="clean-install.bat"
              className="text-[12px] font-bold px-3 py-1.5 rounded-lg bg-warn/20 text-warn hover:bg-warn/30 transition"
            >
              🪟 Windows 자동 삭제 스크립트 (.bat)
            </a>
          </div>
          <p className="text-[11px] text-mute mt-2">
            ⚠️ 그냥 위에서 dmg/exe 받아서 덮어쓰기 설치해도 됩니다 (데이터 보존). 위 스크립트는 완전 초기화용.
          </p>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DownloadCard
            os="Mac (Apple Silicon)"
            emoji="💻"
            description="M1 / M2 / M3 / M4"
            url={DOWNLOADS.mac.url}
            available={DOWNLOADS.mac.available}
            filename=".dmg"
          />
          <DownloadCard
            os="Mac (Intel)"
            emoji="🖥️"
            description="Intel x64 Mac"
            url={DOWNLOADS.macIntel.url}
            available={DOWNLOADS.macIntel.available}
            filename=".dmg"
          />
          <DownloadCard
            os="Windows"
            emoji="🪟"
            description="Windows 10/11 64bit"
            url={DOWNLOADS.windows.url}
            available={DOWNLOADS.windows.available}
            filename=".exe"
          />
        </div>

        <p className="mt-3 text-xs text-mute">
          모든 영상 처리는 본인 PC에서 진행되어 개인정보 유출 위험이 없습니다.
          설치 파일 약 320~335MB. <b>자동 업데이트 지원</b> — 이번 한 번만 받으면 다음부터 앱이 알아서 새 버전을 가져와요.
        </p>
      </section>

      {/* 처음 설치 */}
      <section className="mb-12">
        <h2 className="text-base font-bold text-ink mb-4">
          📦 처음 설치 (한 번만)
        </h2>
        <ol className="space-y-3 text-sm text-sub">
          <Step n={1}>
            위 <b>다운로드</b> 클릭 → 본인 OS에 맞는 인스톨러 받기 (약 275MB)
          </Step>
          <Step n={2}>
            <b>Mac:</b> .dmg 더블클릭 → 창 안의 Ark Clipper 아이콘을{" "}
            <b>Applications 폴더로 드래그</b>
            <span className="block text-xs text-mute mt-1">
              Windows: .exe 더블클릭 → 인스톨러 따라서 설치
            </span>
          </Step>
          <Step n={3}>
            <b>Mac:</b> Applications에서 Ark Clipper{" "}
            <b>우클릭 → &ldquo;열기&rdquo;</b> (첫 실행만, 그 뒤로는 일반
            실행)
            <span className="block text-xs text-mute mt-1">
              Windows: SmartScreen 경고 뜨면 &ldquo;추가 정보 → 실행&rdquo;
              클릭
            </span>
          </Step>
          <Step n={4}>
            앱 창이 뜨면 우상단에 API 키 두 개 입력 → 저장
            <span className="block text-xs text-mute mt-1">
              Anthropic 키 (sk-ant-...) + OpenAI 키 (sk-...) 둘 다 필요
            </span>
          </Step>
          <Step n={5}>
            YouTube URL 붙여넣기 → &ldquo;쇼츠 만들기&rdquo; 클릭 → 준비 완료
          </Step>
        </ol>
      </section>

      {/* 핵심 기능 */}
      <section className="mb-12">
        <h2 className="text-base font-bold text-ink mb-4">✨ 핵심 기능</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Feature emoji="🤖" title="AI 후킹 분석">
            Claude AI가 영상에서 가장 바이럴 가능성 높은 5-6개 구간을 자동
            추출
          </Feature>
          <Feature emoji="🎙️" title="한국어 음성 인식">
            Whisper large-v3로 단어별 타임스탬프 정확하게 추출
          </Feature>
          <Feature emoji="📱" title="9:16 자동 변환">
            세로형 쇼츠로 자동 크롭 + 레터박스 옵션
          </Feature>
          <Feature emoji="🎨" title="디자인 커스텀">
            폰트/색상/위치/외곽선/배경 자유롭게 조정
          </Feature>
          <Feature emoji="✂️" title="타임라인 에디터">
            영상 보면서 시작/끝 시간 정밀 조정
          </Feature>
          <Feature emoji="📥" title="MP4 / ZIP 다운로드">
            개별 또는 전체 한 번에 받기
          </Feature>
        </div>
      </section>

      {/* 시스템 요구사항 */}
      <section className="mb-12">
        <h2 className="text-base font-bold text-ink mb-4">⚙️ 시스템 요구사항</h2>
        <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
          <ul className="space-y-2.5 text-sm text-sub">
            <li>
              <span className="font-bold text-ink">OS:</span> Mac (Apple Silicon
              권장) 또는 Windows 10/11 64bit
            </li>
            <li>
              <span className="font-bold text-ink">메모리:</span> 8GB 이상 권장
            </li>
            <li>
              <span className="font-bold text-ink">디스크:</span> 10GB 이상
              여유공간 (Whisper 모델 + 영상 처리용)
            </li>
            <li>
              <span className="font-bold text-ink">GPU:</span>{" "}
              <span>NVIDIA GPU(Win) 또는 Apple Silicon(Mac) 권장 — 없으면 음성 인식이 느림</span>
            </li>
            <li>
              <span className="font-bold text-ink">인터넷:</span> YouTube 다운로드
              + Claude API 호출 시
            </li>
          </ul>
        </div>
      </section>

      {/* API 키 발급 */}
      <section className="mb-12">
        <h2 className="text-base font-bold text-ink mb-4">
          🔑 API 키 발급 (1회, 두 개 필요)
        </h2>
        <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card mb-3">
          <p className="text-sm font-bold text-ink mb-1">
            1️⃣ Anthropic 키 (Claude AI 분석용)
          </p>
          <ol className="space-y-2 text-sm text-sub mt-3">
            <Step n={1}>
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand underline underline-offset-2"
              >
                console.anthropic.com
              </a>{" "}
              가입 + 결제 카드 등록 + $5~$10 충전
            </Step>
            <Step n={2}>
              <b>Settings → API Keys → Create Key</b> →{" "}
              <code className="px-1.5 py-0.5 rounded bg-chip text-ink text-[12px] font-mono">
                sk-ant-api03-...
              </code>{" "}
              복사
            </Step>
            <Step n={3}>앱 실행 후 우상단 첫 번째 칸에 붙여넣기</Step>
          </ol>
          <p className="text-xs text-mute mt-3">
            영상 1개당 약 $0.05~$0.20 (Claude 분석 비용)
          </p>
        </div>

        <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
          <p className="text-sm font-bold text-ink mb-1">
            2️⃣ OpenAI 키 (Whisper 음성 인식용)
          </p>
          <ol className="space-y-2 text-sm text-sub mt-3">
            <Step n={1}>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand underline underline-offset-2"
              >
                platform.openai.com/api-keys
              </a>{" "}
              접속 (구글 계정 가능) + 카드 등록 + $5 충전
            </Step>
            <Step n={2}>
              <b>Create new secret key</b> →{" "}
              <code className="px-1.5 py-0.5 rounded bg-chip text-ink text-[12px] font-mono">
                sk-...
              </code>{" "}
              복사
            </Step>
            <Step n={3}>앱 우상단 두 번째 칸에 붙여넣기</Step>
          </ol>
          <p className="text-xs text-mute mt-3">
            영상 1분당 약 $0.006 (Whisper 음성 인식 비용)
          </p>
        </div>
      </section>

      {/* 사용 흐름 */}
      <section className="mb-12">
        <h2 className="text-base font-bold text-ink mb-4">
          ▶️ 매번 사용할 때
        </h2>
        <ol className="space-y-2.5 text-sm text-sub">
          <Step n={1}>
            <b>Ark Clipper</b> 앱 실행 (Mac: Applications · Windows: 시작
            메뉴)
          </Step>
          <Step n={2}>YouTube URL 붙여넣기 → &ldquo;쇼츠 만들기&rdquo;</Step>
          <Step n={3}>자동 처리 (다운로드 → 음성 인식 → AI 분석, 1~5분)</Step>
          <Step n={4}>AI 추천 후킹 5~6개 검토 → 시간/제목/디자인 조정</Step>
          <Step n={5}>클립 자동 생성 → MP4 개별 또는 ZIP 전체 다운로드</Step>
        </ol>
      </section>

      {/* 개인정보 */}
      <section className="mb-12">
        <div className="rounded-xl2 border border-success/30 bg-successSoft/40 p-5">
          <h3 className="text-sm font-bold text-success mb-2">🔒 개인정보 보호</h3>
          <ul className="space-y-1 text-[13px] text-sub leading-relaxed">
            <li>• API 키는 본인 컴퓨터에만 저장 (서버 X, 외부 공유 X)</li>
            <li>• 영상/자막/클립 파일은 본인 PC에 저장 (외부 업로드 없음)</li>
            <li>• Whisper API에는 음성 데이터, Claude API에는 전사 텍스트만 전송</li>
            <li>• 비용은 본인 Anthropic / OpenAI 계정에서 직접 차감</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function DownloadCard({
  os,
  emoji,
  description,
  url,
  available,
  filename,
}: {
  os: string;
  emoji: string;
  description: string;
  url: string;
  available: boolean;
  filename: string;
}) {
  const inner = (
    <div
      className={`rounded-xl2 border-2 p-5 transition ${
        available
          ? "border-brand bg-surface hover:bg-brandSoft hover:-translate-y-0.5 cursor-pointer shadow-card hover:shadow-pop"
          : "border-line bg-surface opacity-70 cursor-not-allowed"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-bold text-ink">{os}</h3>
            {!available && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-chip text-mute">
                준비 중
              </span>
            )}
          </div>
          <p className="text-xs text-mute">{description}</p>
          <p className="mt-3 text-[13px] font-bold">
            {available ? (
              <span className="text-brand">{filename} 다운로드 →</span>
            ) : (
              <span className="text-mute">곧 추가됩니다</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );

  if (available && url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return <div>{inner}</div>;
}

function Feature({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl2 border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start gap-2.5">
        <span className="text-xl shrink-0">{emoji}</span>
        <div>
          <p className="text-[14px] font-bold text-ink mb-1">{title}</p>
          <p className="text-[13px] text-sub leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-brandSoft text-brand text-[11px] font-bold flex items-center justify-center">
        {n}
      </span>
      <span className="flex-1 pt-0.5">{children}</span>
    </li>
  );
}
