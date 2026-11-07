// Run: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../prompt.js');

test('every catalog concept builds a prompt with all sections', () => {
  const sections = ['## BRIEF', '## ROLE', '## DELIVERABLE', '## 1. CONTENT STRUCTURE', '## 1A. VOICE-OVER SCRIPT, TIMINGS & MERGE WORKFLOW',
    '## 2. VISUAL DESIGN', '## 3. ENGINE', '## 4. PLAYER UI', '## 5. AUDIO: DEFAULT VOICE + ADVANCED VOICE STUDIO', '## 6. DOWNLOAD VIDEO', '## 7. QUALITY GATE', '## 8. OUTPUT FORMAT'];
  for (const [category, list] of Object.entries(P.CATALOG)) {
    assert.ok(list.length >= 3, `${category} has at least 3 concepts`);
    for (const c of list) {
      const out = P.buildPrompt({ category, concept: c.name });
      for (const s of sections) assert.ok(out.includes(s), `${c.name}: missing ${s}`);
      assert.ok(out.includes(`**Concept:** ${c.name}`));
      assert.ok(out.includes(c.hint), `${c.name}: hint included`);
      assert.doesNotMatch(out, /undefined|NaN|\[object Object\]/, `${c.name}: no undefined/NaN`);
    }
  }
});

test('every option value of every dropdown builds cleanly', () => {
  const groups = { level: P.LEVELS, tone: P.TONES, theme: P.THEMES, motion: P.MOTION, format: P.FORMATS, narration: P.NARRATION, voice: P.VOICES, target: P.TARGETS };
  for (const [key, opts] of Object.entries(groups))
    for (const v of Object.keys(opts)) {
      const out = P.buildPrompt({ [key]: v });
      assert.doesNotMatch(out, /undefined|NaN|\[object Object\]/, `${key}=${v}`);
    }
  for (const lang of P.LANGUAGES) assert.ok(P.buildPrompt({ language: lang }).includes(lang));
});

test('format sets exact export resolution and filename', () => {
  const out = P.buildPrompt({ format: 'reels', brand: 'kona-srinivas-devops', concept: 'How Linux Boots' });
  assert.ok(out.includes('1080×1920'));
  assert.ok(out.includes('kona-srinivas-devops-how-linux-boots-1080x1920.mp4'));
});

test('custom concept and custom palette', () => {
  const out = P.buildPrompt({ category: '', concept: 'How Istio sidecar injection works', theme: 'custom', palette: 'black and orange' });
  assert.ok(out.includes('**Concept:** How Istio sidecar injection works'));
  assert.ok(out.includes('Custom palette: black and orange'));
  assert.ok(!out.includes('**Category:**'));
  const typed = P.buildPrompt({ category: 'Service Mesh', concept: 'Istio Ambient Mode' });
  assert.ok(typed.includes('**Category:** Service Mesh') && typed.includes('**Concept:** Istio Ambient Mode'));
});

test('extras are included only when selected', () => {
  const none = P.buildPrompt({ extras: [] });
  const all = P.buildPrompt({ extras: Object.keys(P.EXTRAS) });
  for (const e of Object.values(P.EXTRAS)) {
    assert.ok(all.includes(e.text));
    assert.ok(!none.includes(e.text));
  }
});

test('short format drops roadmap, no-limit has no word budget', () => {
  assert.ok(P.buildPrompt({ minutes: 0.5 }).includes('skip the roadmap'));
  assert.ok(P.buildPrompt({ minutes: 0 }).includes('No time limit'));
  assert.ok(P.buildPrompt({ minutes: '' }).includes('No time limit'));
});

test('auto keyword and slug', () => {
  assert.equal(P.autoKeyword('How Linux Boots'), 'LINUX');
  assert.equal(P.autoKeyword('What Happens When You Type a URL'), 'URL');
  assert.equal(P.slugify('Life of a kubectl apply!'), 'life-of-a-kubectl-apply');
});

