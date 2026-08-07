<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import { skillsSearch } from '$lib/stores/skillsSearch';

	let { data }: { data: PageData } = $props();

	interface UserSkill { id: string; skill: string; level: number; source: string }

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

	function hashSeed(s: string): number {
		let h = 0;
		for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
		return h;
	}

	function shuffleSeeded<T>(arr: T[], seed: number): T[] {
		const out = [...arr];
		for (let i = out.length - 1; i > 0; i--) {
			const x = Math.sin(seed + i) * 10000;
			const j = Math.floor((x - Math.floor(x)) * (i + 1));
			[out[i], out[j]] = [out[j], out[i]];
		}
		return out;
	}

	let skills = $state<UserSkill[]>(data.skills as UserSkill[]);
	const seed = hashSeed(data.userId);

	// Each skill gets a deterministic noise offset so same-level skills scatter
	// across the page rather than forming horizontal bands. noise_range = 5 means
	// a level-10 skill can score anywhere from 10–15, creating organic overlap
	// with adjacent levels while hot skills still dominate the top overall.
	function skillScore(skill: UserSkill): number {
		const x = Math.sin(hashSeed(skill.id + data.userId)) * 10000;
		const r = x - Math.floor(x); // deterministic [0, 1) per skill per user
		return skill.level + r * 5;
	}

	// Compute display order once from initial server data — stable for this page visit
	function computeOrder(initial: UserSkill[]): string[] {
		return [...initial]
			.sort((a, b) => skillScore(b) - skillScore(a))
			.map(s => s.id);
	}

	// orderedIds is set once at init and only appended to when new skills are added
	let orderedIds = $state<string[]>(computeOrder(data.skills as UserSkill[]));

	// Order uses stable orderedIds; only level/color data is reactive
	const displaySkills = $derived(
		orderedIds.map(id => skills.find(s => s.id === id)).filter((s): s is UserSkill => s != null)
	);

	onDestroy(() => skillsSearch.set(''));

	const RED_COLOR  = '#ff3333';
	const RED_SHADOW = '0 0 6px rgba(255,50,50,1), 0 0 22px rgba(255,20,20,0.8), 0 0 44px rgba(180,0,0,0.5)';

	// True when ANY skill partially matches the search
	const hasAnyMatch = $derived.by(() => {
		const q = $skillsSearch.trim().toLowerCase();
		return !q || skills.some(s => s.skill.toLowerCase().includes(q));
	});

	async function addSkill() {
		const name = $skillsSearch.trim();
		if (!name) return;
		const res = await fetch('/api/skills', {
			method:  'POST',
			headers: { 'Content-Type': 'application/json' },
			body:    JSON.stringify({ tags: [name] }),
		});
		if (!res.ok) return;
		const { skills: added } = await res.json() as { skills: UserSkill[] };
		if (added.length > 0) {
			skills    = [...skills, ...added];
			orderedIds = [...orderedIds, ...added.map(s => s.id)];
			skillsSearch.set('');
		}
	}

	async function practice(skill: UserSkill) {
		if (skill.level >= 25) return;
		const next = skill.level + 1;
		// Update data only — orderedIds unchanged, so position stays fixed
		skills = skills.map(s => s.id === skill.id ? { ...s, level: next } : s);
		await fetch(`/api/skills/${skill.id}`, {
			method:  'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body:    JSON.stringify({ level: next }),
		});
	}
</script>

<div class="skills-page">
	{#if skills.length === 0}
		<p class="empty">no skills yet — complete onboarding to begin</p>
	{:else}
		<div class="skills-wrap">
			<div class="skills-cloud">
				{#each displaySkills as skill (skill.id)}
					{@const q = $skillsSearch.trim().toLowerCase()}
					{@const matched = q.length > 0 && skill.skill.toLowerCase().includes(q)}
					{@const dimmed  = q.length > 0 && !matched}
					<button
						class="skill-word"
						class:maxed={skill.level >= 25}
						class:dimmed
						style="color:{matched ? RED_COLOR : colorAt(skill.level / 25)};text-shadow:{matched ? RED_SHADOW : shadowAt(skill.level / 25)}"
						onclick={() => practice(skill)}
						title="level {skill.level} / 25 — click to practice"
					>{skill.skill}</button>
				{/each}
			</div>

			{#if $skillsSearch.trim() && !hasAnyMatch}
				<div class="no-match-overlay">
					<p class="no-match-label">no matching skills</p>
					<button class="no-match-add" onclick={addSkill}>add new</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.skills-page {
		padding: 5.5rem var(--page-mx) 4rem;
		min-height: 100vh;
	}

	.skills-wrap {
		position: relative;
	}

	.skills-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem 2.2rem;
		align-items: baseline;
	}

	.skill-word {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		cursor: pointer;
		padding: 0.1rem 0;
		line-height: 1.7;
		transition: filter 0.15s ease, color 0.35s ease, text-shadow 0.35s ease;
	}

	.skill-word:hover { filter: brightness(1.55) saturate(0.45); }
	.skill-word.maxed { cursor: default; }

	.skill-word.dimmed {
		opacity: 0.12;
		filter: none;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	.no-match-overlay {
		position: absolute;
		inset: 0;
		min-height: 8rem;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.85rem;
		animation: fadeIn 0.18s ease both;
	}

	.no-match-label {
		margin: 0;
		font-size: 0.68rem;
		color: var(--text-dim);
		letter-spacing: 0.12em;
	}

	.no-match-add {
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0;
		transition: color 0.15s ease;
	}

	.no-match-add:hover { color: var(--text-primary); }

	.empty {
		color: var(--text-dim);
		font-size: 0.75rem;
		letter-spacing: 0.08em;
	}
</style>
