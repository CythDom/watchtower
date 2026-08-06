import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { email } = await request.json();
	if (!email) return json({ exists: false });

	const row = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
	return json({ exists: row.length > 0 });
};
