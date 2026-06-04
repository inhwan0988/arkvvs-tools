-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VVS-Planner — 작업 세션 (위저드 단계별 자동 저장 + 이어 작업)
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create table if not exists public.vvs_planner_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Step 1: 키워드 검색
  keyword text,

  -- Step 2: 영상 선택 (썸네일/제목까지 캐싱 → 카드 표시용)
  selected_video_id text,
  selected_video_title text,
  selected_video_url text,
  selected_video_thumbnail text,
  selected_video_channel text,

  -- Step 3: 채널 프로필 / 의도 / 레퍼런스 / 선택 주제
  channel_profile jsonb,
  user_intent jsonb,
  reference_video_urls text[],
  selected_topic jsonb,

  -- Step 3.5: 인터뷰 질문 + 답변
  interview_questions jsonb,
  interview_answers jsonb,

  -- Step 4: 원고
  script_text text,

  -- 메타
  status text not null default 'in_progress'
    check (status in ('in_progress','complete','abandoned')),
  step_progress int not null default 1,  -- 1~4 (3.5 도 4로 카운트)
  title text,  -- 사용자에게 보여줄 라벨 (자동: keyword 또는 selected_video_title)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 사용자별 최근 업데이트 순 (history 카드의 핵심 쿼리)
create index if not exists vvs_planner_sessions_user_recent_idx
  on public.vvs_planner_sessions(user_id, updated_at desc);

alter table public.vvs_planner_sessions enable row level security;

-- 소유자만 read/write
drop policy if exists "vvs_sessions_owner_all" on public.vvs_planner_sessions;
create policy "vvs_sessions_owner_all"
  on public.vvs_planner_sessions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
