<script lang="ts">
	import { onMount } from 'svelte';

	let visible = $state(false);

	let bg          = $state('#1e1e1e');
	let textPrimary = $state('#f0f0f0');
	let textMuted   = $state('#c0c0c0');
	let textDim     = $state('#808080');

	const root = () => document.documentElement;

	$effect(() => {
		root().style.setProperty('--bg',           bg);
		root().style.setProperty('--text-primary', textPrimary);
		root().style.setProperty('--text-muted',   textMuted);
		root().style.setProperty('--text-dim',     textDim);
	});

	const PRESETS = [
		{ name: 'original',    bg: '#1e1e1e', p: '#d0d0d0', m: '#888888', d: '#4a4a4a' },
		{ name: 'lifted',      bg: '#1e1e1e', p: '#e2e2e2', m: '#a8a8a8', d: '#6e6e6e' },
		{ name: 'charcoal',    bg: '#242424', p: '#dedede', m: '#a0a0a0', d: '#686868' },
		{ name: 'soft black',  bg: '#171717', p: '#e8e8e8', m: '#b0b0b0', d: '#707070' },
		{ name: 'warm forge',  bg: '#1d1b18', p: '#ddd5c0', m: '#9e9080', d: '#655e55' },
		{ name: 'cool slate',  bg: '#1a1f2a', p: '#cdd6f4', m: '#8890aa', d: '#585e72' },
		{ name: 'iron',        bg: '#1e1e1e', p: '#f0f0f0', m: '#c0c0c0', d: '#808080' },
	];

	function applyPreset(p: typeof PRESETS[0]) {
		bg = p.bg; textPrimary = p.p; textMuted = p.m; textDim = p.d;
	}

	function contrastRatio(fg: string, bg_: string): string {
		function lum(hex: string) {
			const r = parseInt(hex.slice(1,3),16)/255;
			const g = parseInt(hex.slice(3,5),16)/255;
			const b = parseInt(hex.slice(5,7),16)/255;
			const c = (x: number) => x <= 0.03928 ? x/12.92 : ((x+0.055)/1.055)**2.4;
			return 0.2126*c(r) + 0.7152*c(g) + 0.0722*c(b);
		}
		const l1 = lum(fg), l2 = lum(bg_);
		const ratio = (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
		return ratio.toFixed(1)+'×';
	}

	const css = $derived(
`:root {
  --bg:           ${bg};
  --text-primary: ${textPrimary};
  --text-muted:   ${textMuted};
  --text-dim:     ${textDim};
}`
	);

	let copied = $state(false);
	function copy() {
		navigator.clipboard.writeText(css);
		copied = true;
		setTimeout(() => copied = false, 1800);
	}

	let showGrid = $state(false);

	$effect(() => {
		root().style.setProperty('--grid-line-blue', showGrid ? 'rgba(60, 140, 255, 0.18)' : 'transparent');
		root().style.setProperty('--grid-line-red',  showGrid ? 'rgba(220, 70, 70, 0.35)'  : 'transparent');
	});

	onMount(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.key === '`') { e.preventDefault(); visible = !visible; }
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	});
</script>

