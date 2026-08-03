import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export async function handle({ event, resolve }) {
	event.locals.session = await auth.api.getSession({ headers: event.request.headers }).catch(() => null);
	return svelteKitHandler({ event, resolve, auth });
}
