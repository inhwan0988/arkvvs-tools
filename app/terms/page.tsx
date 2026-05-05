import Link from "next/link";

export const metadata = {
  title: "이용약관 — arkvvs.tools",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg py-12 px-6">
      <div className="mx-auto max-w-3xl rounded-xl3 bg-surface shadow-card p-8 sm:p-10">
        <Link
          href="/"
          className="text-sm font-semibold text-brand hover:underline"
        >
          ← 홈으로
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-ink">이용약관</h1>
        <p className="mt-1 text-xs text-mute">시행일: 2026년 5월 4일</p>

        <div className="mt-8 space-y-6 text-sm text-sub leading-relaxed">
          <Section title="제1조 (목적)">
            <p>
              본 약관은 arkvvs.tools(이하 &quot;서비스&quot;)의 이용 조건과 절차,
              회사와 회원 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
            </p>
          </Section>

          <Section title="제2조 (서비스의 내용)">
            <p>
              서비스는 유튜브 콘텐츠 제작을 보조하는 AI 도구 모음을 제공합니다.
              구체적인 도구는 운영상 추가·변경될 수 있습니다.
            </p>
          </Section>

          <Section title="제3조 (회원가입)">
            <p>
              구글·카카오 OAuth를 통해 가입합니다. 운영자는 부정 이용·약관 위반
              시 사전 통보 없이 계정을 차단할 수 있습니다.
            </p>
          </Section>

          <Section title="제4조 (외부 API 키 책임)">
            <p>
              회원이 입력한 AI API 키(YouTube, Anthropic, OpenAI 등)는 회원의
              브라우저에만 저장되며, 키 사용에 따른 비용·할당량·보안 책임은
              전적으로 회원 본인에게 있습니다.
            </p>
          </Section>

          <Section title="제5조 (생성된 콘텐츠의 권리)">
            <p>
              AI가 생성한 텍스트·이미지·영상의 저작권 및 사용 책임은 회원에게
              있습니다. 운영자는 생성물의 정확성·적법성을 보증하지 않습니다.
            </p>
          </Section>

          <Section title="제6조 (금지 행위)">
            <ul className="ml-5 list-disc space-y-1">
              <li>타인의 계정·API 키를 도용하거나 무단 이용하는 행위</li>
              <li>서비스를 자동화 봇·과도한 트래픽으로 부하를 가하는 행위</li>
              <li>저작권·명예훼손·음란성·혐오 등 위법한 콘텐츠 생성에 이용</li>
              <li>리버스 엔지니어링·소스 코드 추출 시도</li>
            </ul>
          </Section>

          <Section title="제7조 (서비스의 변경 및 중단)">
            <p>
              운영자는 사전 공지 후 서비스를 변경하거나 중단할 수 있으며, 무료
              제공되는 서비스의 경우 사전 공지 없이도 중단할 수 있습니다.
            </p>
          </Section>

          <Section title="제8조 (책임의 한계)">
            <p>
              서비스는 &quot;있는 그대로(as is)&quot; 제공되며, 천재지변·외부 API
              장애·회원의 부주의로 인한 손해에 대해 운영자는 책임을 지지 않습니다.
            </p>
          </Section>

          <Section title="제9조 (준거법 및 관할)">
            <p>
              본 약관은 대한민국 법률에 따라 해석되며, 서비스 이용과 관련하여
              발생한 분쟁은 운영자의 주소지를 관할하는 법원을 1심 관할로 합니다.
            </p>
          </Section>

          <Section title="문의">
            <p>joshua@arkstudio.kr</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}
