-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Spread (멀티플랫폼 게시 도구) — 스키마
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) SNS 계정 연결 (OAuth 토큰 저장)
create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  platform text not null check (platform in (
    'instagram_business','facebook_page','threads',
    'tiktok','youtube','x'
  )),

  -- 플랫폼 측 식별자
  external_id text not null,                  -- IG: ig_user_id / FB: page_id / Threads: threads_user_id 등
  external_username text,                     -- @handle
  external_name text,                         -- 표시명

  -- 토큰 (TODO Phase 2: pgsodium 암호화)
  access_token text not null,
  refresh_token text,                         -- Threads/TikTok 등
  token_expires_at timestamptz,
  scope text,

  -- 인스타용 추가 정보
  fb_page_id text,                            -- IG가 연결된 FB Page
  fb_page_access_token text,                  -- IG 게시는 page token 필요

  enabled boolean default true,
  last_used_at timestamptz,
  last_refreshed_at timestamptz,
  refresh_error text,

  created_at timestamptz not null default now(),
  unique(user_id, platform, external_id)
);

create index if not exists social_connections_user_idx
  on public.social_connections(user_id);
create index if not exists social_connections_expiry_idx
  on public.social_connections(token_expires_at)
  where enabled = true;

-- 2) 예약/게시 큐
create table if not exists public.spread_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- 콘텐츠
  caption text,
  media_urls text[],                          -- 업로드된 이미지/영상 URL 목록 (Supabase Storage)
  -- 플랫폼별 캡션 override (다른 캡션 쓰고 싶을 때)
  per_platform_caption jsonb,                 -- { instagram_business: "...", threads: "..." }

  -- 대상 플랫폼 (다중 게시)
  target_platforms text[],

  -- 상태
  status text not null default 'draft' check (status in (
    'draft','scheduled','posting','posted','partial_failed','failed'
  )),
  scheduled_at timestamptz,
  posted_at timestamptz,

  -- 카테고리 (Queue/Evergreen용)
  category text,
  evergreen boolean default false,            -- true면 큐에서 반복 게시
  evergreen_last_at timestamptz,

  -- 결과
  results jsonb,                              -- { platform: { ok, post_id, url, error } }

  -- sns-tracker 연동
  short_id text,                              -- 게시할 때 자동 삽입된 단축 URL

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spread_posts_user_idx
  on public.spread_posts(user_id, created_at desc);
create index if not exists spread_posts_scheduled_idx
  on public.spread_posts(scheduled_at)
  where status = 'scheduled';
create index if not exists spread_posts_evergreen_idx
  on public.spread_posts(user_id, evergreen_last_at)
  where evergreen = true;

create or replace function public.touch_spread_posts_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_spread_posts_updated on public.spread_posts;
create trigger trg_spread_posts_updated
  before update on public.spread_posts
  for each row execute function public.touch_spread_posts_updated_at();

-- 3) RLS
alter table public.social_connections enable row level security;
alter table public.spread_posts enable row level security;

drop policy if exists "social_connections owner all" on public.social_connections;
create policy "social_connections owner all"
  on public.social_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "spread_posts owner all" on public.spread_posts;
create policy "spread_posts owner all"
  on public.spread_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4) Storage bucket 안내 (대시보드에서 직접 생성)
-- 이름: spread-media (Private)
-- RLS:
--   SELECT/INSERT/DELETE: bucket_id = 'spread-media' AND (storage.foldername(name))[1] = auth.uid()::text
