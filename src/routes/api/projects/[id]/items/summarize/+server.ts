import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const project = await db.select({ id: projects.id }).from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.get();
	if (!project) return json({ error: 'not found' }, { status: 404 });

	const { context } = await request.json();
	if (!context) return json({ summary: '', actionLabel: '' });

	const prompt = `Summarize this development task in exactly 2 sentences. Be direct, forward-looking, and focus on the value of taking action. No fluff, no preamble.

Context: ${context}

Reply with ONLY valid JSON, no markdown:
{"summary": "...", "actionLabel": "..."}`;

	try {
		const msg = await client.messages.create({
			model: 'claude-haiku-4-5-20251001',
			max_tokens: 200,
			messages: [{ role: 'user', content: prompt }],
		});
		const raw = (msg.content[0] as { type: string; text: string }).text.trim();
		const parsed = JSON.parse(raw);
		return json({
			summary:     String(parsed.summary ?? ''),
			actionLabel: String(parsed.actionLabel ?? ''),
		});
	} catch {
		return json({ summary: context.slice(0, 180), actionLabel: '' });
	}
};
