-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VVS-Planner — 검색 기록
-- 매 검색마다 append. Step 1의 "최근 검색어" 칩 UI에서 재사용.
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create table if not exists public.vvs_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  keyword text not null,
  filters jsonb,          -- {period, videoFormat, minVvs, sortBy, ...}
  result_count int not null default 0,
  cached boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists vvs_search_history_user_recent_idx
  on public.vvs_search_history (user_id, created_at desc);

-- 같은 사용자가 같은 키워드로 반복 검색 시 최신 것만 보여주려고
-- unique는 걸지 않음 — insert 시 최근 30분 내 동일 keyword는 skip 하는 로직은 API에서 처리.

alter table public.vvs_search_history enable row level security;

drop policy if exists "vvs_search_history_owner_all" on public.vvs_search_history;
create policy "vvs_search_history_owner_all"
  on public.vvs_search_history
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
