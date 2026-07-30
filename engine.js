/* Playback engine. Knows about pacing, interrupts and the queue — nothing
   about the DOM or a terminal. Renderers implement the `io` interface:

     io.chrome(scenario, theme)      set up tab bar / banner / prompt
     io.line(rowCls) -> handle       handle: .write(segs) .append(txt) .set(txt) .remove()
     io.gap()                        blank line
     io.status({left, right})        footer
     io.input({pre,buf,ghost,queueLabel})
     io.end()                        session finished / user left

   A `seg` is [cls, text]; cls is one of '', dim, bold, err, ok, thinking,
   user, accent, spin, ln. Row classes add d-add / d-del / d-ctx. */

function createSession({ theme, cfg, content, io }) {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const waiters = new Set();
  const sleep = ms => new Promise(res => {
    const done = () => { clearTimeout(id); waiters.delete(done); res(); };
    const id = setTimeout(done, ms);
    waiters.add(done);
  });
  const releaseSleeps = () => { for (const w of [...waiters]) w(); };

  const S = {
    input: '', auto: '', queue: [], brk: false, stopped: false,
    tokens: rand(1200, 9000), ctx: rand(72, 96),
    t0: now(),
    endAt: cfg.duration ? now() + cfg.duration * 1000 : 0,
    cwd: '~', branch: 'main',
    lastEsc: 0,
  };

  /* ------------------------------------------------------------- painting */

  function paintStatus() {
    const [left, right] = theme.status({
      model: theme.model, cwd: S.cwd, branch: S.branch,
      elapsed: (now() - S.t0) / 1000,
      tokens: Math.round(S.tokens), ctx: Math.round(S.ctx),
    });
    io.status({ left, right });
  }
  function paintInput() {
    // `auto` is the prompt typing itself out; whatever the user types lands in
    // `input` behind it and shows up once the prompt is submitted
    const buf = S.auto || S.input;
    io.input({
      pre: theme.userPre,
      buf,
      ghost: buf ? '' : theme.ghost,
      queueLabel: S.queue.length ? theme.queued(S.queue.length) : '',
    });
  }

  /* ------------------------------------------------------------- emitting */

  async function emit(spec) {
    const h = io.line(spec.cls || '');
    if (spec.mode === 'stream') {
      const txt = spec.segs[0][1];
      for (let i = 0; i < txt.length; i++) {
        if (S.brk || S.stopped) return;             // cut off mid-word, like a real ^C
        h.append(txt[i]);
        S.tokens += 0.28;
        let d = cfg.speed * rand(0.55, 1.7);
        if (txt[i] === ' ') d *= 0.5;
        if (/[.,;:)]/.test(txt[i])) d *= 3;
        await sleep(d);
      }
      await sleep(spec.after ?? rand(120, 380));
      return;
    }
    h.write(spec.segs);
    S.tokens += Math.ceil(spec.segs.reduce((n, s) => n + s[1].length, 0) / 3.6);
    await sleep(spec.after ?? rand(20, 90));
  }

  async function spinner(label, ms) {
    const h = io.line('spin');
    const t0 = now();
    let i = 0;
    while (!S.brk && !S.stopped && now() - t0 < ms) {
      h.set(theme.spin(theme.spinFrames[i++ % theme.spinFrames.length], label, (now() - t0) / 1000));
      S.tokens += rand(4, 22);
      S.ctx = Math.max(3, S.ctx - 0.012);
      paintStatus();
      await sleep(90);
    }
    h.remove();
  }

  /* ------------------------------------------------------------ formatting */

  const one = (text, cls) => ({ cls, segs: [['', text]] });
  const streamed = (text, cls) => ({ cls, mode: 'stream', segs: [['', text]] });

  function format(ev) {
    const L = [];
    switch (ev.t) {
      case 'user':
        L.push(one(theme.userPre + ev.text, 'user'));
        break;

      case 'text':
        for (const l of ev.lines) L.push(streamed(theme.textPre + l, ''));
        break;

      case 'think':
        L.push(one(theme.thinkHdr, 'dim'));
        for (const l of ev.lines) L.push(streamed('  ' + l, 'thinking'));
        break;

      case 'tool':
        L.push(one(theme.bullet + theme.tool(ev.name, ev.arg), 'bold'));
        if (ev.result) L.push(one(theme.sub + ev.result, 'dim'));
        for (const l of ev.out || []) L.push(one(theme.sub + l, ev.fail ? 'err' : 'dim'));
        break;

      case 'diff': {
        const [hdr, tail] = theme.editHdr(ev.file, ev.add, ev.del);
        L.push({ cls: '', segs: [['bold', theme.bullet + hdr], ['dim', tail || '']] });
        if (theme.editSub) L.push(one(theme.sub + theme.editSub(ev.file, ev.add, ev.del), 'dim'));
        // two counters, like a real unified diff: removals walk the old file,
        // additions the new one, context walks both
        let oldN = ev.start, newN = ev.start;
        for (const [sign, code] of ev.hunk) {
          const rowCls = sign === '+' ? 'd-add' : sign === '-' ? 'd-del' : 'd-ctx';
          const n = sign === '-' ? oldN++ : sign === '+' ? newN++ : (oldN++, newN++);
          L.push({ cls: rowCls, segs: [['ln', String(n).padStart(5)], ['', ` ${sign} ${code}`]] });
        }
        break;
      }

      case 'note':
        L.push(one(ev.text, ev.cls || 'dim'));
        break;
    }
    return L;
  }

  /* ---------------------------------------------------------------- playing */

  async function playEvent(ev) {
    if (S.brk || S.stopped) return;
    const stall = ms => (cfg.effort ? ms : Math.min(ms, 1600));
    if (ev.t === 'wait') return spinner(ev.label || 'Working', stall(ev.ms));
    if (ev.ms) {
      const label = ev.t === 'think' ? pick(content.thinkLabels) : (ev.label || 'Working');
      await spinner(label, stall(ev.ms));
    }
    for (const spec of format(ev)) {
      if (S.brk || S.stopped) return;
      await emit(spec);
    }
    io.gap();
  }

  // types the prompt into the fake input, then submits it into the transcript
  async function typePrompt(text) {
    S.auto = '';
    for (const ch of text) {
      if (S.stopped) return;
      S.auto += ch;
      paintInput();
      await sleep(cfg.speed * rand(0.5, 1.6));
    }
    await sleep(rand(300, 900));
    S.auto = '';
    paintInput();
    await emit(one(theme.userPre + text, 'user'));
    io.gap();
  }

  async function handleInterrupt() {
    S.brk = false;
    await emit(one(theme.interrupt, 'err'));
    io.gap();
    const until = now() + rand(5000, 13000);
    while (!S.stopped && !S.queue.length && now() < until) {
      S.brk = false;                     // extra escapes while idle do nothing
      await spinner(theme.idle, 700);
      await sleep(120);
    }
  }

  async function drainQueue() {
    while (S.queue.length && !S.stopped) {
      const msg = S.queue.shift();
      paintInput();
      await emit(one(theme.userPre + msg, 'user'));
      io.gap();
      for (const ev of pick(content.followups)(msg)) {
        await playEvent(ev);
        if (S.brk) await handleInterrupt();
      }
    }
  }

  async function runScenario(sc) {
    S.cwd = sc.cwd;
    S.branch = sc.branch;
    io.chrome(sc, theme);
    paintInput();
    paintStatus();
    await typePrompt(sc.prompt);
    for (const ev of sc.events) {
      if (S.stopped) return;
      await playEvent(ev);
      if (S.brk) await handleInterrupt();
      if (S.queue.length) await drainQueue();
      if (S.endAt && now() > S.endAt) return;
    }
    await sleep(rand(1500, 4000));
  }

  /* ------------------------------------------------------------------ api */

  const pool = cfg.scenario && cfg.scenario !== '*'
    ? content.scenarios.filter(s => s.id === cfg.scenario)
    : content.scenarios;

  async function start() {
    const tick = setInterval(paintStatus, 1000);
    let deck = [];
    while (!S.stopped && (!S.endAt || now() < S.endAt)) {
      if (!deck.length) deck = shuffle((pool.length ? pool : content.scenarios).slice());
      await runScenario(deck.pop());
    }
    clearInterval(tick);
    stop();
  }

  function stop() {
    if (S.stopped) return;
    S.stopped = true;
    releaseSleeps();
    io.end();
  }

  // 'esc' interrupts; two escapes in quick succession leaves. Printable keys go
  // into the fake input, Enter queues it like a real CLI would.
  function key(k) {
    if (S.stopped) return;
    if (k.type === 'kill') return stop();
    if (k.type === 'esc') {
      const t = now();
      if (t - S.lastEsc < 900) return stop();
      S.lastEsc = t;
      S.brk = true;
      releaseSleeps();
      return;
    }
    if (k.type === 'enter') {
      if (S.input.trim()) { S.queue.push(S.input.trim()); S.input = ''; paintInput(); }
      return;
    }
    if (k.type === 'back') { S.input = S.input.slice(0, -1); paintInput(); return; }
    if (k.type === 'char') { S.input += k.ch; paintInput(); }
  }

  return { start, stop, key };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createSession };
