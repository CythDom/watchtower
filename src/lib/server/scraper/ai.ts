import Anthropic from '@anthropic-ai/sdk';
import type { RawItem } from './hn.js';

const client = new Anthropic();

interface ScoredItem {
	id:        string;
	topic:     string;
	relevance: number;
}

const BATCH_SIZE = 20;

export async function scoreItems(items: RawItem[]): Promise<Map<string, ScoredItem>> {
	const scored = new Map<string, ScoredItem>();

	for (let i = 0; i < items.length; i += BATCH_SIZE) {
		const batch = items.slice(i, i + BATCH_SIZE);
		const list  = batch.map((item, idx) =>
			`${idx + 1}. [${item.id}] ${item.title} (${item.source})`
		).join('\n');

		const response = await client.messages.create({
			model:      'claude-haiku-4-5-20251001',
			max_tokens: 1024,
			messages: [{
				role:    'user',
				content: `Score these articles for a developer's daily briefing. For each, return a JSON array entry with: id (exact string from brackets), topic (one word: AI, Web, Tools, Security, Science, Career, OpenSource, Design, Business, or Other), relevance (1-10 integer, 10 = must-read for devs). Skip nothing — include all items.

Articles:
${list}

Respond ONLY with a JSON array, no other text. Example: [{"id":"hn-123","topic":"AI","relevance":8}]`
			}]
		});

		const text = response.content[0].type === 'text' ? response.content[0].text : '';
		try {
			const parsed = JSON.parse(text) as ScoredItem[];
			for (const item of parsed) scored.set(item.id, item);
		} catch {
			// if parsing fails, assign defaults for the batch
			for (const item of batch) scored.set(item.id, { id: item.id, topic: 'Other', relevance: 5 });
		}
	}

	return scored;
}
