import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects, mcpTokens } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

	const project = await db.select().from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.get();
	if (!project) return json({ error: 'Not found' }, { status: 404 });

	// Revoke any existing token for this project+user
	await db.delete(mcpTokens)
		.where(and(eq(mcpTokens.projectId, params.id), eq(mcpTokens.userId, session.user.id)));

	const token = `wt_${Array.from(crypto.getRandomValues(new Uint8Array(24)))
		.map(b => b.toString(16).padStart(2, '0')).join('')}`;

	await db.insert(mcpTokens).values({
		token,
		projectId: params.id,
		userId: session.user.id,
	});

	return json({ token });
};
