import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db/index.js';
import { projects, credentials, activityLog } from '$lib/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { decrypt } from '$lib/server/crypto';

export interface PulseItem {
	label: string;
	meta?: string;
	url?: string;
}

export interface PulseCard {
	id: string;
	title: string;
	subtitle?: string;
	items: PulseItem[];
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

function relativeTime(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const days = Math.floor(diff / 86_400_000);
	if (days === 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 7) return `${days}d ago`;
	if (days < 30) return `${Math.floor(days / 7)}w ago`;
	return `${Math.floor(days / 30)}mo ago`;
}

export const GET: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, { status: 401 });

	const [project] = await db.select().from(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)))
		.limit(1);
	if (!project) return json({ error: 'not found' }, { status: 404 });

	const cards: PulseCard[] = [];

	// ── GitHub signals ────────────────────────────────────────────────
	const [cred] = await db.select().from(credentials)
		.where(and(eq(credentials.projectId, params.id), eq(credentials.tool, 'GitHub')))
		.limit(1);

	if (cred && project.repoFullName) {
		const token = decrypt(cred.encryptedToken);
		const repo  = project.repoFullName;

		const [prs, issues, runs] = await Promise.all([
			ghFetch(token, `/repos/${repo}/pulls?state=open&per_page=15`),
			ghFetch(token, `/repos/${repo}/issues?state=open&per_page=30`),
			ghFetch(token, `/repos/${repo}/actions/runs?per_page=5`),
		]);

		// ── PRs ──
		if (Array.isArray(prs) && prs.length > 0) {
			const ready     = prs.filter((p: any) => !p.draft);
			const drafts    = prs.filter((p: any) => p.draft);

			if (ready.length > 0) {
				cards.push({
					id: 'prs-ready',
					title: ready.length === 1 ? 'Ready for review' : `${ready.length} ready for review`,
					subtitle: 'open pull requests',
					items: ready.slice(0, 5).map((p: any) => ({
						label: p.title,
						meta: relativeTime(p.created_at),
						url: p.html_url,
					})),
				});
			}

			if (drafts.length > 0) {
				cards.push({
					id: 'prs-draft',
					title: 'Work in progress',
					subtitle: `${drafts.length} draft PR${drafts.length > 1 ? 's' : ''}`,
					items: drafts.slice(0, 3).map((p: any) => ({
						label: p.title,
						meta: relativeTime(p.updated_at),
						url: p.html_url,
					})),
				});
			}
		}

		// ── Issues — features/enhancements only ──
		if (Array.isArray(issues)) {
			const realIssues = issues.filter((i: any) => !i.pull_request);
			const enhancements = realIssues.filter((i: any) =>
				i.labels?.some((l: any) =>
					/enhancemen|feature|improvement|idea/i.test(l.name)
				)
			);
			const quickWins = realIssues.filter((i: any) =>
				i.labels?.some((l: any) =>
					/good.first|easy|beginner|quick|small/i.test(l.name)
				)
			);
			const bugs = realIssues.filter((i: any) =>
				i.labels?.some((l: any) => /bug|fix|broken/i.test(l.name))
			);

			if (enhancements.length > 0) {
				cards.push({
					id: 'enhancements',
					title: 'On deck',
					subtitle: 'feature ideas to build',
					items: enhancements.slice(0, 5).map((i: any) => ({
						label: i.title,
						meta: `#${i.number}`,
						url: i.html_url,
					})),
				});
			}

			if (quickWins.length > 0) {
				cards.push({
					id: 'quick-wins',
					title: 'Quick wins',
					subtitle: 'small improvements ready to ship',
					items: quickWins.slice(0, 4).map((i: any) => ({
						label: i.title,
						meta: `#${i.number}`,
						url: i.html_url,
					})),
				});
			}

			if (bugs.length > 0) {
				cards.push({
					id: 'fixes',
					title: `${bugs.length === 1 ? 'One thing' : `${bugs.length} things`} to tighten up`,
					subtitle: 'known issues',
					items: bugs.slice(0, 4).map((i: any) => ({
						label: i.title,
						meta: `#${i.number}`,
						url: i.html_url,
					})),
				});
			}

			// Unlabeled issues
			const unlabeled = realIssues.filter((i: any) =>
				!enhancements.includes(i) && !quickWins.includes(i) && !bugs.includes(i)
			);
			if (unlabeled.length > 0 && enhancements.length === 0) {
				cards.push({
					id: 'backlog',
					title: 'Ideas in the backlog',
					subtitle: `${unlabeled.length} open issue${unlabeled.length > 1 ? 's' : ''}`,
					items: unlabeled.slice(0, 5).map((i: any) => ({
						label: i.title,
						meta: `#${i.number}`,
						url: i.html_url,
					})),
				});
			}
		}

		// ── CI — only surface failure if recent (<48h) ──
		if (runs?.workflow_runs?.length > 0) {
			const latest = runs.workflow_runs[0];
			const ageMs  = Date.now() - new Date(latest.updated_at).getTime();
			const recent = ageMs < 48 * 3_600_000;

			if (recent && latest.conclusion === 'failure') {
				cards.push({
					id: 'ci-fix',
					title: 'One fix before green',
					subtitle: `${latest.name} · ${relativeTime(latest.updated_at)}`,
					items: [{ label: latest.display_title ?? latest.head_commit?.message ?? 'View run', url: latest.html_url }],
				});
			}
		}
	}

	// ── Claude Code activity ──────────────────────────────────────────
	const recentActivity = await db.select().from(activityLog)
		.where(eq(activityLog.projectId, params.id))
		.orderBy(desc(activityLog.createdAt))
		.limit(6);

	if (recentActivity.length > 0) {
		const sevenDaysAgo = Date.now() - 7 * 86_400_000;
		const fresh = recentActivity.filter(
			a => (a.createdAt as unknown as Date).getTime() > sevenDaysAgo
		);
		if (fresh.length > 0) {
			cards.push({
				id: 'claude-activity',
				title: 'Recent momentum',
				subtitle: 'logged from Claude Code sessions',
				items: fresh.slice(0, 5).map(a => ({
					label: a.message,
					meta: relativeTime((a.createdAt as unknown as Date).toISOString()),
				})),
			});
		}
	}

	return json({ cards });
};