test('share-state round trip', () => {
  const s = { category: 'Kubernetes', concept: 'How Pod Scheduling Works', format: 'reels', minutes: 2.5, extras: ['quiz'], handle: '@kona.srinivas', timing: 'locked', timedScript: P.TIMED_TEMPLATE, captions: false, studio: false, studioOpts: ['upload'] };
  const back = P.decodeState(P.encodeState(s));
  for (const k of Object.keys(s)) assert.deepEqual(back[k], s[k], k);
  assert.deepEqual(P.decodeState('!!!garbage'), P.normalize({}));
});

/* ---------------- timed script ---------------- */
test('parses pipe format with scenes', () => {
  const r = P.parseTimedScript(P.TIMED_TEMPLATE);
  assert.equal(r.errors.length, 0);
  assert.equal(r.segments.length, 4);
  assert.deepEqual(r.segments.map(s => [s.start, s.end, s.scene]), [[0, 6.5, 'Hook'], [6.5, 12, 'Roadmap'], [12, 24, 'Power On'], [24, 31, 'CTA']]);
  assert.equal(r.total, 31);
});

test('parses SRT including multi-line cues and hours', () => {
  const srt = '1\n00:00:00,000 --> 00:00:05,500\nHello there\nworld\n\n2\n00:00:05,500 --> 00:00:12,250\nSecond cue\n\n3\n01:00:00,000 --> 01:00:02,500\nAn hour in';
  const r = P.parseTimedScript(srt);
  assert.equal(r.errors.length, 0);
  assert.deepEqual(r.segments.map(s => [s.start, s.end, s.text]), [[0, 5.5, 'Hello there world'], [5.5, 12.25, 'Second cue'], [3600, 3602.5, 'An hour in']]);
});

test('parses bracket and start-only formats', () => {
  const r = P.parseTimedScript('0:00 | Hook | first words here\n0:07 | Two | second\n[0:15 - 0:20] third');
  assert.equal(r.errors.length, 0);
  assert.deepEqual(r.segments.map(s => [s.start, s.end]), [[0, 7], [7, 15], [15, 20]]);
  const last = P.parseTimedScript('0:00 | a b c d e');
  assert.ok(last.segments[0].estimated);
});

test('reports errors: bad lines, reversed and overlapping cues', () => {
  const r = P.parseTimedScript('no time here\n00:10-00:05 | Bad | text\n00:20-00:30 | A | x\n00:25-00:35 | B | y');
  assert.ok(r.errors.some(e => e.startsWith('Line 1')));
  assert.ok(r.errors.some(e => e.includes('must be after start')));
  assert.ok(r.errors.some(e => e.includes('overlaps')));
});

test('warns about fast narration and gaps', () => {
  const r = P.parseTimedScript('00:00-00:02 | A | one two three four five six seven eight nine ten\n00:06-00:12 | B | fine pace text here');
  assert.ok(r.warnings.some(w => w.includes('words/s')));
  assert.ok(r.warnings.some(w => w.includes('silence')));
});

test('locked prompt embeds the cue table and exact total', () => {
  const out = P.buildPrompt({ timing: 'locked', timedScript: P.TIMED_TEMPLATE });
  assert.ok(out.includes('## 1A. MY TIMED VOICE-OVER SCRIPT (source of truth)'));
  assert.ok(out.includes('## 1B. VOICE-OVER SYNC & MERGE WORKFLOW'));
  assert.ok(out.includes('| 3 | 12.00 | 24.00 | 12.00 | Power On |'));
  assert.ok(out.includes('**31.00 s**'));
  assert.ok(out.includes('`TOTAL` = 31.00 s'));
  assert.ok(!out.includes('narration budget'));
});

test('locked with invalid script falls back to auto-timing', () => {
  const out = P.buildPrompt({ timing: 'locked', timedScript: 'garbage only' });
  assert.ok(!out.includes('MY TIMED VOICE-OVER SCRIPT'));
  assert.ok(out.includes('1A. VOICE-OVER SCRIPT, TIMINGS & MERGE WORKFLOW'));
});

