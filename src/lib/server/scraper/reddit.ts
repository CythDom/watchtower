import type { RawItem } from './hn.js';
import { SUBREDDITS } from './sources.js';

interface RedditPost {
	data: { id: string; title: string; url: string; score: number; is_self: boolean };
}

export async function fetchReddit(): Promise<RawItem[]> {
	const results = await Promise.allSettled(
		SUBREDDITS.map(async sub => {
			const res  = await fetch(`https://www.reddit.com/r/${sub}/top.json?limit=15&t=day`, {
				headers: { 'User-Agent': 'watchtower/1.0' }
			});
			const data = await res.json() as { data: { children: RedditPost[] } };

			return data.data.children
				.filter(p => !p.data.is_self && p.data.url && p.data.title)
				.map(p => ({
					id:     `reddit-${p.data.id}`,
					title:  p.data.title,
					url:    p.data.url,
					source: `r/${sub}`,
					points: p.data.score,
				}));
		})
	);

	return results
		.filter((r): r is PromiseFulfilledResult<RawItem[]> => r.status === 'fulfilled')
		.flatMap(r => r.value);
}
