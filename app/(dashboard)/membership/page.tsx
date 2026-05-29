import Link from "next/link";

export const metadata = {
  title: "멤버십 안내 — arkvvs.tools",
};

interface Plan {
  name: string;
  description: string;
  originalPrice?: string;
  price: string;
  priceUnit: string;
  badge?: string;
  highlighted?: boolean;
  features: string[];
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

const PLANS: Plan[] = [
  {
    name: "일반공개",
    description: "AI 도구를 처음 써보거나 가벼운 작업이 필요한 분께.",
    originalPrice: "50,000원",
    price: "무료",
    priceUnit: "",
    features: [
      "조회수 터지는 기획 (vvs-planner)",
      "프리미어프로 반자동 편집",
      "YouTube 세팅 툴",
      "Ark Clipper 데스크탑 앱",
      "본인 API 키(BYOK)로 비용 직접 관리",
      "업데이트 / 유지보수 무제한",
      "기본 이메일 지원",
    ],
    primaryCta: { label: "지금 사용하기", href: "/" },
  },
  {
    name: "회원전용",
    description: "콘텐츠 제작을 본격적으로 늘리려는 크리에이터에게 최적.",
    originalPrice: "100,000원",
    price: "무료",
    priceUnit: "",
    badge: "가장 인기 많은",
    highlighted: true,
    features: [
      "일반공개의 모든 도구 포함",
      "인스타그램 떡상 기획 (insta-planner)",
      "캡컷 반자동 편집 (capcut-edit)",
      "SNS 트래픽 추적 및 관리",
      "Spread — 멀티 SNS 동시 게시",
      "신규 도구 우선 공개",
      "1:1 우선 지원 (joshua@arkstudio.kr)",
      "콘텐츠 코칭 1회 무료",
    ],
    primaryCta: {
      label: "회원전용 신청",
      href: "mailto:joshua@arkstudio.kr?subject=arkvvs.tools 회원전용 신청",
    },
    secondaryCta: { label: "무료로 먼저 사용해보기", href: "/" },
  },
  {
    name: "비즈니스",
    description: "팀 단위로 운영하는 에이전시/스튜디오를 위한 풀 패키지.",
    price: "150,000",
    priceUnit: "원",
    features: [
      "회원전용의 모든 도구 포함",
      "팀원 5명까지 사용 가능",
      "월간 콘텐츠 컨설팅 1회 (1시간)",
      "맞춤 도구 / 기능 요청 우선 반영",
      "전용 Slack 채널 (1:1 즉시 응대)",
      "분석 데이터 CSV 일괄 export",
      "월간 성과 리포트 자동 생성",
      "사내 교육 자료 제공",
    ],
    primaryCta: {
      label: "비즈니스 상담",
      href: "mailto:joshua@arkstudio.kr?subject=arkvvs.tools 비즈니스 플랜 상담",
    },
  },
];

export default function MembershipPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10 sm:py-16">
      <div className="mb-4">
        <Link href="/" className="text-xs font-semibold text-sub hover:text-ink">
          ← 대시보드
        </Link>
      </div>

      <header className="mb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-3">
          나에게 맞는 플랜을 선택하세요
        </h1>
        <p className="text-base text-sub leading-relaxed">
          크리에이터를 위한 AI 도구 묶음 — 가볍게 시작하고 필요할 때 업그레이드.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </section>

