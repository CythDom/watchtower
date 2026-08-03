import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects, credentials } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '$lib/server/crypto';

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const { tool, token } = await request.json();
	if (!tool || !token?.trim()) return json({ error: 'tool and token required' }, { status: 400 });

	const project = await db.select().from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.get();
	if (!project) return json({ error: 'not found' }, { status: 404 });

	const encryptedToken = encrypt(token.trim());

	const existing = await db.select().from(credentials)
		.where(and(eq(credentials.projectId, params.id), eq(credentials.tool, tool)))
		.get();

	if (existing) {
		await db.update(credentials)
			.set({ encryptedToken })
			.where(eq(credentials.id, existing.id));
	} else {
		await db.insert(credentials).values({
			id: crypto.randomUUID(),
			projectId: params.id,
			userId: session.user.id,
			tool,
			encryptedToken,
		});
	}

	const conns: Record<string, string> = JSON.parse(project.connections);
	conns[tool] = 'connected';
	await db.update(projects)
		.set({ connections: JSON.stringify(conns) })
		.where(eq(projects.id, params.id));

	return json({ connections: conns });
};

export const DELETE: RequestHandler = async ({ request, params, url }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const tool = url.searchParams.get('tool');
	if (!tool) return json({ error: 'tool required' }, { status: 400 });

	const project = await db.select().from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.get();
	if (!project) return json({ error: 'not found' }, { status: 404 });

	await db.delete(credentials)
		.where(and(eq(credentials.projectId, params.id), eq(credentials.tool, tool)));

	const conns: Record<string, string> = JSON.parse(project.connections);
	conns[tool] = 'pending';
	await db.update(projects)
		.set({ connections: JSON.stringify(conns) })
		.where(eq(projects.id, params.id));

	return json({ connections: conns });
};
