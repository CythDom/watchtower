import Parser from 'rss-parser';
import type { RawItem } from './hn.js';
import { RSS_FEEDS } from './sources.js';

const parser = new Parser({ timeout: 8000 });

function parseHost(url: string): string {
	try { return new URL(url).hostname.replace('www.', ''); }
	catch { return ''; }
}

export async function fetchRSS(): Promise<RawItem[]> {
	const results = await Promise.allSettled(
		RSS_FEEDS.map(async feed => {
			const parsed = await parser.parseURL(feed.url);
			return (parsed.items ?? [])
				.filter(item => item.link && item.title)
				.slice(0, 10)
				.map(item => ({
					id:     `rss-${Buffer.from(item.link!).toString('base64').slice(0, 24)}`,
					title:  item.title!,
					url:    item.link!,
					source: parseHost(item.link!) || feed.name,
					points: 0,
				}));
		})
	);

	return results
		.filter((r): r is PromiseFulfilledResult<RawItem[]> => r.status === 'fulfilled')
		.flatMap(r => r.value);
}
