# Fake AI Working Screen

일하는 척할 때 쓰는 가짜 AI 에이전트 화면. [whitescreen 의 fake macOS update](https://www.whitescreen.online/fake-mac-os-x-update-screen/) 와 [hackertyper](https://hackertyper.net/) 의 AI CLI 버전.

테마 4개 (Codex / Claude Code / Gemini CLI / Grok CLI), 시나리오 10개, 한 글자씩 스트리밍, git diff 색상, effort 로딩 연출까지 전부 가짜. 네트워크 요청 0, 의존성 0.

## 웹

**https://im-ian.github.io/fake-ai-waiting/**

로컬에서 열려면:

```bash
python3 -m http.server 8899   # 아무 정적 서버나
open http://localhost:8899
```

테마 / 시간 / 속도 / 시나리오 고르고 시작. 설정은 localStorage 에 남음.

GitHub Pages 배포: Settings → Pages → Source `Deploy from a branch` → 브랜치 root 선택. 빌드 단계 없음.

## CLI

### 무설치 실행 (npx)

Node 18+ 만 있으면 됨. 클론도 install 도 필요 없음.

```bash
npm exec --yes -- github:im-ian/fake-ai-waiting                        # 대화형 메뉴 (테마/시간/속도 질문)
npm exec --yes -- github:im-ian/fake-ai-waiting -t codex -T 30 -s fast # 바로 시작
npm exec --yes -- github:im-ian/fake-ai-waiting --list                 # 시나리오 목록
npm exec --yes -- github:im-ian/fake-ai-waiting --help
```

임시 디렉터리에 받아서 실행하고, 두 번째부터는 캐시라 바로 뜬다. `--yes` 는 첫 실행 설치 확인 프롬프트 생략용.

`npx` 를 쓰고 싶으면 `-c` 로 감싸야 한다. npm 11 의 npx 는 git 스펙을 npm 서브커맨드로 오인해서 `Unknown command` 를 내기 때문 (npm 11.12.1 확인):

```bash
npx -y --package git+https://github.com/im-ian/fake-ai-waiting.git -c "fake-ai -t claude -T 10"
```

### 클론해서 쓰기

```bash
git clone --depth 1 https://github.com/im-ian/fake-ai-waiting
cd fake-ai-waiting
node cli.js                  # 또는 ./cli.js
npm test                     # selfcheck
```

### 옵션

| 옵션 | 값 | 기본 |
|---|---|---|
| `-t, --theme` | `codex` \| `claude` \| `gemini` \| `grok` | 없으면 대화형 메뉴 |
| `-T, --time` | 분 단위. `0` = 무한 | `10` |
| `-s, --speed` | `slow` \| `normal` \| `fast` \| `turbo`, 또는 글자당 ms 숫자 | `normal` |
| `--scenario` | 시나리오 id (`--list` 로 확인) | 전체 셔플 |
| `--no-effort` | 긴 사고 대기(effort 연출) 생략 | 대기 있음 |
| `--plain` | alt screen·하단 고정줄 없이 평문 출력 | TTY 아니면 자동 |
| `-l, --list` / `-h, --help` | 목록 / 도움말 | |

### 조작

```
아무 글자 + Enter   메시지 큐에 적립 → 진행 중 작업 끝나면 받아서 이어감
Esc                 가짜 인터럽트 (타이핑 끊김 → 입력 대기)
Esc Esc / Ctrl-C    종료
```

터미널 크기 바뀌면 하단 상태줄 자동 재배치. 파이프로 넘기면(`| tee log`) TTY 가 아니라서 `--plain` 이 자동 적용됨.

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
