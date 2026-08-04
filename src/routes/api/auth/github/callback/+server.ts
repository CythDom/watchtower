import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects, credentials } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '$lib/server/crypto';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) redirect(302, '/login');

	const code      = url.searchParams.get('code');
	const projectId = url.searchParams.get('state');
	if (!code || !projectId) redirect(302, '/forge');

	const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id:     GITHUB_CLIENT_ID,
			client_secret: GITHUB_CLIENT_SECRET,
			code,
			redirect_uri:  `${url.origin}/api/auth/github/callback`,
		}),
	});

	const { access_token } = await tokenRes.json();
	if (!access_token) redirect(302, '/forge');

	const project = await db.select().from(projects)
		.where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
		.get();
	if (!project) redirect(302, '/forge');

	const encryptedToken = encrypt(access_token);
	const existing = await db.select().from(credentials)
		.where(and(eq(credentials.projectId, projectId), eq(credentials.tool, 'GitHub')))
		.get();

	if (existing) {
		await db.update(credentials).set({ encryptedToken }).where(eq(credentials.id, existing.id));
	} else {
		await db.insert(credentials).values({
			id: crypto.randomUUID(), projectId, userId: session.user.id,
			tool: 'GitHub', encryptedToken,
		});
	}

	const conns = JSON.parse(project.connections);
	conns['GitHub'] = 'connected';
	await db.update(projects)
		.set({ connections: JSON.stringify(conns) })
		.where(eq(projects.id, projectId));

	redirect(302, '/forge');
};
