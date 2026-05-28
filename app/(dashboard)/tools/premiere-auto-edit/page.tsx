import Link from "next/link";

const DOWNLOAD_URL = "/downloads/ArkPointsProSetup.exe";
const APP_VERSION = "1.0.0";

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
          v{APP_VERSION} · Windows 데스크탑 앱
        </span>
      </header>

      {/* 다운로드 + 설치 */}
      <section className="mb-10">
        <div className="rounded-xl3 border-2 border-brand bg-brandSoft/40 p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink mb-1">📦 다운로드 &amp; 설치</h2>
          <p className="text-sm text-sub mb-5 leading-relaxed">
            설치파일 하나로 끝! Node.js, Git 등 별도 설치 없이 바로 사용할 수
            있어요.
          </p>

          <a
            href={DOWNLOAD_URL}
            download
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl2 bg-brand text-white font-bold text-base hover:opacity-90 transition shadow-card mb-6"
          >
            ⬇️ Ark Points Pro 다운로드 (Windows · 약 79MB)
          </a>

          <h3 className="text-sm font-bold text-ink mb-3">설치 순서</h3>
          <ol className="space-y-3 text-sm text-sub">
            <Step n={1}>
              위 버튼으로 <code className="px-1.5 py-0.5 rounded bg-chip text-ink text-[12px] font-mono">ArkPointsProSetup.exe</code> 다운로드
            </Step>
            <Step n={2}>
              다운받은 파일 더블클릭 → 설치
              <span className="block text-xs text-mute mt-1">
                &ldquo;알 수 없는 게시자&rdquo; 경고 뜨면 → &ldquo;추가 정보 →
                실행&rdquo;
              </span>
            </Step>
            <Step n={3}>
              <b>Premiere Pro 한 번 재시작</b> (CEP 플러그인 인식용)
            </Step>
            <Step n={4}>
              바탕화면 또는 시작 메뉴에서 <b>&ldquo;Ark Points Pro&rdquo;</b> 실행
            </Step>
            <Step n={5}>
              앱 내 <b>🤖 AI 설정</b> → Claude 또는 Gemini 선택 → API 키 입력
              <span className="block text-xs text-mute mt-1">
                키는 관리자에게 문의
              </span>
            </Step>
          </ol>
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
              <span className="font-bold text-ink">OS:</span> Windows 10/11
              (64bit)
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
