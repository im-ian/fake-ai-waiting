#!/usr/bin/env node
/* Smallest thing that fails if the engine breaks: drives a session through a
   queued message and an interrupt against a fake renderer, then asserts.
   Run: node selfcheck.js */

const assert = require('assert');
const { THEMES } = require('./themes.js');
const { SCENARIOS, FOLLOWUPS, THINK_LABELS } = require('./scenarios.js');
const { createSession } = require('./engine.js');

const lines = [];
let inputs = [], ended = false;

const io = {
  chrome() {},
  gap() {},
  status() {},
  input(v) { inputs.push(v); },
  end() { ended = true; },
  line(cls) {
    const row = { cls, text: '' };
    lines.push(row);
    return {
      write: segs => { row.text = segs.map(s => s[1]).join(''); },
      append: t => { row.text += t; },
      set: t => { row.text = t; },
      remove: () => { lines.splice(lines.indexOf(row), 1); },
    };
  },
};

const MSG = 'also check the sibling callers';
const theme = THEMES.claude;
const session = createSession({
  theme,
  cfg: { speed: 0, duration: 0, effort: false, scenario: 'jwt' },
  content: { scenarios: SCENARIOS, followups: FOLLOWUPS, thinkLabels: THINK_LABELS },
  io,
});

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  session.start();

  await wait(400);
  for (const ch of MSG) session.key({ type: 'char', ch });
  session.key({ type: 'char', ch: 'x' });
  session.key({ type: 'back' });                       // backspace must drop it
  session.key({ type: 'enter' });
  assert.match(inputs.at(-1).queueLabel, /1 message queued/, 'enter should queue');

  await wait(6000);                                    // one capped stall + a few events
  const text = () => lines.map(l => l.text).join('\n');
  assert.ok(text().includes(MSG), 'queued message should reach the transcript');
  assert.ok(!text().includes(MSG + 'x'), 'backspace should have dropped the last char');
  assert.equal(inputs.at(-1).queueLabel, '', 'queue should drain');

  // diff rows: additions and removals each walk their own line numbers
  const adds = () => lines.filter(l => l.cls === 'd-add');
  const deadline = Date.now() + 30_000;
  while (adds().length < 3 && Date.now() < deadline) await wait(300);
  const nums = [];                                     // first hunk only: numbering restarts per diff
  for (const n of adds().map(l => parseInt(l.text, 10))) {
    if (nums.length && n <= nums.at(-1)) break;
    nums.push(n);
  }
  assert.ok(nums.length > 2, 'expected an increasing run of added line numbers');

  session.key({ type: 'esc' });                        // fake interrupt
  await wait(400);
  assert.ok(text().includes(theme.interrupt.trim()), 'esc should print the interrupt line');

  session.key({ type: 'esc' });                        // esc esc leaves
  assert.ok(ended, 'double esc should end the session');

  console.log(`ok — ${lines.length} lines, queue + interrupt + diff numbering`);
})();
