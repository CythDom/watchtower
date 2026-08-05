import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { userTags, projects } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const standalone = await db
		.select()
		.from(userTags)
		.where(eq(userTags.userId, session.user.id));

	const userProjects = await db
		.select({ integrations: projects.integrations, skills: projects.skills })
		.from(projects)
		.where(eq(projects.userId, session.user.id));

	const projectTagSet = new Set<string>();
	for (const p of userProjects) {
		try { (JSON.parse(p.integrations) as string[]).forEach(t => projectTagSet.add(t)); } catch {}
		try { (JSON.parse(p.skills) as string[]).forEach(t => projectTagSet.add(t)); } catch {}
	}

	return json({
		standalone,
		projectTags: [...projectTagSet],
	});
};

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const body = await request.json() as { prompt?: string; tags?: string[] };

	let tagList: string[] = [];

	if (body.tags && body.tags.length > 0) {
		tagList = body.tags.map(t => t.trim()).filter(Boolean);
	} else if (body.prompt) {
		const response = await client.messages.create({
			model: 'claude-haiku-4-5-20251001',
			max_tokens: 512,
			messages: [{
				role: 'user',
				content: `Extract a list of specific interests, technologies, and topics from this text for a developer's discovery feed. Return 3–8 concise tags (1-3 words each) as a JSON array of strings. Focus on technologies, domains, and topics that can be matched against news articles.

Text: "${body.prompt}"

Respond ONLY with a JSON array. Example: ["SvelteKit","TypeScript","AI","web performance","open source"]`
			}]
		});

		let raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';
		// strip markdown code fences if present
		raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
		console.log('[tags] Claude raw:', raw);
		try {
			tagList = JSON.parse(raw) as string[];
		} catch (e) {
			console.error('[tags] JSON parse failed:', e, 'raw:', raw);
			tagList = [];
		}
	}

	if (tagList.length === 0) return json({ tags: [] });

	const total = tagList.length;
	const rows = tagList.map((tag, i) => ({
		id:     crypto.randomUUID(),
		userId: session.user.id,
		tag,
		source: 'standalone' as const,
		// first tags typed get highest interest; descend to minimum 2
		rating: Math.max(2, 5 - Math.floor(i * 3 / Math.max(total - 1, 1))),
	}));

	try {
		await db.insert(userTags).values(rows);
	} catch (e) {
		console.error('[tags] DB insert failed:', e);
		return json({ error: 'db_error' }, { status: 500 });
	}

	return json({ tags: rows });
};
