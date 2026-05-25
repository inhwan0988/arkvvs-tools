# 캡컷 헬퍼 (Phase 2)

캡컷 데스크탑과 우리 웹앱을 실시간 연동하는 Electron 헬퍼 앱.

## 컨셉

```
캡컷 데스크탑                헬퍼 (이 앱)               웹앱 (arkvvs-tools)
─────────────────            ─────────────────         ─────────────────
사용자가 영상 import   →    프로젝트 폴더 watch  →    실시간 분석 UI
                                                     자막/포인트/효과음
                            audio 추출 (ffmpeg)   ←   검수 결과 sync
                            결과를 캡컷 폴더에 write
                       ←    .srt/효과음 파일 배치
캡컷 자동 갱신
```

## 기술 스택

- **Electron** (ark-clipper-main의 인프라 재활용)
- **chokidar** — 캡컷 폴더 file watcher
- **fluent-ffmpeg** + `@ffmpeg-installer/ffmpeg` — audio 추출
- **WebSocket** (Supabase Realtime client) — 웹앱과 양방향 sync
- **electron-updater** — 자동 업데이트 (ark-clipper와 동일)

## 캡컷 프로젝트 폴더 위치

```
macOS:   ~/Movies/CapCut/User Data/Projects/com.lveditor.draft/
Windows: %APPDATA%\CapCut\User Data\Projects\com.lveditor.draft\
```

각 프로젝트는 unique UUID 폴더 안에:
```
<project_uuid>/
├── draft_info.json       — 프로젝트 메타 (이름, 생성일 등)
├── draft_content.json    — 편집 정보 (세그먼트, 자막, 효과음 등) ★ Phase 3 대상
└── resources/            — 영상/오디오/이미지 파일들
    ├── video_clips/
    └── audios/
```

## Phase 2 구현 단계

### Step 1: Electron scaffold
- ark-clipper-main의 electron/main.js 기반으로 시작
- 매우 가벼운 helper (UI 최소, 백그라운드 실행)
- 시스템 트레이 아이콘으로 상태 표시

### Step 2: 캡컷 폴더 자동 감지
- macOS/Windows 별 위치 자동 detect
- 사용자가 수동 지정도 가능 (커스텀 경로)

### Step 3: 폴더 watcher
- chokidar로 새 프로젝트 감지
- 새 영상 import 감지 → 알림 + 처리 시작 옵션

### Step 4: audio 추출
- ffmpeg로 영상 → mp3 (64-128kbps)
- 임시 폴더에 저장

### Step 5: 웹앱 sync
- Supabase Realtime channel 가입
- 사용자가 웹앱 로그인하면 helper와 pairing
- audio 자동 업로드 → 처리 결과 받기

### Step 6: 캡컷 폴더에 결과 write
- .srt 자막 파일을 프로젝트 폴더의 resources/에
- 효과음 .mp3 파일들을 audios/에
- 가이드 텍스트를 readme.txt로
- 사용자가 캡컷에서 import만 하면 됨

## Phase 3 — 캡컷 .draft 자동 수정

`draft_content.json` 구조를 reverse engineering해서 자막/컷/효과음을 자동으로 timeline에 배치.

### 알려진 구조 (community 기반, 변경 가능)

```typescript
interface CapcutDraft {
  // 시간은 microseconds 단위
  duration: number;
  
  // 영상/오디오 트랙
  tracks: Track[];
  
  // 자막/텍스트
  texts: TextSegment[];
  
  // 효과음 (BGM 트랙 안에 segments)
  audios: AudioSegment[];
  
  // 영상 컷 (segments는 timeline 위 클립)
  segments: VideoSegment[];
}

interface TextSegment {
  id: string;
  start_time: number;  // microseconds
  duration: number;
  content: {
    text: string;
    font_size?: number;
    color?: string;
    // ... 캡컷 특화 styling
  };
}

interface AudioSegment {
  id: string;
  material_id: string;  // resources/ 안 파일 참조
  start_time: number;
  duration: number;
}
```

### Phase 3 작업

1. **실제 캡컷에서 sample 프로젝트 만들어 .draft 파일 분석**
   - 자막 1개 + 효과음 1개 + 컷 1개 있는 minimal 프로젝트
   - JSON spec dump
2. **draft-parser.ts** — 기존 draft 읽기
3. **draft-writer.ts** — 우리 분석 결과 → draft 수정
4. **검증**: 수정된 draft를 캡컷이 정상으로 인식하는지

⚠️ 위험: 캡컷 버전 업그레이드 시 spec 변경 → 매번 검증 필요.

## 시작 가이드 (사용자 자고 일어난 후)

```bash
cd apps/capcut-helper

# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 빌드 (Mac arm64)
npm run build:mac

# 빌드 (Windows)
npm run build:win
```

(npm 스크립트는 ark-clipper-main의 package.json을 참고해서 셋업 필요)
