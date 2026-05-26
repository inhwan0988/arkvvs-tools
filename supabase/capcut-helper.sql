-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 캡컷 Helper App ↔ 웹앱 연동 — 스키마
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) 페어링된 Helper device 목록
--    Helper app 첫 실행 → 6자리 코드 발급 → 사용자 웹앱에서 입력 → 페어링 완료
create table if not exists public.capcut_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,         -- 페어링 완료 후 set
  device_name text,                                                  -- "joshua의 Mac" 같은 표시명
  platform text check (platform in ('darwin', 'win32', 'linux')),

  -- 페어링 코드 (페어링 전)
  pairing_code text unique,                                          -- 6자리 숫자
  pairing_code_expires_at timestamptz,                               -- 발급 후 10분
  paired_at timestamptz,                                             -- 페어링 완료 시각

  -- Helper 인증용 secret (sha256 hash 저장)
  -- Helper는 register 시 발급받은 plain secret을 local에 저장,
  -- API 호출 시 Bearer {device_id}.{secret} 형태로 보냄
  device_secret_hash text not null,

  -- Helper 상태
  last_seen_at timestamptz,
  capcut_dir_path text,                                              -- 감지된 캡컷 폴더 (Helper 알림용)

  created_at timestamptz not null default now()
);

create index if not exists capcut_devices_user_idx on public.capcut_devices(user_id) where user_id is not null;
create index if not exists capcut_devices_pair_idx on public.capcut_devices(pairing_code) where pairing_code is not null;

-- 2) Helper가 감지한 영상 + 처리 job
create table if not exists public.capcut_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.capcut_devices(id) on delete cascade,

  -- 캡컷 프로젝트 메타
  project_id text,                                                   -- 캡컷 프로젝트 uuid (폴더명)
  project_dir text not null,                                         -- 절대경로
  video_path text not null,                                          -- 영상 파일 절대경로 (Helper 로컬)
  video_name text not null,                                          -- "shooting_001.mp4"
  video_size_bytes bigint,
  video_duration_sec numeric,

  -- audio 추출본 (Supabase Storage 경로)
  audio_storage_path text,                                           -- e.g. "user_id/job_id.mp3"
  audio_uploaded_at timestamptz,

  -- 분석 결과 (ProcessResult JSON)
  result_json jsonb,
  analyzed_at timestamptz,

  -- 처리 상태
  status text not null default 'detected' check (status in (
    'detected',         -- Helper가 영상 감지함
    'extracting',       -- audio 추출 중 (Helper)
    'uploading',        -- audio 업로드 중 (Helper)
    'pending_analysis', -- 업로드 완료, 사용자 분석 trigger 대기
    'analyzing',        -- Whisper + Claude 실행 중 (서버)
    'pending_review',   -- 사용자 검수 대기
    'pending_apply',    -- "적용" 클릭됨, Helper가 실행해야 함
    'applying',         -- Helper가 ffmpeg cut 진행 중
    'done',             -- 완성 — 잘린 영상 + .srt 모두 캡컷 폴더에 저장됨
    'error'
  )),

  -- 결과 file paths (Helper가 저장한 후 채움)
  output_video_path text,                                            -- 무음 cut된 mp4
  output_srt_path text,                                              -- 자막 .srt
  output_guide_path text,                                            -- 포인트 + 효과음 가이드 txt

  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists capcut_jobs_user_idx on public.capcut_jobs(user_id, created_at desc);
create index if not exists capcut_jobs_device_idx on public.capcut_jobs(device_id, status);
create index if not exists capcut_jobs_status_idx on public.capcut_jobs(status);

-- updated_at 자동 갱신
create or replace function public.touch_capcut_jobs_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_capcut_jobs_updated on public.capcut_jobs;
create trigger trg_capcut_jobs_updated
  before update on public.capcut_jobs
  for each row execute function public.touch_capcut_jobs_updated_at();

-- 3) RLS
alter table public.capcut_devices enable row level security;
alter table public.capcut_jobs enable row level security;

-- devices: 본인만 읽기/수정. 페어링 전(user_id IS NULL)은 익명 insert 허용.
drop policy if exists "capcut_devices owner read" on public.capcut_devices;
create policy "capcut_devices owner read"
  on public.capcut_devices for select
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "capcut_devices anon insert (pairing)" on public.capcut_devices;
create policy "capcut_devices anon insert (pairing)"
  on public.capcut_devices for insert
  with check (user_id is null);

drop policy if exists "capcut_devices owner update" on public.capcut_devices;
create policy "capcut_devices owner update"
  on public.capcut_devices for update
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "capcut_devices owner delete" on public.capcut_devices;
create policy "capcut_devices owner delete"
  on public.capcut_devices for delete
  using (auth.uid() = user_id);

-- jobs: 본인만
drop policy if exists "capcut_jobs owner all" on public.capcut_jobs;
create policy "capcut_jobs owner all"
  on public.capcut_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4) Realtime 구독 가능하게
alter publication supabase_realtime add table public.capcut_jobs;
alter publication supabase_realtime add table public.capcut_devices;

-- 5) Storage bucket — audio 임시 저장 (잘리고 분석 끝나면 helper가 삭제)
-- ⚠️ Dashboard → Storage 에서 직접 만들어주세요:
--    1. New bucket: capcut-audio
--    2. Private
--    3. RLS policy: 본인 user_id/* prefix만 read/write
--
-- 또는 아래 SQL 실행 (storage.buckets는 service_role 필요):
-- insert into storage.buckets (id, name, public) values ('capcut-audio', 'capcut-audio', false)
--   on conflict (id) do nothing;
--
-- Storage RLS (대시보드에서 다음 정책 추가):
-- - SELECT: bucket_id = 'capcut-audio' AND (storage.foldername(name))[1] = auth.uid()::text
-- - INSERT: bucket_id = 'capcut-audio' AND (storage.foldername(name))[1] = auth.uid()::text
-- - DELETE: bucket_id = 'capcut-audio' AND (storage.foldername(name))[1] = auth.uid()::text
