<script lang="ts">
	import { fade } from 'svelte/transition';

	const line1 = 'Every tool needs sharpening';
	const line2 = 'See Latest Insights →';

	function tokenize(str: string, offset = 0) {
		let charIdx = 0;
		return str.split('').map((ch) => {
			if (ch === ' ') return { ch, space: true, ei: 0 };
			return { ch, space: false, ei: offset + charIdx++ };
		});
	}

	// ── Heat animation ─────────────────────────────────────────
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

	const HEAT_SPEED = 0.8;
	const COOL_SPEED = 0.08;
	const AMBIENT    = 0.45; // resting glow level — colored but not yet glowing

	let l1Pos = $state(AMBIENT), l1Target = AMBIENT, l1Raf: number | null = null;

	const l1Color  = $derived(colorAt(l1Pos));
	const l1Shadow = $derived(shadowAt(l1Pos));

	function loop() {
		let last: number | null = null;
		return function frame(ts: number) {
			if (last === null) last = ts;
			const dt   = Math.min((ts - last) / 1000, 0.05);
			last = ts;
			const diff = l1Target - l1Pos;
			if (Math.abs(diff) < 0.0003) { l1Pos = l1Target; return; }
			const speed  = diff > 0 ? HEAT_SPEED : COOL_SPEED;
			const newPos = l1Pos + Math.sign(diff) * Math.min(speed * dt, Math.abs(diff));
			l1Pos = newPos;
			l1Raf = requestAnimationFrame(frame);
		};
	}

	function heat() {
		if (l1Raf) cancelAnimationFrame(l1Raf);
		l1Target = 1;
		l1Raf = requestAnimationFrame(loop());
	}

	function cool() {
		if (l1Raf) cancelAnimationFrame(l1Raf);
		l1Target = AMBIENT;
		l1Raf = requestAnimationFrame(loop());
	}

	// ── Heat line 2 ────────────────────────────────────────────
	// "Every tool needs sharpening" has 24 non-space chars
	let l2Pos = $state(AMBIENT), l2Target = AMBIENT, l2Raf: number | null = null;

	const l2Color  = $derived(colorAt(l2Pos));
	const l2Shadow = $derived(shadowAt(l2Pos));

	function loop2() {
		let last: number | null = null;
		return function frame(ts: number) {
			if (last === null) last = ts;
			const dt   = Math.min((ts - last) / 1000, 0.05);
			last = ts;
			const diff = l2Target - l2Pos;
			if (Math.abs(diff) < 0.0003) { l2Pos = l2Target; return; }
			const speed  = diff > 0 ? HEAT_SPEED : COOL_SPEED;
			l2Pos = l2Pos + Math.sign(diff) * Math.min(speed * dt, Math.abs(diff));
			l2Raf = requestAnimationFrame(frame);
		};
	}

	function heat2() { if (l2Raf) cancelAnimationFrame(l2Raf); l2Target = 1;       l2Raf = requestAnimationFrame(loop2()); }
	function cool2() { if (l2Raf) cancelAnimationFrame(l2Raf); l2Target = AMBIENT; l2Raf = requestAnimationFrame(loop2()); }

	// ── Projects ────────────────────────────────────────────────
	let projects = $state<{ name: string }[]>([]);

	let selected:   string | null = $state(null);
	let pickerOpen: boolean       = $state(false);

	// ── Project wizard ──────────────────────────────────────────
	const INTEGRATION_TYPES = ['codebase', 'articles', 'accounts', 'deployments', 'website'];
	const AI_SKILLS = ['CSS', 'HTML', 'JavaScript', 'TypeScript', 'Git', 'SvelteKit', 'Node.js'];

	let creatingProject = $state(false);
	let wizardStep      = $state(1);
	let newName         = $state('');
	let newIntegrations = $state<string[]>([]);
	let newSkills       = $state<string[]>([]);
	let skillInput      = $state('');

	function openWizard() {
		creatingProject = true; wizardStep = 1;
		newName = ''; newIntegrations = []; newSkills = []; skillInput = '';
	}
	function closeOverlay() {
		selected = null; pickerOpen = false; creatingProject = false;
	}
	function toggleIntegration(id: string) {
		if (newIntegrations.includes(id)) newIntegrations = newIntegrations.filter(i => i !== id);
		else newIntegrations = [...newIntegrations, id];
	}
	function addSkill() {
		const s = skillInput.trim();
		if (s && !newSkills.includes(s)) newSkills = [...newSkills, s];
		skillInput = '';
	}
	function removeSkill(s: string) { newSkills = newSkills.filter(x => x !== s); }
	function createProject() {
		if (!newName.trim()) return;
		projects = [...projects, { name: newName.trim() }];
		selected = newName.trim();
		creatingProject = false;
	}

	// ── Options heat animation ─────────────────────────────────
	// Ramp starts at light grey, heats through orange to white glow
	const OPTION_RAMP = [
		'#aaaaaa', '#c06030', '#df5500', '#f46600',
		'#ff7a00', '#ff9200', '#ffaa00', '#ffbf00',
		'#ffd000', '#ffe044', '#fff0a0', '#ffffff',
	];

	function optColorAt(pos: number): string {
		const max = OPTION_RAMP.length - 1;
		const p   = Math.max(0, Math.min(1, pos)) * max;
		const lo  = Math.floor(p), hi = Math.min(lo + 1, max);
		const t   = p - lo;
		const [r1,g1,b1] = hexToRgb(OPTION_RAMP[lo]);
		const [r2,g2,b2] = hexToRgb(OPTION_RAMP[hi]);
		return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
	}

	const OPTIONS = ['Insights', 'Skills', 'Community'];
	let optPos    = $state([0, 0, 0]);
	let optTarget = [0, 0, 0];
	let optRaf:   (number | null)[] = [null, null, null];

	const optColors  = $derived(optPos.map(p => optColorAt(p)));
	const optShadows = $derived(optPos.map(p => shadowAt(p)));

	function loopOpt(i: number) {
		let last: number | null = null;
		return function frame(ts: number) {
			if (last === null) last = ts;
			const dt   = Math.min((ts - last) / 1000, 0.05);
			last = ts;
			const diff = optTarget[i] - optPos[i];
			if (Math.abs(diff) < 0.0003) { optPos[i] = optTarget[i]; return; }
			const speed  = diff > 0 ? HEAT_SPEED : COOL_SPEED;
			optPos[i]    = optPos[i] + Math.sign(diff) * Math.min(speed * dt, Math.abs(diff));
			optRaf[i]    = requestAnimationFrame(frame);
		};
	}

	function heatOpt(i: number) {
		if (optRaf[i]) cancelAnimationFrame(optRaf[i]!);
		optTarget[i] = 1;
		optRaf[i]    = requestAnimationFrame(loopOpt(i));
	}

	function coolOpt(i: number) {
		if (optRaf[i]) cancelAnimationFrame(optRaf[i]!);
		optTarget[i] = 0;
		optRaf[i]    = requestAnimationFrame(loopOpt(i));
	}
