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

  $('categoryList').innerHTML = Object.keys(P.CATALOG).map(k => `<option value="${esc(k)}">`).join('');
  $('ideas').innerHTML = Object.entries(P.CATALOG).map(([cat, list]) =>
    `<h4>${esc(cat)}</h4>` + list.map(c => `<button type="button" class="idea" data-cat="${esc(cat)}" data-name="${esc(c.name)}">${esc(c.name)}</button>`).join('')).join('');
  $('studioOpts').innerHTML = Object.entries(P.STUDIO).map(([k, v]) =>
    `<label><input type="checkbox" name="studioOpts" value="${k}"><span>${esc(v.label)}</span></label>`).join('');
  fill($('level'), lbl(P.LEVELS)); fill($('tone'), lbl(P.TONES));
  fill($('pedagogy'), lbl(P.PEDAGOGY)); fill($('background'), lbl(P.BACKGROUND));
  { let g = '';
    $('themes').innerHTML = Object.entries(P.THEMES).map(([k, t]) => {
      const head = t.group !== g ? `<div class="tgroup">${esc(t.group)}</div>` : ''; g = t.group;
      const sw = t.bg ? `<span class="tprev" style="background:${t.bg};border-color:${t.surface}">
          <i style="background:${t.surface};border-color:${t.accent}"><b style="background:${t.accent}"></b><u style="background:${t.muted}"></u></i>
          <em style="color:${t.text}">Aa</em><s style="background:${t.ok}"></s><s style="background:${t.warn}"></s><s style="background:${t.bad}"></s></span>`
        : '<span class="tprev custom">🎨</span>';
      return head + `<label class="tcard"><input type="radio" name="theme" value="${k}">${sw}<span class="tname">${esc(t.label)}</span></label>`;
    }).join(''); }
  fill($('motion'), lbl(P.MOTION)); fill($('format'), lbl(P.FORMATS));
  fill($('narration'), lbl(P.NARRATION)); fill($('voice'), lbl(P.VOICES)); fill($('target'), lbl(P.TARGETS));
  fill($('language'), P.LANGUAGES.map(l => [l, l]));
  $('extras').innerHTML = Object.entries(P.EXTRAS).map(([k, v]) =>
    `<label><input type="checkbox" name="extras" value="${k}"><span>${esc(v.label)}</span></label>`).join('');

  function fillConcepts(cat) {
    const key = String(cat || '').trim().toLowerCase();
    const match = Object.keys(P.CATALOG).find(k => k.toLowerCase() === key);
    const list = match ? P.CATALOG[match] : Object.values(P.CATALOG).flat();
    $('conceptList').innerHTML = list.map(c => `<option value="${esc(c.name)}">`).join('');
  }

  /* ---------- state <-> form ---------- */
  function read() {
    const fd = new FormData(form), s = {};
    for (const k of ['category', 'concept', 'level', 'tone', 'theme', 'palette', 'motion', 'background', 'pedagogy', 'format', 'minutes',
      'narration', 'language', 'voice', 'target', 'brand', 'handle', 'keyword', 'hashtags', 'mustInclude', 'avoid', 'timing', 'timedScript'])
      s[k] = fd.get(k) ?? '';
    s.extras = fd.getAll('extras');
    s.studioOpts = fd.getAll('studioOpts');
    s.studio = $('studio').checked;
    s.captions = $('captions').checked;
    s.retention = $('retention').checked;
    return s;
  }
  function write(st) {
    const s = P.normalize(st);
    fillConcepts(s.category);
    $('minutes').value = s.minutes || 0;
    for (const k of ['category', 'concept', 'level', 'tone', 'palette', 'motion', 'background', 'pedagogy', 'format', 'narration', 'language', 'voice',
      'target', 'brand', 'handle', 'keyword', 'hashtags', 'mustInclude', 'avoid', 'timedScript'])
      if ($(k)) $(k).value = s[k];
    form.querySelectorAll('input[name=extras]').forEach(i => { i.checked = s.extras.includes(i.value); });
    form.querySelectorAll('input[name=studioOpts]').forEach(i => { i.checked = s.studioOpts.includes(i.value); });
    $('studio').checked = s.studio;
    $('retention').checked = s.retention;
    form.querySelectorAll('input[name=theme]').forEach(i => { i.checked = i.value === s.theme; });
    form.querySelectorAll('input[name=timing]').forEach(i => { i.checked = i.value === s.timing; });
    $('captions').checked = s.captions;
  }

  /* ---------- timed-script UI ---------- */
  function renderTimed(s) {
    const locked = s.timing === 'locked';
    $('lockedBox').hidden = !locked;
    $('minutes').disabled = locked; $('presets').classList.toggle('dis', locked);
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
    $('paletteWrap').hidden = s.theme !== 'custom';
    const N = P.normalize(s);
    const info = P.conceptInfo(N);
    $('conceptHint').innerHTML = !s.concept.trim()
      ? '<span style="color:var(--warn)">Type a concept name (anything you like), or choose one from the ideas below.</span>'
      : info.hint ? '✓ Known concept. Key points added automatically: ' + esc(info.hint)
      : 'Custom concept. The AI will research the key points. Add any must-cover facts under "Must include".';
    document.querySelectorAll('#ideas .idea').forEach(b => b.classList.toggle('on', b.dataset.name.toLowerCase() === s.concept.trim().toLowerCase()));
    document.querySelectorAll('#presets button').forEach(b => b.classList.toggle('on', Number(b.dataset.m) === N.minutes));
    form.querySelector('fieldset.studio').classList.toggle('off', !s.studio);
    const C = P.clarityScore(N);
    const col = C.score >= 85 ? 'var(--ok)' : C.score >= 70 ? '#4f8cff' : C.score >= 50 ? 'var(--warn)' : 'var(--err)';
    $('clarity').innerHTML = `<div class="cbar"><span>Teaching clarity</span><b style="color:${col}">${C.score}/100 · ${C.grade}</b></div>
      <div class="cmeter"><i style="width:${C.score}%;background:${col}"></i></div>` +
      (C.tips.length ? `<ul>${C.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="hint">✓ Low-noise setup: one accent, calm motion, captions on. Great for learning.</p>');
    $('targetHint').textContent = P.TARGETS[s.target] ? P.TARGETS[s.target].howto.replace('{slug}', P.slugify(info.name)) : '';
    const sec = Math.round(N.minutes * 60);
    $('lengthHint').textContent = s.timing === 'locked' ? 'Length comes from your timed voice-over script.' :
      (sec ? `${N.minutes} min = ${sec} s · narration of about ${Math.round(sec * 2.4)} words · export records in real time (about ${Math.ceil(sec / 60)} min)${sec > 1800 ? ' · tip: very long videos are delivered in several parts, so reply "continue"' : ''}.`
           : 'No limit. Length follows the content, and export works for any length.');
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
      s.timing === 'locked' ? (lock ? `<span class="lock">🔒 ${P.fmtTC(r.total)} locked</span>` : `<span class="bad">⚠ timing not locked</span>`) : `<span>⏱ ${sec ? N.minutes + ' min' : 'no limit'}</span>`,
      `<span>${s.studio ? '🎙 Voice Studio' : '🔊 Default voice'}</span>`,
      `<span>${words.toLocaleString()} words · ~${Math.round(current.length / 4).toLocaleString()} tokens</span>`,
    ].join('');
    if (save) try { localStorage.setItem(STORE, P.encodeState(s)); } catch (e) {}
  }

  /* ---------- actions ---------- */
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000); }
  async function copyText(text, msg, btn) {
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) {}
    if (!ok) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
    }
    if (!ok) { selectOutput(); toast('Press Ctrl/⌘ + C to copy the selected prompt'); return false; }
    toast(msg);
    if (btn) { const t = btn.innerHTML; btn.classList.add('copied'); btn.innerHTML = '✓ Copied'; setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = t; }, 1600); }
    return true;
  }
  function selectOutput() { const r = document.createRange(); r.selectNodeContents($('output')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const fname = ext => `prompt-${P.slugify(P.conceptInfo(P.normalize(read())).name)}.${ext}`;

  const copyPrompt = btn => {
    if (!read().concept.trim()) { toast('Type a concept name first'); $('concept').focus(); return; }
    copyText(current, `✓ Prompt copied (${(current.match(/\S+/g) || []).length.toLocaleString()} words). Paste it into Claude, ChatGPT or Gemini.`, btn);
  };
  $('copy').onclick = () => copyPrompt($('copy'));
  $('copy2').onclick = () => copyPrompt($('copy2'));
  $('output').addEventListener('mouseup', () => { const t = getSelection().toString(); if (t.length < 3) setTimeout(selectOutput, 0); });
  $('ideas').addEventListener('click', e => {
    const b = e.target.closest('.idea'); if (!b) return;
    $('category').value = b.dataset.cat; $('concept').value = b.dataset.name; fillConcepts(b.dataset.cat); update();
  });
  $('presets').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || $('minutes').disabled) return; $('minutes').value = b.dataset.m; update(); });
  $('dlmd').onclick = () => download(fname('md'), current, 'text/markdown');
  $('dltxt').onclick = () => download(fname('txt'), current, 'text/plain');
  $('share').onclick = () => copyText((location.protocol === 'file:' ? location.href.split('#')[0] : location.origin + location.pathname) + '#s=' + P.encodeState(read()), '✓ Share link copied', $('share'));
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
  $('category').addEventListener('input', () => fillConcepts($('category').value));
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
