import Link from "next/link";

// GitHub Releases 직접 다운로드 URL — 클릭 시 즉시 다운로드 시작
// ark-clipper- 레포가 public이라 비로그인 사용자도 받을 수 있음
const APP_VERSION = "0.4.1";
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

      {/* 다운로드 섹션 */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-ink">📥 다운로드</h2>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brandSoft text-brand">
            v{APP_VERSION}
          </span>
        </div>

        {/* 변경사항 (v0.3.3 — 2026-05-26 빌드) */}
        <div className="mb-4 rounded-xl2 border border-brand/30 bg-brandSoft/40 p-4">
          <p className="text-[11px] font-bold text-brand uppercase tracking-wider mb-2">
            ✨ NEW in v{APP_VERSION} (2026-05-26 빌드)
          </p>
          <ul className="space-y-1 text-[13px] text-sub leading-relaxed">
            <li>• <b>🔔 새 버전 감지 + 안내</b> — 새 버전이 나오면 앱이 자동으로 감지해서 다이얼로그로 알려드려요. "다운로드 페이지 열기" 한 번 클릭으로 이 페이지로 이동</li>
            <li>• <b>macOS는 매번 새 dmg 수동 설치 필요</b> — 코드 서명 정책상 자동 적용 불가. 다이얼로그가 친절하게 안내해줘요</li>
            <li>• <b>Windows는 완전 자동 업데이트</b> — 다운로드/적용/재시작까지 한 번에</li>
            <li>• Claude 모델 fallback chain — 외부 사용자 모델 404 사전 차단</li>
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

      {/* 자주 묻는 질문 (FAQ) */}
      <section className="mb-12">
        <h2 className="text-base font-bold text-ink mb-4">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          <FaqItem question="📦 처음 설치 방법">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl2 border border-line bg-bg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🍎</span>
                  <span className="text-[14px] font-bold text-ink">Mac</span>
                </div>
                <ol className="space-y-3 text-[13px] text-sub">
                  <Step n={1}>
                    본인 칩에 맞는 <b>.dmg</b> 다운로드 (Apple Silicon / Intel)
                  </Step>
                  <Step n={2}>
                    .dmg 더블클릭 → Ark Clipper를{" "}
                    <b>Applications 폴더로 드래그</b>
                  </Step>
                  <Step n={3}>
                    Applications에서 <b>우클릭 → &ldquo;열기&rdquo;</b> (첫
                    실행만)
                  </Step>
                </ol>
              </div>

              <div className="rounded-xl2 border border-line bg-bg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🪟</span>
                  <span className="text-[14px] font-bold text-ink">Windows</span>
                </div>
                <ol className="space-y-3 text-[13px] text-sub">
                  <Step n={1}>
                    <b>.exe</b> 인스톨러 다운로드
                  </Step>
                  <Step n={2}>.exe 더블클릭 → 인스톨러 안내 따라 설치</Step>
                  <Step n={3}>
                    SmartScreen 경고 시{" "}
                    <b>&ldquo;추가 정보 → 실행&rdquo;</b>
                  </Step>
                </ol>
              </div>
            </div>

            <div className="mt-3 rounded-xl2 border border-brand/20 bg-brandSoft/30 p-4">
              <p className="text-[13px] font-bold text-brand mb-3">
                ✅ 설치 후 (Mac · Windows 공통)
              </p>
              <ol className="space-y-3 text-[13px] text-sub">
                <Step n={4}>
                  앱 우상단에 <b>Anthropic 키</b>(sk-ant-…) +{" "}
                  <b>OpenAI 키</b>(sk-…) 둘 다 입력 → 저장
                </Step>
                <Step n={5}>
                  YouTube URL 붙여넣기 → <b>&ldquo;쇼츠 만들기&rdquo;</b> → 준비
                  완료!
                </Step>
              </ol>
            </div>
          </FaqItem>

          <FaqItem question="💰 API 사용 비용은 얼마인가요?">
            <p className="text-[12px] text-mute mb-4">
          본인 API 키 사용 → Anthropic + OpenAI에서 직접 차감. 환율 1,400원/$ 기준 추정값.
        </p>

        {/* 영상 길이별 1편 비용 */}
        <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card mb-3">
          <h3 className="text-sm font-bold text-ink mb-3">
            영상 1편당 처리 비용
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="py-2 pr-3 text-[11px] font-bold text-mute uppercase tracking-wider">
                    영상 길이
                  </th>
                  <th className="py-2 pr-3 text-[11px] font-bold text-mute uppercase tracking-wider">
                    Whisper
                  </th>
                  <th className="py-2 pr-3 text-[11px] font-bold text-mute uppercase tracking-wider">
                    Claude
                  </th>
                  <th className="py-2 pr-3 text-[11px] font-bold text-mute uppercase tracking-wider text-right">
                    총 (₩)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr>
                  <td className="py-2.5 pr-3 font-semibold text-ink">5분</td>
                  <td className="py-2.5 pr-3 text-sub">$0.03 (~42원)</td>
                  <td className="py-2.5 pr-3 text-sub">$0.04 (~56원)</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-brand">
                    약 100원
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-semibold text-ink">10분</td>
                  <td className="py-2.5 pr-3 text-sub">$0.06 (~84원)</td>
                  <td className="py-2.5 pr-3 text-sub">$0.05 (~70원)</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-brand">
                    약 150원
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-semibold text-ink">20분</td>
                  <td className="py-2.5 pr-3 text-sub">$0.12 (~168원)</td>
                  <td className="py-2.5 pr-3 text-sub">$0.07 (~98원)</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-brand">
                    약 270원
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-semibold text-ink">30분</td>
                  <td className="py-2.5 pr-3 text-sub">$0.18 (~252원)</td>
                  <td className="py-2.5 pr-3 text-sub">$0.09 (~126원)</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-brand">
                    약 380원
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-semibold text-ink">60분</td>
                  <td className="py-2.5 pr-3 text-sub">$0.36 (~504원)</td>
                  <td className="py-2.5 pr-3 text-sub">$0.15 (~210원)</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-brand">
                    약 720원
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-semibold text-ink">120분</td>
                  <td className="py-2.5 pr-3 text-sub">$0.72 (~1,008원)</td>
                  <td className="py-2.5 pr-3 text-sub">$0.25 (~350원)</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-brand">
                    약 1,400원
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 월 사용량별 예상 */}
        <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card mb-3">
          <h3 className="text-sm font-bold text-ink mb-3">
            월 사용량별 예상 (평균 15분 영상 기준)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <CostCard count="5개/월" cost="약 1,000원" />
            <CostCard count="20개/월" cost="약 4,000원" />
            <CostCard count="50개/월" cost="약 10,000원" emphasis />
            <CostCard count="100개/월" cost="약 20,000원" />
          </div>
          <p className="text-[11px] text-mute mt-3">
            ⚠️ Whisper는 음성 길이, Claude는 자막 글자 수에 따라 변동. 위는 한국어 평균치 기준.
          </p>
        </div>

        {/* 비교 */}
        <div className="rounded-xl2 border border-success/30 bg-successSoft/40 p-4">
          <h3 className="text-sm font-bold text-success mb-2">
            🆚 다른 서비스 대비
          </h3>
          <ul className="space-y-1.5 text-[12px] text-sub">
            <li>
              <b className="text-ink">OpusClip</b> 월 ₩50,000 (3시간 영상 한도)
            </li>
            <li>
              <b className="text-ink">Vidnoz / Submagic</b> 월 ₩35,000~70,000
              (구독)
            </li>
            <li>
              <b className="text-ink text-success">Ark Clipper</b> 사용한 만큼만
              지불. 영상 100개 (월 25시간)도 약 2만원
            </li>
          </ul>
          <p className="text-[11px] text-mute mt-2 italic">
            ⚠️ 추정값. 실제 비용은 Anthropic / OpenAI 콘솔에서 확인.
          </p>
            </div>
          </FaqItem>

          <FaqItem question="🔒 개인정보는 안전한가요?">
            <ul className="space-y-1 text-[13px] text-sub leading-relaxed">
            <li>• API 키는 본인 컴퓨터에만 저장 (서버 X, 외부 공유 X)</li>
            <li>• 영상/자막/클립 파일은 본인 PC에 저장 (외부 업로드 없음)</li>
            <li>• Whisper API에는 음성 데이터, Claude API에는 전사 텍스트만 전송</li>
            <li>• 비용은 본인 Anthropic / OpenAI 계정에서 직접 차감</li>
          </ul>
          </FaqItem>

          <FaqItem question="⚙️ 시스템 요구사항은 어떻게 되나요?">
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
          </FaqItem>

          <FaqItem question="🆘 결과물이 안 나와요">
            <div className="space-y-3">
          <TroubleItem
            num={1}
            title="API 키 두 개 다 입력했는지 확인"
            chance="90%"
          >
            앱 우상단 설정 (⚙️)에서 <b>Anthropic 키 (sk-ant-로 시작)</b> +{" "}
            <b>OpenAI 키 (sk-로 시작)</b> 둘 다 입력. 하나라도 비면 처리가 시작
            안 됩니다.{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand font-bold hover:underline"
            >
              Anthropic 발급
            </a>
            {" / "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand font-bold hover:underline"
            >
              OpenAI 발급
            </a>
          </TroubleItem>

          <TroubleItem num={2} title="API 키 잔액/권한 확인" chance="5%">
            키는 맞는데 결제 정보가 없거나 잔액 0이면 401/429 오류. Anthropic{" "}
            <a
              href="https://console.anthropic.com/settings/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand font-bold hover:underline"
            >
              billing
            </a>
            {" / "}
            OpenAI{" "}
            <a
              href="https://platform.openai.com/settings/organization/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand font-bold hover:underline"
            >
              billing
            </a>
            에서 결제 카드 등록 + 최소 $5 충전.
          </TroubleItem>

          <TroubleItem
            num={3}
            title="macOS — &ldquo;개발자 확인 불가&rdquo; 경고"
            chance="3%"
          >
            첫 실행 시 차단되면 시스템 설정 → 개인정보 보호 및 보안 → 맨
            아래로 스크롤 → &ldquo;Ark Clipper&rdquo;{" "}
            <b>&ldquo;확인 없이 열기&rdquo;</b> 클릭. 또는 터미널에서:
            <pre className="mt-1.5 px-2 py-1 bg-chip rounded text-[11px] font-mono overflow-x-auto">
              xattr -dr com.apple.quarantine /Applications/Ark\ Clipper.app
            </pre>
          </TroubleItem>

          <TroubleItem num={4} title="앱 로그 보내기 (위 셋 다 해당 X)" chance="2%">
            앱 우상단 설정 → 디버그 → <b>&ldquo;로그 폴더 열기&rdquo;</b> 클릭
            → 가장 최근 파일을 joshua@arkstudio.kr로 보내주세요. 보통 5분 안에
            원인 회신 드립니다.
          </TroubleItem>
            </div>
          </FaqItem>
        </div>
      </section>
    </div>
  );
}

function FaqItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl2 border border-line bg-surface shadow-card">
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-bold text-ink">{question}</span>
        <svg
          className="w-4 h-4 text-mute shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </details>
  );
}

function TroubleItem({
  num,
  title,
  chance,
  children,
}: {
  num: number;
  title: string;
  chance: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl2 border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-6 h-6 rounded-full bg-brandSoft text-brand text-[12px] font-bold flex items-center justify-center">
          {num}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <p className="text-[14px] font-bold text-ink">{title}</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-chip text-mute">
              가능성 {chance}
            </span>
          </div>
          <div className="text-[13px] text-sub leading-relaxed">{children}</div>
        </div>
      </div>
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

function CostCard({
  count,
  cost,
  emphasis,
}: {
  count: string;
  cost: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-xl2 p-3 border ${
        emphasis
          ? "border-brand bg-brandSoft/40"
          : "border-line bg-surface"
      }`}
    >
      <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1">
        {count}
      </p>
      <p
        className={`text-base font-bold ${
          emphasis ? "text-brand" : "text-ink"
        }`}
      >
        {cost}
      </p>
    </div>
  );
}