</script>

<!-- Background -->
<div class="bg">
	<div class="bg-image"></div>
	<div class="bg-vignette"></div>
</div>

<!-- Intro text -->
<div class="page" class:hidden={selected !== null}>
	<p
		class="line line1"
		style="color: {l1Color}; text-shadow: {l1Shadow};"
		onmouseenter={heat}
		onmouseleave={cool}
	>
		{#each tokenize(line1) as token}
			{#if token.space}&nbsp;{:else}<span class="char" style="--ei: {token.ei}">{token.ch}</span>{/if}
		{/each}
	</p>

	<p
		class="line line2"
		style="color: {l2Color}; text-shadow: {l2Shadow};"
		onmouseenter={heat2}
		onmouseleave={cool2}
	>
		{#each tokenize(line2, 24 + 4) as token}
			{#if token.space}&nbsp;{:else}<span class="char" style="--ei: {token.ei}">{token.ch}</span>{/if}
		{/each}
	</p>
</div>

<!-- Right menu -->
<nav class="menu-panel" class:expanded={selected !== null || creatingProject}>

	{#if creatingProject}
		<!-- ── Wizard ── -->
		<button class="overlay-back" onclick={() => wizardStep > 1 ? wizardStep-- : closeOverlay()}>←</button>

		{#key wizardStep}
			{#if wizardStep === 1}
				<div class="wizard-step" in:fade={{ duration: 220, delay: 60 }}>
					<p class="wizard-label">what should we call it?</p>
					<div class="wizard-input-row">
						<!-- svelte-ignore a11y_autofocus -->
						<input class="wizard-input" bind:value={newName} placeholder="project name" autofocus
							onkeydown={(e) => { if (e.key === 'Enter' && newName.trim()) wizardStep = 2; }} />
						<button class="wizard-arrow" disabled={!newName.trim()} onclick={() => wizardStep = 2}>→</button>
					</div>
				</div>

			{:else if wizardStep === 2}
				<div class="wizard-step" in:fade={{ duration: 220, delay: 60 }}>
					<p class="wizard-label">connect your tools</p>
					<p class="wizard-sub">link mcps to give the ai context about your project</p>
					<div class="chip-grid">
						{#each INTEGRATION_TYPES as type}
							<button class="int-chip" class:active={newIntegrations.includes(type)}
								onclick={() => toggleIntegration(type)}>{type}</button>
						{/each}
					</div>
					<button class="wizard-arrow standalone" onclick={() => wizardStep = 3}>→</button>
				</div>

			{:else}
				<div class="wizard-step" in:fade={{ duration: 220, delay: 60 }}>
					<p class="wizard-label">we've got a head start</p>
					<p class="wizard-sub">ai-suggested skills for your project</p>
					<div class="chip-grid">
						{#each AI_SKILLS as skill}
							<span class="skill-chip ai">{skill}</span>
						{/each}
					</div>
					<p class="wizard-sub section">add your own</p>
					<div class="wizard-input-row">
						<input class="wizard-input small" bind:value={skillInput} placeholder="e.g. prompting"
							onkeydown={(e) => { if (e.key === 'Enter') addSkill(); }} />
						<button class="wizard-add" onclick={addSkill}>+</button>
					</div>
					{#if newSkills.length > 0}
						<div class="chip-grid user-chips">
							{#each newSkills as skill}
								<button class="skill-chip user" onclick={() => removeSkill(skill)}>{skill} ×</button>
							{/each}
						</div>
					{/if}
					<button class="wizard-create" onclick={createProject}>create project →</button>
				</div>
			{/if}
		{/key}

	{:else if selected !== null}
		<!-- ── Project view ── -->
		<button class="overlay-back" onclick={() => { selected = null; pickerOpen = false; }}>←</button>
		<div class="picker">
			<button class="picker-trigger" onclick={(e) => { e.stopPropagation(); pickerOpen = !pickerOpen; }}>
				<span>{selected}</span>
				<span class="picker-chevron" class:open={pickerOpen}>∨</span>
			</button>
			{#if pickerOpen}
				<div class="picker-dropdown">
					{#each projects as project}
						<button class="picker-option" class:picker-option-active={selected === project.name}
							onclick={() => { selected = project.name; pickerOpen = false; }}>
							{#if selected === project.name}<span class="picker-check">✓</span>{/if}
							{project.name}
						</button>
					{/each}
					<hr class="picker-divider" />
					<button class="picker-option picker-new" onclick={() => { pickerOpen = false; openWizard(); }}>+ new project</button>
				</div>
			{/if}
		</div>

		<div class="options-list">
			{#each OPTIONS as opt, i}
				<button
					class="option-btn"
					class:option-disabled={opt === 'Community'}
					disabled={opt === 'Community'}
					style={opt !== 'Community' ? `color: ${optColors[i]}; text-shadow: ${optShadows[i]};` : ''}
					onmouseenter={() => opt !== 'Community' && heatOpt(i)}
					onmouseleave={() => opt !== 'Community' && coolOpt(i)}
				>{opt}{#if opt === 'Community'}<span class="option-soon"> soon</span>{/if}</button>
			{/each}
		</div>

	{:else}
		<!-- ── Collapsed ── -->
		<p class="menu-heading">projects</p>
		{#if projects.length === 0}
			<p class="menu-empty">nothing here yet</p>
		{:else}
			{#each projects as project}
				<button class="menu-item" onclick={() => (selected = project.name)}>{project.name}</button>
			{/each}
		{/if}
		<button class="menu-new" onclick={openWizard}>+ new project</button>
	{/if}

</nav>

{#if selected !== null || creatingProject}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="panel-backdrop" onclick={closeOverlay}></div>
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
		background-image: url('/forge-bg-2.png');
		background-size: cover;
		background-position: center 40%;
		filter: blur(7px);
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

	/* ── Intro text ───────────────────────────────────── */

	.page {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		padding-top: 15vh;
		padding-left: 5vw;
		gap: 1.25rem;
		max-width: 55%;
	}

	.page.hidden {
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.3s ease;
	}

	.line {
		display: block;
		cursor: default;
		line-height: 1.4;
	}

	.line1 .char { font-size: 1.5rem; letter-spacing: 0.03em; }
	.line2 .char { font-size: 0.9rem; letter-spacing: 0.07em; }

	.char {
		display: inline-block;
		color: inherit;
		animation: letterEnter 0.45s ease both;
		animation-delay: calc(0.25s + var(--ei) * 0.03s);
	}

	@keyframes letterEnter {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	/* ── Right menu ───────────────────────────────────── */

	.menu-panel {
		position: fixed;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 6;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.25rem;
		padding: 2rem 2.5rem;
		background: rgba(8, 8, 8, 0.88);
		border-left: 1px solid rgba(255, 255, 255, 0.06);
		width: 14rem;
		animation: fadeUp 0.6s ease both;
		animation-delay: 0.2s;
		transition: left 0.45s ease, background 0.45s ease, border-color 0.45s ease;
	}

	.menu-panel.expanded {
		left: 0;
		right: 0;
		width: auto;
		background: rgba(8, 8, 8, 0.75);
		border-left: none;
		align-items: center;
		justify-content: center;
		padding: 0 0 30vh 0;
		gap: 0;
	}

	/* ── Collapsed menu ──────────────────────────────── */

	.menu-heading {
		font-size: 0.6rem;
		color: var(--text-dim);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		margin-bottom: 0.75rem;
	}

	.menu-item {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.95rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
		padding: 0.4rem 0;
		cursor: pointer;
		text-align: left;
		transition: color 0.15s ease;
	}

	.menu-item:hover { color: var(--text-primary); }

	/* ── Expanded: picker (centered top) ────────────── */

	.picker {
		position: absolute;
		top: calc(var(--nav-height) + 2rem);
		left: 50%;
		transform: translateX(-50%);
	}

	.picker-trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.08);
		font-family: var(--font-mono);
		font-size: 0.88rem;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.45rem 0.85rem;
		transition: border-color 0.15s ease, color 0.15s ease;
	}

	.picker-trigger:hover {
		border-color: rgba(255, 255, 255, 0.18);
		color: var(--text-primary);
	}

	.picker-chevron {
		font-size: 0.55rem;
		transition: transform 0.2s ease;
		color: var(--text-dim);
	}

	.picker-chevron.open { transform: rotate(180deg); }

	.picker-dropdown {
		position: absolute;
		top: calc(100% + 0.4rem);
		left: 0;
		min-width: 100%;
		background: #111;
		border: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		z-index: 10;
		animation: fadeUp 0.15s ease both;
	}

	.picker-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.5rem 0.85rem;
		text-align: left;
		transition: background 0.1s ease, color 0.1s ease;
	}

	.picker-option:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-primary);
	}

	.picker-option-active { color: var(--text-primary); cursor: default; }

	.picker-check {
		font-size: 0.6rem;
		color: var(--text-muted);
		width: 0.8rem;
	}

	/* ── Expanded: options list ──────────────────────── */

	.options-list {
		display: flex;
		gap: 4rem;
		align-items: baseline;
	}

	.option-btn {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 1.1rem;
		letter-spacing: 0.05em;
		cursor: pointer;
		padding: 0;
	}

	/* Invisible backdrop catches clicks to close */
	.panel-backdrop {
		position: fixed;
		inset: 0;
		z-index: 5;
	}

	/* ── Collapsed extras ────────────────────────────────── */

	.menu-empty {
		font-size: 0.65rem;
		color: var(--text-dim);
		letter-spacing: 0.05em;
		padding: 0.1rem 0 0.5rem;
	}

	.menu-new {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.88rem;
		color: var(--text-dim);
		letter-spacing: 0.05em;
		padding: 0.4rem 0;
		cursor: pointer;
		text-align: left;
		margin-top: 0.25rem;
		transition: color 0.15s ease;
	}
	.menu-new:hover { color: var(--text-muted); }

	/* ── Options disabled ────────────────────────────────── */

	.option-disabled { opacity: 0.25; cursor: default; }

	.option-soon {
		font-size: 0.5rem;
		vertical-align: super;
		letter-spacing: 0.08em;
	}

	/* ── Picker extras ───────────────────────────────────── */

	.picker-divider {
		border: none;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		margin: 0.25rem 0;
	}

	.picker-new { color: var(--text-dim); }
	.picker-new:hover { color: var(--text-muted); background: transparent; }

	/* ── Wizard ──────────────────────────────────────────── */

	.overlay-back {
		position: absolute;
		top: calc(var(--nav-height) + 1.25rem);
		left: 3rem;
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 1rem;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		transition: color 0.15s ease;
		z-index: 1;
	}
	.overlay-back:hover { color: var(--text-muted); }

	.wizard-step {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		width: 100%;
		max-width: 26rem;
	}

	.wizard-label {
		font-size: 1rem;
		color: var(--text-muted);
		letter-spacing: 0.04em;
		margin-bottom: 1.5rem;
	}

	.wizard-sub {
		font-size: 0.78rem;
		color: var(--text-dim);
		letter-spacing: 0.04em;
		margin-top: -0.9rem;
		margin-bottom: 1.75rem;
	}
	.wizard-sub.section { margin-top: 1.75rem; margin-bottom: 0.9rem; }

	.wizard-input-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		align-self: stretch;
	}

	.wizard-input {
		flex: 1;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
		font-family: var(--font-mono);
		font-size: 1rem;
		color: var(--text-primary);
		padding: 0.4rem 0;
		outline: none;
		letter-spacing: 0.04em;
		transition: border-color 0.2s ease;
	}
	.wizard-input:focus { border-bottom-color: rgba(255, 255, 255, 0.32); }
	.wizard-input::placeholder { color: var(--text-dim); }
	.wizard-input.small { font-size: 0.82rem; }

	.wizard-arrow {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 1rem;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		transition: color 0.15s ease;
	}
	.wizard-arrow:disabled { color: var(--text-dim); cursor: default; }
	.wizard-arrow:not(:disabled):hover { color: var(--text-primary); }
	.wizard-arrow.standalone { align-self: flex-end; margin-top: 1.5rem; }

	.wizard-add {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 1rem;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		transition: color 0.15s ease;
	}
	.wizard-add:hover { color: var(--text-muted); }

	.wizard-create {
		align-self: flex-end;
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.88rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
		cursor: pointer;
		padding: 0;
		margin-top: 2rem;
		transition: color 0.15s ease;
	}
	.wizard-create:hover { color: var(--text-primary); }

	/* ── Chips ───────────────────────────────────────────── */

	.chip-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.user-chips { margin-top: 0.75rem; }

	.int-chip {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		color: var(--text-dim);
		padding: 0.35rem 0.8rem;
		cursor: pointer;
		transition: border-color 0.15s ease, color 0.15s ease;
	}
	.int-chip:hover { border-color: rgba(255, 255, 255, 0.2); color: var(--text-muted); }
	.int-chip.active { border-color: rgba(255, 255, 255, 0.35); color: var(--text-primary); }

	.skill-chip {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 0.05em;
		padding: 0.3rem 0.65rem;
	}
	.skill-chip.ai {
		border: 1px solid rgba(255, 140, 50, 0.22);
		color: rgba(255, 140, 50, 0.6);
		background: rgba(255, 100, 0, 0.05);
	}
	.skill-chip.user {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: var(--text-muted);
		cursor: pointer;
		transition: border-color 0.15s ease;
	}
	.skill-chip.user:hover { border-color: rgba(255, 255, 255, 0.25); }
</style>
