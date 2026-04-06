# Claude Cursor Pets

Claude Code 활성 세션 수만큼 캐릭터가 마우스를 따라다니는 데스크톱 펫입니다.

![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)

## Features

- **세션 자동 감지** — `~/.claude/projects/`의 로그 파일 변경을 감지하여 활성 세션 수만큼 펫 생성
- **커서 추종** — 펫들이 마우스를 따라다니며, 뒤쪽 펫일수록 느긋하게 따라오는 꼬리 효과
- **멀티 모니터 지원** — 모니터마다 투명 오버레이를 생성하여 어느 화면에서든 동작
- **6가지 색상** — 주황, 보라, 파랑, 골드, 초록, 로즈 순환 적용
- **커스텀 캐릭터** — 트레이 메뉴에서 원하는 SVG로 캐릭터 변경 가능
- **시스템 트레이** — 숨기기/보이기, 재시작, 종료 등 간편 제어

## How It Works

```
SessionWatcher (1초 폴링)           마우스 위치 (16ms 폴링)
  ~/.claude/projects/*.jsonl            │
         │                              │
    session-count                  mouse-move
         │                              │
         ▼                              ▼
      main.js ── IPC (preload.js) ──► overlay.html
                                        │
                                   Pet 인스턴스들
                                   (lerp 추종 애니메이션)
```

1. **SessionWatcher**가 Claude Code의 프로젝트 로그 폴더를 1초마다 확인합니다
2. `.jsonl` 파일의 수정 시간이 최근 20초 이내에 변했으면 활성 세션으로 판별합니다
3. 세션 수가 바뀌면 Electron 메인 프로세스가 렌더러에 전파합니다
4. 렌더러는 세션 수만큼 Pet 객체를 생성/제거하고, 60fps로 커서를 추종합니다

## Install & Run

```bash
npm install
npm start
```

## Tech Stack

- **Electron** — 투명 오버레이 윈도우, 시스템 트레이, 멀티 모니터
- **Chokidar** — 파일 시스템 감시
