import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects, credentials, activityLog, itemStatus } from '$lib/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { decrypt } from '$lib/server/crypto';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export interface Destination {
	label:   string;
	url?:    string;
	prompt?: string;
}

export interface ActionItem {
	key:          string;
	title:        string;
	group:        string;
	status:       string;
	destinations: Destination[];
	rawContext:   string;
}

function relativeTime(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const days = Math.floor(diff / 86_400_000);
	if (days === 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 7)  return `${days}d ago`;
	if (days < 30) return `${Math.floor(days / 7)}w ago`;
	return `${Math.floor(days / 30)}mo ago`;
}

function itemSlug(title: string): string {
	return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

async function ghFetch(token: string, path: string) {
	const res = await fetch(`https://api.github.com${path}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
		},
	});
	if (!res.ok) return null;
	return res.json();
}

function issueGroup(issue: any): string {
	const labels: string[] = (issue.labels ?? []).map((l: any) => l.name as string);
	if (labels.some(l => /enhancemen|feature|improvement|idea/i.test(l))) return 'On deck';
	if (labels.some(l => /good.first|easy|beginner|quick|small/i.test(l))) return 'Quick wins';
	if (labels.some(l => /bug|fix|broken/i.test(l))) return 'One thing to tighten up';
	return 'Ideas in the backlog';
}

async function fetchPackageJson(token: string, repo: string): Promise<string> {
	try {
		const data = await ghFetch(token, `/repos/${repo}/contents/package.json`);
		if (!data?.content) return '';
		const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
		const pkg = JSON.parse(decoded);
		const deps = Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) });
		return deps.slice(0, 40).join(', ');
	} catch {
		return '';
	}
}

async function generateAiItems(
	projectName: string,
	integrations: string[],
	skills: string[],
	dependencies: string,
	existingIssueTitles: string[],
): Promise<ActionItem[]> {
	const avoidStr = existingIssueTitles.length > 0
		? `\nOpen GitHub issues already tracked (do not duplicate):\n${existingIssueTitles.slice(0, 8).map(t => `- ${t}`).join('\n')}`
		: '';

	const depStr = dependencies
		? `\nPackage dependencies: ${dependencies}`
		: '';

	const prompt = `You are a senior developer analyzing a software project. Identify specific, high-value improvements the developer should make based on their tech stack.

Project: "${projectName}"
Platforms / Integrations: ${integrations.join(', ') || 'none specified'}
Skills / Stack: ${skills.join(', ') || 'none specified'}${depStr}${avoidStr}

Generate 4–6 specific, actionable items. Each must follow these rules exactly:

Title rules:
- Start with an imperative verb: Implement, Add, Upgrade, Enable, Connect, Explore, Refactor, Integrate, Configure, Migrate, Adopt, Secure, Optimize
- 4–8 words total, specific to their actual stack (not generic advice)
- Positive and forward-looking — frame as a gain, not a fix
- Examples of good titles: "Add rate limiting to API routes", "Migrate sessions to edge-compatible storage", "Enable Drizzle Studio for local debugging"

Group rules — pick the single best fit:
"Code improvement" | "Security upgrade" | "Feature opportunity" | "Performance gain" | "Developer experience" | "Stack upgrade"

Context rules:
- 1–2 sentences explaining the concrete value of taking this action
- Mention specific tools, APIs, or patterns from their stack when possible

Do NOT suggest:
- Writing tests unless the stack has zero test tooling
- Generic documentation
- Anything already covered by the open issues listed above
- More than one item per group
- Vague advice like "improve error handling" without specifics

Reply with ONLY a valid JSON array, no markdown fences or extra text:
[{"title":"...","group":"...","context":"..."}]`;

	try {
		const msg = await anthropic.messages.create({
			model: 'claude-haiku-4-5-20251001',
			max_tokens: 800,
			messages: [{ role: 'user', content: prompt }],
		});
		const raw = (msg.content[0] as { type: string; text: string }).text.trim()
			.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
		const parsed: { title: string; group: string; context: string }[] = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];

		return parsed.slice(0, 6).map(item => ({
			key:   `ai:${itemSlug(item.title)}`,
			title: item.title,
			group: item.group,
			status: 'new',
			destinations: [{
				label: 'Copy Claude prompt →',
				prompt: `You're working on the "${projectName}" project. ${item.context} Help me implement this step by step: "${item.title}". Start by reviewing the relevant files, then propose a concrete plan.`,
			}],
			rawContext: `${item.title}. ${item.context}`,
		}));
	} catch {
		return [];
	}
}

