Supabase 마이그레이션 SQL 파일 생성.

사용: `/migration <설명>`
예: `/migration 사용자별 결제 이력 테이블 추가`

만들 파일: `supabase/<slug>.sql` (slug는 설명에서 자동)

필수 포함:
1. `create table if not exists public.<name>` (멱등성)
2. `enable row level security` + 정책 (owner all 기본)
3. 인덱스 (자주 조회되는 컬럼)
4. timestamp (`created_at`, 필요 시 `updated_at` + trigger)
5. user_id FK + cascade

`.claude/agents/supabase-rls.md` subagent로 자체 검토 필수.

작업 후 사용자에게 안내:
- "Supabase Dashboard → SQL Editor에서 이 파일 내용 실행"
- 또는 admin이 자동화 사용
- 직접 `supabase db push` 절대 금지