test('pipes inside narration do not break the markdown table', () => {
  const out = P.buildPrompt({ timing: 'locked', timedScript: '00:00-00:05 | Cmd | run ps aux | grep nginx' });
  assert.ok(out.includes('| run ps aux / grep nginx |'));
});

test('auto prompt asks for the round-trippable timed script and merge tools', () => {
  const out = P.buildPrompt({});
  assert.ok(out.includes('`00:12.0-00:24.0 | Scene name | narration`'));
  for (const s of ['Copy timed script', 'cues.json', 'Silent video', 'Stretch visuals to audio', 'Sync check', 'Re-time', '-map 0:v -map 1:a'])
    assert.ok(out.includes(s), s);
});

test('fmtTC output is re-parseable (round trip)', () => {
  for (const t of [0, 6.5, 59.9, 61.2, 754.3]) {
    const r = P.parseTimedScript(`${P.fmtTC(t)}-${P.fmtTC(t + 3)} | S | x y z`);
    assert.ok(Math.abs(r.segments[0].start - t) < 0.06 && Math.abs(r.segments[0].dur - 3) < 0.11, String(t));
  }
});

/* ---------------- free text, minutes, voice studio ---------------- */
test('free-text concept picks up catalog hints case-insensitively from any category', () => {
  const out = P.buildPrompt({ category: '', concept: '  how LINUX boots ' });
  assert.ok(out.includes('**Concept:** how LINUX boots'));
  assert.ok(out.includes('GRUB2, kernel init'));
  assert.ok(P.buildPrompt({ concept: '' }).includes('**Concept:** Your Concept'));
});

test('manual minutes: decimals, large values, clamping', () => {
  assert.ok(P.buildPrompt({ minutes: 2.5 }).includes('about 2 min 30 s'));
  assert.ok(P.buildPrompt({ minutes: 12 }).includes('about 12 minutes'));
  assert.ok(P.buildPrompt({ minutes: 45 }).includes('narration budget about 6480 words'));
  assert.equal(P.normalize({ minutes: -4 }).minutes, 0);
  assert.equal(P.normalize({ minutes: 9999 }).minutes, 600);
  assert.equal(P.normalize({ minutes: 'abc' }).minutes, 0);
});

test('old saved state (length select, custom concept) migrates', () => {
  const s = P.normalize({ length: '90', category: '__custom__', concept: '__custom__', conceptCustom: 'My Topic' });
  assert.equal(s.minutes, 1.5); assert.equal(s.concept, 'My Topic'); assert.equal(s.category, '');
  assert.equal(P.normalize({ length: 'none' }).minutes, 0);
  assert.ok(!('length' in s) && !('conceptCustom' in s));
});

test('default voice is always the out-of-box audio and the download fallback', () => {
  const out = P.buildPrompt({});
  assert.ok(out.includes('**Default voice (ON by default):**'));
  assert.ok(out.includes('Custom (if ready) → Default voice (if capture works) → Captions only'));
  assert.ok(out.includes('-custom-voice.mp4') && out.includes('-default-voice.mp4') && out.includes('-captions.mp4'));
  assert.ok(out.includes('Capture of browser speech is **not guaranteed**'));
});

test('voice studio: mic selection, word timing, takes, merge and checklist', () => {
  const out = P.buildPrompt({});
  for (const s of ['enumerateDevices()', 'devicechange', "deviceId: { exact: id }", 'level meter', 'Teleprompter', 'Scene-by-scene takes',
    'IndexedDB', 'Tap-sync', 'OfflineAudioContext', 'Readiness checklist', 'Voice-over .wav', 'window.__reel.words', 'never speed up audio'])
    assert.ok(out.includes(s), s);
});

