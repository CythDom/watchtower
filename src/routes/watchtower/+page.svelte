<script lang="ts">
	import { onMount } from 'svelte';

	const line1 = 'Improvement is on the horizon';
	const line2 = 'Begin exploring →';

	function tokenize(str: string, offset = 0) {
		let charIdx = 0;
		return str.split('').map((ch) => {
			if (ch === ' ') return { ch, space: true, ei: 0 };
			return { ch, space: false, ei: offset + charIdx++ };
		});
	}

	// ── Backgrounds ────────────────────────────────────────────
	const STARTING_BG  = '/bg-pan-2.png';
	const DESTINATIONS = [
		'/bg-1.jpg', '/bg-2.jpg', '/bg-3.jpg',
		'/bg-4.jpg', '/bg-5.jpg', '/bg-6.jpg', '/bg-7.jpg',
	];

	let bgSrc     = $state(STARTING_BG);
	let traveling = $state(false);
	let dark      = $state(false);
	let textShown = $state(true);
	let viewing  = $state(false);
	let panReady = $state(false);
	let panX     = $state(50); // matches bg-position center = 50%
	let panY     = $state(30); // matches bg-position 30%

	$effect(() => {
		document.body.classList.toggle('viewing', viewing);
	});

	function trackMouse(e: MouseEvent) {
		if (!panReady) return;
		panX = (e.clientX / window.innerWidth)  * 100;
		panY = 30 + (e.clientY / window.innerHeight - 0.5) * 10;
	}

	onMount(() => {
		DESTINATIONS.forEach(src => { const i = new Image(); i.src = src; });
		try {
			const saved = JSON.parse(localStorage.getItem('wt-log') ?? '[]');
			loggedIds = new Set(saved);
		} catch {}
	});

	function sleep(ms: number) {
		return new Promise<void>(r => setTimeout(r, ms));
	}

	function enjoyView(e: Event) {
		e.preventDefault();
		viewing   = true;
		panReady  = false;
		textShown = false;
		setTimeout(() => { panReady = true; }, 1400);
	}

	function exitView() {
		viewing   = false;
		panReady  = false;
		textShown = true;
		panX = 50;
		panY = 30;
	}

	async function beginJourney(e: Event) {
		e.preventDefault();
		if (traveling) return;
		traveling = true;

		textShown = false;
		dark      = true;

		await sleep(1500);
		bgSrc = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];

		await sleep(200);
		dark = false;

		await sleep(1800);
		panelShown = true;
		loadFinds();
		traveling  = false;
	}

	// ── Color ramp ─────────────────────────────────────────────
	const RAMP = [
		'#1c1c1c', '#2e0c0c', '#430f0f', '#5e1111', '#7a1414',
		'#962020', '#b03010', '#c84400', '#df5500', '#f46600',
		'#ff7a00', '#ff9200', '#ffaa00', '#ffbf00', '#ffd000',
		'#ffe044', '#fff0a0', '#ffffff',
	];

	function hexToRgb(h: string): [number, number, number] {
		const n = parseInt(h.slice(1), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	function colorAt(pos: number): string {
		const max = RAMP.length - 1;
		const p   = Math.max(0, Math.min(1, pos)) * max;
		const lo  = Math.floor(p), hi = Math.min(lo + 1, max);
		const t   = p - lo;
		const [r1,g1,b1] = hexToRgb(RAMP[lo]);
		const [r2,g2,b2] = hexToRgb(RAMP[hi]);
		return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
	}

	function shadowAt(pos: number): string {
		if (pos < 0.52) return 'none';
		const t = (pos - 0.52) / 0.48;
		return [
			`0 0 ${(6*t).toFixed(1)}px rgba(255,255,255,${t.toFixed(2)})`,
			`0 0 ${(22*t).toFixed(1)}px rgba(255,215,0,${(0.8*t).toFixed(2)})`,
			`0 0 ${(42*t).toFixed(1)}px rgba(255,140,0,${(0.6*t).toFixed(2)})`,
		].join(', ');
	}

	// ── Heat animation ─────────────────────────────────────────
	const HEAT_SPEED = 0.8;
	const COOL_SPEED = 0.08;

	let l1Pos = $state(0), l1Target = 0, l1Raf: number | null = null;
	let l2Pos = $state(0), l2Target = 0, l2Raf: number | null = null;

	const l1Color  = $derived(colorAt(l1Pos));
	const l1Shadow = $derived(shadowAt(l1Pos));
	const l2Color  = $derived(colorAt(l2Pos));
	const l2Shadow = $derived(shadowAt(l2Pos));

	function loop(line: 1 | 2) {
		let last: number | null = null;
		return function frame(ts: number) {
			if (last === null) last = ts;
			const dt     = Math.min((ts - last) / 1000, 0.05);
			last = ts;
			const pos    = line === 1 ? l1Pos    : l2Pos;
			const target = line === 1 ? l1Target : l2Target;
			const diff   = target - pos;
			if (Math.abs(diff) < 0.0003) {
				if (line === 1) l1Pos = target; else l2Pos = target;
				return;
			}
			const speed  = diff > 0 ? HEAT_SPEED : COOL_SPEED;
			const newPos = pos + Math.sign(diff) * Math.min(speed * dt, Math.abs(diff));
			if (line === 1) l1Pos = newPos; else l2Pos = newPos;
			const id = requestAnimationFrame(frame);
			if (line === 1) l1Raf = id; else l2Raf = id;
		};
	}

	function heat(line: 1 | 2) {
		if (!textShown) return;
		if (line === 1) { if (l1Raf) cancelAnimationFrame(l1Raf); l1Target = 1; l1Raf = requestAnimationFrame(loop(1)); }
		else             { if (l2Raf) cancelAnimationFrame(l2Raf); l2Target = 1; l2Raf = requestAnimationFrame(loop(2)); }
	}

	function cool(line: 1 | 2) {
		if (line === 1) { if (l1Raf) cancelAnimationFrame(l1Raf); l1Target = 0; l1Raf = requestAnimationFrame(loop(1)); }
		else             { if (l2Raf) cancelAnimationFrame(l2Raf); l2Target = 0; l2Raf = requestAnimationFrame(loop(2)); }
	}

	// ── Discovery ──────────────────────────────────────────────
	interface Find {
		id:     string;
		title:  string;
		url:    string;
		source: string;
		topic:  string;
		points: number;
	}

	let panelShown   = $state(false);
	let finds        = $state<Find[]>([]);
	let findIndex    = $state(0);
	let loadingFinds = $state(false);
	let loggedIds    = $state(new Set<string>());

	const currentFind = $derived(finds[findIndex] ?? null);

	function getInterests(): Record<string, number> {
		try { return JSON.parse(localStorage.getItem('wt-interests') ?? '{}'); }
		catch { return {}; }
	}

	function recordExplore(topic: string) {
		const interests = getInterests();
		const key = topic.toLowerCase();
		interests[key] = (interests[key] ?? 0) + 1;
		localStorage.setItem('wt-interests', JSON.stringify(interests));
	}

	function markOnMap(find: Find) {
		if (loggedIds.has(find.id)) return;
		loggedIds = new Set([...loggedIds, find.id]);
		localStorage.setItem('wt-log', JSON.stringify([...loggedIds]));
	}

	async function loadFinds() {
		loadingFinds = true;
		try {
			const res  = await fetch('/api/news');
			const data = await res.json() as { finds: Find[] };
			const interests = getInterests();
			finds = [...data.finds].sort((a, b) =>
				(interests[b.topic.toLowerCase()] ?? 0) - (interests[a.topic.toLowerCase()] ?? 0)
			);
			findIndex = 0;
		} catch {
			finds = [];
		}
		loadingFinds = false;
	}
</script>

<!-- Background -->
<div class="bg" class:zooming={traveling} class:deblurred={viewing}>
	<div class="bg-image" style="background-image: url('{bgSrc}')"></div>
	<div class="bg-vignette"></div>
	<div class="travel-dark" class:visible={dark}></div>
</div>

<!-- Panoramic view layer -->
<div
	class="pan-layer"
	class:pan-visible={viewing}
	style="background-position: {panX}% {panY}%"
></div>

<!-- Intro text -->
<div class="page" class:hidden={!textShown}>
	<p
		class="line line1"
		style="color: {l1Color}; text-shadow: {l1Shadow};"
		onmouseenter={() => heat(1)}
		onmouseleave={() => cool(1)}
	>
		{#each tokenize(line1) as token}
			{#if token.space}&nbsp;{:else}<span class="char" style="--ei: {token.ei}">{token.ch}</span>{/if}
		{/each}
	</p>

	<a
		href="/research"
		class="line line2"
		style="color: {l2Color}; text-shadow: {l2Shadow};"
		onmouseenter={() => heat(2)}
		onmouseleave={() => cool(2)}
		onclick={beginJourney}
	>
		{#each tokenize(line2, 25 + 5) as token}
			{#if token.space}&nbsp;{:else}<span class="char" style="--ei: {token.ei}">{token.ch}</span>{/if}
		{/each}
	</a>

	<button class="line line3" onclick={enjoyView}>
		{#each tokenize('enjoy the view', 48) as token}
			{#if token.space}&nbsp;{:else}<span class="char" style="--ei: {token.ei}">{token.ch}</span>{/if}
		{/each}
	</button>
</div>

{#if viewing}
	<div class="view-overlay" onclick={exitView} onmousemove={trackMouse} role="button" tabindex="0" aria-label="Exit view"></div>
{/if}

<!-- Discovery panel — diagonal parallelogram -->
<!-- Layer 1: filled background shape -->
<div class="panel-bg" class:panel-visible={panelShown}></div>

<!-- Layer 2: edge lines -->
<svg class="panel-lines" class:panel-visible={panelShown} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
	<line x1="27" y1="0" x2="17" y2="100" />
	<line x1="73" y1="0" x2="63" y2="100" />
</svg>

<!-- Layer 3: content (safe rectangle inside the parallelogram) -->
<div class="panel-content" class:panel-visible={panelShown}>
	{#if loadingFinds}
		<p class="panel-status">scanning the horizon...</p>
	{:else if finds.length === 0 && panelShown}
		<p class="panel-status">no signal found</p>
	{:else if currentFind}
		<div class="find-header">
			<span class="find-label">vein detected</span>
			<span class="find-topic">[ {currentFind.topic.toLowerCase()} ]</span>
		</div>

		<h2 class="find-title">{currentFind.title}</h2>

		<div class="find-meta">
			<span class="find-source">{currentFind.source}</span>
			{#if currentFind.points > 0}
				<span class="find-points">{currentFind.points} pts</span>
			{/if}
		</div>

		<div class="find-actions">
			<a
				href={currentFind.url}
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-explore"
				onclick={() => recordExplore(currentFind.topic)}
			>
				chart course →
			</a>
			<button
				class="btn btn-log"
				class:btn-logged={loggedIds.has(currentFind.id)}
				onclick={() => markOnMap(currentFind)}
				disabled={loggedIds.has(currentFind.id)}
			>
				{loggedIds.has(currentFind.id) ? 'marked' : 'mark on map'}
			</button>
		</div>

		<div class="find-nav">
			<button
				class="nav-btn"
				onclick={() => { findIndex = Math.max(0, findIndex - 1); }}
				disabled={findIndex === 0}
			>◁</button>
			<span class="find-count">find {findIndex + 1} of {finds.length}</span>
			<button
				class="nav-btn"
				onclick={() => { findIndex = Math.min(finds.length - 1, findIndex + 1); }}
				disabled={findIndex === finds.length - 1}
			>▷</button>
		</div>
	{/if}
</div>

<style>
	/* ── Background ───────────────────────────────────── */

	.bg {
		position: fixed;
		inset: 0;
		z-index: 0;
	}

	.bg-image {
		position: absolute;
		inset: -6%;
		background-size: cover;
		background-position: center 30%;
		filter: blur(7px);
		transform: scale(1);
		transition:
			transform 1.8s ease-in,
			filter    1.4s ease-in;
	}

	.bg.zooming .bg-image {
		transform: scale(1.18);
		filter: blur(18px);
	}

	.bg-vignette {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at 50% 50%,
			transparent           15%,
			rgba(0, 0, 0, 0.45)   50%,
			rgba(0, 0, 0, 0.82)   75%,
			rgba(0, 0, 0, 0.97)  100%
		);
	}

	.travel-dark {
		position: absolute;
		inset: 0;
		background: #080808;
		opacity: 0;
		pointer-events: none;
		transition: opacity 1.4s ease-in;
		z-index: 1;
	}

	.travel-dark.visible { opacity: 1; }
	.travel-dark:not(.visible) { transition: opacity 1.8s ease-out; }

	.bg.deblurred .bg-image {
		filter: blur(0px);
		transition: filter 1.6s ease-out, transform 1.8s ease-in;
	}

	.bg.deblurred .bg-vignette {
		opacity: 0;
		transition: opacity 1.4s ease-out;
	}

	/* ── Intro text ───────────────────────────────────── */

	.page {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		padding-top: 30vh;
		padding-left: 27vw;
		gap: 1.25rem;
		max-width: 55%;
		transition: opacity 0.8s ease;
	}

	.page.hidden {
		opacity: 0;
		pointer-events: none;
	}

	.line {
		display: block;
		cursor: default;
		line-height: 1.4;
	}

	.line2 {
		cursor: pointer;
		text-decoration: none;
	}

	.line1 .char { font-size: 1.5rem; letter-spacing: 0.03em; }
	.line2 .char { font-size: 0.9rem; letter-spacing: 0.07em; }
	.line3 .char { font-size: 0.7rem; letter-spacing: 0.07em; }

	.line3 {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		text-align: left;
		transition: color 0.2s ease;
	}

	.line3:hover { color: var(--text-muted); }

	.char {
		display: inline-block;
		color: inherit;
		animation: letterEnter 0.45s ease both;
		animation-delay: calc(0.25s + var(--ei) * 0.03s);
	}

	@keyframes letterEnter {
		from { opacity: 0; transform: translateX(16px); }
		to   { opacity: 1; transform: translateX(0); }
	}

	/* ── Panoramic pan layer ──────────────────────────── */

	.pan-layer {
		position: fixed;
		inset: 0;
		z-index: 1;
		background-image: url('/bg-pan-2.png');
		background-size: auto 100vh;
		background-repeat: no-repeat;
		opacity: 0;
		pointer-events: none;
		transition: opacity 1.4s ease, background-position 0.12s ease-out;
	}

	.pan-layer.pan-visible {
		opacity: 1;
	}

	/* ── View mode ────────────────────────────────────── */

	.view-overlay {
		position: fixed;
		inset: 0;
		z-index: 99;
		cursor: pointer;
	}

	:global(body.viewing nav) {
		opacity: 0;
		pointer-events: none;
		transition: opacity 1s ease;
	}

	/* ── Discovery panel ──────────────────────────────── */
	/*
	 * Parallelogram defined by four corners:
	 *   top-left (27%, 0%)  →  top-right (73%, 0%)
	 *   bottom-right (63%, 100%)  →  bottom-left (17%, 100%)
	 * Both edges slant ~10% leftward from top to bottom.
	 */

	.panel-bg,
	.panel-lines,
	.panel-content {
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.7s ease;
	}

	.panel-bg.panel-visible,
	.panel-lines.panel-visible,
	.panel-content.panel-visible {
		opacity: 1;
		pointer-events: auto;
	}

	/* Filled background — clipped to the parallelogram */
	.panel-bg {
		position: fixed;
		inset: 0;
		z-index: 2;
		background: rgba(8, 8, 8, 0.88);
		clip-path: polygon(27% 0%, 73% 0%, 63% 100%, 17% 100%);
	}

	/* Edge lines — full-screen SVG, lines drawn in viewBox space */
	.panel-lines {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 3;
		pointer-events: none;
	}

	.panel-lines line {
		stroke: rgba(255, 255, 255, 0.1);
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}

	/*
	 * Content rectangle — must stay inside the parallelogram at all heights.
	 * At any height t (0–1): left edge = (27 - 10t)%, right edge = (73 - 10t)%.
	 * The tightest safe bounds are: left ≥ 27% (top), right ≤ 63% (bottom).
	 * Adding ~3% padding inward on each side.
	 */
	.panel-content {
		position: fixed;
		left: 30vw;
		right: 40vw;   /* right edge at 60vw */
		top: 0;
		bottom: 0;
		z-index: 4;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 12vh 0;
		gap: 1.75rem;
	}

	.panel-status {
		font-size: 0.75rem;
		color: var(--text-dim);
		letter-spacing: 0.08em;
	}

	.find-header {
		display: flex;
		align-items: baseline;
		gap: 1.25rem;
	}

	.find-label {
		font-size: 0.6rem;
		color: var(--text-dim);
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.find-topic {
		font-size: 0.7rem;
		color: var(--text-muted);
		letter-spacing: 0.1em;
	}

	.find-title {
		font-size: 1rem;
		font-weight: 400;
		color: var(--text-primary);
		letter-spacing: 0.02em;
		line-height: 1.6;
	}

	.find-meta {
		display: flex;
		gap: 1.5rem;
		font-size: 0.65rem;
		color: var(--text-dim);
		letter-spacing: 0.07em;
	}

	.find-actions {
		display: flex;
		gap: 1.5rem;
		align-items: center;
		padding-top: 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.btn {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.07em;
		cursor: pointer;
		padding: 0;
		transition: color 0.2s ease;
	}

	.btn-explore {
		color: var(--text-muted);
		text-decoration: none;
	}

	.btn-explore:hover { color: var(--text-primary); }

	.btn-log { color: var(--text-dim); }
	.btn-log:hover:not(:disabled) { color: var(--text-muted); }
	.btn-log:disabled { cursor: default; }
	.btn-logged { opacity: 0.5; }

	.find-nav {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.nav-btn {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		transition: color 0.15s ease;
	}

	.nav-btn:hover:not(:disabled) { color: var(--text-muted); }
	.nav-btn:disabled { opacity: 0.2; cursor: default; }

	.find-count {
		font-size: 0.65rem;
		color: var(--text-dim);
		letter-spacing: 0.08em;
	}
</style>
