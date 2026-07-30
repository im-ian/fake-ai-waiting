/* Browser front end: config screen + a DOM renderer for the shared engine. */

const $ = sel => document.querySelector(sel);
const stage = $('#stage'), out = $('#out'), top_ = $('#top'), bottom = $('#bottom'), hint = $('#hint');
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

let session = null;

/* ------------------------------------------------------------ DOM renderer */

const domIO = {
  chrome(sc, theme, first) {
    // tab bar is real chrome and stays put; the welcome banner is transcript,
    // printed once at launch and scrolled away after that
    top_.innerHTML = theme.tab
      ? `<div class="tabbar"><div class="tab"><span class="live">●</span>${esc(sc.branch)}<span class="x">✕</span></div></div>`
      : '';
    const banner = first && (typeof theme.banner === 'function' ? theme.banner(sc) : theme.banner);
    if (banner) {
      const el = document.createElement('div');
      el.className = 'banner';
      el.innerHTML = banner.map((l, i) => `<div${i === 0 ? ' class="big"' : ''}>${esc(l)}</div>`).join('');
      out.appendChild(el);
    }
    if (!bottom.firstChild) {
      bottom.innerHTML = `
        <div class="promptbox">
          <div class="line queue dim" hidden></div>
          <div class="line inputline${theme.box ? ' inputbox' : ''}"><span class="pre accent"></span><span class="buf"></span><span class="caret">&nbsp;</span><span class="ghost dim"></span></div>
        </div>
        <div class="statusbar"><span class="left"></span><span class="right"></span></div>`;
      domIO.el = {
        queue: bottom.querySelector('.queue'),
        pre: bottom.querySelector('.pre'),
        buf: bottom.querySelector('.buf'),
        ghost: bottom.querySelector('.ghost'),
        left: bottom.querySelector('.left'),
        right: bottom.querySelector('.right'),
      };
    }
  },

  line(rowCls) {
    const el = document.createElement('div');
    el.className = 'line ' + rowCls;
    out.appendChild(el);
    while (out.children.length > 600) out.firstChild.remove();
    out.scrollTop = out.scrollHeight;
    return {
      write(segs) {
        el.innerHTML = segs.map(([cls, text]) =>
          cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text)).join('');
        out.scrollTop = out.scrollHeight;
      },
      append(txt) { el.textContent += txt; out.scrollTop = out.scrollHeight; },
      set(txt) { el.textContent = txt; out.scrollTop = out.scrollHeight; },
      remove() { el.remove(); },
    };
  },

  gap() {
    const el = document.createElement('div');
    el.className = 'line gap';
    out.appendChild(el);
    out.scrollTop = out.scrollHeight;
  },

  status({ left, right }) {
    if (!domIO.el) return;
    domIO.el.left.textContent = left;
    domIO.el.right.textContent = right;
  },

  input({ pre, buf, ghost, queueLabel }) {
    if (!domIO.el) return;
    domIO.el.pre.textContent = pre;
    domIO.el.buf.textContent = buf;
    domIO.el.ghost.textContent = ghost;
    domIO.el.queue.hidden = !queueLabel;
    domIO.el.queue.textContent = queueLabel;
  },

  end() { leave(); },
};

/* ------------------------------------------------------------------ session */

function begin(cfg) {
  const theme = THEMES[cfg.theme];
  stage.hidden = false;
  $('#config').hidden = true;
  out.innerHTML = '';
  bottom.innerHTML = '';
  domIO.el = null;
  for (const [k, v] of Object.entries(theme.pal)) {
    stage.style.setProperty('--' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), v);
  }
  hint.classList.remove('fade');
  setTimeout(() => hint.classList.add('fade'), 5000);
  if (cfg.fullscreen && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  session = createSession({
    theme, cfg, io: domIO,
    content: { scenarios: SCENARIOS, followups: FOLLOWUPS, thinkLabels: THINK_LABELS },
  });
  session.start();
}

function leave() {
  session = null;
  stage.hidden = true;
  $('#config').hidden = false;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

addEventListener('keydown', e => {
  if (!session) return;
  if (e.key === 'Escape') { e.preventDefault(); return session.key({ type: 'esc' }); }
  if (e.key === 'Enter') { e.preventDefault(); return session.key({ type: 'enter' }); }
  if (e.key === 'Backspace') { e.preventDefault(); return session.key({ type: 'back' }); }
  if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) return session.key({ type: 'esc' });
  if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    session.key({ type: 'char', ch: e.key });
  }
});
// double click also leaves — the browser eats Esc for fullscreen on some setups
stage.addEventListener('dblclick', () => session?.key({ type: 'kill' }));

/* ------------------------------------------------------------- config screen */

const LS = 'fake-ai-cfg';
const cfg = Object.assign(
  { theme: 'claude', duration: 600, speed: 24, scenario: '*', fullscreen: true, effort: true },
  JSON.parse(localStorage.getItem(LS) || '{}')
);

$('#pick-theme').innerHTML = Object.entries(THEMES).map(([k, t]) => `
  <button class="card" data-val="${k}" style="--card-accent:${t.pal.accent}">
    <span class="name"><span class="dot"></span>${t.label}</span>
    <span class="desc">${t.desc}</span>
  </button>`).join('');

$('#pick-scenario').innerHTML =
  `<option value="*">전체 시나리오 무작위 재생 (${SCENARIOS.length}개)</option>` +
  SCENARIOS.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join('');

function bindPicker(sel, key, cast = String) {
  const root = $(sel);
  const paint = () => root.querySelectorAll('[data-val]').forEach(b =>
    b.classList.toggle('on', cast(b.dataset.val) === cfg[key]));
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-val]');
    if (!b) return;
    cfg[key] = cast(b.dataset.val);
    paint();
    renderCmd();
  });
  paint();
}
bindPicker('#pick-theme', 'theme');
bindPicker('#pick-dur', 'duration', Number);
bindPicker('#pick-speed', 'speed', Number);

$('#pick-scenario').value = cfg.scenario;
$('#pick-scenario').onchange = e => { cfg.scenario = e.target.value; renderCmd(); };
$('#opt-fs').checked = cfg.fullscreen;
$('#opt-effort').checked = cfg.effort;
$('#opt-fs').onchange = e => { cfg.fullscreen = e.target.checked; };
$('#opt-effort').onchange = e => { cfg.effort = e.target.checked; renderCmd(); };

// the equivalent CLI invocation for whatever is selected right now
const SPEED_NAMES = { 42: 'slow', 24: 'normal', 13: 'fast', 6: 'turbo' };
function cliCommand() {
  const a = ['npm', 'exec', '--yes', '--', 'github:im-ian/fake-ai-waiting'];
  a.push('-t', cfg.theme);
  a.push('-T', String(cfg.duration / 60));
  a.push('-s', SPEED_NAMES[cfg.speed] || String(cfg.speed));
  if (cfg.scenario !== '*') a.push('--scenario', cfg.scenario);
  if (!cfg.effort) a.push('--no-effort');
  return a.join(' ');
}
function renderCmd() { $('#cmd').textContent = cliCommand(); }
renderCmd();

$('#copy').onclick = async () => {
  const btn = $('#copy');
  try {
    await navigator.clipboard.writeText(cliCommand());
    btn.textContent = '복사됨';
  } catch {
    btn.textContent = '복사 실패';
  }
  setTimeout(() => { btn.textContent = '복사'; }, 1600);
};

$('#start').onclick = () => {
  localStorage.setItem(LS, JSON.stringify(cfg));
  begin(cfg);
};
