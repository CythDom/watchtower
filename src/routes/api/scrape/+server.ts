import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { scrapeQuota } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { runScrape } from '$lib/server/scraper/index.js';

const OWNER = 'dominic.spinozzi@cyth.com';
const RATE_LIMIT_HOURS = 24;

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const isOwner = session.user.email === OWNER;

	if (!isOwner) {
		const quota = await db
			.select()
			.from(scrapeQuota)
			.where(eq(scrapeQuota.userId, session.user.id))
			.get();

		if (quota) {
			const hoursSince = (Date.now() - quota.lastScrapedAt.getTime()) / 3_600_000;
			if (hoursSince < RATE_LIMIT_HOURS) {
				const nextAt = new Date(quota.lastScrapedAt.getTime() + RATE_LIMIT_HOURS * 3_600_000);
				return json({ error: 'rate_limited', nextAt }, { status: 429 });
			}
		}
	}

	const result = await runScrape();

	await db
		.insert(scrapeQuota)
		.values({ userId: session.user.id, lastScrapedAt: new Date() })
		.onConflictDoUpdate({ target: scrapeQuota.userId, set: { lastScrapedAt: new Date() } });

	return json(result);
};
