-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- arkvvs.tools - Supabase 스키마
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) profiles 테이블
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'approved' check (status in ('approved', 'banned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  banned_at timestamptz,
  banned_by uuid references auth.users on delete set null
);

-- 2) RLS 활성화
alter table public.profiles enable row level security;

-- 3) is_admin 헬퍼 함수 (security definer 로 RLS 우회 → 무한 재귀 방지)
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

-- 4) RLS 정책
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "admins read all" on public.profiles;
create policy "admins read all"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

drop policy if exists "admins update all" on public.profiles;
create policy "admins update all"
  on public.profiles for update
  using (public.is_admin(auth.uid()));

-- 5) 신규 사용자 자동 등록 트리거
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url, role, status)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name'
    ),
    new.raw_user_meta_data->>'avatar_url',
    case when new.email = 'joshua@arkstudio.kr' then 'admin' else 'member' end,
    'approved'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) updated_at 자동 갱신 트리거
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 7) 기존 가입자 백필 (이미 로그인한 사람들 profile 채우기)
insert into public.profiles (id, email, name, avatar_url, role, status)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name'),
  u.raw_user_meta_data->>'avatar_url',
  case when u.email = 'joshua@arkstudio.kr' then 'admin' else 'member' end,
  'approved'
from auth.users u
on conflict (id) do nothing;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 완료. profiles 테이블 확인:
-- select * from public.profiles;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
