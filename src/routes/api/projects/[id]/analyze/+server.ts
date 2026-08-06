import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const HEALTH_MESSAGES = [
	"Stack looks solid. Nothing major stands out.",
	"Generally healthy. One or two things worth noting.",
	"A few specific improvements available.",
	"Some notable gaps worth addressing.",
	"Several issues need attention.",
];

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const [row] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.limit(1);

	if (!row) return json({ error: 'not found' }, { status: 404 });

	const integrations: string[] = JSON.parse(row.integrations);
	const skills: string[]       = JSON.parse(row.skills);
	const stack = [...new Set([...integrations, ...skills])].join(', ');

	const prompt = `You are performing a strict technical analysis of a software project.

Your job: identify ONLY genuine, specific improvement opportunities based on the tech stack provided.

Rules you must follow:
- Only flag real, actionable issues you can specifically infer from the given technologies
- Do NOT manufacture problems to seem helpful
- Do NOT suggest generic things like "add tests" unless the stack has no testing tool at all
- A healthScore of 0 means the project is solid — use it when it's true
- Maximum 4 suggestions; return fewer if fewer are warranted
- Each suggestion must be 3–8 words, specific to their actual stack
- Be skeptical: if the stack is well-assembled, say so

Project name: "${row.name}"
Tech stack: ${stack || '(none specified)'}

Reply with ONLY valid JSON, no markdown fences, no explanation:
{"score":0,"suggestions":[]}`;

	try {
		const msg = await client.messages.create({
			model: 'claude-haiku-4-5-20251001',
			max_tokens: 256,
			messages: [{ role: 'user', content: prompt }],
		});

		const raw = (msg.content[0] as { type: string; text: string }).text.trim();
		const parsed = JSON.parse(raw);
		const score = Math.max(0, Math.min(4, Math.round(Number(parsed.score) || 0)));

		return json({
			healthMessage: HEALTH_MESSAGES[score],
			suggestions: Array.isArray(parsed.suggestions)
				? parsed.suggestions.slice(0, 4).map(String)
				: [],
		});
	} catch {
		return json({
			healthMessage: HEALTH_MESSAGES[0],
			suggestions: [],
		});
	}
};
