-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SNS 트래픽 추적 도구 - 스키마
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) 등록된 콘텐츠 (사용자가 SNS에 게시한 게시물)
create table if not exists public.sns_contents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- 플랫폼
  platform text not null check (platform in (
    'youtube','instagram','tiktok','x','facebook','threads','naver_blog','etc'
  )),

  -- 콘텐츠 정보
  title text not null,
  content_url text,                -- 콘텐츠 자체 URL (예: youtube.com/watch?v=...)
  posted_at timestamptz not null,  -- 게시일

  -- 트래커 (콘텐츠 본문에 넣을 단축 URL)
  short_id text not null unique,   -- /r/{short_id} → destination_url
  destination_url text not null,   -- 실제 보낼 곳 (자기 사이트, 상품, lead form 등)

  -- 외부 통계 (사용자가 수동 또는 자동 sync로 입력)
  views bigint default 0,          -- SNS 조회수
  likes bigint default 0,
  comments bigint default 0,
  views_synced_at timestamptz,

  -- 메모
  notes text,

  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists sns_contents_user_idx on public.sns_contents(user_id);
create index if not exists sns_contents_short_idx on public.sns_contents(short_id);
create index if not exists sns_contents_posted_idx on public.sns_contents(posted_at desc);
create index if not exists sns_contents_platform_idx on public.sns_contents(user_id, platform);

-- 2) 클릭 로그 (URL shortener의 redirect 시 기록)
create table if not exists public.link_clicks (
  id bigserial primary key,
  short_id text not null,
  content_id uuid references public.sns_contents(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  -- 익명화된 추적
  ip_hash text,                    -- sha256(ip + salt)
  ua text,                         -- user-agent
  referer text,
  country text,                    -- 2-letter (옵션)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  is_bot boolean default false
);

create index if not exists link_clicks_content_idx on public.link_clicks(content_id);
create index if not exists link_clicks_time_idx on public.link_clicks(clicked_at desc);
create index if not exists link_clicks_short_idx on public.link_clicks(short_id);

-- 3) 주간 분석 (Claude 결과 캐시)
create table if not exists public.sns_weekly_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,        -- 월요일 (UTC)
  platform text,                   -- null이면 전체
  -- 베스트 / 워스트 콘텐츠
  best_content_id uuid references public.sns_contents(id) on delete set null,
  worst_content_id uuid references public.sns_contents(id) on delete set null,
  -- AI 분석 (markdown)
  analysis_md text not null,
  -- 메트릭 스냅샷
  metrics_json jsonb,
  created_at timestamptz not null default now(),

  unique(user_id, week_start, platform)
);

create index if not exists sns_weekly_user_idx on public.sns_weekly_analyses(user_id, week_start desc);

-- 4) RLS
alter table public.sns_contents enable row level security;
alter table public.link_clicks enable row level security;
alter table public.sns_weekly_analyses enable row level security;

-- 콘텐츠: 본인만 읽기/쓰기/삭제
drop policy if exists "sns_contents owner all" on public.sns_contents;
create policy "sns_contents owner all"
  on public.sns_contents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 클릭 로그: 본인 콘텐츠의 클릭만 읽기, 삽입은 service role 또는 익명 가능 (redirect 라우트)
drop policy if exists "link_clicks owner read" on public.link_clicks;
create policy "link_clicks owner read"
  on public.link_clicks for select
  using (
    exists (
      select 1 from public.sns_contents
      where sns_contents.id = link_clicks.content_id
        and sns_contents.user_id = auth.uid()
    )
  );

drop policy if exists "link_clicks anyone insert" on public.link_clicks;
create policy "link_clicks anyone insert"
  on public.link_clicks for insert
  with check (true);

-- 주간 분석: 본인 것만
drop policy if exists "sns_weekly owner all" on public.sns_weekly_analyses;
create policy "sns_weekly owner all"
  on public.sns_weekly_analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5) 집계 view: 콘텐츠별 클릭 수 + 전환율
drop view if exists public.sns_content_stats;
create view public.sns_content_stats as
select
  c.id as content_id,
  c.user_id,
  c.platform,
  c.title,
  c.content_url,
  c.short_id,
  c.destination_url,
  c.posted_at,
  c.views,
  c.likes,
  c.comments,
  coalesce(click_agg.click_count, 0) as click_count,
  case
    when c.views > 0 then round((coalesce(click_agg.click_count, 0)::numeric / c.views::numeric) * 100, 2)
    else 0
  end as conversion_rate_pct,
  click_agg.last_click_at,
  c.created_at
from public.sns_contents c
left join (
  select
    content_id,
    count(*) filter (where is_bot = false) as click_count,
    max(clicked_at) as last_click_at
  from public.link_clicks
  group by content_id
) click_agg on click_agg.content_id = c.id
where c.archived_at is null;

grant select on public.sns_content_stats to authenticated;
