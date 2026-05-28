-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Insta-Planner — 검색 기록 (영감 채널 검색 세션)
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create table if not exists public.insta_planner_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- 검색한 채널 @핸들 묶음 (세션 단위)
  handles text[] not null,

  -- 검색 시 적용한 필터 (복원용)
  filters jsonb not null default '{}'::jsonb,

  -- 결과 개수 (성공한 검색만 저장하므로 1 이상)
  result_count int not null default 0,

  -- 동일 handles set 재검색 시 갱신 (최근 사용 순)
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 사용자별 최근 사용 순 조회 — 가장 많이 쓰이는 쿼리
create index if not exists insta_planner_searches_user_recent_idx
  on public.insta_planner_searches(user_id, last_used_at desc);

-- 동일 핸들 묶음 dedupe용 (handles는 GIN, 매칭은 array 동치로)
create index if not exists insta_planner_searches_handles_idx
  on public.insta_planner_searches using gin(handles);

-- 동일 사용자 + 동일 handles set은 1 row만 — race 방지
create unique index if not exists insta_planner_searches_user_handles_uidx
  on public.insta_planner_searches(user_id, handles);

alter table public.insta_planner_searches enable row level security;

-- 소유자만 read/write
create policy "insta_planner_searches_owner_all"
  on public.insta_planner_searches
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
