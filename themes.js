/* Theme table: glyphs + palette. Shared by the web build and the CLI.
   `pal` is the single source of colour — the browser turns it into CSS vars,
   the CLI turns it into truecolor ANSI. */

const fmtNum = n => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
function fmtClock(sec) {
  const s = Math.floor(sec);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}
const snake = s => s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();

const THEMES = {
  codex: {
    label: 'Codex',
    desc: 'gpt-5.6-sol',
    model: 'gpt-5.6-sol ultra fast',
    tab: true,
    ghost: 'implement {feature}',
    userPre: '» ',
    bullet: '• ',
    sub: '  └ ',
    textPre: '',
    thinkHdr: '• Thinking',
    tool: (name, arg) => `${name}${arg ? ' ' + arg : ''}`,
    editHdr: (f, a, d) => [`Edited ${f}`, ` (+${a} -${d})`],
    spin: (fr, label, s) => `${fr} ${label} (${fmtClock(s)} • esc to interrupt)`,
    spinFrames: ['·', '•', '●', '•'],
    interrupt: '• Interrupted by user (esc)',
    queued: n => `⏎ ${n} queued`,
    idle: 'Waiting for input',
    status: s => [
      `${s.model} · ${s.cwd} · ${s.branch}`,
      `${fmtClock(s.elapsed)} · ${fmtNum(s.tokens)} tokens · ${s.ctx}% context left`,
    ],
    pal: {
      synK: '#569cd6', synS: '#ce9178', synC: '#6a9955', synN: '#b5cea8',
      bg: '#171717', fg: '#cfcfcf', fgb: '#f2f2f2', dim: '#8a8a8a',
      accent: '#4ec9b0', think: '#9a9a9a', user: '#d4d4d4',
      rule: '#262626', rule2: '#3a3a3a', tabBg: '#262626', lnum: '#7a7a7a',
      addFg: '#9fdfae', addBg: 'rgba(60,160,90,.18)', addBgTerm: '#1d2c22',
      delFg: '#e79a9a', delBg: 'rgba(210,70,70,.16)', delBgTerm: '#2e1f1f',
    },
  },

  claude: {
    label: 'Claude Code',
    desc: 'claude-opus-5',
    model: 'claude-opus-5',
    box: true,
    banner: sc => ['✻ Welcome to Claude Code!', '', '  /help for help, /status for your setup', `  cwd: ${sc.cwd}`],
    ghost: 'Try "fix the failing auth test"',
    userPre: '> ',
    bullet: '● ',
    sub: '  ⎿  ',
    textPre: '',
    thinkHdr: '✻ Thinking…',
    tool: (name, arg) => `${name}(${arg || ''})`,
    editHdr: f => [`Update(${f})`, ''],
    editSub: (f, a, d) => `Updated ${f} with ${a} addition${a === 1 ? '' : 's'} and ${d} removal${d === 1 ? '' : 's'}`,
    spin: (fr, label, s) => `${fr} ${label}… (${Math.round(s)}s · ↓ ${fmtNum(Math.round(s * 180))} tokens · esc to interrupt)`,
    spinFrames: ['✻', '✳', '✢', '·', '✢', '✳'],
    interrupt: '  ⎿  Interrupted by user',
    queued: n => `⏸ ${n} message${n === 1 ? '' : 's'} queued`,
    idle: 'Waiting',
    status: s => [
      '  ⏵⏵ accept edits on (shift+tab to cycle)',
      `${s.ctx}% context left · ${fmtClock(s.elapsed)}`,
    ],
    pal: {
      synK: '#c9a3e8', synS: '#d9b48f', synC: '#77906f', synN: '#a8c6e8',
      bg: '#131316', fg: '#dcd9d4', fgb: '#f4f1ec', dim: '#7d7a74',
      accent: '#d97757', think: '#9a9691', user: '#a8a5a0',
      rule: '#26252a', rule2: '#4a474f', tabBg: '#26252a', lnum: '#6f6c66',
      addFg: '#a7d9a7', addBg: 'rgba(70,150,90,.16)', addBgTerm: '#1b271d',
      delFg: '#e0a0a0', delBg: 'rgba(200,80,80,.16)', delBgTerm: '#2b1d1d',
    },
  },

  gemini: {
    label: 'Gemini CLI',
    desc: 'gemini-2.5-pro',
    model: 'gemini-2.5-pro',
    box: true,
    banner: sc => ['✦ Gemini CLI  v0.9.4', '', `  ${sc.cwd}  ·  /help for commands  ·  @file to add context`],
    ghost: 'Type your message or @path/to/file',
    userPre: '> ',
    bullet: '✔ ',
    sub: '  ↳ ',
    textPre: '✦ ',
    thinkHdr: '✦ Thinking',
    tool: (name, arg) => `${name} ${arg || ''}`.trim(),
    editHdr: (f, a, d) => [`Edit ${f}`, ` (+${a} -${d})`],
    spin: (fr, label, s) => `${fr} ${label}... (esc to cancel, ${Math.round(s)}s)`,
    spinFrames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    interrupt: '✦ Request cancelled by user.',
    queued: n => `⏸ ${n} queued`,
    idle: 'Waiting for input',
    status: s => [
      `${s.cwd} (${s.branch}*)  no sandbox (see /docs)`,
      `${s.model} (${s.ctx}% context left)`,
    ],
    pal: {
      synK: '#8ab4f8', synS: '#f2b8c6', synC: '#5f7e6e', synN: '#c58af9',
      bg: '#0b0f19', fg: '#d3dcea', fgb: '#f0f5fb', dim: '#6d7d94',
      accent: '#8ab4f8', think: '#a3a0d8', user: '#c5d2e4',
      rule: '#1b2333', rule2: '#33405a', tabBg: '#162030', lnum: '#5b6b82',
      addFg: '#8fe0bd', addBg: 'rgba(60,160,120,.18)', addBgTerm: '#122a24',
      delFg: '#f0a0b0', delBg: 'rgba(230,90,110,.16)', delBgTerm: '#2c1a20',
    },
  },

  grok: {
    label: 'Grok CLI',
    desc: 'grok-4-fast',
    model: 'grok-4-fast',
    ghost: 'ask grok anything · /help for commands',
    userPre: '❯ ',
    bullet: '▸ ',
    sub: '  ↳ ',
    textPre: '',
    thinkHdr: '▸ reasoning',
    tool: (name, arg) => `${snake(name)}${arg ? ' ' + arg : ''}`,
    editHdr: (f, a, d) => [`edit_file ${f}`, ` (+${a} -${d})`],
    spin: (fr, label, s) => `${fr} ${label.toLowerCase()} ${fmtClock(s)} · esc to stop`,
    spinFrames: ['▖', '▘', '▝', '▗'],
    interrupt: '▸ stopped by user',
    queued: n => `⏸ ${n} queued`,
    idle: 'idle',
    status: s => [
      `${s.model} · ${s.cwd} · ${s.branch}`,
      `${fmtClock(s.elapsed)} · ${fmtNum(s.tokens)} tok`,
    ],
    pal: {
      synK: '#ffffff', synS: '#a8c7fa', synC: '#5c5c5c', synN: '#d0d0d0',
      bg: '#000000', fg: '#d6d6d6', fgb: '#ffffff', dim: '#7a7a7a',
      accent: '#ffffff', think: '#9b9b9b', user: '#c8c8c8',
      rule: '#202020', rule2: '#333333', tabBg: '#141414', lnum: '#666666',
      addFg: '#7ee0a1', addBg: 'rgba(45,150,90,.2)', addBgTerm: '#0f2418',
      delFg: '#f08a8a', delBg: 'rgba(220,60,60,.18)', delBgTerm: '#261212',
    },
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = { THEMES, fmtClock, fmtNum };
