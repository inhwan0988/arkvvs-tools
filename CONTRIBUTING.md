# ARK Tools — 팀 협업 가이드

3명이 각자 PC에서 Claude Code로 같은 repo를 작업합니다.

## 🟢 첫 셋업 (한 번만, 10분)

### 1) Mac/Win 공통 — 필수 도구
```bash
# 이미 있으면 skip
brew install gh node pnpm   # Mac
# Windows: winget install GitHub.cli OpenJS.NodeJS pnpm.pnpm
```

Claude Code는 각자 이미 설치되어 있다고 가정.

### 2) repo clone
```bash
gh auth login   # 한 번만
gh repo clone inhwan0988/arkvvs-tools ~/arkvvs-tools
cd ~/arkvvs-tools
pnpm install
```

### 3) 환경 변수 받기
joshua가 1Password 또는 Doppler로 공유. `.env.local` 만들기:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # dev에만 필요
YOUTUBE_API_KEY=...
```
**절대 commit 하지 말 것** (.gitignore에 이미 있음).

### 4) Claude Code 실행
```bash
claude
```
자동으로 `CLAUDE.md` 읽고 도메인 컨벤션 적용됨.

## 🌳 작업 흐름 — git worktree (충돌 0)

같은 repo에서 여러 명이 동시 작업할 때:

```bash
# 1. 작업할 branch 만들기
git worktree add ../arkvvs-feat-userpage -b feat/<이름>-<task>

# 2. 그 폴더에서 Claude 실행 (별도 dev server, 충돌 X)
cd ../arkvvs-feat-userpage
claude

# 3. 다 끝나면
git push -u origin feat/<이름>-<task>
gh pr create

# 4. worktree 제거
cd ~/arkvvs-tools
git worktree remove ../arkvvs-feat-userpage
```

장점:
- 메인 `~/arkvvs-tools`는 `main` 그대로 유지
- 각 worktree마다 `.next` 캐시 별도 → dev/build 충돌 0
- 여러 task 동시 진행 가능

## 🧠 Claude Code 활용 패턴

### 큰 작업은 plan mode 먼저
```
사용자: "관리자 페이지에 사용자 차단 기능 추가해줘"
→ Claude가 plan 출력 → 사용자 검토 → 코딩
```

### subagent 활용
- DB 작업: "supabase-rls subagent로 검토해줘"
- PR 만들기 전: "code-reviewer로 자체 검토"
- 새 도구: `/new-tool` 명령

### 절대 금지 (CLAUDE.md에도 명시)
- `pnpm dev` 도는 중에 `pnpm build` 실행
- production DB에 직접 `supabase db push`
- API key, .env를 commit
- main에 직접 push (branch protection으로 차단됨)

## 📝 PR 만들기 (1줄로 끝)

### Branch 이름
- `feat/<이름>-<task>`: 새 기능
- `fix/<이름>-<task>`: 버그 fix
- `chore/<이름>-<task>`: 리팩토링, 의존성 등

### Commit 메시지
첫 줄 50자 이내, 한국어 OK.
예: `feat(spread): AI 캡션 플랫폼별 변환`

### PR 생성 — 한 줄
```bash
git push -u origin HEAD && gh pr create --fill
```

자동으로 일어나는 일:
- ✅ GitHub Actions가 `tsc --noEmit` + `lint` 검증 (CI 통과 필수)
- ✅ Vercel preview URL 생성
- ✅ **`auto-merge` 라벨 자동 부착** (`.github/workflows/auto-merge.yml`)
- ✅ **GitHub native auto-merge 자동 활성화** — CI 통과 + approve 1명 받는 즉시 자동 squash merge + branch 삭제
- ✅ **main 변경 시 PR branch 자동 update** (`.github/workflows/auto-update-pr.yml`) — stale 충돌 자동 해소

### 직원이 신경 쓸 일 = 0
- 라벨 안 붙여도 됨 (워크플로우가 자동)
- `gh pr merge --auto` 안 쳐도 됨 (자동)
- main pull 매번 안 해도 됨 (GitHub 쪽은 자동)

### 다른 직원 approve만 1명 필요
- 직원 A의 PR → 직원 B 또는 joshua가 "Approve" 1번
- joshua가 본인 PR을 만들면 → 직원이 approve

### 단, 본인 PC에서는
```bash
# 새 branch 시작할 때만 main 동기화 권장
git checkout main && git pull
git checkout -b feat/<task>
```
이거 빠뜨려도 GitHub Action이 PR을 자동 update하지만, 본인 local과 origin이 어긋나서 다음 push 시 reject될 수 있음. 그때 `git pull --rebase origin <branch>` 한 번.

## 🚦 권한 매트릭스

| 역할 | GitHub | Vercel | Supabase | Doppler |
|---|---|---|---|---|
| joshua | Admin | Owner | Owner | Owner |
| 직원 (개발) | Write | Developer | Developer (dev branch만) | Dev |
| 직원 (운영) | Read | Viewer | Editor (dashboard) | - |

위험한 작업은 joshua만 가능 (production DB migration, env 변경 등).

## 🎯 일상 워크플로우 예시

**아침**
1. `cd ~/arkvvs-tools && git pull origin main`
2. Linear 또는 GitHub Issues에서 본인 할당 task 확인
3. `git worktree add ../arkvvs-feat-... -b feat/<task>`

**작업**
4. `cd ../arkvvs-feat-...` 후 `claude`
5. plan → 코딩 → `npx tsc --noEmit`로 검증
6. commit 자주, 의미 있게

**저녁**
7. `gh pr create`
8. joshua review 받기
9. Slack #dev 채널에 PR 링크 공유

## ❓ 자주 묻는 것

**Q. dev 서버 동시에 여러 명 켜도 되나?**
A. 같은 worktree에서는 X. 각자 worktree에 별도 폴더면 OK (포트 자동 할당).

**Q. Supabase 마이그레이션 어떻게?**
A. `supabase/<name>.sql` 파일로 PR. main merge 후 joshua가 production에 실행. dev DB는 자동 (joshua가 셋업).

**Q. API key 어떻게 받나?**
A. joshua에게 1Password 초대 요청 또는 Doppler 가입 안내.

**Q. 막혔을 때?**
A. Slack #dev에 질문 + Claude에게 `code-reviewer subagent로 분석해줘`.
