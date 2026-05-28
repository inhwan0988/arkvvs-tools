새 도구를 ARK Tools 플랫폼에 추가하는 보일러플레이트.

사용: `/new-tool <slug> "<한국어 표시명>"`
예: `/new-tool ai-thumbnail "썸네일 생성기"`

만들 파일들:
1. `app/(dashboard)/tools/<slug>/page.tsx` — 토스 스타일 페이지
2. `app/(dashboard)/tools/<slug>/error.tsx` — error boundary
3. `lib/tools/<slug>/types.ts` — 타입 정의
4. `lib/tools/registry.ts`에 항목 추가
5. (필요 시) `supabase/<slug>.sql` 마이그레이션

조건:
- 모든 색상은 Tailwind token 사용 (bg-brand, text-ink 등)
- 한국어 UI, 영문 코드
- max-w-2xl 좁은 폭, rounded-xl3 카드, shadow-card
- Server 컴포넌트는 async, Client는 "use client"
- error.tsx는 `app/(dashboard)/tools/sns-tracker/error.tsx` 패턴 그대로 복사 (이름만 변경)
- 새 API는 `app/api/tools/<slug>/`에, 인증 필요하면 middleware skip 안 함

작업 후:
1. `npx tsc --noEmit` 통과 확인
2. `.claude/agents/tool-registry.md` subagent로 자체 검토
3. `git add -A && git commit -m "feat(<slug>): 초기 구조"` 후 PR
