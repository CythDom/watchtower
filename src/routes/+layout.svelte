<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import ThemeEditor from '$lib/components/ThemeEditor.svelte';

	let { children } = $props();
</script>

<nav>
	<div class="nav-left">
		<a href="/watchtower" class:active={$page.url.pathname.startsWith('/watchtower')}>Watchtower</a>
		<a href="/hall" class:active={$page.url.pathname.startsWith('/hall')}>Iron×Iron</a>
		<a href="/forge" class:active={$page.url.pathname.startsWith('/forge')}>Forge</a>
	</div>
	<div class="nav-right">
		<a href="/login">Login</a>
	</div>
</nav>

<main>
	{@render children()}
</main>

<ThemeEditor />

<style>
	nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
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

	nav a:hover,
	nav a.active {
		color: var(--text-primary);
	}

	.nav-left a:nth-child(1) { animation-delay: 0.05s; }
	.nav-left a:nth-child(2) { animation-delay: 0.12s; }
	.nav-left a:nth-child(3) { animation-delay: 0.19s; }
	.nav-right a             { animation-delay: 0.08s; }

	main {
		min-height: 100vh;
	}
</style>
