-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- arkvvs.tools - VVS 검색 결과 캐시
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) 캐시 테이블
create table if not exists public.vvs_search_cache (
  cache_key text primary key,
  result jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists vvs_search_cache_expires_idx
  on public.vvs_search_cache (expires_at);

-- 2) RLS 활성화
alter table public.vvs_search_cache enable row level security;

-- 3) 정책: 인증된 사용자는 모두 읽기/쓰기 가능 (캐시는 사용자 간 공유)
--    캐시 결과는 공개 데이터(YouTube 검색 결과)이므로 격리 불필요
drop policy if exists "auth users read cache" on public.vvs_search_cache;
create policy "auth users read cache"
  on public.vvs_search_cache for select
  to authenticated
  using (true);

drop policy if exists "auth users write cache" on public.vvs_search_cache;
create policy "auth users write cache"
  on public.vvs_search_cache for insert
  to authenticated
  with check (true);

drop policy if exists "auth users update cache" on public.vvs_search_cache;
create policy "auth users update cache"
  on public.vvs_search_cache for update
  to authenticated
  using (true)
  with check (true);

-- 4) 만료된 행 자동 정리 함수 (선택 — 주기적으로 호출하거나 cron으로)
create or replace function public.purge_expired_vvs_cache()
returns void language sql as $$
  delete from public.vvs_search_cache where expires_at < now();
$$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 완료. 확인:
-- select count(*) from public.vvs_search_cache;
-- 만료 정리:
-- select public.purge_expired_vvs_cache();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
