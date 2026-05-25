# Phase 3 — 캡컷 .draft 파일 reverse engineering 가이드

## 목표
사용자 분석 결과 (자막 + 무음 컷 + 포인트 자막 + 효과음)를
캡컷 프로젝트 파일에 직접 write back → 사용자가 캡컷 열어서 import만 하면 완성된 상태.

## 사용자 자고 일어난 후 진행 순서

### Step 1: 환경 준비 (10분)
- 본인 PC에 캡컷 desktop 설치
- 캡컷 desktop에서 "minimal 프로젝트" 1개 만들기:
  - 영상 1개 (10초)
  - 자막 1줄 ("테스트")
  - 효과음 1개 (캡컷 기본 라이브러리)
  - 컷 1개 (중간 무음 잘라내기)
- 프로젝트 저장 + 캡컷 종료

### Step 2: draft 파일 분석 (30분)
```bash
# macOS
open ~/Movies/CapCut/User\ Data/Projects/com.lveditor.draft/
# 가장 최근 폴더 (uuid) 안의 draft_content.json 복사
```

JSON 구조 살펴보기:
- `tracks` 배열의 각 track type (video/audio/text)
- 각 track의 `segments`
- `materials` (영상/오디오 파일 reference)
- 시간 단위는 microseconds (1초 = 1,000,000)

### Step 3: parser/writer 구현 (1-2일)
- `apps/capcut-helper/electron/capcut-draft.js` 보강
- 알려진 spec으로 `buildSubtitleSegment` 등 구현
- minimal 프로젝트로 read → modify → write → 캡컷 재시작 → 정상 인식 확인

### Step 4: 통합 (1-2일)
- Helper app: 분석 결과 받으면 → capcut-draft.js의 `applyToCapcutDraft()`
- 사용자가 캡컷 reopen → 모든 게 적용된 상태로 표시

## 알려진 정보 (community 기반, 검증 필요)

### 파일 위치
```
macOS:   ~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<uuid>/
Windows: %APPDATA%\CapCut\User Data\Projects\com.lveditor.draft\<uuid>\
```

### 주요 파일
```
<uuid>/
├── draft_info.json          — 메타 (이름, 생성일)
├── draft_content.json       — 편집 데이터 ★ 핵심
├── draft_meta_info.json     — 캡컷 내부 메타
├── draft_cover.jpg          — 썸네일
└── resources/
    ├── video_clips/         — import한 영상
    ├── audios/              — 오디오/효과음
    └── images/              — 이미지
```

### draft_content.json 추정 구조
```json
{
  "duration": 60000000,       // microseconds (60초)
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "tracks": [
    {
      "id": "...",
      "type": "video",
      "segments": [
        {
          "id": "...",
          "material_id": "...",     // resources/video_clips/ 파일
          "source_timerange": { "start": 0, "duration": 10000000 },
          "target_timerange": { "start": 0, "duration": 10000000 },
          "speed": 1.0
        }
      ]
    },
    {
      "id": "...",
      "type": "audio",
      "segments": [ /* 효과음 segments */ ]
    },
    {
      "id": "...",
      "type": "text",
      "segments": [ /* 자막 segments */ ]
    }
  ],
  "materials": {
    "videos": [],
    "audios": [],
    "texts": [],
    "stickers": []
  }
}
```

## 주의 사항

⚠️ **캡컷 버전 의존성**:
- ByteDance가 spec을 자주 변경
- 사용자별로 캡컷 버전이 다를 수 있음
- 우리 helper가 작동하지 않는 버전 발생 가능

대응:
- 알려진 호환 버전 명시 (e.g., 5.0.0 ~ 6.x)
- 버전 detect → 미지원 버전이면 fallback (.srt + 가이드만 export)
- 사용자 피드백 받아 버전 spec 누적

⚠️ **ToS 위반 가능성**:
- ByteDance가 third-party 자동화를 명시적으로 차단하지는 않음 (확인된 한)
- 다만 우려된다면 helper를 별도 product로 분리

## Phase 3 완성 후 마케팅 포인트

"캡컷 켜놓고 영상만 import하면 자막 + 컷 + 포인트 + 효과음이 자동으로 다 적용된 상태"
→ Submagic 같은 경쟁사보다 한 단계 앞선 UX
→ 한국 시장 unique (Submagic은 영어 위주)
