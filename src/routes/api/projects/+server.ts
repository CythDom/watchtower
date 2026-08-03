import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

const CONNECTABLE_MCPS = new Set([
	'GitHub', 'GitLab', 'Slack', 'Linear', 'Jira', 'Notion', 'Figma',
	'Vercel', 'Netlify', 'Supabase', 'Stripe', 'Sentry', 'Datadog',
	'AWS', 'Google Cloud', 'Twilio', 'Resend', 'Shopify', 'Airtable',
	'HubSpot', 'Plaid', 'Anthropic', 'OpenAI', 'Brave Search',
]);

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const rows = await db.select().from(projects).where(eq(projects.userId, session.user.id));
	return json(rows.map(r => ({
		id:           r.id,
		name:         r.name,
		integrations: JSON.parse(r.integrations),
		skills:       JSON.parse(r.skills),
		connections:  JSON.parse(r.connections),
	})));
};

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const body = await request.json();
	const { name, integrations = [], skills = [] } = body;

	if (!name?.trim()) return json({ error: 'name required' }, { status: 400 });

	const connections: Record<string, string> = {};
	for (const tool of integrations) {
		if (CONNECTABLE_MCPS.has(tool)) connections[tool] = 'pending';
	}

	const id = crypto.randomUUID();
	await db.insert(projects).values({
		id,
		userId:       session.user.id,
		name:         name.trim(),
		integrations: JSON.stringify(integrations),
		skills:       JSON.stringify(skills),
		connections:  JSON.stringify(connections),
	});

	return json({ id, name: name.trim(), integrations, skills, connections });
};
