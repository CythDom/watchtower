import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects, itemStatus } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

const VALID = new Set(['in_progress', 'deferred', 'forget']);

export const PATCH: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const project = await db.select({ id: projects.id }).from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.get();
	if (!project) return json({ error: 'not found' }, { status: 404 });

	const { key, status } = await request.json();
	if (!key || !VALID.has(status)) return json({ error: 'invalid' }, { status: 400 });

	const deferredUntil = status === 'deferred'
		? new Date(Date.now() + 7 * 86_400_000)
		: null;

	await db.insert(itemStatus)
		.values({ projectId: params.id, itemKey: key, status, deferredUntil })
		.onConflictDoUpdate({
			target: [itemStatus.projectId, itemStatus.itemKey],
			set: { status, deferredUntil, updatedAt: new Date() },
		});

	return json({ ok: true });
};
