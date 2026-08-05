import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { userTags } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const { rating } = await request.json() as { rating: number };
	const clamped = Math.max(1, Math.min(5, Math.round(rating)));

	await db
		.update(userTags)
		.set({ rating: clamped })
		.where(and(eq(userTags.id, params.id), eq(userTags.userId, session.user.id)));

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	await db
		.delete(userTags)
		.where(and(eq(userTags.id, params.id), eq(userTags.userId, session.user.id)));

	return json({ ok: true });
};
