import { db } from '$lib/server/db/index.js';
import { finds } from '$lib/server/db/schema.js';
import { inArray } from 'drizzle-orm';
import { fetchHN } from './hn.js';
import { fetchRSS } from './rss.js';
import { fetchReddit } from './reddit.js';
import { scoreItems } from './ai.js';

let running = false;

export async function runScrape(): Promise<{ inserted: number; skipped: number }> {
	if (running) return { inserted: 0, skipped: 0 };
	running = true;

	try {
		const [hnItems, rssItems, redditItems] = await Promise.all([
			fetchHN().catch(e  => { console.error('[scraper] HN failed:',     e); return []; }),
			fetchRSS().catch(e => { console.error('[scraper] RSS failed:',    e); return []; }),
			fetchReddit().catch(e => { console.error('[scraper] Reddit failed:', e); return []; }),
		]);

		console.log(`[scraper] fetched: HN=${hnItems.length} RSS=${rssItems.length} Reddit=${redditItems.length}`);

		const all = [...hnItems, ...rssItems, ...redditItems];
		if (all.length === 0) {
			console.error('[scraper] all sources returned empty');
			return { inserted: 0, skipped: 0 };
		}

		const ids      = all.map(i => i.id);
		const existing = await db.select({ id: finds.id }).from(finds).where(inArray(finds.id, ids));
		const existingSet = new Set(existing.map(r => r.id));
		const fresh    = all.filter(i => !existingSet.has(i.id));

		console.log(`[scraper] ${fresh.length} new items, ${existingSet.size} already stored`);

		if (fresh.length === 0) return { inserted: 0, skipped: all.length };

		let scores = new Map<string, { id: string; topic: string; relevance: number }>();
		try {
			scores = await scoreItems(fresh);
		} catch (e) {
			console.error('[scraper] AI scoring failed, inserting with defaults:', e);
		}

		const rows = fresh.map(item => {
			const score = scores.get(item.id);
			return {
				id:        item.id,
				title:     item.title,
				url:       item.url,
				source:    item.source,
				topic:     score?.topic     ?? 'Other',
				relevance: score?.relevance ?? 5,
				points:    item.points,
				scrapedAt: new Date(),
			};
		});

		await db.insert(finds).values(rows).onConflictDoNothing();
		console.log(`[scraper] inserted ${rows.length} items`);

		return { inserted: rows.length, skipped: existingSet.size };
	} finally {
		running = false;
	}
}
