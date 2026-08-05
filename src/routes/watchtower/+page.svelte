<script lang="ts">
	import { onMount } from 'svelte';

	const line1 = 'Improvement is on the horizon';
	const line2 = 'Begin exploring';

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
	let panX     = $state(50);
	let panY     = $state(30);

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
		loadTagsAndFinds();
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
	const RAMP = ['#909090', '#ffb300', '#ffe044', '#ffffff'];

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
	const HEAT_SPEED = 12;
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

	// ── Tags ───────────────────────────────────────────────────
	interface UserTag { id: string; tag: string; source: string; rating: number }

	const MAX_TAGS = 25;

	let standaloneTags  = $state<UserTag[]>([]);
	let projectTags     = $state<string[]>([]);
	let allTagKeywords  = $derived([...standaloneTags.map(t => t.tag), ...projectTags]);

	// editor
	let editingTags  = $state(false);
	let addTagInput  = $state('');
	let tagsReady    = $state(false);

	function ratingPos(r: number) { return (Math.max(1, Math.min(5, r)) - 1) / 4; }

	async function adjustRating(tag: UserTag, delta: number) {
		const next = Math.max(1, Math.min(5, tag.rating + delta));
		if (next === tag.rating) return;
		standaloneTags = standaloneTags.map(t => t.id === tag.id ? { ...t, rating: next } : t);
		await fetch(`/api/tags/${tag.id}`, {
			method:  'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body:    JSON.stringify({ rating: next }),
		});
	}

	async function addTagDirect() {
		const v = addTagInput.trim();
		if (!v || standaloneTags.length >= MAX_TAGS) return;
		addTagInput = '';
		const res  = await fetch('/api/tags', {
			method:  'POST',
			headers: { 'Content-Type': 'application/json' },
			body:    JSON.stringify({ tags: [v] }),
		});
		if (!res.ok) return;
		const data = await res.json() as { tags: UserTag[] };
		standaloneTags = [...standaloneTags, ...data.tags];
	}

	let onboarding        = $state(false);
	let onboardingPrompt  = $state('');
	let onboardingLoading = $state(false);
	let onboardingError   = $state<string | null>(null);
	// newest-first list of raw entries the user has typed
	let onboardingEntries = $state<string[]>([]);

	async function loadTags() {
		try {
			const res  = await fetch('/api/tags');
			if (res.ok) {
				const data = await res.json() as { standalone: UserTag[]; projectTags: string[] };
				standaloneTags = data.standalone;
				projectTags    = data.projectTags;
				if (standaloneTags.length === 0) onboarding = true;
			}
		} catch {}
		tagsReady = true;
	}

	function addEntry() {
		const v = onboardingPrompt.trim();
		if (!v) return;
		onboardingEntries = [v, ...onboardingEntries];
		onboardingPrompt  = '';
	}

	async function finishOnboarding() {
		if (onboardingEntries.length === 0 || onboardingLoading) return;
		onboardingLoading = true;
		onboardingError   = null;
		try {
			const combined = [...onboardingEntries].reverse().join('. ');
			const res  = await fetch('/api/tags', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ prompt: combined }),
			});
			if (!res.ok) {
				onboardingError   = `failed to save (${res.status})`;
				onboardingLoading = false;
				return;
			}
			const data = await res.json() as { tags: UserTag[] };
			// merge with any existing tags rather than replacing
			standaloneTags = [...standaloneTags, ...data.tags];
		} catch (e) {
			onboardingError   = 'connection error';
			onboardingLoading = false;
			return;
		}
		onboarding = false;
		loadFinds();
		onboardingLoading = false;
	}

	async function removeTag(id: string) {
		await fetch(`/api/tags/${id}`, { method: 'DELETE' });
		standaloneTags = standaloneTags.filter(t => t.id !== id);
	}

	// ── Discovery ──────────────────────────────────────────────
	interface Find {
		id:        string;
		title:     string;
		url:       string;
		source:    string;
		topic:     string;
		points:    number;
		relevance: number;
	}

	function rPos(r: number) { return (Math.max(1, Math.min(10, r)) - 1) / 9; }

	function heatLabel(r: number): string {
		if (r <= 2) return 'cold';
		if (r <= 4) return 'warm';
		if (r <= 6) return 'hot';
		if (r <= 8) return 'critical';
		return 'molten';
	}

	let panelShown   = $state(false);
	let finds        = $state<Find[]>([]);
	let findIndex    = $state(0);
	let loadingFinds = $state(false);
	let loggedIds    = $state(new Set<string>());
	let hasData      = $state(false);
	let scanning     = $state(false);
	let scanError    = $state<string | null>(null);

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

	function tagScore(find: Find): number {
		if (allTagKeywords.length === 0) return 0;
		const haystack = `${find.title} ${find.topic}`.toLowerCase();
		return allTagKeywords.reduce((n, tag) =>
			n + (haystack.includes(tag.toLowerCase()) ? 1 : 0), 0);
	}

	async function loadFinds() {
		loadingFinds = true;
		try {
			const res  = await fetch('/api/news');
			const data = await res.json() as { finds: Find[] };
			const interests = getInterests();
			finds = [...data.finds].sort((a, b) => {
				const tagDiff = tagScore(b) - tagScore(a);
				if (tagDiff !== 0) return tagDiff;
				const intDiff = (interests[b.topic.toLowerCase()] ?? 0) - (interests[a.topic.toLowerCase()] ?? 0);
				if (intDiff !== 0) return intDiff;
				return 0;
			});
			findIndex = 0;
			hasData = finds.length > 0;
		} catch {
			finds = [];
		}
		loadingFinds = false;
	}

	async function loadTagsAndFinds() {
		await loadTags();
		loadFinds();
	}

	async function triggerScan() {
		if (scanning) return;
		scanning = true;
		scanError = null;
		try {
			const res = await fetch('/api/scrape', { method: 'POST' });
			if (res.status === 429) {
				const data = await res.json() as { nextAt: string };
				scanError = `next scan available at ${new Date(data.nextAt).toLocaleTimeString()}`;
			} else if (res.status === 401) {
				scanError = 'sign in to scan';
			}
		} catch {
			scanError = 'scan failed';
		} finally {
			scanning = false;
		}
		await loadFinds();
		if (finds.length > 0) {
			panelShown = true;
			textShown  = false;
		}
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

<!-- Onboarding overlay -->
{#if onboarding}
<div class="onboarding">
	<div class="ob-anchor">
		<p class="ob-title">Set your sights ahead</p>
		<p class="ob-sub">Tell watchtower what you want to see</p>
		<input
			class="ob-input"
			type="text"
			placeholder="e.g. SvelteKit, AI, web security, open source tooling…"
			bind:value={onboardingPrompt}
			onkeydown={(e) => e.key === 'Enter' && addEntry()}
			disabled={onboardingLoading}
			autofocus
		/>
		<button
			class="ob-continue"
			onclick={finishOnboarding}
			disabled={onboardingEntries.length === 0 || onboardingLoading}
		>
			{onboardingLoading ? 'reading…' : 'continue →'}
		</button>
		{#if onboardingError}<p class="ob-error">{onboardingError}</p>{/if}
		<div class="ob-queue">
			{#each onboardingEntries as entry, i (entry + i)}
				<p class="ob-entry" style="color: rgba(255,255,255,{Math.max(0.05, 0.22 - i * 0.03).toFixed(3)})">{entry}</p>
			{/each}
		</div>
	</div>
</div>
{/if}

<!-- Intro text -->
<div class="page" class:hidden={!textShown || onboarding || !tagsReady || editingTags}>
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

	<button class="scan-btn" onclick={triggerScan} disabled={scanning}>
		{#if scanning}scanning...{:else if hasData}reload{:else}scan horizon{/if}
	</button>
	{#if scanError}<p class="scan-error">{scanError}</p>{/if}
	{#if standaloneTags.length > 0}
	<button class="scan-btn" onclick={() => { editingTags = true; }} style="margin-top: 0.1rem">
		edit sights
	</button>
	{/if}
</div>

{#if viewing}
	<div class="view-overlay" onclick={exitView} onmousemove={trackMouse} role="button" tabindex="0" aria-label="Exit view"></div>
{/if}

<!-- Discovery panel -->
<div class="panel-content" class:panel-visible={panelShown && !onboarding}>
	{#if loadingFinds}
		<p class="panel-status">scanning the horizon...</p>
	{:else if finds.length === 0 && panelShown}
		<p class="panel-status">no signal found</p>
	{:else if currentFind}
		<div class="find-header">
			<span class="find-label">vein detected</span>
			<span class="find-topic">[ {currentFind.topic.toLowerCase()} ]</span>
		</div>

		<span
			class="heat-word"
			style="color:{colorAt(rPos(currentFind.relevance))};text-shadow:{shadowAt(rPos(currentFind.relevance))}"
		>{heatLabel(currentFind.relevance)}</span>

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
			<button class="nav-btn reload-btn" onclick={triggerScan} disabled={scanning}>
				{scanning ? '...' : '↺'}
			</button>
		</div>
		{#if scanError}<p class="scan-error">{scanError}</p>{/if}

		<!-- Tags strip + edit button -->
		<div class="tags-strip">
			{#each standaloneTags as t}
				<span class="tag-chip" style="color:{colorAt(ratingPos(t.rating))};text-shadow:{shadowAt(ratingPos(t.rating))}">{t.tag}</span>
			{/each}
			{#each projectTags as t}
				<span class="tag-chip tag-chip-project">{t}</span>
			{/each}
			<button class="tag-edit-btn" onclick={() => { editingTags = true; }}>edit sights</button>
		</div>
	{/if}
</div>

<!-- Tag editor overlay -->
{#if editingTags}
<div class="tag-editor" role="dialog" aria-label="Edit sights">
	<div class="te-inner">
		<div class="te-header">
			<span class="te-title">your sights</span>
			<span class="te-count">{standaloneTags.length} / {MAX_TAGS}</span>
			<button class="te-close" onclick={() => { editingTags = false; }}>close</button>
		</div>

		<ul class="te-list">
			{#each standaloneTags as t (t.id)}
				<li class="te-row">
					<span
						class="te-tag"
						style="color:{colorAt(ratingPos(t.rating))};text-shadow:{shadowAt(ratingPos(t.rating))}"
					>{t.tag}</span>
					<div class="te-controls" title="interest rating — higher values surface more of this topic in your feed">
						<button class="te-adj" onclick={() => adjustRating(t, -1)} disabled={t.rating <= 1}>−</button>
						<span class="te-dots">
							{#each [1,2,3,4,5] as d}
								<span class="te-dot" class:te-dot-on={d <= t.rating} style={d <= t.rating ? `color:${colorAt(ratingPos(t.rating))}` : ''}>●</span>
							{/each}
						</span>
						<button class="te-adj" onclick={() => adjustRating(t, 1)} disabled={t.rating >= 5}>+</button>
					</div>
					<button class="te-del" onclick={() => removeTag(t.id)} aria-label="remove">×</button>
				</li>
			{/each}
		</ul>

		{#if standaloneTags.length < MAX_TAGS}
		<div class="te-add">
			<input
				class="te-add-input"
				type="text"
				placeholder="add a sight…"
				bind:value={addTagInput}
				onkeydown={(e) => e.key === 'Enter' && addTagDirect()}
			/>
			<button class="te-add-btn" onclick={addTagDirect} disabled={!addTagInput.trim()}>+</button>
		</div>
		{/if}
	</div>
</div>
{/if}

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
		display: none;
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
		justify-content: center;
		align-items: center;
		text-align: center;
		gap: 1.25rem;
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

	.scan-btn {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		margin-top: 0.25rem;
		transition: color 0.2s ease;
	}
	.scan-btn:hover:not(:disabled) { color: var(--text-muted); }
	.scan-btn:disabled { opacity: 0.4; cursor: default; }

	.scan-error {
		font-size: 0.6rem;
		color: var(--text-dim);
		letter-spacing: 0.06em;
		margin-top: 0.25rem;
	}

	.reload-btn {
		margin-left: auto;
	}

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
		display: none;
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

	/* ── Onboarding ───────────────────────────────────── */

	.onboarding {
		position: fixed;
		inset: 0;
		z-index: 5;
		overflow: hidden;
		animation: fadeIn 0.6s ease both;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	/* anchors title + input to upper-center; queue grows down from here */
	.ob-anchor {
		position: absolute;
		/* fixed top positions the static content (title+sub+input+continue ≈ 10rem)
		   so it appears centered; queue grows downward from here */
		top: calc(50% - 5rem);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		width: min(480px, calc(100vw - 3rem));
		text-align: center;
	}

	.ob-title {
		margin: 0;
		font-size: 1.4rem;
		color: var(--text-primary);
		letter-spacing: 0.04em;
		font-weight: 300;
	}

	.ob-sub {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-dim);
		letter-spacing: 0.1em;
	}

	.ob-input {
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--text-primary);
		letter-spacing: 0.05em;
		padding: 0.5rem 0;
		width: 100%;
		outline: none;
		text-align: center;
		transition: border-color 0.2s ease;
		margin-top: 0.4rem;
	}

	.ob-input::placeholder { color: var(--text-dim); }
	.ob-input:focus { border-bottom-color: rgba(255, 255, 255, 0.28); }
	.ob-input:disabled { opacity: 0.4; }

	/* queue grows downward from the input; no overflow clipping — items drift off page */
	.ob-queue {
		display: flex;
		flex-direction: column;
		gap: 0;
		width: 100%;
		margin-top: 0.25rem;
	}

	.ob-entry {
		margin: 0;
		padding: 0.45rem 0;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--text-primary);
		letter-spacing: 0.06em;
		animation: entrySlide 0.3s ease both;
		text-align: center;
	}

	@keyframes entrySlide {
		from { opacity: 0; transform: translateY(-6px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.ob-continue {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		white-space: nowrap;
		transition: color 0.2s ease, opacity 0.2s ease;
	}

	.ob-continue:hover:not(:disabled) { color: var(--text-muted); }
	.ob-continue:disabled { opacity: 0.2; cursor: default; }

	.ob-error {
		margin: 0;
		font-size: 0.6rem;
		color: var(--text-dim);
		letter-spacing: 0.08em;
	}

	/* ── Discovery panel ──────────────────────────────── */

	.panel-content {
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.7s ease;
		position: fixed;
		inset: 0;
		z-index: 4;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		gap: 1.75rem;
	}

	.panel-content.panel-visible {
		opacity: 1;
		pointer-events: auto;
	}

	.heat-word {
		font-size: 0.6rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
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

	/* ── Tags strip ───────────────────────────────────── */

	.tags-strip {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 0.7rem;
		max-width: 540px;
		position: absolute;
		bottom: 2.5rem;
	}

	.tag-chip {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.08em;
	}

	.tag-chip-project {
		color: var(--text-dim);
		opacity: 0.45;
	}

	.tag-edit-btn {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.55rem;
		letter-spacing: 0.1em;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		opacity: 0.5;
		transition: opacity 0.15s ease;
	}

	.tag-edit-btn:hover { opacity: 1; }

	/* ── Tag editor overlay ───────────────────────────── */

	.tag-editor {
		position: fixed;
		inset: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		animation: fadeIn 0.2s ease both;
	}

	.te-inner {
		display: flex;
		flex-direction: column;
		gap: 0;
		width: min(420px, calc(100vw - 3rem));
		max-height: 80vh;
		overflow-y: auto;
	}

	.te-header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		margin-bottom: 0.25rem;
	}

	.te-title {
		font-size: 0.75rem;
		color: var(--text-muted);
		letter-spacing: 0.1em;
		flex: 1;
	}

	.te-count {
		font-size: 0.6rem;
		color: var(--text-dim);
		letter-spacing: 0.08em;
	}

	.te-close {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		transition: color 0.15s ease;
	}

	.te-close:hover { color: var(--text-muted); }

	.te-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.te-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.te-tag {
		flex: 1;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.05em;
		transition: color 0.2s ease, text-shadow 0.2s ease;
	}

	.te-controls {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		cursor: default;
	}

	.te-adj {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		line-height: 1;
		width: 1rem;
		transition: color 0.15s ease;
	}

	.te-adj:hover:not(:disabled) { color: var(--text-muted); }
	.te-adj:disabled { opacity: 0.2; cursor: default; }

	.te-dots {
		display: flex;
		gap: 0.15rem;
		font-size: 0.5rem;
		line-height: 1;
	}

	.te-dot { color: rgba(255, 255, 255, 0.15); transition: color 0.2s ease; }
	.te-dot-on { /* color set inline */ }

	.te-del {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		opacity: 0.4;
		transition: opacity 0.15s ease;
	}

	.te-del:hover { opacity: 1; }

	.te-add {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding-top: 1rem;
		margin-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.te-add-input {
		flex: 1;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-primary);
		letter-spacing: 0.05em;
		padding: 0.25rem 0;
		outline: none;
		transition: border-color 0.2s ease;
	}

	.te-add-input::placeholder { color: var(--text-dim); }
	.te-add-input:focus { border-bottom-color: rgba(255, 255, 255, 0.25); }

	.te-add-btn {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.9rem;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		transition: color 0.15s ease;
	}

	.te-add-btn:hover:not(:disabled) { color: var(--text-muted); }
	.te-add-btn:disabled { opacity: 0.2; cursor: default; }
</style>
