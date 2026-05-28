---
name: supabase-rls
description: 새 Supabase 테이블/마이그레이션을 만들거나 검토할 때 RLS, 인덱스, RLS bypass 위험을 점검. 새 테이블 만들 때 항상 호출.
---

새 Supabase 테이블/뷰/마이그레이션을 만들거나 PR에 그런 코드가 있으면 다음 체크리스트로 검토.

# 필수 체크리스트

## 1. RLS 활성화 + 정책
- 새 테이블은 반드시 `alter table public.<name> enable row level security;`
- 최소 1개 정책 (예: owner all):
  ```sql
  create policy "<name> owner all"
    on public.<name> for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  ```
- 정책 없으면 모든 query가 빈 결과 반환 → 디버깅 시간 낭비
- 익명 insert가 필요한 경우 (예: 클릭 로그) 별도 정책 + `with check (true)`

## 2. user_id FK
- `user_id uuid not null references auth.users(id) on delete cascade`
- 사용자 삭제 시 cascade 안 하면 orphan row 남음

## 3. 인덱스
- 자주 쿼리하는 컬럼: `created_at desc`, `user_id`, status 등
- 외래키는 자동 인덱스 X — 명시적으로 `create index on <table>(<fk_col>);`

## 4. timestamp
- `created_at timestamptz not null default now()`
- 수정 추적이 필요하면 `updated_at` + trigger 같이

## 5. service_role 사용처
- service_role 키는 RLS를 우회함
- 코드에서 `createSnsAdminClient()` 같은 admin client는:
  - public path만 (예: `/r/[shortId]` redirect)
  - cron job
  - device-auth (사용자 세션 없는 경우)
- 사용자 세션이 있는 경우는 항상 일반 `createClient()` 사용 — RLS 적용

## 6. 마이그레이션 파일 위치
- `supabase/<name>.sql`로 저장
- 파일명은 명확하게 (예: `sns-tracker.sql`, `spread.sql`, `capcut-helper.sql`)
- DROP 문 신중히 — production 데이터 손실 위험

## 7. Storage bucket
- 새 bucket이면 RLS 정책 안내 주석 포함:
  ```
  SELECT/INSERT/DELETE: bucket_id = '<name>' AND (storage.foldername(name))[1] = auth.uid()::text
  ```

## 8. CHECK constraint
- enum 같은 string 컬럼은 `check (col in ('a', 'b', 'c'))` 강제
- 잘못된 값 insert 차단

# 검토 결과 출력 형식
```
## RLS 검토
✅ RLS 활성화 + owner 정책 있음
✅ user_id FK + cascade
⚠️ status 컬럼에 CHECK 없음 — enum이면 추가 권장
❌ user_id 인덱스 누락 — 추가 필요

## 위험도: 중 (인덱스 누락만 fix 필요)
```
