# ARK Tools — 작업 시 반드시 지킬 규칙

## 도메인
크리에이터용 AI 도구 멀티-툴 SaaS (한국). 토스 스타일 UX, 한국어 UI 기본, 영문 코드.

## 스택
- Next.js 16 (App Router, --webpack), TypeScript, React 19
- Supabase (Auth + DB + Storage + RLS)
- Tailwind v3 (Pretendard, Toss palette: `bg`/`surface`/`ink`/`sub`/`mute`/`line`/`chip`/`brand`/`brandSoft`/`success`/`warn`/`danger`/`premium`)
- Vercel 배포 (`vercel.json`에 cron)
- Anthropic Claude API + OpenAI Whisper (사용자 BYOK)

## 도구 추가 패턴
- `lib/tools/<slug>/` — types, prompts, 로직
- `app/(dashboard)/tools/<slug>/page.tsx` — UI
- `app/api/tools/<slug>/.../route.ts` — API
- `lib/tools/registry.ts`에 항목 등록 (slug, name, href, category, membersOnly, status)

## 검증 (반드시)
- `npx tsc --noEmit` 만 (이건 빠르고 안전)
- **`pnpm dev` 중에 `pnpm build` 절대 금지** — `.next` 캐시 충돌로 사이트 unstyled 됨
- 사용자 키가 필요한 분석/AI 호출은 직접 테스트 불가 — 코드 review만

## DB
- 마이그레이션은 `supabase/<name>.sql` 파일로 commit. main에 merge 후 admin이 Supabase Dashboard에서 실행 (또는 우리 자동화 사용)
- `supabase db push` 직접 금지 (각자 PC에서 production 건드림)
- RLS는 모든 새 테이블에 `enable row level security` + `owner all` 정책 기본

## Secrets
- `.env.local` 절대 commit X (이미 .gitignore)
- API key, token은 채팅 history도 위험 — `/tmp/` 파일 또는 환경변수
- Vercel env는 `npx vercel env add` (joshua만 production 권한)

## Claude API 호출
- 모든 곳에서 모델 fallback chain 사용 (외부 사용자 키 plan에 따라 4-5 / 3-5-latest / 3-5-20241022)
- raw fetch 패턴 (Edge 호환): `lib/tools/vvs-planner/claude.ts` 참고

## 코드 스타일
- 함수형 컴포넌트 + named export
- 컴포넌트는 `components/tools/<slug>/<Component>.tsx`
- 한국어 UI 텍스트, 영문 변수명
- 주석 최소 (코드 자체로 명확하게). `WHY`만 적기

## 워크플로우
- main 직접 push 금지 — feature branch + PR
- branch 이름: `feat/<이름>`, `fix/<이름>`, `chore/<이름>`
- 큰 작업은 plan mode로 먼저 합의 후 코딩
- `.claude/agents/` 안의 subagent 적극 활용

## 알려진 함정
- `app/(dashboard)/tools/sns-tracker/page.tsx` 등에서 hardcoded URL 박지 말기 — `window.location.origin` 사용
- middleware의 PUBLIC_PATHS에 새 익명 endpoint 추가 시 빠뜨림 주의
- `apps/capcut-helper/` 는 별도 Electron 앱 — `.vercelignore`에 `apps/` 있음, Vercel 빌드 무관
- 캡컷 draft 직접 수정은 `apps/capcut-helper/electron/capcut-draft-writer.js` 통해서만 (capcut-cli 사용)

## 도구별 자세한 컨벤션
각 도구 폴더에 별도 `CLAUDE.md`가 있으면 그것도 같이 참고:
- `tools/vvs-planner/CLAUDE.md` (없으면 만들기)
- `tools/spread/CLAUDE.md` (없으면 만들기)

## 의문 있을 때
- joshua에게 묻거나, plan mode로 먼저 의도 명확화
- `.claude/agents/` 의 도메인 전문 subagent 호출
