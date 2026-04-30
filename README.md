# arkvvs.tools

크리에이터를 위한 AI 툴킷. 로그인한 수강생만 사용 가능한 멀티-툴 대시보드.

**Live**: https://tools.arkvvs.ai (배포 후)

---

## 🧩 포함된 툴

| 툴 | 설명 | 상태 |
|---|---|---|
| YouTube 세팅 툴 | 스크립트 → 제목 · 썸네일 · 설명란 · SEO 키워드 자동 생성 | ✅ Live |
| (다음 툴) | — | 🔜 Soon |

새 툴 추가는 `lib/tools/registry.ts` 에 항목만 추가하면 사이드바·대시보드에 자동 노출됩니다.

---

## 🛠 기술 스택

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Auth**: Supabase Auth (Kakao + Google OAuth)
- **AI**: Anthropic Claude / OpenAI GPT — 사용자 BYOK 방식
- **Styling**: Tailwind CSS (토스 스타일)
- **Deploy**: Vercel

---

## 🚀 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 복사 후 채우기
cp .env.local.example .env.local
# → NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 입력

# 3. 개발 서버
npm run dev
# http://localhost:3000
```

---

## ⚙️ Supabase 설정 (최초 1회)

### 1) 프로젝트 생성
1. https://supabase.com → New project
2. Settings → API → URL · anon key 복사 → `.env.local`

### 2) Google OAuth 활성화
1. Google Cloud Console → OAuth 2.0 Client ID 생성
   - Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
2. Supabase → Authentication → Providers → Google 토글 ON → Client ID/Secret 입력

### 3) Kakao OAuth 활성화
1. Kakao Developers (https://developers.kakao.com) → 앱 생성
2. 카카오 로그인 활성화 → Redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
3. 동의항목: 닉네임 · 카카오계정(이메일) — 필수
4. Supabase → Authentication → Providers → Kakao 토글 ON → REST API key (Client ID), Client Secret 입력

### 4) Site URL / Redirect URLs
Supabase → Authentication → URL Configuration:
- **Site URL**: `https://tools.arkvvs.ai` (프로덕션) 또는 `http://localhost:3000`
- **Redirect URLs**: 위 두 개 모두 추가

---

## 🌐 Vercel 배포

```bash
# 1. GitHub 레포 만들고 push
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

1. https://vercel.com → Import Project → 레포 선택
2. **Environment Variables** 등록:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

### 도메인 연결 (tools.arkvvs.ai)
1. Vercel → Project → Settings → Domains → `tools.arkvvs.ai` 추가
2. DNS 제공자(Cloudflare/가비아 등)에서 CNAME 설정:
   - `tools` → `cname.vercel-dns.com`
3. 배포 완료 후 Supabase Site URL을 `https://tools.arkvvs.ai` 로 변경

---

## 📁 디렉토리 구조

```
.
├── app/
│   ├── (auth)/login/        ← 카카오/구글 로그인
│   ├── (dashboard)/          ← 인증 필수 영역
│   │   ├── layout.tsx        ← 사이드바 + 헤더
│   │   ├── page.tsx          ← 대시보드 홈 (툴 카드)
│   │   └── tools/
│   │       └── youtube-setup/
│   ├── api/tools/youtube-setup/generate/  ← AI 호출 API
│   └── auth/callback/        ← OAuth 콜백
├── components/
│   ├── dashboard/{Sidebar, Header}
│   └── tools/youtube-setup/{ScriptInput, ResultPanel, SettingsBar}
├── lib/
│   ├── supabase/{client, server, middleware}.ts
│   └── tools/
│       ├── registry.ts       ← 툴 메타데이터 (여기 추가하면 사이드바 자동 갱신)
│       └── youtube-setup/{prompts, claude, openai, types}.ts
└── middleware.ts             ← 비로그인 → /login 강제 리다이렉트
```

---

## ➕ 새 툴 추가하기

1. `lib/tools/<slug>/` 에 로직 파일 작성
2. `app/(dashboard)/tools/<slug>/page.tsx` 에 UI
3. `app/api/tools/<slug>/.../route.ts` 에 API
4. `lib/tools/registry.ts` 에 항목 추가:
   ```ts
   { slug: "<slug>", name: "...", description: "...", emoji: "...",
     href: "/tools/<slug>", status: "live", color: "bg-brandSoft" }
   ```

자동으로 사이드바·대시보드 카드에 노출됩니다.

---

## 🔐 보안 메모

- API 키는 사용자 브라우저 localStorage 에만 저장 (BYOK)
- Supabase RLS 비활성 — 현재는 인증 통과 = 모든 툴 사용 가능
- 추후 사용량 제한·결제 도입 시 `users` 테이블 + RLS 정책 추가 예정
