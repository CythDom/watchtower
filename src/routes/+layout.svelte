<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { signOut } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import ThemeEditor from '$lib/components/ThemeEditor.svelte';
	import { skillsSearch } from '$lib/stores/skillsSearch';

	let { children, data } = $props();

	let dropdownOpen = $state(false);
	let dropdownTimeout: ReturnType<typeof setTimeout> | null = null;

	function openDropdown()  {
		if (dropdownTimeout) clearTimeout(dropdownTimeout);
		dropdownOpen = true;
	}
	function closeDropdown() {
		dropdownTimeout = setTimeout(() => { dropdownOpen = false; }, 120);
	}

	async function handleSignOut() {
		dropdownOpen = false;
		await signOut();
		goto('/');
	}

	// ── Onboarding ─────────────────────────────────────────────
	let onboarding = $state(data.user != null && data.needsOnboarding);
	let obPrompt   = $state('');
	let obLoading  = $state(false);
	let obError    = $state<string | null>(null);
	let obEntries  = $state<string[]>([]);

	function obAddEntry() {
		const v = obPrompt.trim();
		if (!v) return;
		obEntries = [v, ...obEntries];
		obPrompt  = '';
	}

	async function obFinish() {
		if (obEntries.length === 0 || obLoading) return;
		obLoading = true;
		obError   = null;
		try {
			const combined = [...obEntries].reverse().join('. ');
			const tagsRes = await fetch('/api/tags', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ prompt: combined }),
			});
			if (!tagsRes.ok) {
				obError   = `failed (${tagsRes.status})`;
				obLoading = false;
				return;
			}
			const { tags } = await tagsRes.json() as { tags: Array<{ tag: string }> };
			await fetch('/api/skills', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ tags: tags.map(t => t.tag) }),
			});
		} catch {
			obError   = 'connection error';
			obLoading = false;
			return;
		}
		onboarding = false;
		obLoading  = false;
	}
</script>