test('voice studio off removes every studio reference', () => {
  const out = P.buildPrompt({ studio: false });
  assert.doesNotMatch(out, /Voice Studio|customTrack|Load voice-over|enumerateDevices/);
  assert.ok(out.includes('1. **Default voice**'));
});

test('studio option subsets', () => {
  const up = P.buildPrompt({ studioOpts: ['upload'] });
  assert.ok(up.includes('**Upload audio:**') && !up.includes('enumerateDevices') && !up.includes('Teleprompter'));
  const mic = P.buildPrompt({ studioOpts: ['mic'] });
  assert.ok(mic.includes('enumerateDevices') && !mic.includes('noiseSuppression') && !mic.includes('Tap-sync'));
  assert.ok(P.buildPrompt({ studioOpts: ['mic', 'denoise'] }).includes('noiseSuppression'));
  assert.ok(P.buildPrompt({ studioOpts: ['music'] }).includes('auto-ducking'));
});

test('captions-only narration has no default-voice download', () => {
  const out = P.buildPrompt({ narration: 'captions', studio: false });
  assert.ok(!out.includes('-default-voice.mp4'));
  assert.ok(out.includes('1. **No voice (captions only)**'));
});

/* ---------------- teaching & low-noise design ---------------- */
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('every theme meets WCAG AA contrast', () => {
  for (const [k, t] of Object.entries(P.THEMES)) {
    if (!t.bg) continue;
    for (const fg of ['text', 'muted']) for (const bg of ['bg', 'surface'])
      assert.ok(contrast(t[fg], t[bg]) >= 4.5, `${k}: ${fg}/${bg} = ${contrast(t[fg], t[bg]).toFixed(2)}`);
    for (const fg of ['accent', 'ok', 'warn', 'bad'])
      assert.ok(contrast(t[fg], t.bg) >= 3, `${k}: ${fg}/bg = ${contrast(t[fg], t.bg).toFixed(2)}`);
  }
});

test('defaults are the low-noise teaching setup', () => {
  assert.equal(P.DEFAULTS.theme, 'focus'); assert.equal(P.DEFAULTS.background, 'off'); assert.equal(P.DEFAULTS.motion, 'subtle');
  const out = P.buildPrompt({});
  assert.ok(out.includes("const THEME = { bg: '#0b0f17'"));
  assert.ok(out.includes('a flat solid background colour. No grid, no orbs'));
  assert.ok(!out.includes('drifting blurred glow orbs'));
  assert.equal(P.clarityScore({}).score, 100);
});

test('teaching method section: signalling, cognitive load, retention', () => {
  const out = P.buildPrompt({});
  for (const s of ['## 1C. TEACHING METHOD', 'exactly ONE element is "active"', 'at most 4 new terms per scene', 'Spatial consistency',
    'Never put full narration sentences on screen', '"So far"', 'summary diagram', 'Element budget per scene', 'prefers-reduced-motion', 'magic move'])
    assert.ok(out.includes(s), s);
  assert.ok(!P.buildPrompt({ retention: false }).includes('"So far"'));
});

test('every background and pedagogy option builds cleanly', () => {
  for (const b of Object.keys(P.BACKGROUND)) assert.ok(P.buildPrompt({ background: b }).includes(P.BACKGROUND[b].text));
  for (const p of Object.keys(P.PEDAGOGY)) assert.ok(P.buildPrompt({ pedagogy: p }).includes(P.PEDAGOGY[p].text));
  assert.equal(P.normalize({ background: 'x', pedagogy: 'y', theme: 'z' }).theme, 'focus');
});

test('clarity score penalises noise and explains why', () => {
  const noisy = P.clarityScore({ theme: 'cyber', background: 'rich', motion: 'high', captions: false, extras: Object.keys(P.EXTRAS) });
  assert.ok(noisy.score < 50 && noisy.grade === 'Noisy', String(noisy.score));
  assert.ok(noisy.tips.length >= 4);
  assert.ok(P.clarityScore({ motion: 'balanced', background: 'minimal' }).score >= 85);
});
