import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userSkills } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) throw redirect(302, '/');
	const skills = await db.select()
		.from(userSkills)
		.where(eq(userSkills.userId, locals.session.user.id));
	return { skills, userId: locals.session.user.id };
};
