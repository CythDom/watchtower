<script lang="ts">
	import { signIn } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let email    = $state('');
	let password = $state('');
	let error    = $state('');
	let loading  = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		const result = await signIn.email({ email, password });

		if (result.error) {
			error = result.error.message ?? 'Sign in failed.';
			loading = false;
		} else {
			goto('/forge');
		}
	}
</script>

<!-- Background -->
<div class="bg">
	<div class="bg-vignette"></div>
</div>

<div class="auth-page">
	<form onsubmit={handleSubmit} class="auth-form">
		<p class="auth-title">sign in</p>

		<div class="field">
			<label for="email">email</label>
			<input id="email" type="email" bind:value={email}
				required autocomplete="email" placeholder="you@example.com" />
		</div>

		<div class="field">
			<label for="password">password</label>
			<input id="password" type="password" bind:value={password}
				required autocomplete="current-password" placeholder="••••••••" />
		</div>

		{#if error}
			<p class="auth-error">{error}</p>
		{/if}

		<button type="submit" class="auth-btn" disabled={loading}>
			{loading ? 'signing in…' : 'sign in →'}
		</button>

		<p class="auth-switch">
			no account? <a href="/register">register</a>
		</p>
	</form>
</div>

<style>
	/* ── Background ── */
	.bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
	.bg-vignette {
		position: absolute; inset: 0;
		background: radial-gradient(
			ellipse at 50% 50%,
			transparent 15%, rgba(0,0,0,0.45) 50%,
			rgba(0,0,0,0.82) 75%, rgba(0,0,0,0.97) 100%
		);
	}

	/* ── Layout ── */
	.auth-page {
		position: relative; z-index: 1;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeUp 0.5s ease both;
		animation-delay: 0.1s;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
		max-width: 20rem;
	}

	/* ── Title ── */
	.auth-title {
		font-size: 1.1rem;
		font-weight: 300;
		color: var(--text-primary);
		letter-spacing: 0.08em;
		margin-bottom: 0.25rem;
	}

	/* ── Fields ── */
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	label {
		font-size: 0.6rem;
		color: var(--text-dim);
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	input {
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255,255,255,0.12);
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		padding: 0.5rem 0;
		outline: none;
		transition: border-color 0.2s ease;
		width: 100%;
	}
	input::placeholder { color: var(--text-dim); opacity: 0.6; }
	input:focus { border-bottom-color: rgba(255,255,255,0.35); }

	/* ── Button ── */
	.auth-btn {
		margin-top: 0.5rem;
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 0.82rem;
		letter-spacing: 0.08em;
		padding: 0;
		cursor: pointer;
		align-self: flex-start;
		transition: color 0.2s ease;
	}
	.auth-btn:hover:not(:disabled) { color: var(--text-primary); }
	.auth-btn:disabled { opacity: 0.35; cursor: default; }

	/* ── Error / switch ── */
	.auth-error {
		font-size: 0.6875rem;
		color: #b87070;
		letter-spacing: 0.03em;
	}

	.auth-switch {
		font-size: 0.6rem;
		color: var(--text-dim);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.auth-switch a {
		color: var(--text-muted);
		transition: color 0.2s ease;
	}
	.auth-switch a:hover { color: var(--text-primary); }
</style>
