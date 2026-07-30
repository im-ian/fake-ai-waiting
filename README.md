# Fake AI Working Screen

AI 에이전트가 한창 작업하는 터미널 화면을 재생해 주는 페이지입니다. [whitescreen 의 가짜 macOS 업데이트 화면](https://www.whitescreen.online/fake-mac-os-x-update-screen/) 과 [hackertyper](https://hackertyper.net/) 를 AI CLI 로 옮겼다고 보면 됩니다.

테마는 Codex, Claude Code, Gemini CLI, Grok CLI 네 가지이고, 시나리오 10개가 한 글자씩 흘러나옵니다. git diff 색상과 추론 대기 연출까지 들어 있지만 출력은 전부 미리 써 둔 스크립트라서, 네트워크 요청도 의존성도 없습니다.

## 웹

**https://im-ian.github.io/fake-ai-waiting/**

로컬에서 열어 보려면 정적 서버만 띄우면 됩니다.

```bash
python3 -m http.server 8899
open http://localhost:8899
```

테마, 재생 시간, 타이핑 속도, 시나리오를 고르고 시작하면 되고, 선택한 설정은 localStorage 에 남습니다.

GitHub Pages 로 배포할 때는 Settings → Pages → Source 에서 `Deploy from a branch` 를 고르고 브랜치의 root 를 지정하면 끝입니다. 빌드 단계가 없습니다.

## CLI

### 설치 없이 실행

Node 18 이상만 있으면 클론이나 install 없이 바로 실행할 수 있습니다.

```bash
npm exec --yes -- github:im-ian/fake-ai-waiting                        # 대화형 메뉴로 테마·시간·속도 선택
npm exec --yes -- github:im-ian/fake-ai-waiting -t codex -T 30 -s fast # 옵션을 주고 바로 시작
npm exec --yes -- github:im-ian/fake-ai-waiting --list                 # 시나리오 목록 보기
npm exec --yes -- github:im-ian/fake-ai-waiting --help
```

임시 디렉터리에 받아서 실행하기 때문에 두 번째 실행부터는 캐시가 남아 바로 뜹니다. `--yes` 는 첫 실행 때 나오는 설치 확인 프롬프트를 건너뛰기 위한 옵션입니다.

`npx` 로 쓰려면 `-c` 로 한 번 감싸야 합니다. npm 11 의 npx 는 git 주소를 npm 서브커맨드로 착각해서 `Unknown command` 를 내기 때문입니다 (npm 11.12.1 에서 확인).

```bash
npx -y --package git+https://github.com/im-ian/fake-ai-waiting.git -c "fake-ai -t claude -T 10"
```

### 클론해서 실행

```bash
git clone --depth 1 https://github.com/im-ian/fake-ai-waiting
cd fake-ai-waiting
node cli.js      # ./cli.js 도 됩니다
npm test         # selfcheck 실행
```

### 옵션

| 옵션 | 값 | 기본값 |
|---|---|---|
| `-t, --theme` | `codex` \| `claude` \| `gemini` \| `grok` | 생략하면 대화형 메뉴 |
| `-T, --time` | 분 단위, `0` 은 무한 | `10` |
| `-s, --speed` | `slow` \| `normal` \| `fast` \| `turbo` 또는 글자당 ms | `normal` |
| `--scenario` | 시나리오 id (`--list` 로 확인) | 전체를 섞어서 재생 |
| `--no-effort` | 추론하는 동안 오래 기다리는 연출을 생략 | 연출 포함 |
| `--plain` | alt screen 과 하단 고정줄 없이 평문으로 출력 | TTY 가 아니면 자동 적용 |
| `-l, --list` / `-h, --help` | 시나리오 목록 / 도움말 | |

터미널 크기를 바꾸면 하단 상태줄이 알아서 다시 자리를 잡고, `| tee log` 처럼 파이프로 넘기면 TTY 가 아니라 `--plain` 이 자동으로 적용됩니다.

## 조작

| 키 | 동작 |
|---|---|
| 아무 글자 + `Enter` | 입력한 문장이 큐에 쌓입니다 (`⏸ 1 message queued`). 진행 중인 작업이 끝나면 그 문장을 받아 다음 턴을 재생합니다 |
| `Esc` | 중단합니다. 타이핑이 단어 중간에서 끊기고 `Interrupted by user` 를 출력한 뒤 입력을 기다립니다 |
| `Esc` `Esc` | 종료합니다. 웹에서는 더블클릭으로도 나갈 수 있습니다 |
| `Ctrl-C` | CLI 를 종료합니다 |

## 구조

| 파일 | 역할 |
|---|---|
| `scenarios.js` | 콘텐츠 템플릿입니다. 시나리오 하나가 이벤트 배열(`think`, `tool`, `diff`, `wait`, `text`)로 되어 있습니다 |
| `themes.js` | 테마별 글리프와 상태줄, 팔레트입니다. 이 팔레트가 CSS 변수와 ANSI 색의 유일한 출처입니다 |
| `engine.js` | 재생 엔진입니다. 타이핑 속도, 중단, 큐만 다루고 DOM 이나 터미널은 알지 못합니다 |
| `app.js` | 웹 설정 화면과 DOM 렌더러입니다 |
| `cli.js` | 터미널 렌더러입니다. truecolor ANSI, alt screen, 하단 고정 상태줄을 씁니다 |
| `selfcheck.js` | `node selfcheck.js` 로 큐와 중단, diff 줄번호를 검증합니다 |

시나리오를 추가할 때는 `scenarios.js` 배열에 객체 하나만 넣으면 네 테마에 모두 렌더링됩니다.

이벤트 형식은 다음과 같습니다.

```js
{ t: 'think', ms: 9200, lines: ['...'] }                     // 스피너를 돌린 뒤 사고 과정을 스트리밍
{ t: 'tool',  name: 'Bash', arg: 'pnpm test', out: ['...'], fail: true }
{ t: 'diff',  file: 'src/x.ts', add: 4, del: 2, start: 34,
              hunk: [[' ', 'ctx'], ['-', 'old'], ['+', 'new']] }
{ t: 'wait',  ms: 21000, label: 'Running the auth suite' }    // 추론 대기 연출
{ t: 'text',  lines: ['...'] }
```