<nav>
	<div class="nav-left" class:with-search={$page.url.pathname.startsWith('/skills')}>
		<a href="/watchtower" class:active={$page.url.pathname.startsWith('/watchtower')}>Watchtower</a>
		<a href="/hall"       class:active={$page.url.pathname.startsWith('/hall')}>Iron×Iron</a>
		<a href="/forge"      class:active={$page.url.pathname.startsWith('/forge')}>Forge</a>
		<a href="/skills"     class:active={$page.url.pathname.startsWith('/skills')}>Skills</a>
		{#if $page.url.pathname.startsWith('/skills')}
			<div class="skill-search-wrap">
				<input
					class="skill-search"
					type="text"
					placeholder="search skills"
					bind:value={$skillsSearch}
				/>
			</div>
		{/if}
	</div>
	<div class="nav-right">
		{#if data.user}
			<div class="user-menu"
				onmouseenter={openDropdown}
				onmouseleave={closeDropdown}>
				<span class="user-name" class:active={dropdownOpen}>
					{data.user.name || data.user.email}
				</span>
				{#if dropdownOpen}
					<div class="user-dropdown"
						onmouseenter={openDropdown}
						onmouseleave={closeDropdown}>
						<a href="/forge"    class="dropdown-item" onclick={() => dropdownOpen = false}>Forge</a>
						<a href="/watchtower" class="dropdown-item" onclick={() => dropdownOpen = false}>Watchtower</a>
						<a href="/skills"   class="dropdown-item" onclick={() => dropdownOpen = false}>Skills</a>
						<div class="dropdown-divider"></div>
						<button class="dropdown-item dropdown-logout" onclick={handleSignOut}>Logout</button>
					</div>
				{/if}
			</div>
		{:else}
			<a href="/login" class:active={$page.url.pathname === '/login'}>Login</a>
		{/if}
	</div>
</nav>

<main>
	{@render children()}
</main>

<!-- Onboarding overlay (shown to new users until skills are seeded) -->
{#if onboarding}
<div class="onboarding">
	<div class="ob-anchor">
		<p class="ob-title">Sharpen your edge</p>
		<p class="ob-sub">Tell us what you're building and learning</p>
		<input
			class="ob-input"
			type="text"
			placeholder="e.g. SvelteKit, AI, web security, open source tooling…"
			bind:value={obPrompt}
			onkeydown={(e) => e.key === 'Enter' && obAddEntry()}
			disabled={obLoading}
			autofocus
		/>
		<button
			class="ob-continue"
			onclick={obFinish}
			disabled={obEntries.length === 0 || obLoading}
		>
			{obLoading ? 'reading…' : 'continue →'}
		</button>
		{#if obError}<p class="ob-error">{obError}</p>{/if}
		<div class="ob-queue">
			{#each obEntries as entry, i (entry + i)}
				<p class="ob-entry" style="color: rgba(255,255,255,{Math.max(0.05, 0.22 - i * 0.03).toFixed(3)})">{entry}</p>
			{/each}
		</div>
	</div>
</div>
{/if}

<ThemeEditor />

<style>
	nav {
		position: fixed;
		top: 0; left: 0; right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.375rem var(--page-mx);
		z-index: 20;
	}

	.nav-left {
		display: flex;
		gap: 2.5rem;
		width: var(--forge-nav-col);
	}

	.nav-right {
		width: var(--forge-right-col);
		display: flex;
		justify-content: flex-end;
	}

	nav a {
		font-size: 0.75rem;
		color: var(--text-muted);
		letter-spacing: 0.04em;
		transition: color 0.2s ease;
		animation: fadeUp 0.5s ease both;
	}
	nav a:hover, nav a.active { color: var(--text-primary); }

	.nav-left a:nth-child(1) { animation-delay: 0.05s; }
	.nav-left a:nth-child(2) { animation-delay: 0.12s; }
	.nav-left a:nth-child(3) { animation-delay: 0.19s; }
	.nav-left a:nth-child(4) { animation-delay: 0.26s; }
	.nav-right a             { animation-delay: 0.08s; }

	.nav-left.with-search { width: auto; }

	.skill-search-wrap {
		overflow: hidden;
		display: flex;
		align-items: center;
		animation: searchExpand 0.28s ease both;
	}

	@keyframes searchExpand {
		from { width: 0; margin-left: 0; opacity: 0; }
		to   { width: 9rem;  margin-left: 2.5rem; opacity: 1; }
	}

	.skill-search {
		width: 9rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--text-primary);
		letter-spacing: 0.06em;
		padding: 0 0 0.1rem;
		outline: none;
		transition: border-color 0.2s ease;
	}

	.skill-search::placeholder { color: var(--text-dim); font-style: italic; }
	.skill-search:focus { border-bottom-color: rgba(255, 255, 255, 0.28); }

	/* ── User menu ── */
	.user-menu {
		position: relative;
		animation: fadeUp 0.5s ease both;
		animation-delay: 0.08s;
	}

	.user-name {
		font-size: 0.75rem;
		color: var(--text-muted);
		letter-spacing: 0.04em;
		cursor: default;
		transition: color 0.15s ease;
		user-select: none;
	}
	.user-name.active,
	.user-menu:hover .user-name { color: var(--text-primary); }

	/* ── Dropdown ── */
	.user-dropdown {
		position: absolute;
		top: calc(100% + 0.9rem);
		right: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
		background: rgba(18, 18, 18, 0.97);
		border: 1px solid rgba(255,255,255,0.07);
		padding: 0.4rem 0;
		min-width: 9rem;
		animation: fadeUp 0.15s ease both;
	}

	.dropdown-item {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: var(--text-dim);
		padding: 0.5rem 1rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		width: 100%;
		transition: color 0.15s ease, background 0.15s ease;
		text-decoration: none;
	}
	.dropdown-item:hover {
		color: var(--text-primary);
		background: rgba(255,255,255,0.04);
	}

	.dropdown-divider {
		height: 1px;
		background: rgba(255,255,255,0.07);
		margin: 0.3rem 0;
	}

	.dropdown-logout { color: rgba(200, 100, 90, 0.7); }
	.dropdown-logout:hover { color: rgba(220, 110, 100, 1); background: rgba(200,80,70,0.06); }

	main { min-height: 100vh; }

	/* ── Onboarding overlay ── */

	@keyframes fadeIn {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	.onboarding {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(8, 8, 8, 0.94);
		overflow: hidden;
		animation: fadeIn 0.5s ease both;
	}

	.ob-anchor {
		position: absolute;
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
</style>
