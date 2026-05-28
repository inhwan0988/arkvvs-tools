---
name: tool-registry
description: 새 도구(/tools/<slug>)를 추가하거나 기존 도구를 수정할 때 registry, layout, navigation 일관성 점검
---

ARK Tools 멀티-툴 플랫폼의 도구 추가/수정 시 체크리스트.

# 새 도구 추가 패턴

## 1. 파일 구조
```
app/(dashboard)/tools/<slug>/
├── page.tsx              # 메인 UI
├── error.tsx             # 에러 boundary (필수)
├── [param]/page.tsx      # 상세 페이지 (있다면)
└── ...

components/tools/<slug>/
├── <Component>.tsx       # 각 UI 컴포넌트
└── ...

lib/tools/<slug>/
├── types.ts              # 타입 정의
├── prompts.ts            # AI prompt builder (필요 시)
└── <logic>.ts            # 비즈니스 로직

app/api/tools/<slug>/
├── <action>/route.ts     # API 엔드포인트
└── ...

supabase/<slug>.sql       # DB 마이그레이션 (필요 시)
```

## 2. `lib/tools/registry.ts` 등록 필수
```ts
{
  slug: "<unique>",
  name: "한국어 표시명",
  description: "20-40자 한국어 설명",
  emoji: "📦",
  href: "/tools/<slug>",
  status: "live" | "beta" | "soon",
  color: "bg-brandSoft", // Tailwind class
  category: "기획" | "편집" | "업로드 및 관리" | "콘텐츠 활용",
  membersOnly: true | false, // premium tier 전용?
}
```

## 3. UI 표준
- 토스 스타일: max-w-2xl 좁은 폭, white 카드, shadow-card, 큰 여백
- 헤더: `<h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">`
- 카드: `rounded-xl3 bg-white shadow-card p-5`
- 버튼: `rounded-xl bg-brand py-3 text-base font-bold text-white hover:bg-brandHover`
- 색상: 무조건 token (`bg-brand`, `text-ink`, etc) 사용. hex 직접 X

## 4. error.tsx 필수
모든 새 page에 `error.tsx` — 흰 화면 방지. 기존 `tools/sns-tracker/error.tsx` 또는 `tools/spread/error.tsx` 패턴 그대로 복사 + 이름만 바꿈.

## 5. middleware public path 확인
새 API 중 사용자 인증 없는 endpoint는 `lib/supabase/middleware.ts`의 `PUBLIC_PATHS`에 추가:
- redirect (예: `/r/`)
- cron (`/api/tools/<slug>/cron/`)
- 외부 callback (`/api/oauth/<provider>/callback`)
- public asset (`/api/tools/<slug>/qr/`)

## 6. 회원전용 (membersOnly: true)
- `lib/auth.ts`의 `requireApproved` 또는 tier 체크
- premium tier만 접근 가능

# 검토 결과 출력 형식
```
## Tool 추가 검토
✅ registry.ts 등록됨
✅ error.tsx 있음
⚠️ middleware PUBLIC_PATHS 누락 — /api/tools/<slug>/cron/ 추가 필요
❌ UI에 hex color 직접 사용 — token으로 교체 필요 (#FF0000 → bg-danger)
```
