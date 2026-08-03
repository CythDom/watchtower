import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const row = await db
		.select()
		.from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.get();

	if (!row) return json({ error: 'not found' }, { status: 404 });
	return json(parseProject(row));
};

export const PUT: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const body = await request.json();
	const { name, integrations, skills, connections } = body;

	const existing = await db
		.select()
		.from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.get();

	if (!existing) return json({ error: 'not found' }, { status: 404 });

	await db
		.update(projects)
		.set({
			...(name !== undefined        && { name: name.trim() }),
			...(integrations !== undefined && { integrations: JSON.stringify(integrations) }),
			...(skills !== undefined       && { skills: JSON.stringify(skills) }),
			...(connections !== undefined  && { connections: JSON.stringify(connections) }),
		})
		.where(eq(projects.id, params.id));

	const updated = await db.select().from(projects).where(eq(projects.id, params.id)).get();
	return json(parseProject(updated!));
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const existing = await db
		.select()
		.from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.get();

	if (!existing) return json({ error: 'not found' }, { status: 404 });

	await db.delete(projects).where(eq(projects.id, params.id));
	return json({ ok: true });
};

function parseProject(row: typeof projects.$inferSelect) {
	return {
		id:           row.id,
		name:         row.name,
		integrations: JSON.parse(row.integrations),
		skills:       JSON.parse(row.skills),
		connections:  JSON.parse(row.connections),
	};
}
