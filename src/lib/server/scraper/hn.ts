export interface RawItem {
	id:     string;
	title:  string;
	url:    string;
	source: string;
	points: number;
}

function parseHost(url: string): string {
	try { return new URL(url).hostname.replace('www.', ''); }
	catch { return ''; }
}

export async function fetchHN(): Promise<RawItem[]> {
	const res  = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=40');
	const data = await res.json() as { hits: { objectID: string; title: string; url: string | null; points: number }[] };

	return data.hits
		.filter(h => h.url && h.title)
		.map(h => ({
			id:     `hn-${h.objectID}`,
			title:  h.title,
			url:    h.url!,
			source: parseHost(h.url!),
			points: h.points ?? 0,
		}));
}
