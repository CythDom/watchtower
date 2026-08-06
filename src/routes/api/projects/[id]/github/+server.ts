import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects, credentials } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '$lib/server/crypto';

async function getToken(projectId: string, userId: string): Promise<string | null> {
	const [cred] = await db.select().from(credentials)
		.where(and(eq(credentials.projectId, projectId), eq(credentials.tool, 'GitHub')))
		.limit(1);
	if (!cred) return null;
	const [project] = await db.select().from(projects)
		.where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
		.limit(1);
	if (!project) return null;
	return decrypt(cred.encryptedToken);
}

export const GET: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const token = await getToken(params.id, session.user.id);
	if (!token) return json({ error: 'not connected' }, { status: 400 });

	const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator', {
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
	});
	if (!res.ok) return json({ error: 'github error' }, { status: 502 });

	const repos = await res.json();
	return json(repos.map((r: { id: number; full_name: string; private: boolean }) => ({
		id: r.id, fullName: r.full_name, private: r.private,
	})));
};

export const PUT: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const { repoFullName } = await request.json();

	const [project] = await db.select().from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.limit(1);
	if (!project) return json({ error: 'not found' }, { status: 404 });

	await db.update(projects).set({ repoFullName: repoFullName ?? null }).where(eq(projects.id, params.id));
	return json({ ok: true, repoFullName });
};
