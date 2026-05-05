import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 — arkvvs.tools",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg py-12 px-6">
      <div className="mx-auto max-w-3xl rounded-xl3 bg-surface shadow-card p-8 sm:p-10">
        <Link
          href="/"
          className="text-sm font-semibold text-brand hover:underline"
        >
          ← 홈으로
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-ink">개인정보처리방침</h1>
        <p className="mt-1 text-xs text-mute">
          시행일: 2026년 5월 4일
        </p>

        <div className="mt-8 space-y-6 text-sm text-sub leading-relaxed">
          <Section title="1. 수집하는 개인정보 항목">
            <p>arkvvs.tools(이하 &quot;서비스&quot;)는 다음 정보를 수집합니다.</p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>OAuth 로그인 시 제공되는 정보: 이메일, 이름, 프로필 이미지 URL</li>
              <li>서비스 이용 기록: 로그인 일시, 사용자 식별자(UUID)</li>
            </ul>
          </Section>

          <Section title="2. 개인정보의 수집 및 이용 목적">
            <ul className="ml-5 list-disc space-y-1">
              <li>회원 식별 및 서비스 제공</li>
              <li>부정 이용 방지 및 차단(banned 처리)</li>
              <li>문의 응대</li>
            </ul>
          </Section>

          <Section title="3. 외부 서비스로 전송되는 정보">
            <p>
              사용자가 입력한 AI API 키(YouTube, Anthropic, OpenAI)는
              <b className="text-ink"> 사용자의 브라우저 localStorage에만 저장</b>되며
              서비스 서버에 저장되지 않습니다. 키는 사용자가 검색·생성을 요청할 때만
              해당 외부 API로 직접 전송됩니다.
            </p>
            <p className="mt-2">
              YouTube 검색 결과는 다른 사용자의 quota 절감을 위해 24시간 동안
              서버 캐시에 저장될 수 있습니다 (영상 메타데이터, 사용자 정보 미포함).
            </p>
          </Section>

          <Section title="4. 개인정보의 보유 및 이용 기간">
            <p>
              회원 탈퇴 요청 시 즉시 파기합니다. 관계 법령에 따라 보존 의무가
              있는 경우 해당 기간까지 보관합니다.
            </p>
          </Section>

          <Section title="5. 이용자의 권리">
            <p>
              이용자는 언제든지 본인 정보의 열람·정정·삭제·처리정지를 요청할 수 있습니다.
              요청은 아래 연락처로 보내주시면 영업일 기준 7일 이내 처리합니다.
            </p>
          </Section>

          <Section title="6. 쿠키의 사용">
            <p>
              로그인 세션 유지를 위해 인증 쿠키(Supabase Auth)를 사용합니다.
              브라우저 설정에서 쿠키를 차단할 경우 서비스 이용이 제한될 수 있습니다.
            </p>
          </Section>

          <Section title="7. 개인정보 보호책임자">
            <p>
              이름: 강조슈아 (joshua@arkstudio.kr)
              <br />
              연락처: joshua@arkstudio.kr
            </p>
          </Section>

          <Section title="8. 정책 변경">
            <p>
              본 방침은 법령·서비스 변경에 따라 수정될 수 있으며, 변경 시 본 페이지에
              공지합니다.
            </p>
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
