#!/usr/bin/env node
/* Terminal version: same engine, same scenarios, ANSI instead of DOM.
   node cli.js --theme codex --time 10 --speed fast   ·   node cli.js --help */

const { THEMES } = require('./themes.js');
const { SCENARIOS, FOLLOWUPS, THINK_LABELS } = require('./scenarios.js');
const { createSession } = require('./engine.js');

/* ---------------------------------------------------------------- ansi bits */

const w = s => process.stdout.write(s);
const rgb = h => { const n = parseInt(h.slice(1), 16); return `${n >> 16 & 255};${n >> 8 & 255};${n & 255}`; };
const FG = h => `\x1b[38;2;${rgb(h)}m`;
const BG = h => `\x1b[48;2;${rgb(h)}m`;
const RESET = '\x1b[0m';
const COLS = () => process.stdout.columns || 80;
const ROWS = () => process.stdout.rows || 24;

// display width, so CJK and box glyphs do not break the padding
const dw = s => [...s].reduce((n, c) => n + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/.test(c) ? 2 : 1), 0);
function clip(s, max) {
  let outStr = '', n = 0;
  for (const c of s) { const cw = dw(c); if (n + cw > max) break; outStr += c; n += cw; }
  return outStr;
}

function styles(pal) {
  return {
    '': FG(pal.fg),
    dim: FG(pal.dim),
    bold: '\x1b[1m' + FG(pal.fgb),
    err: FG(pal.delFg),
    ok: FG(pal.addFg),
    thinking: '\x1b[3m' + FG(pal.think),
    user: FG(pal.user),
    accent: FG(pal.accent),
    spin: FG(pal.fgb),
    ln: FG(pal.lnum),
    'd-add': BG(pal.addBgTerm) + FG(pal.addFg),
    'd-del': BG(pal.delBgTerm) + FG(pal.delFg),
    'd-ctx': FG(pal.dim),
    'syn-k': FG(pal.synK),
    'syn-s': FG(pal.synS),
    'syn-c': '\x1b[3m' + FG(pal.synC),
    'syn-n': FG(pal.synN),
  };
}

/* ------------------------------------------------------------ ansi renderer */

function makeIO(theme, { plain }) {
  const pal = theme.pal, ST = styles(pal);
  const rules = theme.input === 'rules';
  const footerRows = rules ? 5 : 3;      // queue, [rule], input, [rule], status
  let queueLabel = '', inputView = { pre: '', buf: '', ghost: '' }, statusView = { left: '', right: '' };

  const region = () => {
    if (plain) return;
    w(`\x1b[1;${Math.max(2, ROWS() - footerRows)}r`);
    w(`\x1b[${Math.max(2, ROWS() - footerRows)};1H`);
  };

  function drawRow(row, text) {
    if (plain) return;
    w(`\x1b7\x1b[${row};1H\x1b[2K${text}${RESET}\x1b8`);
  }
  function drawFooter() {
    if (plain) return;
    const h = ROWS(), cols = COLS();
    let row = h - footerRows + 1;
    drawRow(row++, queueLabel ? FG(pal.accent) + clip(queueLabel, cols) : '');

    const rule = FG(pal.rule2) + '─'.repeat(cols);
    if (rules) drawRow(row++, rule);
    const { pre, buf, ghost } = inputView;
    // a band re-asserts its background after the caret and pads to the edge
    const band = theme.input === 'band' ? BG(pal.userBg) : '';
    const lead = theme.input === 'box' ? '│ ' : band ? ' ' : '';
    const g = ghost ? clip(ghost, cols - dw(lead + pre + buf) - 6) : '';
    const fill = band ? ' '.repeat(Math.max(0, cols - dw(lead + pre + buf + g) - 1)) : '';
    drawRow(row++, band + FG(pal.rule2) + lead + FG(pal.accent) + pre + FG(pal.fg) + buf
      + RESET + BG(pal.fg) + ' ' + RESET + band + FG(pal.dim) + g + fill);
    if (rules) drawRow(row++, rule);

    const { left, right } = statusView;
    const pad = Math.max(1, cols - dw(left) - dw(right) - 1);
    drawRow(row, FG(pal.dim) + clip(left, cols) + ' '.repeat(pad) + right);
  }

  if (!plain) {
    w('\x1b[?1049h\x1b[?25l\x1b[2J');
    region();
    process.stdout.on('resize', () => { region(); drawFooter(); });
  }

  return {
    chrome(sc, _theme, first) {
      if (theme.tab) w(`\n${FG(pal.addFg)}●${RESET} ${FG(pal.fgb)}${sc.branch}${RESET} ${FG(pal.dim)}✕${RESET}\n`);
      const banner = first && theme.banner?.(sc);
      // a '#rrggbb' class is a literal colour (logo art)
      const segs = l => (typeof l === 'string' ? [['dim', l]] : l)
        .map(([c, t]) => RESET + (c[0] === '#' ? FG(c) : ST[c] || ST['']) + t).join('');
      if (banner) w('\n' + banner.map(l => segs(l) + RESET).join('\n') + '\n');
      drawFooter();
    },

    line(rowCls) {
      const rowStyle = ST[rowCls] || '';
      // per-seg styles reset the row, so filled rows (diffs, user band) re-assert their background
      const bg = rowCls === 'd-add' ? BG(pal.addBgTerm) : rowCls === 'd-del' ? BG(pal.delBgTerm)
        : rowCls === 'user' && pal.userBg ? BG(pal.userBg) : '';
      const fill = !!bg;
      let len = 0;
      w('\n' + rowStyle);
      return {
        write(segs) {
          let s = '';
          // empty seg class means "inherit the row" — never the default fg
          for (const [cls, text] of segs) s += RESET + bg + (cls ? ST[cls] || rowStyle : rowStyle) + text;
          const width = segs.reduce((n, x) => n + dw(x[1]), 0);
          // pad filled rows so the background reaches the right edge, like the web build
          w(s + (fill ? ' '.repeat(Math.max(0, COLS() - width)) : '') + RESET);
        },
        append(txt) { len += dw(txt); w(txt); },
        set(txt) { w(`\r\x1b[2K${rowStyle}${clip(txt, COLS())}${RESET}`); len = dw(txt); },
        remove() { w(`\r\x1b[2K${len > COLS() ? '' : '\x1b[1A'}`); },
      };
    },

    gap() { w('\n'); },
    status(v) { statusView = v; drawFooter(); },
    input(v) { queueLabel = v.queueLabel; inputView = v; drawFooter(); },

    end() {
      if (!plain) w(`\x1b[r\x1b[?25h\x1b[?1049l`);
      w(RESET + '\n');
      process.exit(0);
    },
  };
}