      <section className="max-w-3xl mx-auto">
        <h2 className="text-lg font-bold text-ink mb-4 text-center">
          자주 묻는 질문
        </h2>
        <div className="space-y-2">
          <FaqItem
            q="진짜로 회원전용도 무료인가요?"
            a="런칭 프로모션 기간 동안 회원전용 도구를 모두 무료로 사용하실 수 있습니다. 기간 종료 후 정상 가격(월 10만원)으로 전환되며, 가입 시점 가격이 유지되도록 보장합니다."
          />
          <FaqItem
            q="회원전용/비즈니스는 어떻게 결제하나요?"
            a="현재는 joshua@arkstudio.kr로 신청 메일 보내주시면 결제 안내(계좌이체/카드)를 드립니다. 자동 결제는 준비 중입니다."
          />
          <FaqItem
            q="API 비용은 별도인가요?"
            a="네. AI 도구는 본인 OpenAI / Anthropic 키(BYOK) 사용을 권장합니다. 본인 계정에서 직접 차감되어 가격이 투명합니다."
          />
          <FaqItem
            q="중간에 해지할 수 있나요?"
            a="언제든지 가능합니다. 다음 달부터 상위 도구 권한이 해제되고, 일반공개 도구는 계속 사용 가능합니다."
          />
          <FaqItem
            q="환불 정책이 어떻게 되나요?"
            a="결제 후 7일 이내 사용 이력이 없는 경우 전액 환불해드립니다. 그 외에는 잔여 일수 기준 일할 계산하지 않습니다."
          />
        </div>
      </section>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const highlighted = plan.highlighted;
  const isFree = plan.price === "무료";
  return (
    <div
      className={`rounded-xl3 p-7 sm:p-8 shadow-card flex flex-col relative ${
        highlighted
          ? "bg-brand text-white"
          : "bg-surface border border-line text-ink"
      }`}
    >
      <div className="mb-1 flex items-center gap-2 flex-wrap">
        <h3
          className={`text-2xl font-bold ${highlighted ? "text-white" : "text-ink"}`}
        >
          {plan.name}
        </h3>
        {plan.badge && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
              highlighted
                ? "bg-white/20 text-white"
                : "bg-premiumSoft text-premium"
            }`}
          >
            {plan.badge}
          </span>
        )}
      </div>
      <p
        className={`text-[14px] leading-relaxed mb-6 ${
          highlighted ? "text-white/85" : "text-sub"
        }`}
      >
        {plan.description}
      </p>

      <div className="mb-6">
        <p
          className={`text-[12px] font-semibold mb-1 ${
            highlighted ? "text-white/70" : "text-mute"
          }`}
        >
          시작 가격
        </p>
        {plan.originalPrice && (
          <div className="mb-1">
            <span
              className={`text-base line-through ${
                highlighted ? "text-white/60" : "text-mute"
              }`}
            >
              {plan.originalPrice}
            </span>
            <span
              className={`ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                highlighted
                  ? "bg-white/20 text-white"
                  : "bg-success/20 text-success"
              }`}
            >
              런칭 프로모션
            </span>
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-4xl sm:text-5xl font-bold tracking-tight ${
              highlighted ? "text-white" : "text-ink"
            }`}
          >
            {plan.price}
          </span>
          {plan.priceUnit && (
            <span
              className={`text-xl font-bold ${
                highlighted ? "text-white" : "text-ink"
              }`}
            >
              {plan.priceUnit}
            </span>
          )}
          {!isFree && (
            <span
              className={`text-sm font-medium ml-1 ${
                highlighted ? "text-white/70" : "text-mute"
              }`}
            >
              / 월
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5 mb-7">
        <Link
          href={plan.primaryCta.href}
          className={`block text-center rounded-xl py-3 text-[15px] font-bold transition ${
            highlighted
              ? "bg-white text-brand hover:bg-white/90"
              : "bg-brand text-white hover:bg-brandHover"
          }`}
        >
          {plan.primaryCta.label}
        </Link>
        {plan.secondaryCta && (
          <Link
            href={plan.secondaryCta.href}
            className={`block text-center rounded-xl py-3 text-[15px] font-bold border-2 transition ${
              highlighted
                ? "border-white/30 text-white hover:bg-white/10"
                : "border-brand text-brand hover:bg-brandSoft"
            }`}
          >
            {plan.secondaryCta.label}
          </Link>
        )}
      </div>

      <p
        className={`text-[14px] font-bold mb-3 ${
          highlighted ? "text-white" : "text-ink"
        }`}
      >
        주요 혜택:
      </p>
      <ul className="space-y-2.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[15px] leading-snug">
            <span
              className={`mt-0.5 shrink-0 text-base font-bold ${
                highlighted ? "text-white" : "text-brand"
              }`}
            >
              ✓
            </span>
            <span
              className={highlighted ? "text-white/95" : "text-ink"}
            >
              {f}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-xl2 border border-line bg-surface p-4 group">
      <summary className="cursor-pointer text-[14px] font-bold text-ink flex items-center justify-between">
        <span>{q}</span>
        <span className="text-mute group-open:rotate-180 transition-transform text-xs">
          ▼
        </span>
      </summary>
      <p className="text-[13px] text-sub leading-relaxed mt-2 pt-2 border-t border-line">
        {a}
      </p>
    </details>
  );
}
