<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { signOut } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import ThemeEditor from '$lib/components/ThemeEditor.svelte';

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
</script>

<nav>
	<div class="nav-left">
		<a href="/watchtower" class:active={$page.url.pathname.startsWith('/watchtower')}>Watchtower</a>
		<a href="/hall"       class:active={$page.url.pathname.startsWith('/hall')}>Iron×Iron</a>
		<a href="/forge"      class:active={$page.url.pathname.startsWith('/forge')}>Forge</a>
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
	.nav-right a             { animation-delay: 0.08s; }

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
</style>