export const GET: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const project = await db.select().from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.get();
	if (!project) return json({ error: 'not found' }, { status: 404 });

	const integrations: string[] = JSON.parse(project.integrations ?? '[]');
	const skills: string[]       = JSON.parse(project.skills       ?? '[]');

	// Load persisted statuses
	const statusRows = await db.select().from(itemStatus)
		.where(eq(itemStatus.projectId, params.id));
	const statusMap = new Map(statusRows.map(r => [r.itemKey, r]));

	const raw: ActionItem[] = [];

	// ── GitHub + AI in parallel ──────────────────────────────────────
	const cred = await db.select().from(credentials)
		.where(and(eq(credentials.projectId, params.id), eq(credentials.tool, 'GitHub')))
		.get();

	let ghToken = '';
	let repo    = '';

	if (cred && project.repoFullName) {
		ghToken = decrypt(cred.encryptedToken);
		repo    = project.repoFullName;
	}

	// Run GitHub fetches + package.json + AI analysis all in parallel
	const [prs, issues, runs, deps, activity] = await Promise.all([
		ghToken ? ghFetch(ghToken, `/repos/${repo}/pulls?state=open&per_page=20`)                : Promise.resolve(null),
		ghToken ? ghFetch(ghToken, `/repos/${repo}/issues?state=open&per_page=30`)               : Promise.resolve(null),
		ghToken ? ghFetch(ghToken, `/repos/${repo}/actions/runs?per_page=5`)                     : Promise.resolve(null),
		ghToken ? fetchPackageJson(ghToken, repo)                                                : Promise.resolve(''),
		db.select().from(activityLog).where(eq(activityLog.projectId, params.id)).orderBy(desc(activityLog.createdAt)).limit(5),
	]);

	// Gather open issue titles for the AI prompt (dedupe context)
	const openIssueTitles: string[] = Array.isArray(issues)
		? issues.filter((i: any) => !i.pull_request).map((i: any) => i.title as string)
		: [];

	// AI analysis runs with all available context
	const aiItems = await generateAiItems(project.name, integrations, skills, deps, openIssueTitles);

	// ── GitHub PRs ───────────────────────────────────────────────────
	if (Array.isArray(prs)) {
		for (const pr of prs) {
			raw.push({
				key:   `github-pr:${pr.number}`,
				title: pr.title,
				group: pr.draft ? 'Work in progress' : 'Ready for review',
				status: 'new',
				destinations: [{ label: 'Open pull request →', url: pr.html_url }],
				rawContext: `Pull request "${pr.title}" (#${pr.number}) in ${repo} has been open ${relativeTime(pr.created_at)}${pr.draft ? ' and is still a draft' : ' and is ready for review'}.`,
			});
		}
	}

	// ── GitHub issues ────────────────────────────────────────────────
	if (Array.isArray(issues)) {
		for (const issue of issues.filter((i: any) => !i.pull_request)) {
			const body = (issue.body ?? '').slice(0, 200);
			raw.push({
				key:   `github-issue:${issue.number}`,
				title: issue.title,
				group: issueGroup(issue),
				status: 'new',
				destinations: [
					{ label: 'View in GitHub →', url: issue.html_url },
					{
						label: 'Copy Claude prompt →',
						prompt: `Load GitHub issue #${issue.number} from ${repo}: "${issue.title}". Review it and propose a clear implementation approach.`,
					},
				],
				rawContext: `GitHub issue #${issue.number}: "${issue.title}" in ${repo}.${body ? ` Description: ${body}` : ''}`,
			});
		}
	}

	// ── CI ───────────────────────────────────────────────────────────
	if (runs?.workflow_runs?.length > 0) {
		const run = runs.workflow_runs[0];
		const ageMs = Date.now() - new Date(run.updated_at).getTime();
		if (run.conclusion === 'failure' && ageMs < 48 * 3_600_000) {
			raw.push({
				key:   `ci:${run.id}`,
				title: run.display_title ?? run.head_commit?.message ?? run.name,
				group: 'One fix before green',
				status: 'new',
				destinations: [{ label: 'View run →', url: run.html_url }],
				rawContext: `CI workflow "${run.name}" failed ${relativeTime(run.updated_at)} on commit "${run.display_title ?? run.head_commit?.message}".`,
			});
		}
	}

	// ── Claude Code activity ─────────────────────────────────────────
	const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
	for (const entry of activity) {
		const entryDate = entry.createdAt instanceof Date
			? entry.createdAt
			: new Date((entry.createdAt as number) * 1000);
		if (entryDate < sevenDaysAgo) continue;
		raw.push({
			key:   `claude:${entry.id}`,
			title: entry.message.length > 60 ? entry.message.slice(0, 57) + '…' : entry.message,
			group: 'Recent momentum',
			status: 'new',
			destinations: [],
			rawContext: `Claude Code logged ${relativeTime(entryDate.toISOString())}: "${entry.message}".`,
		});
	}

	// ── AI skill/platform items (appended after real data) ───────────
	raw.push(...aiItems);

	// ── Apply stored statuses & filter ───────────────────────────────
	const now = new Date();
	const items: ActionItem[] = [];

	for (const item of raw) {
		const stored = statusMap.get(item.key);
		if (!stored) { items.push(item); continue; }
		if (stored.status === 'forget') continue;
		if (stored.status === 'deferred' && stored.deferredUntil && stored.deferredUntil > now) continue;
		items.push({ ...item, status: stored.status });
	}

	return json(items);
};
