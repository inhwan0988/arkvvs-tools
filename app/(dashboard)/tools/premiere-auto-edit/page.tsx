import Link from "next/link";

// GitHub 최신 릴리스를 못 가져올 때만 쓰는 fallback. 배지 표시용.
const FALLBACK_VERSION = "1.1.2";

const RELEASES_REPO = "hanna0099/Ark-Points-Pro";

// 최신 릴리스 태그를 GitHub API로 조회. 새 버전 릴리스하면 페이지가 자동 갱신됨.
// 1시간 캐시로 unauthenticated rate limit(60/hr)을 넉넉히 피함. 실패 시 fallback.
async function getLatestVersion(): Promise<string> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return FALLBACK_VERSION;
    const data = (await res.json()) as { tag_name?: string };
    // tag_name 이 "v1.1.2" 또는 "1.1.2" 둘 다 올 수 있어 v 접두사 제거 후 통일.
    return data.tag_name?.replace(/^v/, "") || FALLBACK_VERSION;
  } catch {
    return FALLBACK_VERSION;
  }
}

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

export default async function PremiereAutoEditPage() {
  const appVersion = await getLatestVersion();

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
          v{appVersion} · Mac / Windows 데스크탑 앱
        </span>
      </header>

      {/* 다운로드 섹션 */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-ink">📥 다운로드</h2>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brandSoft text-brand">
            v{appVersion}
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
            subtitle="Intel x64 Mac"
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
          <h2 className="text-lg font-bold text-ink mb-1">📋 설치 순서</h2>
          <p className="text-xs text-mute mb-5">
            처음 한 번만 하면 됩니다. 2단계 완료 후 아래 공통 단계로 이어서
            진행하세요.
          </p>

          {/* STEP 1~2: OS별 다운로드 + 설치 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Windows */}
            <div className="rounded-xl2 bg-bg/60 p-4">
              <h3 className="text-sm font-bold text-ink mb-3">🪟 Windows</h3>
              <ol className="space-y-3 text-sm text-sub">
                <Step n={1}>
                  위 <b>Windows</b> 버튼으로 exe 다운로드
                </Step>
                <Step n={2}>
                  파일 더블클릭 → 설치
                  <span className="block text-xs text-mute mt-1">
                    &ldquo;알 수 없는 게시자&rdquo; 경고 → &ldquo;추가 정보 →
                    실행&rdquo;
                  </span>
                </Step>
              </ol>
            </div>

            {/* Mac */}
            <div className="rounded-xl2 bg-bg/60 p-4">
              <h3 className="text-sm font-bold text-ink mb-3">🍎 Mac</h3>
              <ol className="space-y-3 text-sm text-sub">
                <Step n={1}>
                  위 <b>Mac</b> 버튼으로 dmg 다운로드 (본인 칩 확인)
                </Step>
                <Step n={2}>
                  dmg 열고 → <b>Applications 폴더로 드래그</b>
                  <span className="block text-xs text-mute mt-1">
                    &ldquo;확인되지 않은 개발자&rdquo; 뜨면 → 시스템 설정 &gt;
                    개인정보 보호 및 보안 &gt; &ldquo;확인 없이 열기&rdquo;
                  </span>
                </Step>
              </ol>
            </div>
          </div>

          {/* 공통 다음 단계 */}
          <div className="mt-6 pt-6 border-t border-line">
            <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-chip text-sub font-semibold">
                공통
              </span>
              다음 단계
            </h3>

            <ol className="space-y-5">
              <Step n={3}>
                <b>Premiere Pro 완전 종료 후 재시작</b>
                <span className="block text-xs text-mute mt-1">
                  방금 설치한 CEP 플러그인(MCP Bridge)을 Premiere Pro가 인식하려면
                  꼭 한 번 껐다 켜야 해요. (처음 한 번만)
                </span>
              </Step>

              {/* 여기가 사람들이 가장 많이 막히는 지점 — 브랜드 컬러 박스로 강조 */}
              <li className="flex gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center">
                  4
                </span>
                <div className="flex-1 pt-0.5">
                  <div className="text-sm text-ink font-semibold">
                    Premiere Pro에서 <b>MCP Bridge 패널</b> 열기
                  </div>

                  <div className="mt-3 rounded-xl2 border border-brand/25 bg-brandSoft/50 p-4">
                    <div className="text-xs font-semibold text-brand mb-2">
                      상단 메뉴에서 순서대로 클릭
                    </div>
                    <div className="text-sm text-ink font-semibold leading-relaxed break-keep">
                      창 <span className="text-mute mx-0.5">›</span> 확장 프로그램{" "}
                      <span className="text-mute mx-0.5">›</span>{" "}
                      <span className="text-brand">MCP Bridge</span>
                    </div>
                    <div className="text-[11px] text-sub mt-2">
                      영문판: <span className="font-semibold">Window ›
                      Extensions › MCP Bridge</span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-brand/20">
                      <div className="text-[11px] font-bold text-success mb-1">
                        ✅ 성공 표시
                      </div>
                      <div className="text-[12px] text-sub leading-relaxed">
                        패널이 열리고{" "}
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success align-middle" />
                          <span className="font-mono text-[11px] font-semibold text-ink">
                            Running — polling ...
                          </span>
                        </span>{" "}
                        이 보이면 연결 완료.
                      </div>
                      <div className="text-[11px] text-mute mt-1.5">
                        패널은 창 옆에 도킹해두고, 작업이 끝날 때까지 <b>Stop
                        Bridge</b>는 누르지 마세요.
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-brand/20 text-[11px] text-sub leading-relaxed">
                      🚨 <b>MCP Bridge가 메뉴에 안 보이면?</b> Premiere Pro를
                      완전히 종료(⌘Q / Alt+F4)했다가 다시 열어보세요. 3번 단계를
                      건너뛴 경우가 대부분이에요.
                    </div>
                  </div>
                </div>
              </li>

              <Step n={5}>
                <b>Ark Points Pro</b> 앱 실행
                <span className="block text-xs text-mute mt-1">
                  Mac: Launchpad / Applications · Windows: 바탕화면 또는 시작
                  메뉴
                </span>
              </Step>

              <Step n={6}>
                앱 내 <b>🤖 AI 설정</b> → Claude 또는 Gemini 선택 → API 키 입력
                <span className="block text-xs text-mute mt-1">
                  키가 없다면 관리자에게 문의하세요.
                </span>
              </Step>
            </ol>
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