/* --------------------------------------------------------------------- args */

const SPEEDS = { slow: 42, normal: 24, fast: 13, turbo: 6 };
const HELP = `
fake-ai — pretend an AI agent is hard at work in your terminal

  node cli.js [options]

  -t, --theme <name>       ${Object.keys(THEMES).join(' | ')}
  -T, --time <minutes>     how long to run (0 = forever, default 10)
  -s, --speed <name|ms>    ${Object.keys(SPEEDS).join(' | ')} or ms per char (default normal)
      --scenario <id>      run one scenario instead of shuffling all
      --no-effort          skip the long "thinking" stalls
      --plain              no alt screen / pinned footer (for piping)
  -l, --list               list scenarios and exit
  -h, --help               this

  esc          fake interrupt        type + enter   queue a message mid-run
  esc esc      quit                  ctrl-c         quit
`;

function parseArgs(argv) {
  const o = { theme: null, duration: 600, speed: 24, scenario: '*', effort: true, plain: !process.stdout.isTTY };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === '-h' || a === '--help') { console.log(HELP); process.exit(0); }
    else if (a === '-l' || a === '--list') {
      for (const s of SCENARIOS) console.log(`${s.id.padEnd(12)} ${s.title}`);
      process.exit(0);
    } else if (a === '-t' || a === '--theme') o.theme = next();
    else if (a === '-T' || a === '--time') o.duration = Math.round(Number(next()) * 60);
    else if (a === '-s' || a === '--speed') { const v = next(); o.speed = SPEEDS[v] ?? Number(v) ?? 24; }
    else if (a === '--scenario') o.scenario = next();
    else if (a === '--no-effort') o.effort = false;
    else if (a === '--plain') o.plain = true;
    else { console.error(`unknown option: ${a}`); process.exit(1); }
  }
  if (o.theme && !THEMES[o.theme]) { console.error(`unknown theme: ${o.theme}`); process.exit(1); }
  return o;
}

async function menu(cfg) {
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(q, r));
  const keys = Object.keys(THEMES);
  console.log('\n  fake-ai — 일하는 척 하기\n');
  keys.forEach((k, i) => console.log(`  ${i + 1}) ${THEMES[k].label.padEnd(14)} ${THEMES[k].desc}`));
  const t = await ask('\n  테마 [1]: ');
  cfg.theme = keys[(Number(t) || 1) - 1] || keys[0];
  const m = await ask('  시간(분, 0=무한) [10]: ');
  cfg.duration = Math.round((m.trim() === '' ? 10 : Number(m)) * 60);
  const s = await ask(`  속도 (${Object.keys(SPEEDS).join('/')}) [normal]: `);
  cfg.speed = SPEEDS[s.trim()] ?? 24;
  rl.close();
}

/* --------------------------------------------------------------------- main */

(async () => {
  const cfg = parseArgs(process.argv.slice(2));
  if (!cfg.theme && process.stdin.isTTY) await menu(cfg);
  cfg.theme = cfg.theme || 'claude';

  const theme = THEMES[cfg.theme];
  const io = makeIO(theme, { plain: cfg.plain });
  const session = createSession({
    theme, cfg, io,
    content: { scenarios: SCENARIOS, followups: FOLLOWUPS, thinkLabels: THINK_LABELS },
  });

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    process.stdin.on('data', d => {
      if (d === '\x03') return session.key({ type: 'kill' });
      if (d === '\x1b') return session.key({ type: 'esc' });
      if (d === '\r' || d === '\n') return session.key({ type: 'enter' });
      if (d === '\x7f' || d === '\b') return session.key({ type: 'back' });
      if (d.startsWith('\x1b')) return;                 // arrow keys etc
      for (const ch of d) if (ch >= ' ') session.key({ type: 'char', ch });
    });
  }
  process.on('SIGINT', () => session.key({ type: 'kill' }));

  await session.start();
})();
