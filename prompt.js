/*
 * prompt-gen-devops — prompt builder (pure, no DOM).
 * Works in the browser (window.PromptGen) and in Node (require) for tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PromptGen = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Concept catalog: category -> [{ name, hint }]                        */
  /* ------------------------------------------------------------------ */
  const CATALOG = {
    'Linux': [
      { name: 'How Linux Boots', hint: 'Power-on, BIOS/UEFI + POST, boot device (ESP/MBR, Secure Boot), GRUB2, kernel init, initramfs + switch_root, systemd (PID 1, targets), services, login; dmesg, systemd-analyze blame' },
      { name: 'Linux File System Hierarchy', hint: '/, /etc, /var, /usr, /home, /tmp, /proc, /sys, /dev, /boot, /opt; what lives where and why; df, du, mount' },
      { name: 'Processes, Signals & PID 1', hint: 'fork/exec, process states, PID 1 role, SIGTERM vs SIGKILL vs SIGHUP, zombies and orphans; ps, top, kill, pstree' },
      { name: 'File Permissions & chmod', hint: 'rwx for user/group/other, octal notation, chmod/chown, umask, setuid/setgid/sticky bit, ls -l output' },
      { name: 'systemd Units & Targets', hint: 'unit files, service/socket/timer units, dependencies (Wants/Requires/After), targets; systemctl, journalctl' },
      { name: 'Linux Networking Stack', hint: 'interfaces, IP addressing, routing table, DNS resolver, iptables/nftables; ip addr, ip route, ss, dig' },
    ],
    'Kubernetes': [
      { name: 'Life of a kubectl apply', hint: 'kubectl, API server (authn/authz/admission), etcd, controllers and reconciliation, scheduler, kubelet, container runtime' },
      { name: 'How Pod Scheduling Works', hint: 'scheduling queue, filtering and scoring, resource requests, taints/tolerations, node affinity, pod (anti-)affinity, binding' },
      { name: 'Services & kube-proxy', hint: 'ClusterIP, NodePort, LoadBalancer, Endpoints/EndpointSlices, kube-proxy iptables/IPVS modes, CoreDNS' },
      { name: 'Ingress & TLS', hint: 'Ingress resource, ingress controller, host/path routing, TLS termination, cert-manager, Gateway API mention' },
      { name: 'Pod Lifecycle & Probes', hint: 'Pending to Running to Succeeded/Failed, init containers, liveness/readiness/startup probes, restartPolicy, CrashLoopBackOff' },
      { name: 'ConfigMaps vs Secrets', hint: 'env vs volume mounts, base64 is not encryption, encryption at rest, external secret managers, immutable configs' },
      { name: 'Horizontal Pod Autoscaling', hint: 'metrics-server, HPA control loop, target utilisation, scale-up/down behaviour, resource requests requirement, KEDA mention' },
      { name: 'Kubernetes RBAC', hint: 'subjects, Role vs ClusterRole, RoleBinding vs ClusterRoleBinding, ServiceAccounts, least privilege; kubectl auth can-i' },
    ],
    'SAP BTP Kyma': [
      { name: 'Kyma Runtime Architecture', hint: 'SAP BTP, Kyma runtime on Gardener-managed Kubernetes, Kyma modules (Istio, API Gateway, Serverless, Eventing, BTP Operator), kyma-system namespace' },
      { name: 'Exposing an App with APIRule', hint: 'APIRule CR, Istio Ingress Gateway, VirtualService, access strategies (JWT, noAuth), hosts and paths, TLS' },
      { name: 'XSUAA & IAS Authentication on Kyma', hint: 'OAuth 2.0 flows, XSUAA service instance and binding, IAS as identity provider, approuter, JWT validation, scopes/role collections' },
      { name: 'BTP Service Operator & Bindings', hint: 'ServiceInstance and ServiceBinding CRs, credentials as Kubernetes Secrets, mounting into Deployments, rotation' },
      { name: 'Kyma Serverless Functions', hint: 'Function CR, runtimes (Node.js/Python), build to image, scaling, exposing with APIRule, eventing triggers' },
      { name: 'Node Maintenance on Gardener', hint: 'cordon, drain (PDBs, --ignore-daemonsets), uncordon, Gardener rolling updates and maintenance windows, verify node state afterwards' },
    ],
    'Containers': [
      { name: 'How a Docker Image Is Built', hint: 'Dockerfile instructions, layers, build cache, image manifest, tags vs digests, docker build/history' },
      { name: 'Containers vs Virtual Machines', hint: 'hypervisor vs shared kernel, namespaces, cgroups, union filesystems, startup time and density, security isolation trade-offs' },
      { name: 'Dockerfile Best Practices', hint: 'multi-stage builds, minimal base images, non-root USER, .dockerignore, layer ordering for cache, pin versions, HEALTHCHECK' },
      { name: 'Container Registries & Image Tags', hint: 'registry/repository/tag/digest, push/pull, immutable tags, :latest pitfalls, image signing and scanning' },
    ],
    'CI/CD & GitOps': [
      { name: 'Anatomy of a CI/CD Pipeline', hint: 'trigger, checkout, build, unit test, scan (SAST/SCA), package, push artifact, deploy to stages, approvals, rollback' },
      { name: 'GitHub Actions Explained', hint: 'workflows, events, jobs, steps, runners, actions marketplace, secrets, matrix builds, environments, OIDC to cloud' },
      { name: 'GitOps with Argo CD', hint: 'Git as source of truth, Application CR, sync and self-heal, drift detection, app-of-apps, rollback via git revert' },
      { name: 'Blue-Green vs Canary Deployments', hint: 'traffic switching vs gradual shifting, metrics-based promotion, rollback speed, cost, tools (Argo Rollouts, Istio)' },
    ],
    'Cloud (AWS)': [
      { name: 'AWS VPC Networking', hint: 'VPC CIDR, public/private subnets, route tables, Internet Gateway, NAT Gateway, Security Groups vs NACLs' },
      { name: 'Amazon EKS Architecture', hint: 'managed control plane, managed node groups and Fargate, VPC CNI, IAM roles for service accounts (IRSA)/Pod Identity, load balancer controller' },
      { name: 'IAM Policy Evaluation', hint: 'principals, identity vs resource policies, explicit deny wins, permission boundaries, SCPs, STS AssumeRole' },
      { name: 'S3 Storage Classes & Lifecycle', hint: 'Standard, Intelligent-Tiering, Standard-IA, Glacier tiers, lifecycle rules, versioning, durability vs availability' },
    ],
    'Networking': [
      { name: 'What Happens When You Type a URL', hint: 'DNS lookup, TCP handshake, TLS handshake, HTTP request/response, CDN/load balancer, browser rendering' },
      { name: 'DNS Resolution Step by Step', hint: 'stub resolver, recursive resolver, root, TLD and authoritative servers, caching and TTL, record types; dig +trace' },
      { name: 'TCP Three-Way Handshake', hint: 'SYN, SYN-ACK, ACK, sequence numbers, connection teardown (FIN), TIME_WAIT, retransmission basics' },
      { name: 'TLS 1.3 Handshake', hint: 'ClientHello/ServerHello, key share (ECDHE), certificate verification, 1-RTT, session resumption, certificate chain' },
      { name: 'Load Balancers: L4 vs L7', hint: 'transport vs application layer, algorithms (round robin, least connections), health checks, TLS termination, sticky sessions' },
    ],
    'Infrastructure as Code': [
      { name: 'Terraform Plan & Apply Lifecycle', hint: 'providers, resources, init/plan/apply, state file and remote backends, locking, drift, modules' },
      { name: 'Helm Charts Explained', hint: 'chart structure, values.yaml, templates, releases, install/upgrade/rollback, dependencies, helm template' },
      { name: 'Ansible Playbooks', hint: 'inventory, playbooks, tasks, modules, idempotency, handlers, roles, agentless over SSH' },
    ],
    'Observability': [
      { name: 'Metrics, Logs & Traces', hint: 'the three pillars, when to use each, OpenTelemetry, correlation via trace IDs, cardinality' },
      { name: 'Prometheus & PromQL Basics', hint: 'pull-based scraping, exporters, time series and labels, counters/gauges/histograms, rate(), alerting rules, Alertmanager' },
      { name: 'SLIs, SLOs & Error Budgets', hint: 'defining SLIs, setting SLOs, error budget maths, burn-rate alerts, using budgets to balance velocity and reliability' },
    ],
    'Security': [
      { name: 'Secrets Management', hint: 'never in git, Vault, External Secrets Operator, Sealed Secrets, rotation, short-lived credentials' },
      { name: 'Software Supply Chain Security', hint: 'SBOM, dependency scanning, image signing (cosign/Sigstore), provenance (SLSA), admission policies' },
      { name: 'Zero Trust & mTLS with Istio', hint: 'never trust the network, workload identity (SPIFFE), sidecar/ambient mTLS, PeerAuthentication, AuthorizationPolicy' },
    ],
    'Git': [
      { name: 'Git Internals: Blobs, Trees & Commits', hint: '.git directory, object types, SHA hashes, refs and HEAD, how a commit points to a tree; git cat-file' },
      { name: 'Merge vs Rebase', hint: 'merge commits vs linear history, fast-forward, interactive rebase, the golden rule (never rebase shared branches), conflicts' },
      { name: 'Git Branching Strategies', hint: 'trunk-based, GitHub Flow, GitFlow, release branches, feature flags, trade-offs for CI/CD' },
    ],
  };
  const CUSTOM = '__custom__';

  /* ------------------------------------------------------------------ */
  /* Option sets                                                          */
  /* ------------------------------------------------------------------ */
  const FORMATS = {
    'ig-feed': { label: 'Instagram feed · 4:5 (1080×1350)', w: 1080, h: 1350, ratio: '4:5',
      safe: 'Keep all text inside 6% side margins and 5% top/bottom margins.' },
    'reels': { label: 'Reels / Shorts / TikTok · 9:16 (1080×1920)', w: 1080, h: 1920, ratio: '9:16',
      safe: 'Keep important content out of the top 12% and bottom 20% (platform UI overlays) and inside 6% side margins.' },
    'square': { label: 'Square · 1:1 (1080×1080)', w: 1080, h: 1080, ratio: '1:1',
      safe: 'Keep all text inside 6% margins on every side.' },
    'youtube': { label: 'YouTube / LinkedIn · 16:9 (1920×1080)', w: 1920, h: 1080, ratio: '16:9',
      safe: 'Keep all text inside 5% margins; use two-column layouts to make use of the width.' },
  };
  const LENGTHS = {
    '30': { label: '30 seconds', sec: 30 },
    '60': { label: '60 seconds', sec: 60 },
    '90': { label: '90 seconds', sec: 90 },
    '180': { label: '3 minutes', sec: 180 },
    '300': { label: '5 minutes', sec: 300 },
    '600': { label: '10 minutes', sec: 600 },
    'none': { label: 'No limit (cover it completely)', sec: null },
  };
  const LEVELS = {
    'beginner': { label: 'Beginner', text: 'complete beginners: define every term the first time it appears, no assumed knowledge' },
    'beg-int': { label: 'Beginner → Intermediate', text: 'beginner to intermediate engineers: quick definitions, then practical depth' },
    'intermediate': { label: 'Intermediate', text: 'working engineers: skip basics, focus on how it really works and practical commands' },
    'advanced': { label: 'Advanced', text: 'senior engineers: internals, edge cases, performance and failure modes' },
    'interview': { label: 'Interview prep', text: 'candidates preparing for DevOps/SRE interviews: crisp definitions, the "why", and likely follow-up questions' },
  };
  const TONES = {
    'energetic': { label: 'Energetic & punchy', text: 'energetic, punchy and confident, short sentences, zero fluff' },
    'calm': { label: 'Calm & precise', text: 'calm, precise and authoritative, like a senior engineer explaining at a whiteboard' },
    'story': { label: 'Storytelling', text: 'storytelling: follow one request/packet/byte on its journey, with light suspense between scenes' },
    'casual': { label: 'Fun & casual', text: 'fun and casual with light humour, while keeping every fact exact' },
    'coach': { label: 'Interview coach', text: 'an interview coach: "here is what they ask, here is the answer that impresses"' },
  };
  /* Each theme: bg, surface, text, muted, accent (ONE primary), ok/warn/bad, and a font pairing.
     All text/background pairs are chosen for WCAG AA contrast (≥ 4.5:1 body, ≥ 3:1 large). */
  const THEMES = {
    'focus': { label: '★ Clean Focus Dark (recommended)', group: 'Low-noise · best for teaching',
      bg: '#0b0f17', surface: '#141a26', text: '#e6e9ef', muted: '#9aa4b2', accent: '#4f8cff', ok: '#3fb950', warn: '#d29922', bad: '#f85149',
      note: 'Flat solid background, one blue accent, neutral greys. Highlights only the thing being explained.' },
    'paper': { label: 'Whiteboard Light', group: 'Low-noise · best for teaching',
      bg: '#fafaf7', surface: '#ffffff', text: '#1f2328', muted: '#57606a', accent: '#0969da', ok: '#1a7f37', warn: '#9a6700', bad: '#cf222e',
      note: 'Clean whiteboard look, thin 1.5 px dark outlines, no shadows except a 1 px hairline. Very readable on phones in daylight.' },
    'blueprint': { label: 'Blueprint Diagram', group: 'Low-noise · best for teaching',
      bg: '#0d2137', surface: '#123050', text: '#eaf2ff', muted: '#9fb7d3', accent: '#7cc4ff', ok: '#5ad19a', warn: '#ffd166', bad: '#ff7b7b',
      note: 'Architecture-diagram style: thin white lines, labelled boxes and connectors. A faint 8% grid is allowed ONLY here, because it carries meaning (a drawing surface).' },
    'terminal': { label: 'Calm Terminal', group: 'Low-noise · best for teaching',
      bg: '#0d1117', surface: '#161b22', text: '#e6edf3', muted: '#8b949e', accent: '#3fb950', ok: '#3fb950', warn: '#d29922', bad: '#f85149',
      note: 'GitHub-dark terminal look, monospace for code only (sans-serif for titles and body), no scan-lines or CRT effects.' },
    'sap': { label: 'SAP Fiori (Horizon)', group: 'Brand',
      bg: '#0e1b2b', surface: '#15263b', text: '#eaf1f8', muted: '#a3b3c4', accent: '#0a6ed1', ok: '#30914c', warn: '#e9730c', bad: '#e0473b',
      note: 'SAP-style: calm navy, SAP blue accent, rounded 8 px cards, Fiori-like icon outlines. The SAP blue is for outlines, fills and large text only; small text on it is white.' },
    'k8s': { label: 'Kubernetes Blue', group: 'Brand',
      bg: '#0b1020', surface: '#121a33', text: '#e8edf7', muted: '#9aa6c0', accent: '#326ce5', ok: '#2fbf71', warn: '#f2b134', bad: '#ef5b5b',
      note: 'Kubernetes blue accent, white ship-wheel motif only on the hook and CTA.' },
    'neon': { label: 'Neon Dark (high energy)', group: 'Expressive · more visual noise',
      bg: '#070a14', surface: '#10162a', text: '#eef1ff', muted: '#a3abc8', accent: '#7c5cff', ok: '#22c55e', warn: '#f59e0b', bad: '#f43f5e',
      note: 'One accent per scene (violet, amber, green, cyan, rose), soft glows on the hero icon only.' },
    'cyber': { label: 'Cyberpunk (high energy)', group: 'Expressive · more visual noise',
      bg: '#06060a', surface: '#121220', text: '#f2f2ff', muted: '#a8a8c8', accent: '#00e5ff', ok: '#2ee59d', warn: '#ffd400', bad: '#ff2bd6',
      note: 'Cyan primary, magenta only for "wrong/danger". Glitch effect allowed on the hook title only (≤ 300 ms).' },
    'custom': { label: 'Custom palette…', group: 'Custom', note: '' },
  };
  const BACKGROUND = {
    'off': { label: 'Off: solid colour (cleanest)', text: 'a flat solid background colour. No grid, no orbs, no particles, no scan-lines, no vignette.' },
    'minimal': { label: 'Minimal: soft gradient + vignette', text: 'one very soft static radial gradient (≤ 6% lightness change) plus a light vignette. Nothing moves in the background.' },
    'rich': { label: 'Rich: grid, glow orbs, scan-line', text: 'a subtle grid (≤ 5% opacity), 2 slowly drifting blurred glow orbs (≤ 25% opacity, ≥ 20 s per cycle), a soft vignette and an occasional scan-line sweep (≤ 6% opacity). Background motion must never pass behind text that is being read.' },
  };
  const PEDAGOGY = {
    'guided': { label: 'Guided step-by-step (recommended)', text: 'Guided step-by-step: each scene explains ONE step. A persistent mini progress map at the top shows where we are in the whole process.' },
    'problem': { label: 'Problem → solution', text: 'Problem → solution: open each phase with the pain or question ("Why can\'t the kernel just read the disk?"), then show the mechanism that solves it.' },
    'journey': { label: 'Follow one object', text: 'Follow one object: a single packet/request/byte is the protagonist. It visibly travels through every component, and the camera follows it.' },
    'build': { label: 'Build the diagram', text: 'Build the diagram: start from an empty canvas and add one component per scene to ONE growing architecture diagram, ending with the full picture (great as a screenshot).' },
    'compare': { label: 'Misconception → truth', text: 'Misconception → truth: for each phase, show the common wrong belief (struck out), then the correct model.' },
  };
  const MOTION = {
    'subtle': { label: 'Calm (recommended for teaching)', text: 'calm: 250–400 ms fade/slide reveals with easeOutCubic, no looping motion except the one item currently being explained (a slow 2 s pulse, ≤ 4% scale)' },
    'balanced': { label: 'Balanced', text: 'balanced: staggered pop-ins (easeOutBack, overshoot ≤ 6%), flowing dashed arrows on active connections only, one looping accent per scene' },
    'high': { label: 'High-energy', text: 'high-energy: snappy pops, kinetic titles, a quick cut every 2–3 s, but never obscuring text that is being read and never more than 2 things moving at once' },
  };
  const NARRATION = {
    'browser': { label: 'Browser voice + upload slot', text: 'browser' },
    'captions': { label: 'Captions only (no voice)', text: 'captions' },
    'upload': { label: 'My own voice-over file only', text: 'upload' },
  };
  const LANGUAGES = ['English', 'Hinglish (Hindi + English)', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Spanish', 'German', 'French', 'Portuguese', 'Japanese'];
  const VOICES = { 'male': 'Male', 'female': 'Female', 'any': 'Any' };
  const TARGETS = {
    'any': { label: 'Any AI', note: '', howto: 'Save the generated HTML as a .html file and open it in Chrome.' },
    'claude': { label: 'Claude', note: 'You are running in Claude. Create the HTML as ONE artifact of type text/html. Do not split it across artifacts. If you are close to the output limit, follow the multi-part protocol below.',
      howto: 'Claude: open the artifact, use its Download button, then open the .html in Chrome (downloads may be blocked inside the artifact preview).' },
    'chatgpt': { label: 'ChatGPT', note: 'You are running in ChatGPT. If a code/Python tool is available, also save the file as /mnt/data/{slug}.html and give me the download link. Always also print the complete file in one code block.',
      howto: 'ChatGPT: use the /mnt/data download link (or copy the code block into a .html file), then open it in Chrome.' },
    'gemini': { label: 'Gemini', note: 'You are running in Gemini. Put the HTML in Canvas (or one code block) as one complete file. Do not omit, abbreviate or summarise any code.',
      howto: 'Gemini: in Canvas use Share/Export → Copy, paste into a file named {slug}.html, then open it in Chrome.' },
  };
  const EXTRAS = {
    'analogy': { label: 'Real-world analogy', text: 'Open with ONE memorable real-world analogy (split visual: analogy ↔ technical concept) and reuse it in later scenes.' },
    'commands': { label: 'Live commands & output', text: 'For every phase where it applies, show a terminal panel with real commands and realistic, correct sample output (typewriter animation).' },
    'mistakes': { label: 'Common mistakes', text: 'Add a "Common mistakes" scene: 3 mistakes, each shown as ❌ wrong → ✅ right.' },
    'compare': { label: 'Comparison table', text: 'Add a comparison scene (2–3 columns, at most 5 rows, rows animate in) contrasting the concept with its closest alternative.' },
    'troubleshoot': { label: 'Troubleshooting checklist', text: 'Add a "When it breaks" scene: symptom → diagnostic command → fix, for 3 frequent failures.' },
    'interview': { label: 'Interview questions', text: 'Add an "Interview questions" scene: 3 questions, each answer revealed after a 1.5 s pause.' },
    'quiz': { label: 'Quiz with reveal', text: 'Add a quiz scene before the takeaways: 1 multiple-choice question, 4 options, a 3-second countdown ring, then the correct option turns green with a one-line explanation.' },
    'cheatsheet': { label: 'Cheat-sheet end card', text: 'Make the last content frame a dense, screenshot-worthy cheat sheet (all key commands/terms on one frame) and tell viewers to screenshot it.' },
    'mascot': { label: 'Mascot character', text: 'Add a simple vector mascot that fits the topic (e.g. Tux for Linux, a ship wheel for Kubernetes) drawn with canvas paths, reacting at key moments.' },
  };

  const DEFAULTS = {
    category: 'Linux', concept: 'How Linux Boots',
    level: 'beg-int', tone: 'energetic',
    format: 'ig-feed', minutes: 3,
    theme: 'focus', palette: '', motion: 'subtle', background: 'off', pedagogy: 'guided', retention: true,
    narration: 'browser', language: 'English', voice: 'male', captions: true,
    extras: ['commands', 'mistakes', 'interview'],
    target: 'any',
    brand: 'kona-srinivas-devops', handle: '', keyword: '', hashtags: '#devops #linux #kubernetes',
    mustInclude: '', avoid: '',
    timing: 'auto', timedScript: '',
    studio: true, studioOpts: ['mic', 'takes', 'fulltake', 'upload', 'teleprompter', 'cleanup', 'denoise', 'wav'],
  };

  const STUDIO = {
    'mic': { label: 'Microphone recording (device picker + level meter)' },
    'takes': { label: 'Scene-by-scene takes & retakes' },
    'fulltake': { label: 'Full take + tap-sync' },
    'upload': { label: 'Upload audio file(s)' },
    'teleprompter': { label: 'Word-highlight teleprompter' },
    'cleanup': { label: 'Auto-trim silence, normalise, fades' },
    'denoise': { label: 'Noise suppression / echo cancel toggles' },
    'music': { label: 'Background music + auto-ducking' },
    'wav': { label: 'Export voice-over .wav' },
  };

  const TIMING = {
    'auto': { label: 'Auto-timed script (AI writes narration + exact timestamps)' },
    'locked': { label: 'Lock to my voice-over timings (paste timed script / .srt)' },
  };

  /* ------------------------------------------------------------------ */
  /* Timed-script parser                                                  */
  /* Accepts:  "00:05-00:12 | Scene | text", "[0:05 - 0:12] text",       */
  /*           "00:05 | text" (end = next start), and SRT blocks.        */
  /* ------------------------------------------------------------------ */
  const TC = String.raw`(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?|\d+(?:\.\d+)?s?`;
  function parseTime(str) {
    const t = String(str).trim().replace(',', '.').replace(/s$/, '');
    if (!/^[\d:.]+$/.test(t)) return NaN;
    const parts = t.split(':').map(Number);
    if (parts.some(isNaN) || parts.length > 3) return NaN;
    return parts.reduce((acc, v) => acc * 60 + v, 0);
  }
  function fmtTC(sec) {
    if (!isFinite(sec)) return '--:--';
    const m = Math.floor(sec / 60), s = sec - m * 60;
    return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
  }
  const wordCount = t => (String(t).trim().match(/\S+/g) || []).length;

  function parseTimedScript(text) {
    const raw = String(text || '').replace(/\r/g, '').trim();
    const segs = [], errors = [], warnings = [];
    if (!raw) return { segments: segs, total: 0, errors, warnings };

    if (/-->/.test(raw)) {
      const head = new RegExp(String.raw`^\s*(${TC})\s*-->\s*(${TC})`);
      raw.split(/\n\s*\n/).forEach(block => {
        const lines = block.split('\n').map(x => x.trim()).filter(Boolean);
        const k = lines.findIndex(x => head.test(x));
        if (k < 0) return;
        const m = lines[k].match(head), txt = lines.slice(k + 1).join(' ');
        if (txt) segs.push({ start: parseTime(m[1]), end: parseTime(m[2]), scene: '', text: txt, line: segs.length + 1 });
      });
    } else {
      const lineRe = new RegExp(String.raw`^\[?\s*(${TC})\s*(?:(?:-|–|—|to)\s*(${TC}))?\s*\]?\s*(?:\||:|-|–|—)?\s*(.*)$`);
      raw.split('\n').forEach((ln, i) => {
        const l = ln.trim();
        if (!l || l.startsWith('#') || l.startsWith('//')) return;
        const m = l.match(lineRe);
        if (!m || !m[3]) { errors.push(`Line ${i + 1}: could not read a timestamp — use "00:05-00:12 | Scene | narration"`); return; }
        let scene = '', body = m[3].trim();
        const pp = body.split('|').map(x => x.trim());
        if (pp.length >= 2) { scene = pp[0]; body = pp.slice(1).join(' | '); }
        segs.push({ start: parseTime(m[1]), end: m[2] ? parseTime(m[2]) : NaN, scene, text: body, line: i + 1 });
      });
    }

    segs.forEach((s, i) => {
      if (isNaN(s.start)) errors.push(`Cue ${i + 1}: invalid start time`);
      if (isNaN(s.end)) {
        const next = segs[i + 1];
        if (next && !isNaN(next.start)) s.end = next.start;
        else { s.end = s.start + Math.max(1.5, wordCount(s.text) / 2.4); s.estimated = true;
               warnings.push(`Cue ${i + 1}: no end time — estimated ${fmtTC(s.end)} from word count`); }
      }
    });
    segs.forEach((s, i) => {
      s.dur = +(s.end - s.start).toFixed(3);
      s.words = wordCount(s.text);
      s.wps = s.dur > 0 ? +(s.words / s.dur).toFixed(2) : Infinity;
      if (s.dur <= 0) errors.push(`Cue ${i + 1}: end (${fmtTC(s.end)}) must be after start (${fmtTC(s.start)})`);
      const prev = segs[i - 1];
      if (prev && s.start < prev.end - 0.05) errors.push(`Cue ${i + 1}: overlaps cue ${i} (starts ${fmtTC(s.start)} before ${fmtTC(prev.end)})`);
      if (prev && s.start - prev.end > 1.5) warnings.push(`Cue ${i + 1}: ${(s.start - prev.end).toFixed(1)} s of silence before it (the previous scene will hold)`);
      if (s.wps > 3.2) warnings.push(`Cue ${i + 1}: ${s.wps} words/s is very fast — viewers may not keep up`);
      if (s.dur > 0 && s.dur < 2) warnings.push(`Cue ${i + 1}: only ${s.dur}s — too short for a full scene, consider merging`);
    });
    if (segs.length && segs[0].start > 0.5) warnings.push(`First cue starts at ${fmtTC(segs[0].start)} — the video will open on the first scene during that lead-in`);
    const total = segs.length ? +(segs[segs.length - 1].end).toFixed(3) : 0;
    if (segs.length === 1) warnings.push('Only one cue — split the script into one cue per scene for best sync');
    return { segments: segs, total, errors, warnings };
  }

  const TIMED_TEMPLATE = [
    '# One line per scene:  start-end | Scene name | narration',
    '00:00.0-00:06.5 | Hook | You press the power button, and seconds later Linux is ready. What happens in between?',
    '00:06.5-00:12.0 | Roadmap | Nine phases, from power on all the way to login. Let\'s go!',
    '00:12.0-00:24.0 | Power On | The power supply stabilises its rails, sends Power Good, and the CPU jumps to the reset vector.',
    '00:24.0-00:31.0 | CTA | Follow for more, and comment BOOT if this helped!',
  ].join('\n');

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'explainer';
  const fmtSec = s => (s < 60 ? `${s} seconds` : (s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} minute${s === 60 ? '' : 's'}`));
  const pick = (obj, key, fallback) => (Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : obj[fallback]);

  function normalize(state) {
    const s = Object.assign({}, DEFAULTS, state || {});
    s.extras = Array.isArray(s.extras) ? s.extras.filter(e => EXTRAS[e]) : [];
    s.captions = s.captions !== false && s.captions !== 'false';
    if (state && state.length !== undefined && state.minutes === undefined) s.minutes = state.length === 'none' ? 0 : Number(state.length) / 60;
    if (state && state.conceptCustom && (state.concept === CUSTOM || state.category === CUSTOM)) s.concept = state.conceptCustom;
    if (s.category === CUSTOM) s.category = '';
    s.minutes = s.minutes === '' || s.minutes == null ? 0 : Math.max(0, Math.min(600, Number(s.minutes) || 0));
    delete s.length; delete s.conceptCustom;
    s.timing = TIMING[s.timing] ? s.timing : 'auto';
    if (!THEMES[s.theme]) s.theme = DEFAULTS.theme;
    if (!BACKGROUND[s.background]) s.background = DEFAULTS.background;
    if (!PEDAGOGY[s.pedagogy]) s.pedagogy = DEFAULTS.pedagogy;
    s.retention = s.retention !== false && s.retention !== 'false';
    s.studio = s.studio !== false && s.studio !== 'false';
    s.studioOpts = Array.isArray(s.studioOpts) ? s.studioOpts.filter(o => STUDIO[o]) : [];
    for (const k of ['timedScript', 'category', 'concept', 'palette', 'brand', 'handle', 'keyword', 'hashtags', 'mustInclude', 'avoid', 'language'])
      s[k] = String(s[k] == null ? '' : s[k]).trim();
    return s;
  }

  function conceptInfo(s) {
    const name = String(s.concept || '').trim();
    if (!name) return { name: 'Your Concept', hint: '' };
    const key = name.toLowerCase();
    const cats = [s.category, ...Object.keys(CATALOG)];
    for (const c of cats) { const f = (CATALOG[c] || []).find(x => x.name.toLowerCase() === key); if (f) return { name, hint: f.hint, category: c }; }
    return { name, hint: '' };
  }

  function autoKeyword(name) {
    const stop = new Set(['how', 'what', 'the', 'a', 'an', 'of', 'and', 'vs', 'with', 'on', 'is', 'are', 'it', 'works', 'explained', 'happens', 'when', 'you', 'type', 'step', 'by', 'an']);
    const w = name.split(/[^A-Za-z0-9]+/).find(x => x && !stop.has(x.toLowerCase()));
    return (w || 'LEARN').toUpperCase().slice(0, 12);
  }

  function lengthInfo(s) {
    const m = Number(s.minutes);
    if (!isFinite(m) || m <= 0) return { sec: null, label: 'No limit (cover it completely)' };
    const sec = Math.round(m * 60);
    return { sec, label: fmtSec(sec) };
  }

  function plan(s) {
    const L = lengthInfo(s);
    if (!L.sec) return { short: false, text: 'No time limit: cover the concept completely and correctly. Length follows the content (typically 12–25 scenes). Never pad.' };
    const extrasCost = s.extras.length * 14;
    const phases = clamp(Math.round((L.sec - 26 - extrasCost) / 17), 2, 30);
    const words = Math.round(L.sec * 2.4);
    if (L.sec <= 60) return { short: true, text: `Target length: about ${fmtSec(L.sec)} (±10%), narration budget about ${words} words. Short format: hook ≤ 3 s, skip the roadmap scene, 2–3 phase scenes, merge takeaways and CTA into one end card, and drop extras that do not fit.` };
    return { short: false, text: `Target length: about ${fmtSec(L.sec)} (±10%), narration budget about ${words} words. Plan about ${phases} phase scenes plus hook, roadmap, the selected extras, takeaways and CTA. If the extras do not fit, shorten phases rather than exceed the length.` };
  }

  /* ------------------------------------------------------------------ */
  /* Prompt builder                                                       */
  /* ------------------------------------------------------------------ */
  function buildPrompt(input) {
    const s = normalize(input);
    const c = conceptInfo(s);
    const F = pick(FORMATS, s.format, 'ig-feed');
    const T = pick(TARGETS, s.target, 'any');
    const TH = THEMES[s.theme] || THEMES.focus;
    const theme = s.theme === 'custom'
      ? `Custom palette: ${s.palette || 'dark background with one accent colour'} (derive bg/surface/text/muted/accent/ok/warn/bad tokens from it and keep WCAG AA contrast)`
      : `${TH.label.replace(/^★ | \(.*\)$/g, '')}: ${TH.note}`;
    const tokens = s.theme === 'custom' ? null
      : `\`const THEME = { bg: '${TH.bg}', surface: '${TH.surface}', text: '${TH.text}', muted: '${TH.muted}', accent: '${TH.accent}', ok: '${TH.ok}', warn: '${TH.warn}', bad: '${TH.bad}' }\``;
    const BG = BACKGROUND[s.background];
    const PED = PEDAGOGY[s.pedagogy];
    const slug = slugify(c.name);
    const brand = s.brand || 'your-brand';
    const handle = s.handle || (s.brand ? '@' + s.brand : '@your.handle');
    const keyword = (s.keyword || autoKeyword(c.name)).toUpperCase();
    const tags = s.hashtags || '#devops #learning';
    const fileName = `${slugify(brand)}-${slug}-${F.w}x${F.h}`;
    const P = plan(s);
    const narr = s.narration;
    const SO = new Set(s.studio ? s.studioOpts : []);
    const locked = s.timing === 'locked';
    const TS = locked ? parseTimedScript(s.timedScript) : null;
    const lockedOK = locked && TS.segments.length > 0 && TS.errors.length === 0;

    const L = [];
    const H = t => { L.push('', `## ${t}`); };
    const add = (...x) => L.push(...x);

    add('# Build an animated explainer video as one HTML file (exports to MP4)', '');
    add('## BRIEF');
    add(`- **Concept:** ${c.name}`);
    if (s.category) add(`- **Category:** ${s.category}`);
    add(`- **Audience:** ${pick(LEVELS, s.level, 'beg-int').text}`);
    add(`- **Tone:** ${pick(TONES, s.tone, 'energetic').text}`);
    add(`- **Format:** ${F.ratio}, exported at exactly ${F.w}×${F.h} px`);
    add(lockedOK
      ? `- **Length:** locked to my voice-over: **${fmtTC(TS.total)} (${TS.total.toFixed(1)} s)** across ${TS.segments.length} timed cues`
      : `- **Length:** ${lengthInfo(s).label}`);
    add(`- **Audio:** default voice (browser speech) out of the box${s.studio ? ' + **Advanced Voice Studio** for my own recorded or uploaded voice-over, merged into the final download' : ''}`);
    add(`- **Voice-over timing:** ${lockedOK ? 'LOCKED to my timed script below. Timings are fixed and must not change.' : 'auto-timed. You write the narration with exact timestamps so I can record or generate matching audio and merge it later.'}`);
    add(`- **Visual theme:** ${theme}`);
    add(`- **Background effects:** ${BG.label}`);
    add(`- **Motion intensity:** ${pick(MOTION, s.motion, 'subtle').text}`);
    add(`- **Teaching style:** ${PED.text}`);
    add(`- **Narration language:** ${s.language || 'English'} · voice: ${pick(VOICES, s.voice, 'any')}`);
    add(`- **Brand (header + footer):** ${brand}`);
    add(`- **CTA:** Follow ${handle} · comment "${keyword}" · hashtags: ${tags}`);
    if (c.hint) add(`- **Key points to cover (verify each one):** ${c.hint}`);
    if (s.mustInclude) add(`- **Must include:** ${s.mustInclude}`);
    if (s.avoid) add(`- **Avoid:** ${s.avoid}`);

    H('ROLE');
    add('You are a senior motion designer, technical educator and front-end engineer. You produce viral-quality, factually exact animated explainer videos as a single self-contained HTML file that plays like a video and exports itself to MP4.');
    if (T.note) add('', T.note.replace('{slug}', slug));

    H('DELIVERABLE');
    add(`One file \`${slug}.html\`: fully self-contained with inline CSS, JS and icons. **No CDN, no external fonts, images or libraries.** It must work offline when double-clicked, in current Chrome, Edge, Safari and Firefox.`);
    add('- Output the **complete** file in one code block. No placeholders, no "…rest unchanged", no TODOs.');
    add('- **Multi-part protocol:** if the file would exceed your output limit, output Part 1 (the complete engine, player' + (s.studio ? ', Voice Studio' : '') + ' and download system, and the first scenes), ending with the marker comment `/* @@MORE-SCENES-HERE@@ */` inside the `SCENES` array. Then stop and write `Reply "continue" for Part 2`. Each later part contains ONLY additional scene objects to paste at that marker. The engine must work with any number of scenes.');

    H('1. CONTENT STRUCTURE');
    if (lockedOK) add('Scene count, order and timing come from **MY TIMED VOICE-OVER SCRIPT** (section 1A). Map each cue to one scene (hook, roadmap, phases, extras, takeaways and CTA as the cue text indicates). Do NOT add, drop, merge or re-time cues. Extras are only included where a cue covers them.');
    else add(P.text);
    add('1. **Hook** (≤ 5 s): a surprising question or fact, plus a promise of what the viewer will learn.');
    if (!P.short) add('2. **Roadmap:** a numbered table of contents, one row per phase (icon + phase name + description of 6 words or fewer), with rows animating in one by one.');
    add(`${P.short ? '2' : '3'}. **Phase scenes:** one idea per scene. Each scene has a chip \`Step n / N\`, a title of ≤ 5 words with one gradient keyword, 3–5 visual items (cards, flow with arrows, checklist, terminal/log, diagram, comparison, counter) with an icon, a label of ≤ 8 words and an optional subline of ≤ 10 words, and one takeaway caption of ≤ 14 words with a real command, path or pro tip where relevant.`);
    const ex = s.extras.map(e => EXTRAS[e].text);
    if (ex.length) { add(`${P.short ? '3' : '4'}. **Extras (selected):**`); ex.forEach(t => add(`   - ${t}`)); }
    add(`${P.short ? (ex.length ? '4' : '3') : (ex.length ? '5' : '4')}. **Key takeaways:** 4–6 points, each with an animated check mark${P.short ? ', merged with the CTA on one end card' : ''}.`);
    add(`${P.short ? (ex.length ? '5' : '4') : (ex.length ? '6' : '5')}. **CTA:** Follow ${handle} · Like · Comment "${keyword}" · Share · Save, with icons.`);
    if (lockedOK) add('- **Narration:** use MY cue text exactly as written (fix only obvious typos, and list them). Every visual element appears exactly when its words are spoken. Estimate the word offset as `start + dur × (wordIndex / wordCount)`.');
    else add(`- **Narration:** written in ${s.language || 'English'}, conversational, 2.3–2.6 words per second, short sentences. Every visual element appears exactly when the narration mentions it. In the narration text only, write acronyms the way they should be spoken (e.g. "U.E.F.I.", "K-eight-S"). On screen, keep the correct spelling.`);
    add('- **Accuracy:** only verifiable facts. Use real commands, flags, file paths and version names. If you are unsure of a detail, generalise rather than invent it. List any assumptions in an HTML comment at the top of the file.');

    if (lockedOK) {
      H('1A. MY TIMED VOICE-OVER SCRIPT (source of truth)');
      add(`Total audio length: **${TS.total.toFixed(2)} s**. The video's \`TOTAL\` must equal this, to within 0.05 s. Build \`SCENES\` from this table: \`start\` and \`dur\` are copied verbatim, never computed from word count.`, '');
      add('| # | Start (s) | End (s) | Dur (s) | Scene | Narration |', '|---|---|---|---|---|---|');
      TS.segments.forEach((g, i) => add(`| ${i + 1} | ${g.start.toFixed(2)} | ${g.end.toFixed(2)} | ${g.dur.toFixed(2)} | ${g.scene || '—'} | ${g.text.replace(/\|/g, '/')} |`));
      add('', '- If a gap exists between two cues, extend the earlier scene to the next start (hold the last state with a gentle idle loop). If the first cue starts after 0, the first scene covers the lead-in.');
      add('- Inside each scene, distribute the reveal of visual items across the cue in the order they are spoken, using the word-offset rule. Leave the last 0.4 s of each scene with everything visible (no new reveals).');
    }

    H(lockedOK ? '1B. VOICE-OVER SYNC & MERGE WORKFLOW' : '1A. VOICE-OVER SCRIPT, TIMINGS & MERGE WORKFLOW');
    if (!lockedOK) {
      add('- Before writing code, produce the **timed narration script** and use it as the single source of truth for `SCENES` (start, dur, narration). The visuals follow the script, never the reverse.');
      add('- Each scene\'s duration = `round(wordCount / 2.4 + 0.6, 1)` seconds, so the narration fits comfortably when recorded at a natural pace.');
    }
    add('- The player must expose these exports, so audio can be generated, recorded, edited and merged later in any editor (CapCut, Premiere, DaVinci, Audacity, ffmpeg):');
    add('  - `📝 Copy timed script`: one line per scene, in the exact format `00:12.0-00:24.0 | Scene name | narration`. This is the same format this generator accepts back in "Lock to my voice-over" mode.');
    add('  - `⬇ .srt` (subtitle file, one cue per caption chunk) and `⬇ cues.json` (`[{ scene, start, end, dur, narration }]`).');
    add('  - `⬇ Silent video`: the MP4/WebM export with no audio track, for merging in an editor.');
    if (s.studio) add('  - `🎙 Load voice-over` (inside Voice Studio): if a single audio file is loaded, compare its duration with `TOTAL`. If they differ by more than 0.3 s, show a banner such as *"Audio is 182.4 s, video is 180.0 s"* with two buttons: **Stretch visuals to audio** (scale every scene\'s start and dur proportionally) and **Keep timings**. If per-scene clips are loaded, use each clip\'s exact duration (+0.6 s pad) for its scene.');
    add('  - `⏱ Sync check` overlay (toggle with the T key): shows the current scene, cue start/end and the live drift between audio time and timeline in milliseconds.');
    add('- **Re-timing round trip:** if I later paste an edited timed script into a `✏ Re-time` dialog, re-parse it and rebuild `starts[]`, `TOTAL` and the progress bar without reloading. Validate that cues are increasing and non-overlapping, and highlight errors by line.');
    add('- **Merge command** (show it in the download panel, with the real filename): `ffmpeg -i ' + fileName + '-silent.mp4 -i voiceover.m4a -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest ' + fileName + '.mp4`');

    H('1C. TEACHING METHOD (how to explain so it sticks)');
    add(`- **Style:** ${PED.text}`);
    add('- **Cognitive load:** one new idea per scene and **at most 4 new terms per scene**. Define a term the first time it appears (a small "term: meaning" tag beside it), then reuse exactly the same word. Never use two names for one thing.');
    add('- **Signalling:** at any moment exactly ONE element is "active": full colour, accent outline, and a label of what it is doing. Everything already explained dims to 45% opacity; future items are hidden. The viewer should always know where to look.');
    add('- **Spatial consistency:** a component keeps the same position, icon and colour in every scene it appears in. Data and control flow always run in the same direction (left→right' + (F.ratio === '9:16' || F.ratio === '4:5' ? ' or top→bottom on tall formats' : '') + '). Arrows are labelled with what travels on them.');
    add('- **Dual coding without redundancy:** narration explains; the screen shows the diagram plus short labels (≤ 6 words). **Never put full narration sentences on screen except in captions.** Captions sit in a fixed band and never overlap the diagram.');
    add('- **Concrete first:** every abstract idea gets a concrete example (a real command, file, value or number) within the same scene.');
    add('- **Segmenting:** each scene ends on a 0.6 s "settle" frame where nothing moves and the takeaway caption is readable. This is also a natural pause point for the viewer.');
    if (s.retention) {
      add('- **Retention devices:**');
      add('  - Open with a curiosity gap (a question the video answers at the end) and pay it off explicitly.');
      add('  - Every 3–4 phases, insert a 3-second **"So far"** recap strip: the mini progress map with completed steps ticked.');
      add('  - End with a one-frame **summary diagram** that is readable as a screenshot (all steps, one line each).');
      add('  - Pattern interrupt about every 20–30 s (a question, a "❌ common mistake", or a zoom into a detail) so attention resets without adding clutter.');
    }

    H('2. VISUAL DESIGN (clarity first, low noise)');
    add(`- **Theme:** ${theme}.`);
    if (tokens) add(`- **Design tokens (use only these colours):** ${tokens}. Use \`accent\` only for the active element and key words; \`ok\`/\`warn\`/\`bad\` only for meaning (correct/caution/wrong), never decoration. Inactive items use \`muted\`.`);
    add(`- **Background:** ${BG.text}`);
    add('- **Colour discipline:** at most 1 accent + 1 semantic colour visible at a time. Never use colour as the only signal: pair it with an icon (✓ ⚠ ✕) or a label, so it works for colour-blind viewers. Text contrast ≥ 4.5:1 (body) and ≥ 3:1 (titles).');
    add('- **Typography:** system UI sans-serif for titles and body; monospace ONLY for commands, paths and code. Two weights only (600 for titles, 400–500 for body). Line height 1.25 for titles and 1.4 for body. No gradient text on body copy; gradient is allowed on one keyword per title at most.');
    add('- **Type scale** (as a fraction of canvas width): titles 6.5–7.5%, labels 3.4–3.8%, small text never below 2.8% (still readable on a phone). Titles ≤ 2 lines, labels ≤ 6 words.');
    add('- **Layout grid:** 12-column grid with 8-pt spacing (multiples of 0.8% of width). Generous whitespace: the diagram uses ≤ 70% of the safe area. Corner radius is consistent (one value). Shadows: one soft level only, or none in light themes.');
    add('- **Element budget per scene:** ≤ 5 boxes, ≤ 4 arrows and ≤ 1 terminal panel. If a scene needs more, split it into two scenes.');
    add(`- **Safe zones:** ${F.safe} Nothing touches or crosses the canvas edge, and no elements overlap.`);
    add(`- **Header (quiet):** a small logo glyph + **${brand}** (muted colour, 2.6% type) on the left, and the mini progress map on the right (one dot per phase; the current one is accent-coloured with its name). No blinking elements.`);
    add(`- **Footer (quiet):** **${brand}** • ${tags.split(/\s+/).slice(0, 3).join(' ')}, in muted colour, ≤ 2.4% type. No watermark over the content area.`);
    add('- **Icons:** build an inline library of ≥ 40 consistent stroke icons as 24×24 SVG path strings drawn with `Path2D` (one stroke width, rounded caps): power, cpu, ram, disk, network, lock, shield, gear, terminal, file, folder, box, cloud, server, database, user, clock, check, cross, arrow, warning, bug, key, git, container, layers, search, chart, heart, comment, share, bookmark, etc., plus topic-specific icons. Icons always have a text label next to them.');
    add(`- **Motion:** ${pick(MOTION, s.motion, 'subtle').text}. Rules: animate to explain, never to decorate. Every motion must show a change of state, a flow or attention. At most 2 things move at once. Nothing moves while a sentence is being read except the active highlight. Respect \`prefers-reduced-motion\` in the preview (crossfades only).`);
    add('- **Transitions between scenes:** keep shared components on screen and move them to their new positions (a "magic move"), rather than cutting to a blank frame. Hard cuts only at section changes.');

    H('3. ENGINE (mandatory architecture)');
    add('- **Render the whole video on one `<canvas>` with the Canvas 2D API. No DOM or CSS animation inside the video area.** This keeps preview and export pixel-identical, and export works without a screen-share prompt.');
    add('- `drawFrame(ctx, t, W, H, opts)` is a **pure function of time t (seconds)**: no `Date.now()`, no unseeded `Math.random()` (use a seeded PRNG), and no state that depends on the previous frame.');
    add('- Data model: `const SCENES = [{ id, name, accent, dur, narration, caption, draw(ctx, local, p, api) }]`, where `local` is seconds into the scene and `p` is progress 0–1. Set each scene\'s duration to `max(declared dur, wordCount / 2.4 + 1.0)`, then compute `starts[]` and `TOTAL`.');
    add('- Helper `api`: `easeOutCubic`, `easeOutBack`, `easeInOut`, `appear(local, at, len)` → 0–1, `roundRect`, `wrapText` (returns line count), `drawIcon(name, x, y, size, color)`, `chip`, `title`, `card`, `flowRow`, `arrow`, `checklist`, `terminal`, `progressBar`, `counter`, `typewriter`, `caption`, `hero`.');
    add('- Resolution-independent: every size is a fraction of W. The preview canvas uses devicePixelRatio. The export canvas is created at the exact target size.');
    add(`- Expose for automation: \`window.__reel = { total: TOTAL, width: ${F.w}, height: ${F.h}, fps: 30, scenes: [{ name, start, dur, narration }] }\` and \`window.__frameAt(t, type = 'image/jpeg', quality = 0.95)\`, which renders time t on an offscreen ${F.w}×${F.h} canvas and returns a data URL.`);

    H('4. PLAYER UI (outside the canvas, never recorded)');
    add('- Play/Pause, Restart, speed **1× / 2× / 3× / 4×**, a seek bar with chapter ticks and the current scene name, a time readout `m:ss / m:ss @n×`, Loop, **Mute/Unmute**, Captions on/off, Fullscreen (canvas only), and Clean mode (hides everything except the canvas).');
    add('- Keyboard: Space, 1–4, ←/→ (±5 s), R, L, M, C, F, H. Add a "Tap to play" overlay (needed for audio autoplay rules). The canvas scales to the viewport and keeps its aspect ratio. Speed scales the timeline clock.');

    const vname = pick(VOICES, s.voice, 'any').toLowerCase();
    const lang = s.language || 'English';

    H('5. AUDIO: DEFAULT VOICE' + (s.studio ? ' + ADVANCED VOICE STUDIO' : ''));
    add('- **Word timing model (shared by captions, teleprompter, reveals and sync):** for every scene, compute `words: [{ w, t0, t1 }]` once by spreading the narration window (`start + 0.2` → `end − 0.4`) across the words, weighted by `max(2, letters)`, plus 3 units of pause after a comma and 6 units after `. ! ?`. Expose it as `window.__reel.words`. Visual reveals use these word times.');
    if (narr === 'captions') {
      add('- **Default audio:** none. Captions carry the story: burned-in chunks of ≤ 7 words, always on, large and high-contrast, with the current word highlighted.');
    } else if (narr === 'upload') {
      add('- **Default audio:** none until a voice-over is added. Show "Add your voice-over" on the play overlay and rely on captions until then.');
    } else {
      add(`- **Default voice (ON by default):** \`speechSynthesis\` speaks each scene's narration when that scene starts, at \`rate = min(speed, 2)\`. Choose the best ${vname} voice for ${lang} (prefer names containing Natural, Neural, Google, Samantha or Daniel) and add a voice-picker dropdown (remember the choice in localStorage). Load voices asynchronously (\`voiceschanged\`). Cancel and restart speech correctly on pause, seek, speed change and mute. If \`onboundary\` events fire, use them to drive the word highlight; otherwise use the word timing model.`);
    }
    add(`- **Captions:** burned-in subtitle chunks (≤ 7 words) with the current word highlighted. Toggle, default ${s.captions ? 'ON' : 'OFF'}. **Mute** silences every audio source.`);

    if (s.studio) {
      add('', '### 🎙 Advanced Voice Studio (a panel outside the canvas, never recorded into the video)');
      add('A `🎙 Voice Studio` button opens a side panel. The panel lets me choose the **audio source for the final video**: `Default voice` · ' + [SO.has('mic') && '`Record with microphone`', SO.has('upload') && '`Upload audio`'].filter(Boolean).join(' · ') + '. All processing happens in the browser; nothing is uploaded anywhere.');
      let n = 1; const step = t => add(`${n++}. ${t}`);
      if (SO.has('mic')) {
        step('**Microphone selection:** on first use, call `getUserMedia({ audio: true })` once to get permission, then `enumerateDevices()` and list **every** `audioinput` by its label in a dropdown ("System default" first). Refresh the list on `devicechange`, remember the chosen `deviceId` in localStorage, and reopen the stream with `{ deviceId: { exact: id }' + (SO.has('denoise') ? ', echoCancellation, noiseSuppression, autoGainControl' : '') + ' }`' + (SO.has('denoise') ? ', where each of those three is a checkbox' : '') + '. Show a live **level meter** (RMS + peak hold, green/amber/red) with hints: "Too quiet: move closer", "Clipping: lower your input gain". Handle these cases with clear messages instead of failing silently: permission denied, no devices, device unplugged mid-take, and `file://` or insecure contexts where the mic is blocked (tell me to open the file in Chrome; Chrome allows the mic on `file://` after a prompt). Stop all tracks when the studio closes.');
        if (SO.has('teleprompter')) step('**Teleprompter:** large text of the current scene\'s narration with the current word highlighted (word timing model), the next line dimmed, a 3-2-1 countdown with an optional beep (the beep is never recorded), and the video preview playing in sync (default voice muted while recording).');
        if (SO.has('takes')) step('**Scene-by-scene takes (recommended):** a scene list shows the status of each scene: ✓ recorded / ⚠ longer than the scene / ✗ missing, plus take length vs scene length. Select a scene → Record → countdown → the teleprompter runs for that scene\'s window → recording stops automatically at scene end + 1.0 s (or I press Stop). Keep up to 3 takes per scene, with Play, Use this take, Retake and Delete. Keyboard: R = record/stop the selected scene, ↑/↓ = previous/next scene.');
        if (SO.has('fulltake')) step('**Full take + tap-sync:** the whole video plays at 1× while I read; one continuous recording. Then the optional **Tap-sync**: play the recording back and press Space at the start of each scene. This sets the cue starts exactly and rebuilds `starts[]`/`TOTAL` (shown as an editable timed script for fine-tuning).');
        step('Record with `MediaRecorder` (prefer `audio/webm;codecs=opus`, fall back to `audio/mp4`), then decode every take into an `AudioBuffer` with `decodeAudioData`. **Save takes in IndexedDB** so a page reload doesn\'t lose them, and add a "Clear all takes" button.');
      }
      if (SO.has('upload')) step('**Upload audio:** accept one full-length file, or several per-scene files (sorted by filename and mapped to scenes in order). Show a mapping table that lets me reassign files to scenes. For a single full file, compare its length with `TOTAL`. If they differ by more than 0.3 s, offer **Stretch visuals to audio** (scale every start and dur proportionally) or **Keep timings**.');
      step('**Fit & align:** ' + [SO.has('cleanup') && 'auto-trim leading/trailing silence (threshold −45 dBFS, keep 80 ms padding)', 'if a take is longer than its scene, offer **Extend scene to fit** (default: re-time this scene and shift every later scene) or **Trim the tail**, and never speed up audio (it changes pitch)', 'a shorter take is fine (the visuals hold)', 'a global offset nudge (±1.0 s in 10 ms steps) plus a per-scene nudge', 'and a **Sync check** overlay (T key) showing the live drift in ms'].filter(Boolean).join('; ') + '.');
      if (SO.has('cleanup') || SO.has('music')) step('**Processing:** ' + [SO.has('cleanup') && 'peak-normalise the voice to −1 dBFS (checkbox, on), add 10 ms fades at clip edges to avoid clicks', SO.has('music') && 'optional background-music upload with a volume slider and **auto-ducking** (−12 dB with 150 ms attack and 400 ms release whenever voice is present, worked out from the voice track\'s RMS envelope)'].filter(Boolean).join('; ') + '.');
      step('**Merge:** render ONE voice-over track with `OfflineAudioContext` (48 kHz, length = `TOTAL`), placing each clip at its scene start + nudge' + (SO.has('music') ? ', mixed with the ducked music' : '') + '. Store it as `customTrack`. Buttons: `▶ Preview with video` (plays `customTrack` against the timeline from the current position)' + (SO.has('wav') ? ', `⬇ Voice-over .wav` (16-bit PCM, encoded in JS)' : '') + ', `📝 Copy timed script` (with the new timings).');
      step('**Readiness checklist** (shown live; every item must be green before "Custom voice-over" can be chosen for download): every scene has audio or is explicitly marked silent · no clip runs past its scene · peak ≤ −0.5 dBFS (no clipping) · average level not too quiet (RMS > −35 dBFS) · merged length matches `TOTAL` to within 0.1 s. Each failing item has a **Fix** button that jumps to the scene or setting at fault.');
    }

    H('6. DOWNLOAD VIDEO (must work from a file opened locally)');
    add(`- \`⬇ Download video\` opens a panel: format (default ${F.ratio} ${F.w}×${F.h}, also offer 4:5, 9:16, 1:1 and 16:9), FPS (30 or 60), bitrate (8, 12 or 16 Mbps), burn-in captions, and the **Audio** choice below.`);
    add('- **Audio choice (radio buttons, with the reason shown when an option is unavailable):**');
    if (s.studio) add(`  1. **Custom voice-over**${' '}— enabled only when the Voice Studio checklist is all green. Uses \`customTrack\`. **This is the default whenever it is ready.** File: \`${fileName}-custom-voice.mp4\`.`);
    if (narr === 'browser') add(`  ${s.studio ? '2' : '1'}. **Default voice** — the default when no custom audio is ready. Browser speech does not pass through Web Audio, so capture it with tab-audio capture: \`getDisplayMedia({ video: true, audio: { suppressLocalAudioPlayback: false }, preferCurrentTab: true, selfBrowserSurface: 'include', systemAudio: 'include' })\`, keep only the audio track, and tell me to choose **"This tab"** with **"Also share tab audio"** ticked. Watch the captured audio with an \`AnalyserNode\`. If there is no signal by the end of the first narrated scene, stop and say: *"Your browser did not allow the default voice to be recorded. ${s.studio ? 'Record it in Voice Studio, upload a TTS file, or download with captions.' : 'Download with captions, or use the silent video + merge command.'}"* Capture of browser speech is **not guaranteed** (it depends on the browser, OS and voice; Chrome with an online "Google" voice is the most likely to work), so this check is mandatory. File: \`${fileName}-default-voice.mp4\`.`);
    add(`  ${(s.studio ? 1 : 0) + (narr === 'browser' ? 1 : 0) + 1}. **No voice (captions only)**: always available. File: \`${fileName}-captions.mp4\`.`);
    add('- **Fallback chain when I press Download without choosing:** ' + [s.studio && 'Custom (if ready)', narr === 'browser' && 'Default voice (if capture works)', 'Captions only'].filter(Boolean).join(' → ') + '. Always state in the success message which audio the file contains.');
    add('- **Implementation:** create an offscreen canvas at the target W×H and get `canvas.captureStream(fps)`.' + (s.studio ? ' For custom audio: create an `AudioBufferSourceNode(customTrack)` → `MediaStreamDestination`, add its track, and start it at the exact same instant the timeline starts (on the same `AudioContext.currentTime` tick).' : '') + ' For the MIME type, use the first supported from `[\'video/mp4;codecs=avc1.640028,mp4a.40.2\', \'video/mp4;codecs=avc1,mp4a.40.2\', \'video/mp4\', \'video/webm;codecs=vp9,opus\', \'video/webm;codecs=vp8,opus\', \'video/webm\']`.');
    add('- Record by playing the timeline at 1× from 0 to TOTAL in real time (so **there is no length limit**), drawing `drawFrame` at the target resolution on every animation frame. Show progress %, time remaining and Cancel. Warn me to keep the tab visible.');
    add('- When recording stops: build a Blob → `URL.createObjectURL` → click a temporary `<a download>` → revoke the URL after 60 s. **Never link to a sibling file path**: plain file links open the file instead of downloading it when the HTML is opened from disk.');
    add(`- Also offer \`⬇ Silent video\`${s.studio && SO.has('wav') ? ' + `⬇ Voice-over .wav`' : ''} with the merge command: \`ffmpeg -i ${fileName}-silent.mp4 -i voiceover.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest ${fileName}.mp4\`.`);
    add('- If the result is WebM, show the one-line conversion: `ffmpeg -i in.webm -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -movflags +faststart out.mp4`.');
    add('- Also add `📸 Save frame` (PNG of the current frame, for a cover image). If MediaRecorder is unavailable, show a clear message instead of failing silently.');

    H('7. QUALITY GATE (check every item before answering; fix anything that fails)');
    add('- [ ] No external requests of any kind. The file runs offline when opened from disk.');
    add('- [ ] No JavaScript errors. All braces and template strings are closed. Every scene `draw` handles `local < 0` and `local > dur`.');
    add(`- [ ] No text overflows its card or the canvas at ${F.w}×${F.h} or at any other offered format. \`wrapText\` is used everywhere.`);
    add('- [ ] Each visual element appears at the moment the narration mentions it.');
    add('- [ ] **Clarity:** exactly one active element at a time; past items dimmed; ≤ 5 boxes and ≤ 4 arrows per scene; no on-screen sentence longer than 6 words outside captions; text ≥ 2.8% of width; contrast AA.');
    add(`- [ ] **Low noise:** background matches "${BG.label}"; at most 2 moving things at once; nothing decorative moves behind text.`);
    add('- [ ] Speed, seek, mute, loop and captions all work while playing and while paused.');
    add('- [ ] Download uses Blob + object URL, shows progress and can be cancelled.');
    add(`- [ ] Every fact, command and path is correct. Spelling is checked. **${brand}** appears in the header and footer.`);
    if (lockedOK) add(`- [ ] \`TOTAL\` = ${TS.total.toFixed(2)} s, and every scene's start and dur match section 1A exactly (print the table in an HTML comment and diff it).`);
    else add(`- [ ] Total duration matches the brief (${lengthInfo(s).label}), and the timed script's timestamps equal the engine's \`starts[]\` exactly.`);
    add('- [ ] Copy timed script / .srt / cues.json / Silent video / Re-time all work, and the copied script re-imports with identical timings.');
    if (narr === 'browser') add('- [ ] The default voice plays out of the box after "Tap to play", the voice picker lists the available voices, and the default-voice download detects silence and falls back with a message.');
    if (s.studio) {
      if (SO.has('mic')) add('- [ ] After permission is granted, the microphone dropdown lists all input devices by name, updates on plug/unplug, and the level meter moves. Denied permission or missing devices show a clear message.');
      if (SO.has('takes')) add('- [ ] Scene takes record, auto-stop, play back, can be retaken, and survive a page reload (IndexedDB).');
      add('- [ ] The readiness checklist blocks "Custom voice-over" until it is green. The final custom-voice MP4 has the voice at the right times (drift ≤ 50 ms at every scene start).');
    }

    H('8. OUTPUT FORMAT');
    add('1. One line: number of scenes, total duration, resolution.');
    add('2. The complete HTML file in one code block.');
    add(lockedOK
      ? '3. A confirmation table: scene | start | end | first visual reveal time, proving the lock to my timings.'
      : '3. **Timed voice-over script** in a separate code block, one line per scene in the exact format `00:12.0-00:24.0 | Scene name | narration`, ready to record or paste into a TTS tool. Then the same as .srt.');
    if (s.studio) add('4. **Voice Studio quick guide**: 5 short steps (open studio → pick a mic → record scene takes or upload → check list goes green → Download with custom voice).');
    add(`${s.studio ? '5' : '4'}. Post kit: 3 alternative hook lines, a caption (≤ 150 words, ending with "Comment ${keyword}" and a call to save), 20 relevant hashtags including ${tags.split(/\s+/).slice(0, 3).join(' ')}, and a cover-frame suggestion (scene + time).`);

    return L.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  /* Clarity score 0–100: how "low-noise / teachable" the chosen options are */
  function clarityScore(input) {
    const s = normalize(input); let score = 100; const tips = [];
    const TH = THEMES[s.theme] || {};
    if (/Expressive/.test(TH.group || '')) { score -= 15; tips.push('Expressive themes add visual noise. Clean Focus, Whiteboard or Blueprint teach better.'); }
    if (s.theme === 'custom') { score -= 5; tips.push('Custom palettes are not contrast-checked. Keep one accent colour.'); }
    if (s.background === 'rich') { score -= 20; tips.push('Rich background (grid, orbs, scan-line) competes with the diagram. Try Off or Minimal.'); }
    else if (s.background === 'minimal') score -= 3;
    if (s.motion === 'high') { score -= 15; tips.push('High-energy motion makes viewers re-watch to catch facts. Calm motion is better for learning.'); }
    else if (s.motion === 'balanced') score -= 5;
    if (s.extras.length > 4) { score -= (s.extras.length - 4) * 5; tips.push(`${s.extras.length} extra scenes. Pick 2–4 so the core explanation stays the focus.`); }
    const m = Number(s.minutes);
    if (m > 0 && m < 1 && s.extras.length > 1) { score -= 10; tips.push('Under 1 minute with several extras is too dense. Remove extras or add time.'); }
    if (!s.captions) { score -= 8; tips.push('Most Reels are watched muted. Turn captions on.'); }
    if (!s.retention) { score -= 5; tips.push('Retention devices ("So far" recaps, summary frame) improve recall.'); }
    score = Math.max(0, Math.min(100, score));
    return { score, grade: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Busy' : 'Noisy', tips };
  }

  /* ------------------------------------------------------------------ */
  /* Share-link state encoding (URL-safe base64 JSON)                     */
  /* ------------------------------------------------------------------ */
  function b64e(str) {
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
    return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
  }
  function b64d(b64) {
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
    return new TextDecoder().decode(Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)));
  }
  function encodeState(state) {
    const s = normalize(state), diff = {};
    for (const k of Object.keys(s)) if (JSON.stringify(s[k]) !== JSON.stringify(DEFAULTS[k])) diff[k] = s[k];
    return b64e(JSON.stringify(diff)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeState(str) {
    try {
      const b = String(str).replace(/-/g, '+').replace(/_/g, '/');
      return normalize(JSON.parse(b64d(b + '==='.slice((b.length + 3) % 4))));
    } catch (e) { return normalize({}); }
  }

  return { CATALOG, CUSTOM, FORMATS, LENGTHS, LEVELS, TONES, THEMES, MOTION, NARRATION, LANGUAGES, VOICES, TARGETS, EXTRAS, DEFAULTS,
    buildPrompt, clarityScore, STUDIO, BACKGROUND, PEDAGOGY, parseTimedScript, fmtTC, TIMING, TIMED_TEMPLATE, normalize, conceptInfo, slugify, autoKeyword, encodeState, decodeState };
});
