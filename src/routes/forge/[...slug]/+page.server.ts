import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { projects } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = locals.session;
	if (!session) throw redirect(303, '/login');

	const rows = await db
		.select()
		.from(projects)
		.where(eq(projects.userId, session.user.id));

	// Parse slug so the page can restore state on reload
	// slug format: undefined | "project-name" | "project-name/settings" | "project-name/item-key"
	const slug = params.slug ?? '';
	const parts = slug.split('/').filter(Boolean);
	const initialProject = parts[0] ? decodeURIComponent(parts[0]) : null;
	const initialSection = parts[1] ? decodeURIComponent(parts[1]) : null;

	return {
		projects: rows.map(r => ({
			id:           r.id,
			name:         r.name,
			integrations: JSON.parse(r.integrations),
			skills:       JSON.parse(r.skills),
			connections:  JSON.parse(r.connections),
			repoFullName: r.repoFullName ?? null,
		})),
		initialProject,
		initialSection,
	};
};
