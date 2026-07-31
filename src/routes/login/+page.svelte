<script lang="ts">
	import { signIn } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		const result = await signIn.email({ email, password });

		if (result.error) {
			error = result.error.message ?? 'Sign in failed.';
			loading = false;
		} else {
			goto('/watchtower');
		}
	}
</script>

<div class="auth-page">
	<form onsubmit={handleSubmit} class="auth-form">
		<h1>Sign in</h1>

		<div class="field">
			<label for="email">Email</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				required
				autocomplete="email"
				placeholder="you@example.com"
			/>
		</div>

		<div class="field">
			<label for="password">Password</label>
			<input
				id="password"
				type="password"
				bind:value={password}
				required
				autocomplete="current-password"
				placeholder="••••••••"
			/>
		</div>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<button type="submit" disabled={loading}>
			{loading ? 'Signing in...' : 'Sign in'}
		</button>

		<p class="switch">
			No account? <a href="/register">Register</a>
		</p>
	</form>
</div>

<style>
	.auth-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeUp 0.6s ease both;
		animation-delay: 0.15s;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
		max-width: 22rem;
	}

	h1 {
		font-size: 0.8125rem;
		font-weight: 400;
		color: var(--text-primary);
		letter-spacing: 0.08em;
		margin-bottom: 0.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.6875rem;
		color: var(--text-dim);
		letter-spacing: 0.06em;
	}

	input {
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--text-dim);
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		padding: 0.5rem 0;
		outline: none;
		transition: border-color 0.2s ease;
		width: 100%;
	}

	input::placeholder {
		color: var(--text-dim);
	}

	input:focus {
		border-bottom-color: var(--text-muted);
	}

	button {
		margin-top: 0.5rem;
		background: transparent;
		border: 1px solid var(--text-dim);
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.06em;
		padding: 0.625rem 1.5rem;
		cursor: pointer;
		transition: border-color 0.2s ease, color 0.2s ease;
		align-self: flex-start;
	}

	button:hover:not(:disabled) {
		border-color: var(--text-muted);
		color: var(--text-primary);
	}

	button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.error {
		font-size: 0.6875rem;
		color: #b87070;
		letter-spacing: 0.03em;
	}

	.switch {
		font-size: 0.6875rem;
		color: var(--text-dim);
		letter-spacing: 0.04em;
	}

	.switch a {
		color: var(--text-muted);
		transition: color 0.2s ease;
	}

	.switch a:hover {
		color: var(--text-primary);
	}
</style>
