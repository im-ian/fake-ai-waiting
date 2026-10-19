/* Theme table: glyphs + palette. Shared by the web build and the CLI.
   `pal` is the single source of colour — the browser turns it into CSS vars,
   the CLI turns it into truecolor ANSI.

   Versions and models track the real CLIs as of 2026-10: Claude Code 2.1.303,
   Codex 0.163.0, Gemini CLI 0.64.0, Grok Build 1.0.62.

   banner lines are a plain string (dim) or a seg list [[cls, text], ...].
   input is how the prompt is framed: 'rules' (a line above and below),
   'band' (a filled bar in pal.userBg) or 'box' (a rounded border). */

const fmtNum = n => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
function fmtClock(sec) {
  const s = Math.floor(sec);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const clockNow = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
// scenarios name tools the Claude Code way; other CLIs label them in their own words
const verb = (names, name, arg) => `${names[name] ?? name}${arg ? ' ' + arg : ''}`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
// three-stop stand-in for Gemini's horizontal logo gradient
function gradient(line) {
  const c = [...line], k = Math.ceil(c.length / 3);
  return [['syn-k', c.slice(0, k).join('')], ['syn-n', c.slice(k, 2 * k).join('')], ['syn-s', c.slice(2 * k).join('')]];
}

const THEMES = {
  codex: {
    label: 'Codex',
    desc: 'gpt-6.1-sol',
    model: 'gpt-6.1-sol high',
    tab: true,
    input: 'band',
    banner: sc => [
      [['', '  '], ['dim', '>_ '], ['bold', 'OpenAI Codex'], ['dim', ' (v0.163.0)']],
      '     ' + sc.cwd,
    ],
    ghost: 'Implement {feature}',
    userPre: '› ',
    bullet: '• ',
    sub: '  └ ',
    textPre: '• ',
    thinkHdr: '• Thinking',
    tool: (name, arg) => verb({ Bash: 'Ran', Grep: 'Search', Write: 'Added', TodoWrite: 'Updated Plan' }, name, arg),
    editHdr: (f, a, d) => [`Edited ${f}`, ` (+${a} -${d})`],
    spin: (fr, label, s) => `${fr} ${label} (${fmtClock(s)} • esc to interrupt)`,
    spinFrames: ['·', '•', '●', '•'],
    done: s => `Worked for ${fmtClock(s)} • ${clockNow()}`,
    interrupt: '■ Conversation interrupted - use /feedback if something went wrong',
    queued: (n, q) => `↳ ${q[n - 1]}${n > 1 ? `  (+${n - 1})` : ''}`,
    idle: 'Waiting for input',
    status: s => [
      `${s.model} · ${s.cwd} · ${s.branch}`,
      `${s.ctx}% context left`,
    ],
    pal: {
      synK: '#569cd6', synS: '#ce9178', synC: '#6a9955', synN: '#b5cea8',
      bg: '#171717', fg: '#cfcfcf', fgb: '#f2f2f2', dim: '#8a8a8a',
      accent: '#4ec9b0', think: '#9a9a9a', user: '#d4d4d4', userBg: '#232323',
      rule: '#262626', rule2: '#3a3a3a', tabBg: '#262626', lnum: '#7a7a7a',
      addFg: '#9fdfae', addBg: 'rgba(60,160,90,.18)', addBgTerm: '#1d2c22',
      delFg: '#e79a9a', delBg: 'rgba(210,70,70,.16)', delBgTerm: '#2e1f1f',
    },
  },

  claude: {
    label: 'Claude Code',
    desc: 'claude-opus-5-5',
    model: 'Opus 5.5',
    input: 'rules',
    banner: sc => [
      [['accent', ' ▐▛███▜▌   '], ['bold', 'Claude Code'], ['dim', ' v2.1.303']],
      [['accent', '▝▜█████▛▘  '], ['dim', `${THEMES.claude.model} · Claude Max`]],
      [['accent', '  ▘▘ ▝▝    '], ['dim', sc.cwd]],
    ],
    ghost: 'Try "fix the failing auth test"',
    userPre: '❯ ',
    bullet: '⏺ ',
    sub: '  ⎿  ',
    textPre: '⏺ ',
    thinkHdr: '∴ Thinking…',
    lnWidth: 7,
    tool: (name, arg) => `${name}(${arg || ''})`,
    editHdr: f => [`Update(${f})`, ''],
    editSub: (f, a, d) => [a && `Added ${plural(a, 'line')}`, d && `removed ${plural(d, 'line')}`]
      .filter(Boolean).join(', ').replace(/^r/, 'R'),
    spin: (fr, label, s) => `${fr} ${label}… (${fmtClock(s)} · ↓ ${fmtNum(Math.round(s * 180))} tokens)`,
    spinFrames: ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'],
    verbs: [
      'Cogitating', 'Puttering', 'Churning', 'Noodling', 'Percolating', 'Marinating', 'Ruminating',
      'Moseying', 'Finagling', 'Schlepping', 'Sock-hopping', 'Reticulating', 'Simmering', 'Clauding',
    ],
    done: s => `✻ ${pickOne(['Churned', 'Cooked', 'Brewed', 'Baked', 'Crunched', 'Sautéed', 'Worked'])} for ${fmtClock(s)}`,
    interrupt: '  ⎿  Interrupted · What should Claude do instead?',
    queued: n => `⏸ ${n} message${n === 1 ? '' : 's'} queued`,
    idle: 'Waiting',
    status: s => [
      '  ⏵⏵ accept edits on (shift+tab to cycle)',
      `Context left until auto-compact: ${s.ctx}%`,
    ],
    pal: {
      synK: '#c9a3e8', synS: '#d9b48f', synC: '#77906f', synN: '#a8c6e8',
      bg: '#131316', fg: '#dcd9d4', fgb: '#f4f1ec', dim: '#8a8782',
      accent: '#d77757', think: '#9a9691', user: '#a8a5a0',
      rule: '#26252a', rule2: '#5c5a58', tabBg: '#26252a', lnum: '#6f6c66',
      addFg: '#a7d9a7', addBg: 'rgba(70,150,90,.16)', addBgTerm: '#1b271d',
      delFg: '#e0a0a0', delBg: 'rgba(200,80,80,.16)', delBgTerm: '#2b1d1d',
    },
  },

  gemini: {
    label: 'Gemini CLI',
    desc: 'gemini-3.1-pro-preview',
    model: 'gemini-3.1-pro-preview',
    input: 'band',
    banner: () => [
      ...[
        ' ▝▜▄      ▗█▀▀▜▙▝█▛▀▀▌▜██▖▟██▘▜█▘▜██▖▝█▛▝█▛',
        '   ▝▜▄    █▌     █▙▟  ▐█▝█▛▐█ ▐█ ▐█▝█▖█▌ █▌',
        '  ▗▟▀     ▜▙ ▝█▛ █▌▝ ▖▐█   ▐█ ▐█ ▐█ ▝██▌ █▌',
        ' ▝▀        ▀▀▀▀▘▝▀▀▀▀▘▀▀▘  ▀▀▘▀▀▘▀▀▘ ▝▀▀▝▀▀',
      ].map(gradient),
      '',
      [['bold', ' Gemini CLI'], ['dim', ' v0.64.0']],
      '',
      'Tips for getting started:',
      '1. Create GEMINI.md files to customize your interactions',
      '2. /help for more information',
      '3. Ask coding questions, edit code or run commands',
      '4. Be specific for the best results',
    ],
    ghost: 'Type your message or @path/to/file',
    userPre: '> ',
    bullet: '✓  ',
    sub: '    ',
    textPre: '✦ ',
    thinkHdr: ' Thinking...',
    thinkPre: ' │ ',
    tool: (name, arg) => verb({ Bash: 'Shell', Read: 'ReadFile', Grep: 'SearchText', Write: 'WriteFile', TodoWrite: 'WriteTodos' }, name, arg),
    editHdr: (f, a, d) => [`Edit ${f}`, ` → Accepted (+${a}, -${d})`],
    spin: (fr, label, s) => `${fr} ${label}... (esc to cancel, ${fmtClock(s)})`,
    spinFrames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    interrupt: 'ℹ Request cancelled.',
    queued: n => `⏸ ${n} queued`,
    idle: 'Waiting for input',
    status: s => [
      `${s.cwd} (${s.branch}*)    no sandbox`,
      `${s.model}    ${100 - s.ctx}% used`,
    ],
    pal: {
      synK: '#8ab4f8', synS: '#f2b8c6', synC: '#5f7e6e', synN: '#c58af9',
      bg: '#0b0f19', fg: '#d3dcea', fgb: '#f0f5fb', dim: '#6d7d94',
      accent: '#8ab4f8', think: '#a3a0d8', user: '#c5d2e4', userBg: '#151c2b',
      rule: '#1b2333', rule2: '#33405a', tabBg: '#162030', lnum: '#5b6b82',
      addFg: '#8fe0bd', addBg: 'rgba(60,160,120,.18)', addBgTerm: '#122a24',
      delFg: '#f0a0b0', delBg: 'rgba(230,90,110,.16)', delBgTerm: '#2c1a20',
    },
  },

  grok: {
    label: 'Grok Build',
    desc: 'grok-4.7',
    model: 'Grok 4.7 (xhigh)',
    input: 'box',
    banner: sc => [
      [['bold', 'Grok Build'], ['dim', '  1.0.62']],
      sc.cwd,
      '',
      'Tip: Use Ctrl+Enter to interject messages. Or just Enter to queue messages.',
    ],
    ghost: '',
    userPre: '❯ ',
    bullet: '◈ ',
    sub: '  ↳ ',
    textPre: '',
    thinkHdr: '◆ Thinking…',
    thinkPre: '┃  ',
    tool: (name, arg) => verb({ Bash: 'Ran', Grep: 'Searched', Write: 'Created', TodoWrite: 'Updated todos' }, name, arg),
    editHdr: (f, a, d) => [`Edited ${f}`, ` +${a} -${d}`],
    spin: (fr, label, s) => `${fr} ${label}… ${s.toFixed(1)}s   ⇣${fmtNum(Math.round(s * 240))} [stop]`,
    spinFrames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    verbs: ['Thinking', 'Waiting for response'],
    done: s => `Worked for ${fmtClock(s)}`,
    interrupt: '◆ Cancelled',
    queued: n => `▾ Queued ${n}`,
    idle: 'Waiting for input',
    status: s => [
      'Shift+Tab:mode  │  Ctrl+c:cancel  │  Ctrl+x:shortcuts',
      `${s.model} · ${fmtNum(s.tokens)} / 256K`,
    ],
    pal: {
      synK: '#bb9af7', synS: '#9ece6a', synC: '#565f89', synN: '#ff9e64',
      bg: '#141414', fg: '#c8c8c8', fgb: '#e1e1e1', dim: '#6c6c6c',
      accent: '#e1e1e1', think: '#929292', user: '#e1e1e1', userBg: '#242424',
      rule: '#2a2a2a', rule2: '#505058', tabBg: '#1e1e1e', lnum: '#585858',
      addFg: '#9ece6a', addBg: 'rgba(158,206,106,.12)', addBgTerm: '#1f2a17',
      delFg: '#f7768e', delBg: 'rgba(247,118,142,.12)', delBgTerm: '#2c1a1e',
    },
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = { THEMES, fmtClock, fmtNum };
