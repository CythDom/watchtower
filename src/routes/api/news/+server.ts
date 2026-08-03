import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { finds } from '$lib/server/db/schema.js';
import { desc } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	const rows = await db
		.select()
		.from(finds)
		.orderBy(desc(finds.relevance), desc(finds.points))
		.limit(50);

	return json({ finds: rows });
};
