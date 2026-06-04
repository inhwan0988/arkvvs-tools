-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 전역 에러 로그 — 모든 도구의 서버/클라이언트 에러 자동 수집
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),

  -- 발생자 (익명 허용 — auth.users.id가 있으면 set)
  user_id uuid references auth.users(id) on delete set null,

  -- 어디서 발생
  tool_slug text,                     -- 'ark-clipper' | 'sns-tracker' | 'spread' | etc
  route text,                         -- '/api/...' 또는 'client:/tools/...'
  source text default 'server' check (source in ('server','client','helper')),

  -- 내용
  level text not null default 'error' check (level in ('error','warn','info')),
  message text not null,
  stack text,
  context jsonb default '{}'::jsonb,  -- 임의 메타데이터 (요청 body 등)

  -- 환경
  user_agent text,
  status_code int,
  ip_hash text,                       -- 익명 rate limit용 (raw IP는 저장 X)

  -- 분류
  fingerprint text,                   -- 같은 에러 dedupe용 (message 첫 80자 해시)

  created_at timestamptz not null default now()
);

-- 조회 인덱스
create index if not exists error_logs_created_idx
  on public.error_logs(created_at desc);
create index if not exists error_logs_tool_created_idx
  on public.error_logs(tool_slug, created_at desc);
create index if not exists error_logs_fingerprint_idx
  on public.error_logs(fingerprint, created_at desc);
create index if not exists error_logs_user_idx
  on public.error_logs(user_id, created_at desc)
  where user_id is not null;

alter table public.error_logs enable row level security;

-- 익명 + 인증 사용자 둘 다 insert 허용 (로그 수집을 위해)
-- raw IP는 ip_hash로만 저장됨 — abuse는 rate limit으로
create policy "error_logs_anon_insert"
  on public.error_logs
  for insert
  to anon, authenticated
  with check (true);

-- 본인 에러 select (사용자가 자기 에러 확인 가능)
create policy "error_logs_owner_select"
  on public.error_logs
  for select
  to authenticated
  using (user_id = auth.uid());

-- admin은 모든 에러 select 가능 — profiles.role = 'admin'으로 확인
-- service_role 없이도 작동
create policy "error_logs_admin_select"
  on public.error_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
