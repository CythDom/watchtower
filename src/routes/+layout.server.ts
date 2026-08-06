import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userSkills } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.session?.user ?? null;
	let needsOnboarding = false;
	if (user) {
		const check = await db.select({ id: userSkills.id })
			.from(userSkills)
			.where(eq(userSkills.userId, user.id))
			.limit(1);
		needsOnboarding = check.length === 0;
	}
	return { user, needsOnboarding };
};
