-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- arkvvs.tools - profiles.tier 컬럼 추가
-- Supabase Dashboard → SQL Editor 에 붙여넣고 RUN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) tier 컬럼 추가 (free / premium)
alter table public.profiles
  add column if not exists tier text not null default 'free'
  check (tier in ('free', 'premium'));

-- 2) 기존 사용자 백필 (이미 default 'free'로 자동 채워졌지만 안전장치)
update public.profiles set tier = 'free' where tier is null;

-- 3) admin 계정은 자동 premium (관리자는 모든 툴 접근)
update public.profiles set tier = 'premium' where role = 'admin';

-- 4) handle_new_user 트리거 갱신 — 신규 가입자 기본 'free'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url, role, status, tier)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name'
    ),
    new.raw_user_meta_data->>'avatar_url',
    case when new.email = 'joshua@arkstudio.kr' then 'admin' else 'member' end,
    'approved',
    case when new.email = 'joshua@arkstudio.kr' then 'premium' else 'free' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 완료 확인:
-- select email, role, tier from public.profiles order by created_at desc;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
