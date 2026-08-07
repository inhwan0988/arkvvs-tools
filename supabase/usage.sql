-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Usage 로그 & Quota 시스템
-- 서버 API 키(무료 티어) 소진 방지 + 사용자별 사용량 추적
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- 어느 툴 / 어떤 액션
  tool_slug text not null,   -- registry.ts slug: vvs-planner / youtube-setup / insta-viral-planner
  action text not null,      -- search / topics / script / interview-questions / generate / analyze-reel ...

  -- AI 호출 정보
  provider text not null check (provider in ('anthropic', 'openai')),
  model text,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cost_usd numeric(10, 6) not null default 0,   -- 마이크로 단위 정밀도

  -- BYOK 여부 (사용자 자기 키를 썼으면 무료 quota 소진 X)
  used_own_key boolean not null default false,

  -- 상태
  status text not null default 'ok' check (status in ('ok', 'error', 'blocked')),
  error_message text,

  created_at timestamptz not null default now()
);

create index if not exists usage_logs_user_created_idx
  on public.usage_logs (user_id, created_at desc);
create index if not exists usage_logs_tool_created_idx
  on public.usage_logs (tool_slug, created_at desc);
create index if not exists usage_logs_quota_lookup_idx
  on public.usage_logs (user_id, tool_slug, action, used_own_key, status, created_at desc);
create index if not exists usage_logs_created_idx
  on public.usage_logs (created_at desc);

alter table public.usage_logs enable row level security;

-- 본인 로그 조회
drop policy if exists usage_logs_own_read on public.usage_logs;
create policy usage_logs_own_read on public.usage_logs
  for select using (auth.uid() = user_id);

-- 관리자는 전체 조회
drop policy if exists usage_logs_admin_read on public.usage_logs;
create policy usage_logs_admin_read on public.usage_logs
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- INSERT/UPDATE/DELETE 정책 없음 = service_role 키로만 쓸 수 있음 (스푸핑 방지)
