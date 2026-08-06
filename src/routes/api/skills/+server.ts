import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { userSkills, projects } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const skills = await db.select().from(userSkills)
		.where(eq(userSkills.userId, session.user.id));

	return json({ skills });
};

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const body = await request.json() as { tags?: string[] };
	const userId = session.user.id;

	const existing = await db.select({ skill: userSkills.skill })
		.from(userSkills)
		.where(eq(userSkills.userId, userId));
	const existingSet = new Set(existing.map(s => s.skill.toLowerCase()));

	const rows: Array<{ id: string; userId: string; skill: string; level: number; source: string }> = [];

	// User-defined tags from onboarding → level 1–2
	const tagList = (body.tags ?? []).filter(t => !existingSet.has(t.toLowerCase()));
	const total = tagList.length;
	for (let i = 0; i < tagList.length; i++) {
		const level = i < Math.ceil(total / 2) ? 2 : 1;
		rows.push({ id: crypto.randomUUID(), userId, skill: tagList[i], level, source: 'onboarding' });
		existingSet.add(tagList[i].toLowerCase());
	}

	// Project integrations → level 2–3; project skills → level 2
	const userProjects = await db
		.select({ integrations: projects.integrations, skills: projects.skills })
		.from(projects)
		.where(eq(projects.userId, userId));

	let integIdx = 0;
	for (const p of userProjects) {
		try {
			for (const skill of JSON.parse(p.integrations) as string[]) {
				if (existingSet.has(skill.toLowerCase())) continue;
				rows.push({ id: crypto.randomUUID(), userId, skill, level: integIdx < 3 ? 3 : 2, source: 'project' });
				existingSet.add(skill.toLowerCase());
				integIdx++;
			}
		} catch {}
		try {
			for (const skill of JSON.parse(p.skills) as string[]) {
				if (existingSet.has(skill.toLowerCase())) continue;
				rows.push({ id: crypto.randomUUID(), userId, skill, level: 2, source: 'project' });
				existingSet.add(skill.toLowerCase());
			}
		} catch {}
	}

	if (rows.length === 0) return json({ skills: [] });

	try {
		await db.insert(userSkills).values(rows);
	} catch (e) {
		console.error('[skills] DB insert failed:', e);
		return json({ error: 'db_error' }, { status: 500 });
	}

	return json({ skills: rows });
};
