import Link from "next/link";

// 표시용 라벨(배지)에만 쓰임. 다운로드 링크는 버전과 무관하게 항상 최신을 가리킴.
const APP_VERSION = "1.1.2";

// GitHub releases/latest/download/ 는 항상 최신 릴리스의 에셋으로 리다이렉트됨.
// 파일명에 버전이 없는 고정 이름이라 새 버전이 나와도 링크를 바꿀 필요가 없음.
const RELEASE_BASE =
  "https://github.com/hanna0099/Ark-Points-Pro/releases/latest/download";
const DOWNLOADS = {
  mac: {
    url: `${RELEASE_BASE}/Ark.Points.Pro-Setup-arm64.dmg`,
    available: true,
  },
  macIntel: {
    url: `${RELEASE_BASE}/Ark.Points.Pro-Setup-x64.dmg`,
    available: true,
  },
  windows: {
    url: `${RELEASE_BASE}/Ark.Points.Pro-Setup-x64.exe`,
    available: true,
  },
} as const;

export default function PremiereAutoEditPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 sm:py-12">
      <div className="mb-2">
        <Link href="/" className="text-xs font-semibold text-sub hover:text-ink">
          ← 대시보드
        </Link>
      </div>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-xl2 bg-brandSoft flex items-center justify-center text-3xl">
            ✂️
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              프리미어프로 반자동 편집
            </h1>
            <p className="text-sm text-sub mt-0.5">
              Vrew SRT → 포인트 자막 + 효과음 → Premiere Pro 자동 반영
            </p>
          </div>
        </div>
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-chip text-sub text-[11px] font-semibold">
          v{APP_VERSION} · Mac / Windows 데스크탑 앱
        </span>
      </header>

      {/* 다운로드 섹션 */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-ink">📥 다운로드</h2>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brandSoft text-brand">
            v{APP_VERSION}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DownloadCard
            title="Mac (Apple Silicon)"
            subtitle="M1 / M2 / M3 / M4"
            href={DOWNLOADS.mac.url}
            ext=".dmg"
          />
          <DownloadCard
            title="Mac (Intel)"
            subtitle="2020 이전 Mac"
            href={DOWNLOADS.macIntel.url}
            ext=".dmg"
          />
          <DownloadCard
            title="Windows"
            subtitle="Windows 10/11 (64bit)"
            href={DOWNLOADS.windows.url}
            ext=".exe"
          />
        </div>

        <p className="text-[12px] text-mute mt-3">
          설치파일 하나로 끝! Node.js, Git 등 별도 설치 없이 바로 사용할 수 있어요.
        </p>
      </section>

      {/* 설치 안내 */}
      <section className="mb-12">
        <div className="rounded-xl3 border border-line bg-surface p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink mb-4">📋 설치 순서</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Windows */}
            <div>
              <h3 className="text-sm font-bold text-ink mb-3">🪟 Windows</h3>
              <ol className="space-y-3 text-sm text-sub">
                <Step n={1}>
                  위 <b>Windows</b> 버튼으로 exe 다운로드
                </Step>
                <Step n={2}>
                  다운받은 파일 더블클릭 → 설치
                  <span className="block text-xs text-mute mt-1">
                    &ldquo;알 수 없는 게시자&rdquo; 경고 뜨면 → &ldquo;추가 정보 →
                    실행&rdquo;
                  </span>
                </Step>
                <Step n={3}>
                  <b>Premiere Pro 재시작</b> (CEP 플러그인 인식용)
                </Step>
                <Step n={4}>
                  바탕화면에서 <b>&ldquo;Ark Points Pro&rdquo;</b> 실행
                </Step>
              </ol>
            </div>

            {/* Mac */}
            <div>
              <h3 className="text-sm font-bold text-ink mb-3">🍎 Mac</h3>
              <ol className="space-y-3 text-sm text-sub">
                <Step n={1}>
                  위 <b>Mac</b> 버튼으로 dmg 다운로드 (본인 칩 확인)
                </Step>
                <Step n={2}>
                  dmg 열고 → Applications 폴더로 드래그
                  <span className="block text-xs text-mute mt-1">
                    &ldquo;확인되지 않은 개발자&rdquo; → 시스템 설정 &gt; 보안 &gt;
                    &ldquo;확인 없이 열기&rdquo;
                  </span>
                </Step>
                <Step n={3}>
                  <b>Premiere Pro 재시작</b> (CEP 플러그인 인식용)
                </Step>
                <Step n={4}>
                  Launchpad 또는 Applications에서 <b>Ark Points Pro</b> 실행
                </Step>
              </ol>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-line">
            <Step n={5}>
              앱 내 <b>🤖 AI 설정</b> → Claude 또는 Gemini 선택 → API 키 입력
              <span className="block text-xs text-mute mt-1">
                키는 관리자에게 문의
              </span>
            </Step>
          </div>
        </div>
      </section>

      {/* 사용 흐름 */}
      <section className="mb-12">
        <h2 className="text-base font-bold text-ink mb-4">▶️ 사용 흐름</h2>
        <ol className="space-y-2.5 text-sm text-sub">
          <Step n={1}>Vrew에서 만든 SRT를 Premiere Pro 프로젝트에 임포트</Step>
          <Step n={2}>SRT 자동 감지 → 선택</Step>
          <Step n={3}>AI가 포인트 자막 자동 선별 + 생성 (⭐로 좋은 것 유지, 다시 추천)</Step>
          <Step n={4}>카테고리별 효과음 자동 매칭</Step>
          <Step n={5}>한 번에 Premiere Pro 시퀀스에 자막 + 효과음 자동 반영</Step>
        </ol>
      </section>

      {/* 시스템 요구사항 */}
      <section className="mb-12">
        <h2 className="text-base font-bold text-ink mb-4">⚙️ 요구사항</h2>
        <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
          <ul className="space-y-2.5 text-sm text-sub">
            <li>
              <span className="font-bold text-ink">OS:</span> Mac (Apple
              Silicon 또는 Intel) 또는 Windows 10/11 (64bit)
            </li>
            <li>
              <span className="font-bold text-ink">필수:</span> Premiere Pro
            </li>
            <li>
              <span className="font-bold text-ink">AI:</span> Claude API 키
              (Anthropic) 또는 Gemini 무료 키
            </li>
          </ul>
        </div>
      </section>

      {/* 개인정보 */}
      <section className="mb-12">
        <div className="rounded-xl2 border border-success/30 bg-successSoft/40 p-5">
          <h3 className="text-sm font-bold text-success mb-2">🔒 개인정보 보호</h3>
          <ul className="space-y-1 text-[13px] text-sub leading-relaxed">
            <li>• 프로그램은 본인 PC에서만 실행 (영상/자막/효과음 모두 로컬)</li>
            <li>• API 키는 본인 PC에만 저장 (외부 전송 X)</li>
            <li>• Claude API에는 자막 텍스트만 전송됨</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function DownloadCard({
  title,
  subtitle,
  href,
  ext,
}: {
  title: string;
  subtitle: string;
  href: string;
  ext: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl2 border-2 border-line bg-surface p-5 text-center hover:border-brand hover:bg-brandSoft/30 transition shadow-card"
    >
      <span className="text-sm font-bold text-ink">{title}</span>
      <span className="text-xs text-mute">{subtitle}</span>
      <span className="mt-1 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold">
        ⬇️ {ext}
      </span>
    </a>
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
