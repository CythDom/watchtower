import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { projects, mcpTokens, activityLog } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

const SERVER_INFO = { name: 'watchtower', version: '1.0.0' };
const PROTOCOL_VERSION = '2024-11-05';

const TOOLS = [
	{
		name: 'log_activity',
		description: 'Log an activity, decision, or event to the Watchtower project feed',
		inputSchema: {
			type: 'object',
			properties: {
				message: { type: 'string', description: 'Activity message to log' },
				type: {
					type: 'string',
					enum: ['info', 'tool', 'decision', 'error'],
					description: 'Activity type (default: info)',
				},
			},
			required: ['message'],
		},
	},
	{
		name: 'get_project_info',
		description: 'Get metadata about the current Watchtower project',
		inputSchema: { type: 'object', properties: {} },
	},
];

async function findProjectByToken(token: string) {
	const [row] = await db.select({ projectId: mcpTokens.projectId })
		.from(mcpTokens)
		.where(eq(mcpTokens.token, token))
		.limit(1);
	if (!row) return null;

	const [project] = await db.select().from(projects).where(eq(projects.id, row.projectId)).limit(1);
	return project;
}

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization') ?? '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
	if (!token) return json(rpcError(null, -32001, 'Unauthorized'), { status: 401 });

	const project = await findProjectByToken(token);
	if (!project) return json(rpcError(null, -32001, 'Invalid token'), { status: 401 });

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json(rpcError(null, -32700, 'Parse error'), { status: 400 });
	}

	const id     = body.id ?? null;
	const method = body.method as string;
	const params = (body.params ?? {}) as Record<string, unknown>;

	if (method === 'initialize') {
		return json(rpcOk(id, {
			protocolVersion: PROTOCOL_VERSION,
			capabilities: { tools: {} },
			serverInfo: SERVER_INFO,
		}));
	}

	if (method === 'notifications/initialized') {
		return new Response(null, { status: 204 });
	}

	if (method === 'ping') {
		return json(rpcOk(id, {}));
	}

	if (method === 'tools/list') {
		return json(rpcOk(id, { tools: TOOLS }));
	}

	if (method === 'tools/call') {
		const name = params.name as string;
		const args = (params.arguments ?? {}) as Record<string, unknown>;

		if (name === 'log_activity') {
			const message = String(args.message ?? '').trim();
			const type    = ['info', 'tool', 'decision', 'error'].includes(args.type as string)
				? (args.type as string) : 'info';

			if (!message) return json(rpcOk(id, toolError('message is required')));

			await db.insert(activityLog).values({
				id: crypto.randomUUID(),
				projectId: project.id,
				type,
				message,
				source: 'claude',
			});

			return json(rpcOk(id, { content: [{ type: 'text', text: 'Logged.' }] }));
		}

		if (name === 'get_project_info') {
			return json(rpcOk(id, {
				content: [{
					type: 'text',
					text: JSON.stringify({
						id:           project.id,
						name:         project.name,
						integrations: JSON.parse(project.integrations),
						skills:       JSON.parse(project.skills),
						repo:         project.repoFullName ?? null,
					}, null, 2),
				}],
			}));
		}

		return json(rpcError(id, -32601, `Unknown tool: ${name}`));
	}

	return json(rpcError(id, -32601, `Method not found: ${method}`));
};

// Also handle GET for SSE / capability discovery (some clients probe this)
export const GET: RequestHandler = async () => {
	return json({ server: SERVER_INFO, protocolVersion: PROTOCOL_VERSION });
};

function rpcOk(id: unknown, result: unknown) {
	return { jsonrpc: '2.0', result, id };
}

function rpcError(id: unknown, code: number, message: string) {
	return { jsonrpc: '2.0', error: { code, message }, id };
}

function toolError(message: string) {
	return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}
