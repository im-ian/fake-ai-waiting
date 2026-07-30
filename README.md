# Fake AI Working Screen

일하는 척할 때 쓰는 가짜 AI 에이전트 화면. [whitescreen 의 fake macOS update](https://www.whitescreen.online/fake-mac-os-x-update-screen/) 와 [hackertyper](https://hackertyper.net/) 의 AI CLI 버전.

테마 4개 (Codex / Claude Code / Gemini CLI / Grok CLI), 시나리오 10개, 한 글자씩 스트리밍, git diff 색상, effort 로딩 연출까지 전부 가짜. 네트워크 요청 0, 의존성 0.

## 웹

```bash
python3 -m http.server 8899   # 아무 정적 서버나
open http://localhost:8899
```

테마 / 시간 / 속도 / 시나리오 고르고 시작. 설정은 localStorage 에 남음.

GitHub Pages 배포: Settings → Pages → Source `Deploy from a branch` → 브랜치 root 선택. 빌드 단계 없음.

## CLI

```bash
node cli.js                                        # 대화형 메뉴
node cli.js --theme codex --time 10 --speed fast
node cli.js --list                                 # 시나리오 목록
node cli.js --help
```

## 조작

| 키 | 동작 |
|---|---|
| 아무 글자 + `Enter` | 메시지 큐에 적립 (`⏸ 1 message queued`) → 진행 중 작업 끝나면 그 문장 받아서 후속 턴 재생 |
| `Esc` | 가짜 인터럽트. 타이핑이 단어 중간에 끊기고 `Interrupted by user` 출력 후 입력 대기 |
| `Esc` `Esc` | 종료 (웹은 더블클릭도 종료) |
| `Ctrl-C` | CLI 종료 |

## 구조

| 파일 | 역할 |
|---|---|
| `scenarios.js` | 콘텐츠 템플릿. 시나리오 = 이벤트 배열 (`think` / `tool` / `diff` / `wait` / `text`) |
| `themes.js` | 테마별 글리프·상태줄·팔레트. 팔레트가 CSS 변수와 ANSI 색의 단일 출처 |
| `engine.js` | 재생 엔진. 타이핑 페이싱, 인터럽트, 큐. DOM/터미널 모름 |
| `app.js` | 웹 설정 화면 + DOM 렌더러 |
| `cli.js` | 터미널 렌더러 (truecolor ANSI, alt screen, 하단 고정 상태줄) |
| `selfcheck.js` | `node selfcheck.js` — 큐/인터럽트/diff 줄번호 검증 |

시나리오 추가는 `scenarios.js` 배열에 객체 하나 push. 테마 4개에 자동으로 렌더됨.

이벤트 형식:

```js
{ t: 'think', ms: 9200, lines: ['...'] }                    // 스피너 후 사고 과정 스트리밍
{ t: 'tool',  name: 'Bash', arg: 'pnpm test', out: ['...'], fail: true }
{ t: 'diff',  file: 'src/x.ts', add: 4, del: 2, start: 34,
              hunk: [[' ', 'ctx'], ['-', 'old'], ['+', 'new']] }
{ t: 'wait',  ms: 21000, label: 'Running the auth suite' }   // effort 로딩
{ t: 'text',  lines: ['...'] }
```
