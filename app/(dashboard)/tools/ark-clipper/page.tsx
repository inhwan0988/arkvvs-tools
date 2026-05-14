import Link from "next/link";

const DOWNLOADS = {
  mac: { url: "", available: false },
  windows: {
    url: "https://drive.google.com/drive/folders/16whnTS5lZMaVo6roRl8rnOfziRwvFkUm?usp=sharing",
    available: true,
  },
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
        <h2 className="text-base font-bold text-ink mb-4">📥 다운로드</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DownloadCard
            os="Mac"
            emoji="💻"
            description="Apple Silicon · Intel"
            url={DOWNLOADS.mac.url}
            available={DOWNLOADS.mac.available}
            filename=".dmg"
          />
          <DownloadCard
            os="Windows"
            emoji="🖥️"
            description="Windows 10/11 64bit"
            url={DOWNLOADS.windows.url}
            available={DOWNLOADS.windows.available}
            filename=".exe"
          />
        </div>

        <p className="mt-3 text-xs text-mute">
          모든 영상 처리는 본인 PC에서 진행되어 개인정보 유출 위험이 없습니다.
          파일 용량이 약 10GB 정도 됩니다.
        </p>
      </section>

      {/* 처음 설치 */}
      <section className="mb-12">
        <h2 className="text-base font-bold text-ink mb-4">
          📦 처음 설치 (한 번만)
        </h2>
        <ol className="space-y-3 text-sm text-sub">
          <Step n={1}>
            위 <b>Windows 다운로드</b> 클릭 → 구글 드라이브 폴더에서 ZIP 파일
            받기 (약 10GB, 인터넷 속도에 따라 10~60분)
          </Step>
          <Step n={2}>
            받은 ZIP 파일 <b>우클릭 → &ldquo;압축 풀기&rdquo;</b>
          </Step>
          <Step n={3}>
            풀린 폴더 안의 <b>start.bat</b> 더블클릭
            <span className="block text-xs text-mute mt-1">
              Windows 보안 경고가 뜨면 &ldquo;추가 정보 → 실행&rdquo; 클릭
            </span>
          </Step>
          <Step n={4}>
            검은 창이 뜨고 약 5초 후 브라우저가 자동으로 열립니다
          </Step>
          <Step n={5}>
            우상단 API 키 입력칸에{" "}
            <code className="px-1.5 py-0.5 rounded bg-chip text-ink text-[12px] font-mono">
              sk-ant-api03-...
            </code>{" "}
            형태의 키를 붙여넣으면 준비 완료
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
        <h2 className="text-base font-bold text-ink mb-4">🔑 API 키 발급 (1회)</h2>
        <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
          <p className="text-sm text-sub mb-4 leading-relaxed">
            Ark Clipper는 본인 Anthropic 계정의 API 키를 사용합니다. 키는 본인
            브라우저에만 저장되며 외부 노출 위험이 없습니다.
          </p>
          <ol className="space-y-2.5 text-sm text-sub">
            <Step n={1}>
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand underline underline-offset-2"
              >
                console.anthropic.com
              </a>{" "}
              가입
            </Step>
            <Step n={2}>결제 카드 등록 → $5~$10 충전 (영상 1개당 $0.05~$0.20 소모)</Step>
            <Step n={3}>
              <b>Settings → API Keys → Create Key</b>
            </Step>
            <Step n={4}>
              <code className="px-1.5 py-0.5 rounded bg-chip text-ink text-[12px] font-mono">
                sk-ant-api03-...
              </code>{" "}
              형태의 키 복사 (한 번만 보임)
            </Step>
            <Step n={5}>앱 실행 후 우상단 입력칸에 붙여넣기</Step>
          </ol>
        </div>
      </section>

      {/* 사용 흐름 */}
      <section className="mb-12">
        <h2 className="text-base font-bold text-ink mb-4">
          ▶️ 매번 사용할 때
        </h2>
        <ol className="space-y-2.5 text-sm text-sub">
          <Step n={1}>풀어둔 폴더 안의 <b>start.bat</b> 더블클릭</Step>
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
            <li>• API 키는 본인 브라우저 localStorage에만 저장 (서버 X)</li>
            <li>• 영상/자막/클립 파일은 본인 PC에 저장 (외부 업로드 없음)</li>
            <li>• Claude API에는 전사 텍스트만 전송 (영상 파일 X)</li>
            <li>• 비용은 본인 Anthropic 계정에서 직접 차감</li>
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
