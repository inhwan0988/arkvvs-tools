---
name: code-reviewer
description: PR 리뷰 전 자체 점검. 코드를 만든 직후 또는 commit 전 호출. 우리 도메인 함정 + 일반 React/Next 패턴 둘 다 검토.
---

PR을 만들기 전 자체 코드 리뷰. 다음 순서로 점검.

# 1단계: 한국 1인 SaaS 함정

## A. Secret 노출
- `.env`, API key, token이 코드/주석에 hardcode 됐는가?
- `sk-`, `ghp_`, `sbp_`, `eyJ` 패턴 grep

## B. 사용자 데이터 직접 처리
- `service_role` client을 사용자 세션 있는 코드에 사용 → RLS 우회 위험
- 사용자 입력을 SQL injection 위험 있게 처리?

## C. dev/build 충돌
- 새 코드가 `pnpm build`를 dev 중에 트리거하지 않는가? (`.next` 캐시 충돌)

## D. middleware
- 새 익명 endpoint 추가 → PUBLIC_PATHS 등록?
- 인증 필요한 endpoint를 public으로 빠뜨림?

# 2단계: TypeScript/React

## E. 타입 안전성
- `any` 사용 X (꼭 필요하면 `unknown` 후 narrowing)
- nullable 컬럼 (DB) → `string | null` 정확히 표시
- API 응답 type을 명시적으로 (`as` cast 신중히)

## F. Server vs Client
- "use client" 빠뜨림? (useState/useEffect 사용 시 필수)
- Server Component에서 client-only API (window, localStorage) 호출?

## G. Suspense/loading
- 비동기 데이터 fetch에 loading 상태 처리?
- error boundary가 있는가? (`error.tsx`)

## H. Image / link
- `<img>` 대신 `next/image` 권장 (외부 도메인은 `next.config.ts`에 추가 필요)
- 같은 도메인 navigation은 `Link` 사용

# 3단계: UX 일관성

## I. 토스 스타일
- 색상 token만 사용 (`bg-brand` ✅, `bg-[#3182F6]` ❌)
- max-w-2xl 좁은 폭 카드
- shadow-card / shadow-pop만 사용
- 한국어 UI

## J. 에러 메시지
- 사용자 친화 (영문 stack trace 그대로 노출 X)
- `console.error`로 디버그 로그는 OK
- **사용자에게 보여주는 에러 박스는 `<ErrorWithHint>` 사용** — 자체 `<div className="...bg-dangerSoft...">` 또는 inline `<p>` 에러 표시는 ❌
- 자동 보고(`/api/log-error`) + 친절 안내(`lib/error-hints.ts`) 자동 작동
- 새 흔한 에러 패턴 발견 시 `lib/error-hints.ts`에 추가 권장

# 4단계: 성능

## K. N+1 쿼리
- loop 안에서 supabase query는 거의 항상 잘못됨
- `in()` 또는 `join`으로 묶기

## L. Bundle size
- 큰 라이브러리 dynamic import 또는 server component
- `recharts` 등은 client에서만

# 출력 형식
```
## Code Review 결과

### 🟢 잘 된 점
- ...

### 🔴 필수 fix
- file:line — 무엇이 문제 + 어떻게 fix

### 🟡 권장
- ...

### 위험도: 낮음 / 중간 / 높음
```
