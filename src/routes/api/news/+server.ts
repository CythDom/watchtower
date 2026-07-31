import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const TOPICS = ['CSS', 'HTML', 'SvelteKit'] as const;

interface HNHit {
	objectID: string;
	title: string;
	url: string | null;
	points: number;
}

function parseHost(url: string): string {
	try { return new URL(url).hostname.replace('www.', ''); }
	catch { return ''; }
}

export const GET: RequestHandler = async ({ fetch }) => {
	const settled = await Promise.allSettled(
		TOPICS.map(async (topic) => {
			const res  = await fetch(
				`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=5`
			);
			const data = await res.json() as { hits: HNHit[] };
			return data.hits
				.filter((h) => h.url && h.title)
				.slice(0, 3)
				.map((h) => ({
					id:     h.objectID,
					title:  h.title,
					url:    h.url!,
					source: parseHost(h.url!),
					topic,
					points: h.points ?? 0,
				}));
		})
	);

	const finds = settled
		.filter((r): r is PromiseFulfilledResult<ReturnType<typeof Array.prototype.map>> => r.status === 'fulfilled')
		.flatMap((r) => r.value);

	return json({ finds });
};