{#if visible}
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="te-panel">
	<div class="te-header">
		<span>theme</span>
		<button class="te-close" onclick={() => visible = false}>×</button>
	</div>

	<div class="te-presets">
		{#each PRESETS as preset}
			<button class="te-preset" onclick={() => applyPreset(preset)}
				style="background:{preset.bg};color:{preset.p};border-color:{preset.m};">
				{preset.name}
			</button>
		{/each}
	</div>

	<div class="te-rows">
		<div class="te-row">
			<label>background</label>
			<input type="color" bind:value={bg} />
			<code>{bg}</code>
		</div>
		<div class="te-row">
			<label>primary</label>
			<input type="color" bind:value={textPrimary} />
			<code>{textPrimary}</code>
			<span class="te-ratio">{contrastRatio(textPrimary, bg)}</span>
		</div>
		<div class="te-row">
			<label>muted</label>
			<input type="color" bind:value={textMuted} />
			<code>{textMuted}</code>
			<span class="te-ratio">{contrastRatio(textMuted, bg)}</span>
		</div>
		<div class="te-row">
			<label>dim</label>
			<input type="color" bind:value={textDim} />
			<code>{textDim}</code>
			<span class="te-ratio">{contrastRatio(textDim, bg)}</span>
		</div>
	</div>

	<!-- Live preview swatches -->
	<div class="te-preview" style="background:{bg};">
		<span style="color:{textPrimary};">primary text</span>
		<span style="color:{textMuted};">muted text</span>
		<span style="color:{textDim};">dim text</span>
	</div>

	<div class="te-grid-row">
		<span>grid</span>
		<button class="te-grid-toggle" class:active={showGrid} onclick={() => showGrid = !showGrid}>
			{showGrid ? 'on' : 'off'}
		</button>
	</div>

	<button class="te-copy" onclick={copy}>{copied ? 'copied ✓' : 'copy CSS →'}</button>
</div>
{/if}

{#if showGrid}
	<div class="te-grid-overlay" aria-hidden="true">
		<div class="te-grid-col te-col-margin"></div>
		<div class="te-grid-col te-col-nav"></div>
		<div class="te-grid-col te-col-content"></div>
		<div class="te-grid-col te-col-right"></div>
		<div class="te-grid-col te-col-margin"></div>
	</div>
{/if}

<!-- Subtle toggle hint when hidden -->
{#if !visible}
	<button class="te-toggle" onclick={() => visible = true} title="Open theme editor (Ctrl+`)">◑</button>
{/if}

<style>
	.te-panel {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 9999;
		width: 18rem;
		background: #111;
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 6px;
		padding: 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-family: 'Roboto Mono', monospace;
		font-size: 0.72rem;
		box-shadow: 0 8px 32px rgba(0,0,0,0.6);
	}

	.te-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: rgba(255,255,255,0.35);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 0.65rem;
	}

	.te-close {
		background: none; border: none; color: rgba(255,255,255,0.3);
		cursor: pointer; font-size: 1rem; padding: 0; line-height: 1;
	}
	.te-close:hover { color: rgba(255,255,255,0.7); }

	.te-presets {
		display: flex; flex-wrap: wrap; gap: 0.35rem;
	}

	.te-preset {
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		border: 1px solid;
		font-family: inherit; font-size: 0.62rem;
		cursor: pointer; letter-spacing: 0.04em;
		transition: opacity 0.15s;
	}
	.te-preset:hover { opacity: 0.75; }

	.te-rows { display: flex; flex-direction: column; gap: 0.5rem; }

	.te-row {
		display: grid;
		grid-template-columns: 4.5rem 1.5rem 4.5rem 2.5rem;
		align-items: center;
		gap: 0.5rem;
	}

	.te-row label {
		color: rgba(255,255,255,0.35);
		letter-spacing: 0.06em;
	}

	.te-row input[type="color"] {
		width: 1.5rem; height: 1.5rem;
		border: none; padding: 0; cursor: pointer;
		background: none; border-radius: 2px;
	}

	.te-row code {
		color: rgba(255,255,255,0.6);
		letter-spacing: 0.04em;
	}

	.te-ratio {
		color: rgba(255,255,255,0.25);
		font-size: 0.62rem;
		text-align: right;
	}

	.te-preview {
		border-radius: 4px;
		padding: 0.6rem 0.75rem;
		display: flex;
		gap: 1rem;
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		border: 1px solid rgba(255,255,255,0.06);
	}

	.te-copy {
		background: none; border: 1px solid rgba(255,255,255,0.12);
		color: rgba(255,255,255,0.4); font-family: inherit; font-size: 0.68rem;
		letter-spacing: 0.08em; cursor: pointer; padding: 0.35rem 0.6rem;
		border-radius: 3px; text-align: left;
		transition: color 0.15s, border-color 0.15s;
	}
	.te-copy:hover { color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.3); }

	.te-toggle {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		z-index: 9998;
		background: none; border: none;
		color: rgba(255,255,255,0.12);
		font-size: 1rem; cursor: pointer;
		padding: 0.25rem;
		transition: color 0.2s;
	}
	.te-toggle:hover { color: rgba(255,255,255,0.35); }

	.te-grid-row {
		display: flex; align-items: center; justify-content: space-between;
		color: rgba(255,255,255,0.35);
		letter-spacing: 0.06em;
	}

	.te-grid-toggle {
		background: none; border: 1px solid rgba(255,255,255,0.12);
		color: rgba(255,255,255,0.3); font-family: inherit; font-size: 0.65rem;
		letter-spacing: 0.08em; cursor: pointer; padding: 0.15rem 0.45rem;
		border-radius: 3px; transition: color 0.15s, border-color 0.15s;
	}
	.te-grid-toggle:hover { color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.25); }
	.te-grid-toggle.active { color: #ffb300; border-color: rgba(255,179,0,0.45); }

	.te-grid-overlay {
		position: fixed; inset: 0; z-index: 9990;
		pointer-events: none;
		display: grid;
		grid-template-columns: var(--page-mx) var(--forge-nav-col) 1fr var(--forge-right-col) var(--page-mx);
	}

	.te-grid-col { height: 100%; }

	.te-col-margin  { background: rgba(255, 80,  80,  0.07); }
	.te-col-nav     { background: rgba(80,  140, 255, 0.07); }
	.te-col-content { background: rgba(80,  255, 140, 0.04); }
	.te-col-right   { background: rgba(80,  140, 255, 0.07); }
</style>
