import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { projects } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	if (!session) return { projects: [] };

	const rows = await db
		.select()
		.from(projects)
		.where(eq(projects.userId, session.user.id));

	return {
		projects: rows.map(r => ({
			id:           r.id,
			name:         r.name,
			integrations: JSON.parse(r.integrations),
			skills:       JSON.parse(r.skills),
			connections:  JSON.parse(r.connections),
			repoFullName: r.repoFullName ?? null,
		})),
	};
};
