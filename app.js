/* prompt-gen-devops — UI wiring */
(function () {
  'use strict';
  const P = window.PromptGen;
  const $ = id => document.getElementById(id);
  const form = $('form');
  const STORE = 'prompt-gen-devops:v1';
  const PALETTE = ['#7c5cff', '#f59e0b', '#22c55e', '#06b6d4', '#a855f7', '#f43f5e', '#f97316', '#3b82f6', '#10b981', '#eab308'];

  /* ---------- populate selects ---------- */
  const fill = (el, entries) => { el.innerHTML = entries.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join(''); };
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const lbl = o => Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : v.label]);

  fill($('category'), [...Object.keys(P.CATALOG).map(k => [k, k]), [P.CUSTOM, '✏️ Custom concept…']]);
  fill($('level'), lbl(P.LEVELS)); fill($('tone'), lbl(P.TONES)); fill($('theme'), lbl(P.THEMES));
  fill($('motion'), lbl(P.MOTION)); fill($('format'), lbl(P.FORMATS)); fill($('length'), lbl(P.LENGTHS));
  fill($('narration'), lbl(P.NARRATION)); fill($('voice'), lbl(P.VOICES)); fill($('target'), lbl(P.TARGETS));
  fill($('language'), P.LANGUAGES.map(l => [l, l]));
  $('extras').innerHTML = Object.entries(P.EXTRAS).map(([k, v]) =>
    `<label><input type="checkbox" name="extras" value="${k}"><span>${esc(v.label)}</span></label>`).join('');

  function fillConcepts(cat, keep) {
    const list = P.CATALOG[cat] || [];
    fill($('concept'), [...list.map(c => [c.name, c.name]), [P.CUSTOM, '✏️ Custom concept…']]);
    if (keep && [...$('concept').options].some(o => o.value === keep)) $('concept').value = keep;
    else if (cat === P.CUSTOM) $('concept').value = P.CUSTOM;
  }

  /* ---------- state <-> form ---------- */
  function read() {
    const fd = new FormData(form), s = {};
    for (const k of ['category', 'concept', 'conceptCustom', 'level', 'tone', 'theme', 'palette', 'motion', 'format', 'length',
      'narration', 'language', 'voice', 'target', 'brand', 'handle', 'keyword', 'hashtags', 'mustInclude', 'avoid', 'timing', 'timedScript'])
      s[k] = fd.get(k) ?? '';
    s.extras = fd.getAll('extras');
    s.captions = $('captions').checked;
    return s;
  }
  function write(st) {
    const s = P.normalize(st);
    $('category').value = P.CATALOG[s.category] ? s.category : P.CUSTOM;
    fillConcepts($('category').value, s.concept);
    for (const k of ['conceptCustom', 'level', 'tone', 'theme', 'palette', 'motion', 'format', 'length', 'narration', 'language', 'voice',
      'target', 'brand', 'handle', 'keyword', 'hashtags', 'mustInclude', 'avoid', 'timedScript'])
      if ($(k)) $(k).value = s[k];
    form.querySelectorAll('input[name=extras]').forEach(i => { i.checked = s.extras.includes(i.value); });
    form.querySelectorAll('input[name=timing]').forEach(i => { i.checked = i.value === s.timing; });
    $('captions').checked = s.captions;
  }

  /* ---------- timed-script UI ---------- */
  function renderTimed(s) {
    const locked = s.timing === 'locked';
    $('lockedBox').hidden = !locked;
    $('length').disabled = locked;
    if (!locked) return null;
    const r = P.parseTimedScript(s.timedScript);
    const st = $('tsStatus'), tb = $('tsTable'), tl = $('timeline');
    if (!r.segments.length && !r.errors.length) {
      st.innerHTML = '<span class="w">Paste your timed script, or click <b>Insert example</b>. Until it is valid, the prompt falls back to auto-timing.</span>';
      tb.hidden = tl.hidden = true; return r;
    }
    let html = r.errors.length
      ? `<span class="e"><b>${r.errors.length} error(s)</b>: fix these to lock the timings (the prompt is auto-timed until then).</span><ul>${r.errors.map(e => `<li class="e">${esc(e)}</li>`).join('')}</ul>`
      : `<span class="ok">✓ ${r.segments.length} cues · total ${P.fmtTC(r.total)} (${r.total.toFixed(2)} s): the video will be locked to these timings</span>`;
    if (r.warnings.length) html += `<ul>${r.warnings.map(w => `<li class="w">${esc(w)}</li>`).join('')}</ul>`;
    st.innerHTML = html;
    tb.hidden = !r.segments.length;
    tb.querySelector('tbody').innerHTML = r.segments.map((g, i) => `<tr class="${g.wps > 3.2 ? 'fast' : ''}">
      <td>${i + 1}</td><td class="num">${P.fmtTC(g.start)}</td><td class="num">${P.fmtTC(g.end)}${g.estimated ? '*' : ''}</td>
      <td class="num">${isFinite(g.dur) ? g.dur.toFixed(1) : '–'}</td><td class="num wps">${isFinite(g.wps) ? g.wps : '–'}</td>
      <td>${esc(g.scene || '—')}</td><td>${esc(g.text)}</td></tr>`).join('');
    // timeline bar
    const T = r.total || 1; let x = 0, parts = '';
    r.segments.forEach((g, i) => {
      if (g.start > x + 0.05) parts += `<div class="gap" style="flex:${g.start - x}" title="gap ${(g.start - x).toFixed(1)}s"></div>`;
      const d = Math.max(0, g.end - Math.max(g.start, x));
      parts += `<div style="flex:${d};background:${PALETTE[i % PALETTE.length]}" title="${esc((g.scene || 'Cue ' + (i + 1)) + ' · ' + P.fmtTC(g.start) + '–' + P.fmtTC(g.end))}">${d / T > 0.06 ? esc(g.scene || i + 1) : ''}</div>`;
      x = Math.max(x, g.end);
    });
    tl.innerHTML = parts; tl.hidden = !r.segments.length || r.errors.length > 0;
    return r;
  }

  /* ---------- render ---------- */
  let current = '';
  function update(save = true) {
    const s = read();
    const isCustom = s.category === P.CUSTOM || s.concept === P.CUSTOM;
    $('customWrap').hidden = !isCustom;
    $('paletteWrap').hidden = s.theme !== 'custom';
    const info = P.conceptInfo(P.normalize(s));
    $('conceptHint').textContent = info.hint ? 'Covers: ' + info.hint : (isCustom ? 'Describe the concept clearly. Add key points under "Must include".' : '');
    $('targetHint').textContent = P.TARGETS[s.target] ? P.TARGETS[s.target].howto.replace('{slug}', P.slugify(info.name)) : '';
    const L = P.LENGTHS[s.length];
    $('lengthHint').textContent = s.timing === 'locked' ? 'Length comes from your timed voice-over script.' :
      (L && L.sec ? `Narration of about ${Math.round(L.sec * 2.4)} words. Export records in real time (about ${Math.ceil(L.sec / 60)} min).` : 'No limit. Length follows the content, and export works for any length.');
    const h = s.handle.trim();
    $('handleWarn').hidden = !h || /^@?[A-Za-z0-9._]{1,30}$/.test(h);

    const r = renderTimed(s);
    current = P.buildPrompt(s);
    $('output').textContent = current;

    const words = (current.match(/\S+/g) || []).length;
    const F = P.FORMATS[s.format];
    const lock = r && r.segments.length && !r.errors.length;
    $('stats').innerHTML = [
      `<span>${esc(info.name)}</span>`,
      `<span>${F ? F.ratio : ''}</span>`,
      s.timing === 'locked' ? (lock ? `<span class="lock">🔒 ${P.fmtTC(r.total)} locked</span>` : `<span class="bad">⚠ timing not locked</span>`) : `<span>⏱ ${L ? L.label : ''}</span>`,
      `<span>${words.toLocaleString()} words · ~${Math.round(current.length / 4).toLocaleString()} tokens</span>`,
    ].join('');
    if (save) try { localStorage.setItem(STORE, P.encodeState(s)); } catch (e) {}
  }

  /* ---------- actions ---------- */
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000); }
  async function copyText(text, msg) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast(msg);
  }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const fname = ext => `prompt-${P.slugify(P.conceptInfo(P.normalize(read())).name)}.${ext}`;

  $('copy').onclick = () => copyText(current, '✓ Prompt copied. Paste it into Claude, ChatGPT or Gemini.');
  $('dlmd').onclick = () => download(fname('md'), current, 'text/markdown');
  $('dltxt').onclick = () => download(fname('txt'), current, 'text/plain');
  $('share').onclick = () => copyText(location.origin + location.pathname + '#s=' + P.encodeState(read()), '✓ Share link copied');
  $('reset').onclick = () => { write(P.DEFAULTS); history.replaceState(null, '', location.pathname); update(); toast('Reset to defaults'); };
  $('tsSample').onclick = () => { $('timedScript').value = P.TIMED_TEMPLATE; update(); };
  $('tsFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    $('timedScript').value = (await f.text()).replace(/^WEBVTT[^\n]*\n/, '');
    e.target.value = ''; update(); toast(`Loaded ${f.name}`);
  };
  $('audioFile').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const a = new Audio(); const url = URL.createObjectURL(f);
    a.preload = 'metadata'; a.src = url;
    a.onloadedmetadata = () => {
      const d = a.duration; URL.revokeObjectURL(url);
      const r = P.parseTimedScript($('timedScript').value);
      const diff = r.total ? (d - r.total) : null;
      toast(`${f.name}: ${d.toFixed(2)} s` + (diff === null ? '' : ` · script ${r.total.toFixed(2)} s (${diff >= 0 ? '+' : ''}${diff.toFixed(2)} s)`));
      if (diff !== null && Math.abs(diff) > 0.3 && confirm(`Audio is ${d.toFixed(2)} s but the script ends at ${r.total.toFixed(2)} s.\n\nScale all timestamps to match the audio?`)) {
        const k = d / r.total;
        $('timedScript').value = r.segments.map(g => `${P.fmtTC(g.start * k)}-${P.fmtTC(g.end * k)} | ${g.scene || 'Scene'} | ${g.text}`).join('\n');
        update(); toast('Timestamps scaled to the audio length');
      }
    };
    a.onerror = () => toast('Could not read that audio file');
    e.target.value = '';
  };
  $('category').addEventListener('change', () => { fillConcepts($('category').value); update(); });
  form.addEventListener('input', () => update());
  form.addEventListener('change', () => update());
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') { e.preventDefault(); $('copy').click(); }
  });

  /* ---------- init ---------- */
  let init = P.DEFAULTS;
  const m = location.hash.match(/#s=([\w-]+)/);
  if (m) init = P.decodeState(m[1]);
  else try { const v = localStorage.getItem(STORE); if (v) init = P.decodeState(v); } catch (e) {}
  write(init);
  update(false);
})();
