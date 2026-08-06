import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { userSkills } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const body = await request.json() as { level?: number };
	const newLevel = Math.max(0, Math.min(25, body.level ?? 0));

	await db.update(userSkills)
		.set({ level: newLevel })
		.where(and(
			eq(userSkills.id, params.id),
			eq(userSkills.userId, session.user.id)
		));

	return json({ ok: true });
};
