<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── URL sync (no page reload) ────────────────────────────────
	function pushUrl(path: string) {
		history.replaceState({}, '', path);
	}

	// ── Intro text ──────────────────────────────────────────────
	const line1 = 'Every tool needs sharpening';
	const line2 = 'Improve your skills →';

	function tokenize(str: string, offset = 0) {
		let charIdx = 0;
		return str.split('').map((ch) => {
			if (ch === ' ') return { ch, space: true, ei: 0 };
			return { ch, space: false, ei: offset + charIdx++ };
		});
	}

	const RAMP = ['#909090', '#ffb300', '#ffe044', '#ffffff'];

	function hexToRgb(h: string): [number, number, number] {
		const n = parseInt(h.slice(1), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	function colorAt(pos: number): string {
		const max = RAMP.length - 1;
		const p   = Math.max(0, Math.min(1, pos)) * max;
		const lo  = Math.floor(p), hi = Math.min(lo + 1, max);
		const t   = p - lo;
		const [r1,g1,b1] = hexToRgb(RAMP[lo]);
		const [r2,g2,b2] = hexToRgb(RAMP[hi]);
		return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
	}

	function shadowAt(pos: number): string {
		if (pos < 0.52) return 'none';
		const t = (pos - 0.52) / 0.48;
		return [
			`0 0 ${(6*t).toFixed(1)}px rgba(255,255,255,${t.toFixed(2)})`,
			`0 0 ${(22*t).toFixed(1)}px rgba(255,215,0,${(0.8*t).toFixed(2)})`,
			`0 0 ${(42*t).toFixed(1)}px rgba(255,140,0,${(0.6*t).toFixed(2)})`,
		].join(', ');
	}

	const HEAT_SPEED = 12;
	const COOL_SPEED = 0.08;
	const AMBIENT    = 0.45;

	// ── Per-item heat system ────────────────────────────────────
	const ITEM_RAMP = ['#c8c8c8', '#ffb300', '#ffe044', '#ffffff'];
	function itemColorAt(pos: number): string {
		const max = ITEM_RAMP.length - 1;
		const p   = Math.max(0, Math.min(1, pos)) * max;
		const lo  = Math.floor(p), hi = Math.min(lo + 1, max);
		const t   = p - lo;
		const [r1,g1,b1] = hexToRgb(ITEM_RAMP[lo]);
		const [r2,g2,b2] = hexToRgb(ITEM_RAMP[hi]);
		return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
	}
	function itemShadowAt(pos: number): string {
		if (pos < 0.25) return 'none';
		const t = (pos - 0.25) / 0.75;
		return [
			`0 0 ${(4*t).toFixed(1)}px rgba(255,255,220,${(0.9*t).toFixed(2)})`,
			`0 0 ${(14*t).toFixed(1)}px rgba(255,200,50,${(0.7*t).toFixed(2)})`,
			`0 0 ${(32*t).toFixed(1)}px rgba(255,120,10,${(0.55*t).toFixed(2)})`,
			`0 0 ${(70*t).toFixed(1)}px rgba(255,60,0,${(0.3*t).toFixed(2)})`,
		].join(', ');
	}

	const ITEM_COOL_SPEED = 1.0;
	let heatMap = $state<Record<string, number>>({});
	const heatRafs: Record<string, number> = {};

	function heatItem(key: string) {
		if (heatRafs[key]) cancelAnimationFrame(heatRafs[key]);
		delete heatRafs[key];
		heatMap[key] = 1;
	}
	function coolItem(key: string) {
		if (heatRafs[key]) cancelAnimationFrame(heatRafs[key]);
		let last: number | null = null;
		function frame(ts: number) {
			const dt = last === null ? 0 : Math.min((ts - last) / 1000, 0.05);
			last = ts;
			const pos = heatMap[key] ?? 0;
			if (pos <= 0.005) { heatMap[key] = 0; delete heatRafs[key]; return; }
			heatMap[key] = Math.max(0, pos - ITEM_COOL_SPEED * dt);
			heatRafs[key] = requestAnimationFrame(frame);
		}
		heatRafs[key] = requestAnimationFrame(frame);
	}

	let l1Pos = $state(AMBIENT), l1Target = AMBIENT, l1Raf: number | null = null;
	const l1Color  = $derived(colorAt(l1Pos));
	const l1Shadow = $derived(shadowAt(l1Pos));

	function loop1() {
		let last: number | null = null;
		return function frame(ts: number) {
			if (last === null) last = ts;
			const dt   = Math.min((ts - last) / 1000, 0.05); last = ts;
			const diff = l1Target - l1Pos;
			if (Math.abs(diff) < 0.0003) { l1Pos = l1Target; return; }
			l1Pos = l1Pos + Math.sign(diff) * Math.min((diff > 0 ? HEAT_SPEED : COOL_SPEED) * dt, Math.abs(diff));
			l1Raf = requestAnimationFrame(frame);
		};
	}
	function heat1() { if (l1Raf) cancelAnimationFrame(l1Raf); l1Target = 1;       l1Raf = requestAnimationFrame(loop1()); }
	function cool1() { if (l1Raf) cancelAnimationFrame(l1Raf); l1Target = AMBIENT; l1Raf = requestAnimationFrame(loop1()); }

	let l2Pos = $state(AMBIENT), l2Target = AMBIENT, l2Raf: number | null = null;
	const l2Color  = $derived(colorAt(l2Pos));
	const l2Shadow = $derived(shadowAt(l2Pos));

	function loop2() {
		let last: number | null = null;
		return function frame(ts: number) {
			if (last === null) last = ts;
			const dt   = Math.min((ts - last) / 1000, 0.05); last = ts;
			const diff = l2Target - l2Pos;
			if (Math.abs(diff) < 0.0003) { l2Pos = l2Target; return; }
			l2Pos = l2Pos + Math.sign(diff) * Math.min((diff > 0 ? HEAT_SPEED : COOL_SPEED) * dt, Math.abs(diff));
			l2Raf = requestAnimationFrame(frame);
		};
	}
	function heat2() { if (l2Raf) cancelAnimationFrame(l2Raf); l2Target = 1;       l2Raf = requestAnimationFrame(loop2()); }
	function cool2() { if (l2Raf) cancelAnimationFrame(l2Raf); l2Target = AMBIENT; l2Raf = requestAnimationFrame(loop2()); }

	let hovering = $state(false);

	// ── Known tools ─────────────────────────────────────────────
	const KNOWN_TOOLS = [
		{ name: 'GitHub',         tag: 'mcp' },
		{ name: 'GitLab',         tag: 'mcp' },
		{ name: 'Slack',          tag: 'mcp' },
		{ name: 'Linear',         tag: 'mcp' },
		{ name: 'Jira',           tag: 'mcp' },
		{ name: 'Notion',         tag: 'mcp' },
		{ name: 'Figma',          tag: 'mcp' },
		{ name: 'Vercel',         tag: 'mcp' },
		{ name: 'Netlify',        tag: 'mcp' },
		{ name: 'Supabase',       tag: 'mcp' },
		{ name: 'Stripe',         tag: 'mcp' },
		{ name: 'Sentry',         tag: 'mcp' },
		{ name: 'Datadog',        tag: 'mcp' },
		{ name: 'Cloudflare',     tag: 'mcp' },
		{ name: 'AWS',            tag: 'mcp' },
		{ name: 'Google Cloud',   tag: 'mcp' },
		{ name: 'Twilio',         tag: 'mcp' },
		{ name: 'Resend',         tag: 'mcp' },
		{ name: 'Shopify',        tag: 'mcp' },
		{ name: 'Airtable',       tag: 'mcp' },
		{ name: 'HubSpot',        tag: 'mcp' },
		{ name: 'Plaid',          tag: 'mcp' },
		{ name: 'Anthropic',      tag: 'mcp' },
		{ name: 'OpenAI',         tag: 'mcp' },
		{ name: 'Brave Search',   tag: 'mcp' },
		{ name: 'Claude Code',    tag: 'mcp' },
		{ name: 'SvelteKit',      tag: 'framework' },
		{ name: 'React',          tag: 'framework' },
		{ name: 'Vue',            tag: 'framework' },
		{ name: 'Angular',        tag: 'framework' },
		{ name: 'Next.js',        tag: 'framework' },
		{ name: 'Nuxt',           tag: 'framework' },
		{ name: 'Astro',          tag: 'framework' },
		{ name: 'Remix',          tag: 'framework' },
		{ name: 'Solid',          tag: 'framework' },
		{ name: 'Node.js',        tag: 'runtime' },
		{ name: 'Deno',           tag: 'runtime' },
		{ name: 'Bun',            tag: 'runtime' },
		{ name: 'TypeScript',     tag: 'language' },
		{ name: 'JavaScript',     tag: 'language' },
		{ name: 'Python',         tag: 'language' },
		{ name: 'Go',             tag: 'language' },
		{ name: 'Rust',           tag: 'language' },
		{ name: 'Ruby',           tag: 'language' },
		{ name: 'PostgreSQL',     tag: 'database' },
		{ name: 'MySQL',          tag: 'database' },
		{ name: 'SQLite',         tag: 'database' },
		{ name: 'MongoDB',        tag: 'database' },
		{ name: 'Redis',          tag: 'database' },
		{ name: 'Elasticsearch',  tag: 'database' },
		{ name: 'Drizzle',        tag: 'tooling' },
		{ name: 'Prisma',         tag: 'tooling' },
		{ name: 'Tailwind CSS',   tag: 'tooling' },
		{ name: 'Vite',           tag: 'tooling' },
		{ name: 'Docker',         tag: 'tooling' },
		{ name: 'Kubernetes',     tag: 'tooling' },
		{ name: 'GitHub Actions', tag: 'tooling' },
		{ name: 'Terraform',      tag: 'tooling' },
		{ name: 'Better Auth',    tag: 'tooling' },
		{ name: 'Auth.js',        tag: 'tooling' },
		{ name: 'Clerk',          tag: 'tooling' },
		{ name: 'shadcn/ui',      tag: 'tooling' },
		{ name: 'Radix UI',       tag: 'tooling' },
		{ name: 'tRPC',           tag: 'tooling' },
	];

	const CONNECTABLE_MCPS = new Set([
		'GitLab', 'Slack', 'Linear', 'Jira', 'Notion', 'Figma',
		'Vercel', 'Netlify', 'Supabase', 'Stripe', 'Sentry', 'Datadog',
		'AWS', 'Google Cloud', 'Twilio', 'Resend', 'Shopify', 'Airtable',
		'HubSpot', 'Plaid', 'Anthropic', 'OpenAI', 'Brave Search', 'Cloudflare', 'Claude Code',
	]);

	const PLATFORM_SKILLS: Record<string, string[]> = {
		'GitHub':         ['Git', 'Pull Requests', 'Code Review'],
		'GitLab':         ['Git', 'CI/CD', 'DevOps'],
		'Slack':          ['Webhooks', 'Bot Development'],
		'Linear':         ['Project Management', 'Agile'],
		'Jira':           ['Project Management', 'Agile', 'Scrum'],
		'Figma':          ['UI Design', 'Prototyping', 'Design Systems'],
		'Vercel':         ['Deployment', 'Edge Functions', 'CI/CD'],
		'Netlify':        ['Deployment', 'Edge Functions', 'CI/CD'],
		'Supabase':       ['PostgreSQL', 'Auth', 'Realtime', 'Row-Level Security'],
		'Stripe':         ['Payments', 'Webhooks', 'Subscriptions'],
		'Sentry':         ['Error Monitoring', 'Debugging', 'Alerting'],
		'Datadog':        ['Observability', 'Metrics', 'Logging'],
		'AWS':            ['Cloud Infrastructure', 'Serverless', 'S3'],
		'Google Cloud':   ['Cloud Infrastructure', 'BigQuery', 'GKE'],
		'Cloudflare':     ['Edge Computing', 'CDN', 'Workers'],
		'Twilio':         ['SMS', 'Voice', 'Messaging APIs'],
		'Resend':         ['Transactional Email', 'Email APIs'],
		'Shopify':        ['E-commerce', 'Liquid', 'Webhooks'],
		'Anthropic':      ['Prompt Engineering', 'LLMs', 'AI APIs'],
		'OpenAI':         ['Prompt Engineering', 'LLMs', 'Embeddings'],
		'SvelteKit':      ['Svelte', 'TypeScript', 'SSR', 'Vite'],
		'React':          ['JSX', 'Hooks', 'State Management'],
		'Vue':            ['Composition API', 'Pinia', 'TypeScript'],
		'Next.js':        ['React', 'SSR', 'API Routes', 'App Router'],
		'Nuxt':           ['Vue', 'SSR', 'TypeScript'],
		'Astro':          ['Islands Architecture', 'SSG', 'Content Collections'],
		'Node.js':        ['JavaScript', 'npm', 'HTTP', 'Streams'],
		'TypeScript':     ['Type Safety', 'Generics', 'Decorators'],
		'Python':         ['pip', 'Virtual Environments', 'Async'],
		'Go':             ['Goroutines', 'Interfaces', 'net/http'],
		'Rust':           ['Memory Safety', 'Cargo', 'Traits'],
		'PostgreSQL':     ['SQL', 'Indexes', 'JSONB'],
		'MySQL':          ['SQL', 'Indexes', 'Replication'],
		'MongoDB':        ['NoSQL', 'Aggregation Pipeline', 'Atlas'],
		'Redis':          ['Caching', 'Pub/Sub', 'Data Structures'],
		'SQLite':         ['SQL', 'Embedded Databases'],
		'Drizzle':        ['ORM', 'TypeScript', 'Schema Migrations'],
		'Prisma':         ['ORM', 'TypeScript', 'Schema Migrations'],
		'Tailwind CSS':   ['Utility-First CSS', 'Responsive Design'],
		'Docker':         ['Containerization', 'Docker Compose', 'Images'],
		'Kubernetes':     ['Container Orchestration', 'Helm', 'YAML'],
		'GitHub Actions': ['CI/CD', 'Automation', 'YAML', 'Secrets'],
		'Terraform':      ['Infrastructure as Code', 'HCL', 'State Management'],
		'Better Auth':    ['Authentication', 'Sessions', 'OAuth'],
		'Clerk':          ['Authentication', 'User Management', 'OAuth'],
	};

	const AI_EXTRA_SKILLS = [
		'API Design', 'Testing', 'Performance Optimization',
		'Security', 'Accessibility', 'Documentation',
		'Error Handling', 'Caching', 'Rate Limiting',
		'Observability', 'Database Design', 'Code Review',
	];

	// ── Projects ─────────────────────────────────────────────────
	type Project = {
		id:           string;
		name:         string;
		integrations: string[];
		skills:       string[];
		connections:  Record<string, string>;
		repoFullName: string | null;
	};
	let projects = $state<Project[]>(data.projects ?? []);

	// ── Overlay / wizard ─────────────────────────────────────────
	let overlayOpen     = $state(false);
	let creatingProject = $state(false);
	let wizardStep      = $state(1);
	let newName         = $state('');
	let newIntegrations = $state<string[]>([]);
	let newSkills       = $state<string[]>([]);
	let skillInput      = $state('');

	let toolQuery    = $state('');
	let toolDropOpen = $state(false);
	let toolInputEl: HTMLInputElement | null = $state(null);

	const filteredTools = $derived(
		toolQuery.trim().length > 0
			? KNOWN_TOOLS.filter(t =>
					t.name.toLowerCase().includes(toolQuery.toLowerCase()) &&
					!newIntegrations.includes(t.name)
			  ).slice(0, 7)
			: []
	);

	const wizardMcpSelections = $derived(
		newIntegrations.filter(t => CONNECTABLE_MCPS.has(t))
	);

	const aiExtraSkills = $derived(
		AI_EXTRA_SKILLS.filter(s => !newSkills.includes(s)).slice(0, 6)
	);

	function selectTool(name: string) {
		if (!newIntegrations.includes(name)) newIntegrations = [...newIntegrations, name];
		toolQuery = ''; toolDropOpen = false; toolInputEl?.focus();
	}
	function removeTool(name: string) { newIntegrations = newIntegrations.filter(t => t !== name); }
	function handleToolKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (filteredTools.length === 1) { selectTool(filteredTools[0].name); return; }
			const q = toolQuery.trim();
			if (q && !newIntegrations.includes(q)) { newIntegrations = [...newIntegrations, q]; toolQuery = ''; }
		}
		if (e.key === 'Escape') { toolDropOpen = false; toolQuery = ''; }
	}
	function enterStep3() {
		const inherent = newIntegrations.flatMap(t => PLATFORM_SKILLS[t] ?? []);
		newSkills = [...new Set([...newIntegrations, ...inherent])];
		skillInput = '';
		wizardStep = 3;
	}
	function addSkill() {
		const s = skillInput.trim();
		if (s && !newSkills.includes(s)) newSkills = [...newSkills, s];
		skillInput = '';
	}
	function removeSkill(s: string) { newSkills = newSkills.filter(x => x !== s); }

	async function createProject() {
		if (!newName.trim()) return;
		const res = await fetch('/api/projects', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: newName, integrations: newIntegrations, skills: newSkills }),
		});
		if (res.ok) {
			const proj = await res.json();
			projects = [...projects, proj];
		}
		creatingProject = false;
	}

	// ── Project selection ─────────────────────────────────────────
	let selectedProject: string | null = $state(null);

	const selectedProjectData = $derived(
		selectedProject ? projects.find(p => p.name === selectedProject) ?? null : null
	);

	let lastSelectedProjectName: string | null = null;

	function selectProject(project: Project) {
		const prev = projects.find(p => p.name === selectedProject);
		if (prev && prev.id !== project.id) coolItem(prev.id);
		selectedProject = project.name;
		lastSelectedProjectName = project.name;
		heatItem(project.id);
		settingsMode = false;
		pushUrl('/forge/' + encodeURIComponent(project.name));
	}

	// ── Carousel ──────────────────────────────────────────────────
	interface Destination { label: string; url?: string; prompt?: string; }
	interface ActionItem {
		key: string; title: string; group: string; status: string;
		destinations: Destination[]; rawContext: string;
	}

	let carouselItems   = $state<ActionItem[]>([]);
	let carouselIndex   = $state(0);
	let carouselLoading = $state(false);
	let summaryMode     = $state(false);
	let summaryLoading  = $state(false);
	let summaryText     = $state('');
	let activeItem      = $state<ActionItem | null>(null);
	let promptCopied    = $state(false);

	async function loadItems(project: Project) {
		carouselLoading = true;
		summaryMode = false;
		summaryText = '';
		activeItem = null;
		try {
			const res = await fetch(`/api/projects/${project.id}/items`);
			if (res.ok) {
				carouselItems = await res.json();
				carouselIndex = 0;
				if (carouselItems.length > 0) heatItem('carousel-' + carouselItems[0].key);
			} else {
				carouselItems = [];
			}
		} finally {
			carouselLoading = false;
		}
	}

	$effect(() => {
		if (selectedProjectData && !settingsMode) loadItems(selectedProjectData);
	});

	function carouselGo(dir: -1 | 1) {
		const next = carouselIndex + dir;
		if (next < 0 || next >= carouselItems.length) return;
		coolItem('carousel-' + carouselItems[carouselIndex].key);
		carouselIndex = next;
		heatItem('carousel-' + carouselItems[next].key);
	}

	async function setStatus(key: string, status: string) {
		if (!selectedProjectData) return;
		const idx = carouselIndex;
		carouselItems = carouselItems.filter(i => i.key !== key);
		carouselIndex = Math.min(idx, Math.max(0, carouselItems.length - 1));
		if (carouselItems.length > 0) heatItem('carousel-' + carouselItems[carouselIndex].key);
		await fetch(`/api/projects/${selectedProjectData.id}/items/status`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ key, status }),
		});
	}

	async function takeAction(item: ActionItem) {
		activeItem = item;
		summaryMode = true;
		summaryLoading = true;
		if (selectedProjectData) {
			pushUrl('/forge/' + encodeURIComponent(selectedProjectData.name) + '/' + encodeURIComponent(item.key));
			fetch(`/api/projects/${selectedProjectData.id}/items/status`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ key: item.key, status: 'in_progress' }),
			});
		}
		const res = await fetch(`/api/projects/${selectedProjectData!.id}/items/summarize`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ key: item.key, context: item.rawContext }),
		});
		if (res.ok) {
			const d = await res.json();
			summaryText = d.summary;
		}
		summaryLoading = false;
	}

	function copyPrompt(prompt: string) {
		navigator.clipboard.writeText(prompt);
		promptCopied = true;
		setTimeout(() => { promptCopied = false; }, 2000);
	}

	// ── Settings ──────────────────────────────────────────────────
	let settingsMode    = $state(false);
	let settingsProject: Project | null = $state(null);
	let settingsName    = $state('');
	let settingsTools   = $state<string[]>([]);
	let settingsSkills  = $state<string[]>([]);
	let settingsSkillInput = $state('');
	let settingsToolQuery  = $state('');
	let settingsToolDropOpen = $state(false);
	let settingsSaving   = $state(false);
	let confirmingDelete = $state(false);

	let selectedPlatform:     string | null = $state(null);
	let platformToken         = $state('');
	let platformConnecting    = $state(false);
	let platformDisconnecting = $state(false);

	type GithubRepo = { id: number; fullName: string; private: boolean };
	let githubRepos:        GithubRepo[] = $state([]);
	let githubReposLoading               = $state(false);
	let githubRepoQuery                  = $state('');

	async function loadGithubRepos() {
		if (!settingsProject) return;
		githubReposLoading = true;
		githubRepos = [];
		const res = await fetch(`/api/projects/${settingsProject.id}/github`);
		if (res.ok) githubRepos = await res.json();
		githubReposLoading = false;
	}

	async function saveGithubRepo(fullName: string) {
		if (!settingsProject) return;
		await fetch(`/api/projects/${settingsProject.id}/github`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ repoFullName: fullName }),
		});
		settingsProject = { ...settingsProject, repoFullName: fullName };
		projects = projects.map(p => p.id === settingsProject!.id ? { ...p, repoFullName: fullName } : p);
	}

	$effect(() => {
		if (selectedPlatform === 'GitHub' && settingsProject?.connections['GitHub'] === 'connected') {
			loadGithubRepos();
		} else if (selectedPlatform !== 'GitHub') {
			githubRepos = [];
			githubRepoQuery = '';
		}
	});

	// ── Claude Code MCP ───────────────────────────────────────────
	let mcpToken      = $state('');
	let mcpGenerating = $state(false);

	async function generateMcpToken() {
		if (!settingsProject) return;
		mcpGenerating = true;
		mcpToken = '';
		const res = await fetch(`/api/projects/${settingsProject.id}/mcp-token`, { method: 'POST' });
		if (res.ok) {
			const d = await res.json();
			mcpToken = d.token;
		}
		mcpGenerating = false;
	}

	$effect(() => {
		if (selectedPlatform !== 'Claude Code') mcpToken = '';
	});

	let settingsSection: 'general' | 'platforms' | 'skills' = $state('general');

	const settingsFilteredTools = $derived(
		settingsToolQuery.trim().length > 0
			? KNOWN_TOOLS.filter(t =>
					t.name.toLowerCase().includes(settingsToolQuery.toLowerCase()) &&
					!settingsTools.includes(t.name)
			  ).slice(0, 7)
			: []
	);

	function enterSettings(project: Project, e: MouseEvent) {
		e.stopPropagation();
		settingsProject = project;
		settingsMode    = true;
		settingsSection = 'general';
		settingsName    = project.name;
		settingsTools   = [...project.integrations];
		settingsSkills  = [...project.skills];
		selectedProject = null;
		heatItem('general');
		pushUrl('/forge/' + encodeURIComponent(project.name) + '/settings');
	}

	function exitSettings() {
		coolItem(settingsSection);
		const proj = settingsProject;
		settingsMode    = false;
		settingsProject = null;
		if (proj) selectProject(proj); // re-selects, heats, pushes URL
		else pushUrl('/forge');
	}

	function settingsSelectTool(name: string) {
		if (!settingsTools.includes(name)) settingsTools = [...settingsTools, name];
		settingsToolQuery = ''; settingsToolDropOpen = false;
		selectedPlatform = name; platformToken = '';
	}

	async function savePlatformConnection() {
		if (!settingsProject || !selectedPlatform || !platformToken.trim()) return;
		platformConnecting = true;
		const res = await fetch(`/api/projects/${settingsProject.id}/connect`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ tool: selectedPlatform, token: platformToken }),
		});
		if (res.ok) {
			const { connections } = await res.json();
			settingsProject = { ...settingsProject, connections };
			projects = projects.map(p => p.id === settingsProject!.id ? { ...p, connections } : p);
			platformToken = '';
		}
		platformConnecting = false;
	}

	async function disconnectPlatform(tool: string) {
		if (!settingsProject) return;
		platformDisconnecting = true;
		const res = await fetch(`/api/projects/${settingsProject.id}/connect?tool=${encodeURIComponent(tool)}`, {
			method: 'DELETE',
		});
		if (res.ok) {
			const { connections } = await res.json();
			settingsProject = { ...settingsProject, connections };
			projects = projects.map(p => p.id === settingsProject!.id ? { ...p, connections } : p);
		}
		platformDisconnecting = false;
	}
	function settingsRemoveTool(name: string) { settingsTools = settingsTools.filter(t => t !== name); }
	function settingsAddSkill() {
		const s = settingsSkillInput.trim();
		if (s && !settingsSkills.includes(s)) settingsSkills = [...settingsSkills, s];
		settingsSkillInput = '';
	}

	async function deleteProject() {
		if (!settingsProject) return;
		const res = await fetch(`/api/projects/${settingsProject.id}`, { method: 'DELETE' });
		if (res.ok) {
			projects = projects.filter(p => p.id !== settingsProject!.id);
			confirmingDelete = false;
			exitSettings();
		}
	}

	async function saveSettings() {
		if (!settingsProject || !settingsName.trim()) return;
		settingsSaving = true;
		const res = await fetch(`/api/projects/${settingsProject.id}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: settingsName.trim(), integrations: settingsTools, skills: settingsSkills }),
		});
		if (res.ok) {
			const updated = await res.json();
			projects = projects.map(p => p.id === updated.id ? { ...p, ...updated } : p);
			settingsProject = { ...settingsProject!, ...updated };
		}
		settingsSaving = false;
	}

	// ── Overlay navigation ────────────────────────────────────────
	function openProjects() {
		overlayOpen = true;
		creatingProject = false;
		if (selectedProject === null && projects.length > 0) {
			const autoName = lastSelectedProjectName ?? projects[0].name;
			const proj = projects.find(p => p.name === autoName) ?? projects[0];
			selectProject(proj); // also calls pushUrl
		}
	}
	function openWizard() {
		creatingProject = true; wizardStep = 1;
		newName = ''; newIntegrations = []; newSkills = []; skillInput = ''; toolQuery = '';
	}
	function closeOverlay() {
		const prev = projects.find(p => p.name === selectedProject);
		if (prev) coolItem(prev.id);
		overlayOpen = false; creatingProject = false;
		selectedProject = null; settingsMode = false; settingsProject = null;
		pushUrl('/forge');
	}
	function goBack() {
		if (settingsMode)                         { exitSettings(); return; }
		if (creatingProject && wizardStep > 1)    { wizardStep--; return; }
		if (creatingProject)                      { creatingProject = false; return; }
		closeOverlay();
	}

	const backLabel = $derived(
		settingsMode                      ? 'return to project' :
		creatingProject && wizardStep > 1 ? 'back' :
		                                    'return to Forge'
	);

	// ── Restore state from slug on load ───────────────────────────
	onMount(() => {
		const { initialProject, initialSection } = data;
		if (!initialProject) return;
		const proj = projects.find(p => p.name === initialProject);
		if (!proj) return;
		overlayOpen = true;
		if (initialSection === 'settings') {
			settingsProject = proj;
			settingsMode    = true;
			settingsSection = 'general';
			settingsName    = proj.name;
			settingsTools   = [...proj.integrations];
			settingsSkills  = [...proj.skills];
			heatItem('general');
		} else {
			// project view (or item — item summary can be loaded if needed)
			selectedProject       = proj.name;
			lastSelectedProjectName = proj.name;
			heatItem(proj.id);
		}
	});
</script>

<!-- Delete confirmation -->
{#if confirmingDelete}
	<div class="delete-confirm" transition:fade={{ duration: 160 }}>
		<p class="delete-confirm-warning">you are about to delete</p>
		<p class="delete-confirm-name">{settingsProject?.name}</p>
		<div class="delete-confirm-actions">
			<button class="delete-confirm-yes" onclick={deleteProject}>Delete</button>
			<button class="delete-confirm-no" onclick={() => confirmingDelete = false}>Cancel</button>
		</div>
	</div>
{/if}

<!-- Background -->
<div class="bg">
	<div class="bg-image"></div>
	<div class="bg-vignette"></div>
</div>

<!-- Intro text -->
<div class="page" class:dimmed={hovering || overlayOpen}>
	<p class="line line1" style="color:#fff8e0;text-shadow:0 0 4px rgba(255,255,220,0.9),0 0 14px rgba(255,200,50,0.7),0 0 32px rgba(255,120,10,0.55),0 0 70px rgba(255,60,0,0.3);"
		>
		{#each tokenize(line1) as token}
			{#if token.space}&nbsp;{:else}<span class="char" style="--ei:{token.ei}">{token.ch}</span>{/if}
		{/each}
	</p>
	<p class="line line2" style="color:{l2Color};text-shadow:{l2Shadow};cursor:pointer"
		onmouseenter={heat2} onmouseleave={cool2} onclick={() => goto('/skills')}
		role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && goto('/skills')}>
		{#each tokenize(line2, 24 + 4) as token}
			{#if token.space}&nbsp;{:else}<span class="char" style="--ei:{token.ei}">{token.ch}</span>{/if}
		{/each}
	</p>
</div>

<!-- Projects zone -->
<div class="projects-zone" class:hidden={overlayOpen}
	onmouseenter={() => hovering = true} onmouseleave={() => hovering = false}
	onclick={openProjects} role="button" tabindex="0">
	<svg class="proj-chevron" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true">
		<polyline points="0,40 60,3 120,40" fill="none" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
	</svg>
	<span class="proj-label">projects</span>
</div>

<!-- Overlay -->
{#if overlayOpen}
	<div class="overlay" transition:fade={{ duration: 180 }}>
		<button class="overlay-back" onclick={goBack}>← {backLabel}</button>

		{#if creatingProject}
			<!-- ── Wizard ── -->
			{#key wizardStep}
				{#if wizardStep === 1}
					<div class="wizard-step" in:fade={{ duration: 220, delay: 60 }}>
						<p class="wizard-label">what should we call it?</p>
						<div class="wizard-input-row">
							<!-- svelte-ignore a11y_autofocus -->
							<input class="wizard-input" bind:value={newName} placeholder="project name" autofocus
								onkeydown={(e) => { if (e.key === 'Enter' && newName.trim()) wizardStep = 2; }} />
							<button class="wizard-arrow" disabled={!newName.trim()} onclick={() => wizardStep = 2}>→</button>
						</div>
					</div>

				{:else if wizardStep === 2}
					<div class="wizard-step" in:fade={{ duration: 220, delay: 60 }}>
						<p class="wizard-label">connect your tools</p>
						<p class="wizard-sub">Enter platforms, tech stack, or MCPs</p>
						<div class="typeahead-wrap">
							<!-- svelte-ignore a11y_autofocus -->
							<input class="wizard-input" bind:this={toolInputEl} bind:value={toolQuery}
								placeholder="e.g. GitHub, SvelteKit, Stripe…" autofocus
								onfocus={() => toolDropOpen = true}
								onblur={() => setTimeout(() => toolDropOpen = false, 120)}
								oninput={() => toolDropOpen = true}
								onkeydown={handleToolKey}
							/>
							{#if toolDropOpen && filteredTools.length > 0}
								<ul class="tool-dropdown">
									{#each filteredTools as tool}
										<li><button class="tool-option" onmousedown={() => selectTool(tool.name)}>
											<span>{tool.name}</span><span class="tool-tag">{tool.tag}</span>
										</button></li>
									{/each}
								</ul>
							{/if}
						</div>
						{#if newIntegrations.length > 0}
							<div class="chip-grid" style="margin-top:1rem;">
								{#each newIntegrations as tool}
									<button class="int-chip active" onclick={() => removeTool(tool)}>{tool} ×</button>
								{/each}
							</div>
						{/if}
						{#if wizardMcpSelections.length > 0}
							<p class="mcp-note">
								{wizardMcpSelections.length} MCP{wizardMcpSelections.length > 1 ? 's' : ''} selected — connections required after creation
							</p>
						{/if}
						<button class="wizard-arrow standalone" onclick={enterStep3}>→</button>
					</div>

				{:else}
					<div class="wizard-step" in:fade={{ duration: 220, delay: 60 }}>
						<p class="wizard-label">build your skill list</p>
						{#if newSkills.length > 0}
							<div class="chip-grid">
								{#each newSkills as skill}
									<button class="skill-chip user" onclick={() => removeSkill(skill)}>{skill} ×</button>
								{/each}
							</div>
						{/if}
						{#if aiExtraSkills.length > 0}
							<p class="wizard-sub section">ai suggestions</p>
							<div class="chip-grid">
								{#each aiExtraSkills as skill}
									<button class="skill-chip ai" onclick={() => newSkills = [...newSkills, skill]}>{skill}</button>
								{/each}
							</div>
						{/if}
						<p class="wizard-sub section">add your own</p>
						<div class="wizard-input-row">
							<input class="wizard-input small" bind:value={skillInput} placeholder="e.g. rate limiting"
								onkeydown={(e) => { if (e.key === 'Enter') addSkill(); }} />
							<button class="wizard-add" onclick={addSkill}>+</button>
						</div>
						<button class="wizard-create" onclick={createProject}>create project →</button>
					</div>
				{/if}
			{/key}

		{:else if projects.length === 0}
			<!-- ── No projects ── -->
			<div class="no-projects" in:fade={{ duration: 220, delay: 60 }}>
				<p class="no-proj-line">no projects yet,</p>
				<button class="no-proj-create" onclick={openWizard}>create new</button>
			</div>

		{:else}
			<!-- ── Project list + detail ── -->
			<div class="forge-workspace">
			<div class="proj-panel-wrap">
				<div class="proj-list-inner" class:slide-out={settingsMode}>
					<div class="proj-list">
						{#each projects as project}
							<div class="proj-list-item"
								class:proj-selected={selectedProject === project.name}
								style="color:{itemColorAt(heatMap[project.id] ?? 0)};text-shadow:{itemShadowAt(heatMap[project.id] ?? 0)};"
								onmouseenter={() => heatItem(project.id)}
								onmouseleave={() => { if (selectedProject !== project.name) coolItem(project.id); }}
								onclick={() => selectProject(project)}
								role="button" tabindex="0">
								<button class="proj-gear"
									onclick={(e) => enterSettings(project, e)}
									title="settings"
									aria-label="project settings">⚙</button>
								{project.name}
							</div>
						{/each}
					</div>
					<button class="proj-add-btn" onclick={openWizard}>+ add project</button>
				</div>

				<!-- Settings nav -->
				<div class="settings-inner" class:slide-in={settingsMode}>
					<div class="proj-list">
						{#each (['general', 'platforms', 'skills'] as const) as section}
							<div class="proj-list-item"
								class:proj-selected={settingsSection === section}
								style="color:{itemColorAt(heatMap[section] ?? 0)};text-shadow:{itemShadowAt(heatMap[section] ?? 0)};"
								onmouseenter={() => heatItem(section)}
								onmouseleave={() => { if (settingsSection !== section) coolItem(section); }}
								onclick={() => { coolItem(settingsSection); settingsSection = section; heatItem(section); selectedPlatform = null; platformToken = ''; }}
								role="button" tabindex="0">{section}</div>
						{/each}
					</div>
					<button class="proj-add-btn" onclick={saveSettings}>
						{settingsSaving ? 'saving…' : 'save changes →'}
					</button>
					<button class="proj-delete-btn" onclick={() => confirmingDelete = true}>delete project</button>
				</div>
			</div>

			<!-- Project detail (carousel) -->
			{#if selectedProject !== null && !settingsMode}
				{#key selectedProject}
					<div class="proj-detail-panel proj-analysis-panel" in:fade={{ duration: 200, delay: 40 }}>

						{#if carouselLoading}
							<div class="carousel-wrap">
								<p class="carousel-status">loading…</p>
							</div>

						{:else if summaryMode && activeItem}
							<!-- Summary view -->
							<div class="carousel-wrap" in:fade={{ duration: 160 }}>
								{#if summaryLoading}
									<p class="carousel-main-title" style="font-size:1.3rem;color:var(--text-dim)">reading…</p>
								{:else}
									<p class="carousel-group" style="margin-bottom:1.5rem">{activeItem.group}</p>
									<p class="summary-text">{summaryText}</p>
									<div class="summary-dests">
										{#each activeItem.destinations as dest}
											{#if dest.url}
												<a class="summary-cta"
													href={dest.url} target="_blank" rel="noopener"
													style="color:{itemColorAt(heatMap['cta-'+dest.label]??0)};text-shadow:{itemShadowAt(heatMap['cta-'+dest.label]??0)};"
													onmouseenter={() => heatItem('cta-'+dest.label)}
													onmouseleave={() => coolItem('cta-'+dest.label)}>
													{dest.label}
												</a>
											{:else if dest.prompt}
												<button class="summary-cta"
													onclick={() => copyPrompt(dest.prompt!)}
													style="color:{itemColorAt(heatMap['cta-'+dest.label]??0)};text-shadow:{itemShadowAt(heatMap['cta-'+dest.label]??0)};"
													onmouseenter={() => heatItem('cta-'+dest.label)}
													onmouseleave={() => coolItem('cta-'+dest.label)}>
													{promptCopied ? 'copied ✓' : dest.label}
												</button>
											{/if}
										{/each}
									</div>
									<button class="carousel-back"
										onclick={() => {
											summaryMode = false;
											if (selectedProjectData) pushUrl('/forge/' + encodeURIComponent(selectedProjectData.name));
										}}
										style="color:{itemColorAt(heatMap['btn-back']??0)};text-shadow:{itemShadowAt(heatMap['btn-back']??0)};"
										onmouseenter={() => heatItem('btn-back')}
										onmouseleave={() => coolItem('btn-back')}>
										← back
									</button>
								{/if}
							</div>

						{:else if carouselItems.length === 0}
							<!-- Empty state -->
							<div class="carousel-wrap carousel-empty-wrap" in:fade={{ duration: 200 }}>
								<p class="carousel-empty-msg">Nothing needs your attention right now.</p>
								<a href="/watchtower" class="carousel-explore"
									style="color:{itemColorAt(heatMap['explore-link']??0)};text-shadow:{itemShadowAt(heatMap['explore-link']??0)};"
									onmouseenter={() => heatItem('explore-link')}
									onmouseleave={() => coolItem('explore-link')}>
									explore more in Watchtower →
								</a>
							</div>

						{:else}
							<!-- Carousel — zone-based hover -->
							{@const cur  = carouselItems[carouselIndex]}
							{@const prev = carouselIndex > 0 ? carouselItems[carouselIndex - 1] : null}
							{@const next = carouselIndex < carouselItems.length - 1 ? carouselItems[carouselIndex + 1] : null}

							<div class="carousel-zones">
								<!-- Left zone -->
								<button class="zone zone-left" disabled={!prev}
									onclick={() => carouselGo(-1)}>
									<svg class="carousel-chevron-svg carousel-chevron-left" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,40 60,3 120,40" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
								</button>

								<!-- Center zone -->
								<div class="zone zone-center">
									<div class="carousel-content">
										<div class="carousel-main-title"
											style="color:{itemColorAt(heatMap['carousel-'+cur.key]??0)};text-shadow:{itemShadowAt(heatMap['carousel-'+cur.key]??0)};">
											{cur.title}
										</div>
										<p class="carousel-group">{cur.group}</p>
										<div class="carousel-actions">
											{#each ([
												{ key: 'btn-take',     label: 'take action',  action: () => takeAction(cur) },
												{ key: 'btn-progress', label: 'in progress',  action: () => setStatus(cur.key, 'in_progress') },
												{ key: 'btn-maybe',    label: 'maybe later',  action: () => setStatus(cur.key, 'deferred') },
												{ key: 'btn-noneed',   label: 'no need',      action: () => setStatus(cur.key, 'forget') },
											]) as btn}
												<button class="carousel-btn"
													onclick={btn.action}
													style="color:{itemColorAt(heatMap[btn.key]??0)};text-shadow:{itemShadowAt(heatMap[btn.key]??0)};"
													onmouseenter={() => heatItem(btn.key)}
													onmouseleave={() => coolItem(btn.key)}>
													{btn.label}
												</button>
											{/each}
										</div>
										<p class="carousel-counter">{carouselIndex + 1} / {carouselItems.length}</p>
									</div>
								</div>

								<!-- Right zone -->
								<button class="zone zone-right" disabled={!next}
									onclick={() => carouselGo(1)}>
									<svg class="carousel-chevron-svg carousel-chevron-right" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,40 60,3 120,40" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
								</button>
							</div>
						{/if}

					</div>
				{/key}
			{/if}

			<!-- Settings content -->
			{#if settingsMode}
				<div class="proj-detail-panel proj-settings-panel" transition:fade={{ duration: 180 }}>
					{#key settingsSection}
						{#if settingsSection === 'general'}
							<div class="settings-col" in:fade={{ duration: 160, delay: 40 }}>
								<div class="wizard-input-row" style="align-self:stretch;">
									<input class="wizard-input" bind:value={settingsName}
										placeholder="project name"
										onkeydown={(e) => { if (e.key === 'Enter') saveSettings(); }} />
								</div>
							</div>

						{:else if settingsSection === 'platforms'}
							<div class="settings-col" in:fade={{ duration: 160, delay: 40 }}>
								{#each settingsTools as tool}
									<div class="platform-row"
										class:platform-selected={selectedPlatform === tool}
										onclick={() => { selectedPlatform = tool; platformToken = ''; }}
										role="button" tabindex="0">
										<span>{tool}</span>
										{#if CONNECTABLE_MCPS.has(tool)}
											<span class="conn-dot conn-dot-{settingsProject?.connections[tool] ?? 'pending'}"></span>
										{/if}
									</div>
								{/each}
								<div class="typeahead-wrap" style="margin-top:1.5rem;">
									<input class="wizard-input small" bind:value={settingsToolQuery}
										placeholder="add platform…"
										onfocus={() => settingsToolDropOpen = true}
										onblur={() => setTimeout(() => settingsToolDropOpen = false, 120)}
										oninput={() => settingsToolDropOpen = true}
										onkeydown={(e) => {
											if (e.key === 'Enter' && settingsFilteredTools.length === 1)
												settingsSelectTool(settingsFilteredTools[0].name);
										}}
									/>
									{#if settingsToolDropOpen && settingsFilteredTools.length > 0}
										<ul class="tool-dropdown">
											{#each settingsFilteredTools as tool}
												<li><button class="tool-option" onmousedown={() => settingsSelectTool(tool.name)}>
													<span>{tool.name}</span><span class="tool-tag">{tool.tag}</span>
												</button></li>
											{/each}
										</ul>
									{/if}
								</div>
							</div>

							{#if selectedPlatform}
								{@const status = settingsProject?.connections[selectedPlatform] ?? 'pending'}
								<div class="settings-col" in:fade={{ duration: 160 }}>
									<p class="platform-settings-name">{selectedPlatform}</p>

									{#if selectedPlatform === 'GitHub'}
										<span class="conn-badge conn-{status}">{status}</span>
										{#if status === 'connected'}
											{#if githubReposLoading}
												<p class="proj-status" style="margin-top:1.25rem;">loading repos…</p>
											{:else}
												{@const currentRepo = settingsProject?.repoFullName ?? null}
												{#if currentRepo}
													<p class="platform-settings-name" style="font-size:0.8rem;margin-top:1rem;opacity:0.7;">{currentRepo}</p>
												{/if}
												<div class="wizard-input-row" style="margin-top:1rem; align-self:stretch;">
													<input class="wizard-input small" bind:value={githubRepoQuery}
														placeholder="search repos…" />
												</div>
												<div class="github-repo-list">
													{#each githubRepos.filter(r => r.fullName.toLowerCase().includes(githubRepoQuery.toLowerCase())) as repo}
														<div class="github-repo-item"
															class:github-repo-selected={settingsProject?.repoFullName === repo.fullName}
															onclick={() => saveGithubRepo(repo.fullName)}
															role="button" tabindex="0">
															{repo.fullName}
															{#if repo.private}<span class="repo-private">private</span>{/if}
														</div>
													{/each}
												</div>
											{/if}
											<button class="platform-disconnect-btn"
												disabled={platformDisconnecting}
												onclick={() => disconnectPlatform(selectedPlatform!)}>
												{platformDisconnecting ? 'disconnecting…' : 'disconnect'}
											</button>
										{:else}
											<a class="platform-action-btn" style="display:inline-block;margin-top:1.25rem;"
												href="/api/connect/github?project_id={settingsProject?.id}">
												connect GitHub →
											</a>
										{/if}

									{:else if selectedPlatform === 'Claude Code'}
										<p class="platform-desc">
											Watchtower acts as an MCP server. Generate a project token and paste the config snippet into your <code>.claude/settings.json</code>.
										</p>
										<button class="platform-action-btn"
											disabled={mcpGenerating}
											onclick={generateMcpToken}>
											{mcpGenerating ? 'generating…' : mcpToken ? 'regenerate token →' : 'generate token →'}
										</button>
										{#if mcpToken}
											<div class="mcp-snippet-wrap">
												<p class="mcp-snippet-label">Add to <code>.claude/settings.json</code>:</p>
												<pre class="mcp-snippet">{JSON.stringify({
  mcpServers: {
    watchtower: {
      type: "http",
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp`,
      headers: { Authorization: `Bearer ${mcpToken}` }
    }
  }
}, null, 2)}</pre>
												<p class="mcp-snippet-note">Token shown once — copy it now.</p>
											</div>
										{/if}

									{:else if CONNECTABLE_MCPS.has(selectedPlatform)}
										<span class="conn-badge conn-{status}">{status}</span>
										<div class="wizard-input-row" style="margin-top:1.25rem; align-self:stretch;">
											<input class="wizard-input small" type="password"
												autocomplete="new-password"
												bind:value={platformToken}
												placeholder={status === 'connected' ? 'update token…' : 'paste API key or token…'}
												onkeydown={(e) => { if (e.key === 'Enter') savePlatformConnection(); }}
											/>
										</div>
										<button class="platform-action-btn"
											disabled={!platformToken.trim() || platformConnecting}
											onclick={savePlatformConnection}>
											{platformConnecting ? 'saving…' : 'save connection →'}
										</button>
										{#if status === 'connected'}
											<button class="platform-disconnect-btn"
												disabled={platformDisconnecting}
												onclick={() => disconnectPlatform(selectedPlatform!)}>
												{platformDisconnecting ? 'disconnecting…' : 'disconnect'}
											</button>
										{/if}

									{:else}
										<p class="platform-no-connect">no API connection needed</p>
									{/if}

									<button class="platform-remove-btn"
										onclick={() => { settingsRemoveTool(selectedPlatform!); selectedPlatform = null; }}>
										remove from project
									</button>
								</div>
							{/if}

						{:else if settingsSection === 'skills'}
							<div class="settings-col" in:fade={{ duration: 160, delay: 40 }}>
								{#if settingsSkills.length > 0}
									<div class="chip-grid" style="margin-bottom:1rem; max-width:20rem;">
										{#each settingsSkills as skill}
											<button class="skill-chip user"
												onclick={() => settingsSkills = settingsSkills.filter(s => s !== skill)}>
												{skill} ×
											</button>
										{/each}
									</div>
								{/if}
								<div class="wizard-input-row">
									<input class="wizard-input small" bind:value={settingsSkillInput}
										placeholder="add skill"
										onkeydown={(e) => { if (e.key === 'Enter') settingsAddSkill(); }} />
									<button class="wizard-add" onclick={settingsAddSkill}>+</button>
								</div>
							</div>
						{/if}
					{/key}
				</div>
			{/if}
			</div> <!-- /forge-workspace -->
		{/if}
	</div>
{/if}

<style>
	/* ── Background ───────────────────────────────────── */

	.bg { position: fixed; inset: 0; z-index: 0; }

	.bg-image {
		position: absolute; inset: -6%;
		background-image: url('/forge-bg-2.png');
		background-size: cover; background-position: center 40%;
		filter: blur(7px); display: none;
	}

	.bg-vignette {
		position: absolute; inset: 0;
		background: radial-gradient(
			ellipse at 50% 50%,
			transparent 15%, rgba(0,0,0,0.45) 50%,
			rgba(0,0,0,0.82) 75%, rgba(0,0,0,0.97) 100%
		);
	}

	/* ── Intro text ───────────────────────────────────── */

	.page {
		position: relative; z-index: 1;
		min-height: 100vh;
		display: flex; flex-direction: column;
		justify-content: center; align-items: center; text-align: center;
		gap: 1.25rem;
		transition: opacity 0.45s ease, transform 0.45s ease;
	}
	.page.dimmed { opacity: 0.18; transform: translateY(-2.5rem); }

	.line { display: block; cursor: default; line-height: 1.4; }
	.line1 .char { font-size: 1.5rem; letter-spacing: 0.03em; }
	.line2 .char { font-size: 0.9rem;  letter-spacing: 0.07em; }

	.char {
		display: inline-block; color: inherit;
		animation: letterEnter 0.45s ease both;
		animation-delay: calc(0.25s + var(--ei) * 0.03s);
	}
	@keyframes letterEnter { from { opacity: 0; } to { opacity: 1; } }

	/* ── Projects zone ────────────────────────────────── */

	.projects-zone {
		position: fixed; bottom: 0; left: 0; right: 0;
		height: 28vh; z-index: 2; cursor: pointer;
		display: flex; flex-direction: column;
		align-items: center; justify-content: flex-end;
		padding-bottom: 1rem; gap: 1.2rem;
		transition: opacity 0.3s ease;
	}
	.projects-zone.hidden { opacity: 0; pointer-events: none; }

	.proj-chevron {
		width: 7rem; height: auto; stroke: var(--text-dim);
		transition: stroke 0.3s ease, transform 0.45s ease;
	}
	.projects-zone:hover .proj-chevron { stroke: var(--text-muted); transform: translateY(-1.4rem); }

	.proj-label {
		font-family: var(--font-mono); font-size: 0.6rem;
		letter-spacing: 0.18em; text-transform: uppercase;
		color: var(--text-dim);
		transition: color 0.3s ease, transform 0.45s ease;
	}
	.projects-zone:hover .proj-label { color: var(--text-muted); transform: translateY(-0.7rem); }

	/* ── Overlay ──────────────────────────────────────── */

	.overlay {
		position: fixed; inset: 0; z-index: 10;
		background: rgba(10, 10, 10, 0.97);
		display: flex; align-items: center; justify-content: center;
	}

	.overlay-back {
		position: absolute;
		top: calc(var(--nav-height) + 1.25rem);
		left: calc(var(--page-mx) + var(--forge-nav-col));
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: var(--text-dim); cursor: pointer; padding: 0;
		transition: color 0.15s ease; z-index: 2;
	}
	.overlay-back:hover { color: var(--text-muted); }

	/* ── No projects ──────────────────────────────────── */

	.no-projects { display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem; }

	.no-proj-line {
		font-family: var(--font-mono); font-size: 1rem;
		color: var(--text-dim); letter-spacing: 0.04em;
	}
	.no-proj-create {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 1rem;
		color: var(--text-muted); letter-spacing: 0.04em;
		cursor: pointer; padding: 0;
		transition: color 0.15s ease;
	}
	.no-proj-create:hover { color: var(--text-primary); }

	/* ── Forge workspace grid ──────────────────────────── */

	.forge-workspace {
		position: absolute;
		top: var(--nav-height);
		left: var(--page-mx);
		right: var(--page-mx);
		bottom: 0;
		display: grid;
		grid-template-columns: var(--forge-nav-col) 1fr var(--forge-right-col);
		border-top:   1px solid var(--grid-line-blue);
		border-left:  1px solid var(--grid-line-red);
		border-right: 1px solid var(--grid-line-red);
	}

	.forge-workspace::after {
		content: '';
		position: absolute;
		top: 0; bottom: 0;
		right: var(--forge-right-col);
		border-right: 1px solid var(--grid-line-blue);
		pointer-events: none;
	}

	/* ── Project panel wrap (slide container) ─────────── */

	.proj-panel-wrap {
		position: relative;
		overflow: hidden;
	}

	.proj-panel-wrap::after {
		content: '';
		position: absolute;
		top: 0; bottom: 0; right: 0;
		width: 1px;
		background: linear-gradient(
			to bottom,
			transparent 0%,
			rgba(255, 255, 255, 0.10) 18%,
			rgba(255, 255, 255, 0.10) 82%,
			transparent 100%
		);
		pointer-events: none;
		z-index: 1;
	}

	.proj-list-inner {
		position: absolute; inset: 0;
		display: flex; flex-direction: column; justify-content: center;
		padding-left: 2.5rem; padding-bottom: 3rem;
		transform: translateX(0);
		transition: transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.proj-list-inner.slide-out { transform: translateX(-100%); }

	.settings-inner {
		position: absolute; inset: 0;
		display: flex; flex-direction: column; justify-content: center;
		padding-left: 2.5rem; padding-bottom: 3rem;
		transform: translateX(100%);
		transition: transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.settings-inner.slide-in { transform: translateX(0); }

	/* ── Project list items ───────────────────────────── */

	.proj-list { display: flex; flex-direction: column; gap: 0.25rem; }

	.proj-list-item {
		position: relative;
		font-family: var(--font-mono); font-size: 1.1rem;
		letter-spacing: 0.04em;
		padding: 0.55rem 0;
		cursor: pointer;
		user-select: none;
	}

	.proj-gear {
		position: absolute;
		left: -2.2rem; top: 50%; transform: translateY(-50%);
		background: transparent; border: none;
		font-size: 1rem; color: var(--text-dim);
		cursor: pointer; padding: 0.4rem 0.5rem;
		opacity: 0;
		transition: opacity 0.15s ease, color 0.15s ease;
		line-height: 1;
	}
	.proj-list-item:hover .proj-gear,
	.proj-list-item.proj-selected .proj-gear { opacity: 1; }
	.proj-gear:hover {
		color: rgba(255,255,255,0.85) !important;
		text-shadow:
			0 0 5px rgba(255,255,255,0.7),
			0 0 18px rgba(255,255,255,0.4),
			0 0 36px rgba(255,255,255,0.2);
	}

	.proj-add-btn {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 0.78rem;
		letter-spacing: 0.08em; color: var(--text-dim);
		cursor: pointer; padding: 0; margin-top: 2rem; text-align: left;
		transition: color 0.15s ease;
	}
	.proj-add-btn:hover { color: var(--text-muted); }

	.proj-delete-btn {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 0.78rem;
		letter-spacing: 0.08em; color: rgba(220,80,60,0.45);
		cursor: pointer; padding: 0; margin-top: 0.75rem; text-align: left;
		transition: color 0.15s ease;
	}
	.proj-delete-btn:hover { color: rgba(220,80,60,0.85); }

	/* ── Project detail ───────────────────────────────── */

	.proj-detail-panel {
		display: flex; flex-direction: column;
		justify-content: center; align-items: center;
		padding-bottom: 3rem;
	}

	.proj-settings-panel {
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		padding-left: 3rem;
		gap: 4rem;
	}

	/* ── Carousel ────────────────────────────────────────── */

	.carousel-wrap {
		display: flex; flex-direction: column;
		align-items: center; gap: 0;
		width: 100%;
	}

	.carousel-status {
		font-family: var(--font-mono); font-size: 0.78rem;
		letter-spacing: 0.08em; color: var(--text-dim);
	}

	.carousel-zones {
		display: flex;
		align-items: stretch;
		width: 100%; height: 100%;
	}

	.zone {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.zone-left, .zone-right {
		flex: 0 0 7rem;
		background: none; border: none;
		cursor: pointer;
		transition: background 0.2s;
	}
	.zone-left:disabled, .zone-right:disabled { cursor: default; }

	.zone-center {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: default;
		overflow: hidden;
		padding: 0 3rem;
	}

	.zone-center::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at 50% 50%,
			rgba(255, 255, 255, 0.10) 0%,
			rgba(245, 248, 255, 0.06) 30%,
			rgba(230, 235, 255, 0.02) 58%,
			transparent 78%
		);
		opacity: 0.35;
		transition: opacity 0.7s ease;
		pointer-events: none;
	}
	.zone-center:hover::before { opacity: 1; }

	.carousel-content {
		position: relative; z-index: 1;
		display: flex; flex-direction: column;
		align-items: center; gap: 0;
		transition: transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1);
	}
	.zone-center:hover .carousel-content {
		transform: scale(1.05);
	}

	.carousel-main-title {
		font-family: var(--font-mono); font-size: 1.9rem;
		letter-spacing: 0.03em; font-weight: 300;
		text-align: center; line-height: 1.2;
		transition: color 0.05s linear;
	}

	.carousel-group {
		font-family: var(--font-mono); font-size: 0.62rem;
		letter-spacing: 0.14em; text-transform: uppercase;
		color: var(--text-dim); text-align: center;
		margin: 0.75rem 0 0;
	}

	.carousel-chevron-svg {
		width: 4rem; height: auto;
		stroke: var(--text-muted); stroke-width: 1.2;
		fill: none; stroke-linecap: round; stroke-linejoin: round;
		opacity: 0;
		transition: opacity 0.2s ease, transform 0.25s ease, stroke 0.2s ease;
	}
	.carousel-chevron-left  { transform: rotate(-90deg); }
	.carousel-chevron-right { transform: rotate(90deg); }

	.zone-left:not(:disabled)  .carousel-chevron-svg,
	.zone-right:not(:disabled) .carousel-chevron-svg { opacity: 0.55; }

	.zone-left:not(:disabled):hover  .carousel-chevron-svg,
	.zone-right:not(:disabled):hover .carousel-chevron-svg {
		opacity: 0.85;
		stroke: var(--text-primary);
	}
	.zone-left:not(:disabled):hover  .carousel-chevron-left  { transform: rotate(-90deg) scale(1.15); }
	.zone-right:not(:disabled):hover .carousel-chevron-right { transform: rotate(90deg)  scale(1.15); }

	.carousel-counter {
		font-family: var(--font-mono); font-size: 0.6rem;
		letter-spacing: 0.1em; color: var(--text-dim);
		opacity: 0.4; margin-top: 1.25rem;
	}

	.carousel-actions {
		display: flex; gap: 2.5rem;
		overflow: hidden;
		max-height: 0;
		margin-top: 0;
		opacity: 0;
		pointer-events: none;
		transition: max-height 0.3s ease, opacity 0.25s ease, margin-top 0.3s ease;
	}
	.zone-center:hover .carousel-actions {
		max-height: 4rem;
		margin-top: 2.5rem;
		opacity: 1;
		pointer-events: auto;
	}

	.carousel-btn {
		background: none; border: none; cursor: pointer;
		font-family: var(--font-mono); font-size: 0.82rem;
		letter-spacing: 0.06em;
		padding: 0; color: var(--text-dim);
		transition: color 0.05s linear;
	}

	/* ── Empty state ──────────────────────────────────── */
	.carousel-empty-wrap { gap: 1rem; }

	.carousel-empty-msg {
		font-family: var(--font-mono); font-size: 1rem;
		letter-spacing: 0.04em; color: var(--text-dim); margin: 0;
	}

	.carousel-explore {
		font-family: var(--font-mono); font-size: 0.78rem;
		letter-spacing: 0.06em; text-decoration: none;
		color: var(--text-dim);
		transition: color 0.05s linear;
	}

	/* ── Summary view ─────────────────────────────────── */
	.summary-text {
		font-family: var(--font-mono); font-size: 0.95rem;
		letter-spacing: 0.02em; line-height: 1.75;
		color: var(--text-muted); max-width: 30rem;
		text-align: center; margin: 0 0 2rem;
	}

	.summary-dests {
		display: flex; gap: 2rem; align-items: center;
		flex-wrap: wrap; justify-content: center;
		margin-bottom: 2rem;
	}

	.summary-cta {
		font-family: var(--font-mono); font-size: 0.85rem;
		letter-spacing: 0.06em; color: var(--text-dim);
		text-decoration: none; background: none; border: none;
		cursor: pointer; padding: 0; transition: color 0.05s linear;
	}

	.carousel-back {
		font-family: var(--font-mono); font-size: 0.78rem;
		letter-spacing: 0.06em; background: none; border: none;
		cursor: pointer; padding: 0; color: var(--text-dim);
		transition: color 0.05s linear; margin-top: 1.5rem;
	}

	/* ── Settings panel ───────────────────────────────── */

	.settings-col {
		flex: 0 0 18rem; min-width: 0;
		display: flex; flex-direction: column;
	}

	.platform-row {
		display: flex; align-items: center; justify-content: space-between;
		font-family: var(--font-mono); font-size: 0.85rem;
		letter-spacing: 0.04em; color: var(--text-dim);
		padding: 0.55rem 0; cursor: pointer;
		transition: color 0.15s ease; user-select: none;
	}
	.platform-row:hover { color: var(--text-muted); }
	.platform-row.platform-selected {
		color: #ffb300;
		text-shadow: 0 0 6px rgba(255,179,0,0.7), 0 0 22px rgba(255,150,0,0.45), 0 0 44px rgba(255,120,0,0.25);
	}

	.conn-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
	.conn-dot-connected { background: rgba(100,220,100,0.7); }
	.conn-dot-pending   { background: rgba(255,140,50,0.45); }

	.conn-badge {
		font-size: 0.58rem; letter-spacing: 0.1em;
		text-transform: uppercase; padding: 0.1rem 0.4rem;
	}
	.conn-pending   { color: rgba(255,140,50,0.7);  background: rgba(255,100,0,0.08); }
	.conn-connected { color: rgba(100,220,100,0.7); background: rgba(50,200,50,0.08); }

	.platform-settings-name {
		font-family: var(--font-mono); font-size: 1rem;
		letter-spacing: 0.04em; color: var(--text-muted); margin: 0 0 0.4rem;
	}

	.platform-action-btn {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 0.78rem;
		letter-spacing: 0.08em; color: var(--text-dim);
		cursor: pointer; padding: 0; margin-top: 0.5rem; text-align: left;
		text-decoration: none; display: inline-block;
		transition: color 0.15s ease;
	}
	.platform-action-btn:not(:disabled):hover { color: var(--text-muted); }
	.platform-action-btn:disabled { cursor: default; }

	.platform-disconnect-btn {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 0.72rem;
		letter-spacing: 0.08em; color: rgba(220,80,60,0.4);
		cursor: pointer; padding: 0; text-align: left;
		transition: color 0.15s ease;
	}
	.platform-disconnect-btn:not(:disabled):hover { color: rgba(220,80,60,0.85); }

	.platform-remove-btn {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 0.68rem;
		letter-spacing: 0.08em; color: rgba(255,255,255,0.15);
		cursor: pointer; padding: 0; margin-top: auto; text-align: left;
		transition: color 0.15s ease;
	}
	.platform-remove-btn:hover { color: rgba(255,255,255,0.35); }

	.platform-desc {
		font-family: var(--font-mono); font-size: 0.75rem;
		letter-spacing: 0.04em; color: var(--text-dim);
		line-height: 1.55; margin: 0 0 0.5rem; max-width: 26rem;
	}
	.platform-desc code { color: var(--text-muted); font-family: var(--font-mono); }

	.platform-no-connect {
		font-family: var(--font-mono); font-size: 0.78rem;
		letter-spacing: 0.05em; color: var(--text-dim); margin: 0;
	}

	.proj-status {
		font-family: var(--font-mono); font-size: 0.72rem;
		letter-spacing: 0.06em; color: var(--text-dim); margin: 0; opacity: 0.5;
	}

	.github-repo-list {
		display: flex; flex-direction: column; gap: 0.1rem;
		margin-top: 0.75rem; max-height: 14rem; overflow-y: auto;
	}
	.github-repo-item {
		font-family: var(--font-mono); font-size: 0.78rem;
		letter-spacing: 0.03em; color: var(--text-dim);
		padding: 0.35rem 0; cursor: pointer;
		transition: color 0.15s ease;
		display: flex; align-items: center; gap: 0.5rem;
	}
	.github-repo-item:hover { color: var(--text-muted); }
	.github-repo-item.github-repo-selected { color: #ffb300; }
	.repo-private {
		font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase;
		color: var(--text-dim); border: 1px solid rgba(255,255,255,0.1);
		padding: 0.1rem 0.3rem; border-radius: 2px;
	}

	.mcp-snippet-wrap { margin-top: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem; }
	.mcp-snippet-label {
		font-family: var(--font-mono); font-size: 0.7rem;
		letter-spacing: 0.06em; color: var(--text-dim); margin: 0;
	}
	.mcp-snippet-label code { color: var(--text-muted); font-family: var(--font-mono); }
	.mcp-snippet {
		font-family: var(--font-mono); font-size: 0.68rem; line-height: 1.5;
		color: var(--text-muted); background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08); border-radius: 4px;
		padding: 0.75rem; margin: 0; white-space: pre; overflow-x: auto; max-width: 30rem;
	}
	.mcp-snippet-note {
		font-family: var(--font-mono); font-size: 0.66rem;
		letter-spacing: 0.05em; color: var(--text-dim); margin: 0; opacity: 0.7;
	}

	/* ── Wizard ───────────────────────────────────────── */

	.wizard-step {
		display: flex; flex-direction: column;
		align-items: flex-start; gap: 0.75rem;
		max-width: 24rem;
	}

	.wizard-label {
		font-family: var(--font-mono); font-size: 1rem;
		color: var(--text-muted); letter-spacing: 0.04em; margin: 0;
	}

	.wizard-sub {
		font-family: var(--font-mono); font-size: 0.72rem;
		color: var(--text-dim); letter-spacing: 0.08em; margin: 0;
	}
	.wizard-sub.section { margin-top: 0.75rem; }

	.typeahead-wrap { position: relative; align-self: stretch; }

	.tool-dropdown {
		position: absolute; top: calc(100% + 0.4rem); left: 0; right: 0;
		background: #161616; border: 1px solid rgba(255,255,255,0.08);
		list-style: none; padding: 0.25rem 0; margin: 0; z-index: 20;
	}

	.tool-option {
		width: 100%; display: flex; align-items: center; justify-content: space-between;
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 0.82rem;
		color: var(--text-muted); padding: 0.45rem 0.85rem;
		cursor: pointer; text-align: left;
		transition: background 0.1s ease, color 0.1s ease;
	}
	.tool-option:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }

	.tool-tag {
		font-size: 0.62rem; letter-spacing: 0.1em;
		color: var(--text-dim); text-transform: uppercase;
	}

	.wizard-input-row { display: flex; align-items: center; gap: 1rem; align-self: stretch; }

	.wizard-input {
		flex: 1; background: transparent; border: none;
		border-bottom: 1px solid rgba(255,255,255,0.12);
		font-family: var(--font-mono); font-size: 1rem;
		color: var(--text-primary); padding: 0.4rem 0; outline: none;
		letter-spacing: 0.04em; transition: border-color 0.2s ease;
	}
	.wizard-input:focus { border-bottom-color: #ffb300; }
	.wizard-input::placeholder { color: var(--text-dim); }
	.wizard-input.small { font-size: 0.82rem; }

	.wizard-arrow {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 1.1rem;
		color: var(--text-muted); cursor: pointer; padding: 0;
		transition: color 0.15s ease;
	}
	.wizard-arrow:not(:disabled):hover { color: var(--text-primary); }
	.wizard-arrow:disabled { opacity: 0.3; cursor: default; }
	.wizard-arrow.standalone { align-self: flex-end; margin-top: 0.5rem; }

	.wizard-add {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 1rem;
		color: var(--text-dim); cursor: pointer; padding: 0; flex-shrink: 0;
		transition: color 0.15s ease;
	}
	.wizard-add:hover { color: var(--text-muted); }

	.wizard-create {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 0.9rem;
		letter-spacing: 0.06em; color: var(--text-muted);
		cursor: pointer; padding: 0; margin-top: 1.25rem;
		transition: color 0.15s ease;
	}
	.wizard-create:hover { color: var(--text-primary); }

	/* ── Chips ────────────────────────────────────────── */

	.chip-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }

	.int-chip {
		font-family: var(--font-mono); font-size: 0.78rem; letter-spacing: 0.05em;
		padding: 0.3rem 0.65rem; background: transparent; cursor: pointer;
		transition: border-color 0.15s ease;
	}
	.int-chip.active {
		border: 1px solid rgba(255,255,255,0.25); color: var(--text-muted);
	}
	.int-chip.active:hover { border-color: rgba(255,255,255,0.45); }

	.skill-chip { font-family: var(--font-mono); font-size: 0.78rem; letter-spacing: 0.05em; padding: 0.3rem 0.65rem; }
	.skill-chip.user {
		background: transparent; border: 1px solid rgba(255,255,255,0.12);
		color: var(--text-muted); cursor: pointer; transition: border-color 0.15s ease;
	}
	.skill-chip.user:hover { border-color: rgba(255,255,255,0.25); }
	.skill-chip.ai {
		background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
		color: var(--text-dim); cursor: pointer; transition: background 0.15s ease;
	}
	.skill-chip.ai:hover { background: rgba(255,255,255,0.08); color: var(--text-muted); }

	.mcp-note {
		font-family: var(--font-mono); font-size: 0.66rem;
		letter-spacing: 0.08em; color: var(--text-dim); margin: 0;
		opacity: 0.7;
	}

	/* ── Delete confirmation ─────────────────────────── */
	.delete-confirm {
		position: fixed; inset: 0; z-index: 200; background: #0a0a0a;
		display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.5rem;
	}
	.delete-confirm-warning {
		font-family: var(--font-mono); font-size: 0.88rem;
		letter-spacing: 0.08em; margin: 0; color: rgb(220,70,50);
		text-shadow: 0 0 6px rgba(220,60,40,0.7), 0 0 22px rgba(200,40,20,0.5), 0 0 44px rgba(180,30,10,0.3);
	}
	.delete-confirm-name {
		font-family: var(--font-mono); font-size: 1.5rem; letter-spacing: 0.04em;
		color: var(--text-primary); margin: 0;
	}
	.delete-confirm-actions { display: flex; align-items: center; gap: 3rem; }
	.delete-confirm-yes {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 0.92rem; letter-spacing: 0.08em;
		cursor: pointer; padding: 0; color: rgb(220,70,50);
		text-shadow: 0 0 6px rgba(220,60,40,0.7), 0 0 22px rgba(200,40,20,0.5), 0 0 44px rgba(180,30,10,0.3);
		transition: text-shadow 0.2s ease, color 0.2s ease;
	}
	.delete-confirm-yes:hover {
		color: rgb(255,100,80);
		text-shadow: 0 0 8px rgba(255,80,60,1), 0 0 28px rgba(220,50,30,0.8), 0 0 55px rgba(200,30,10,0.5);
	}
	.delete-confirm-no {
		background: transparent; border: none;
		font-family: var(--font-mono); font-size: 0.92rem; letter-spacing: 0.08em;
		cursor: pointer; padding: 0; color: rgba(255,255,255,0.85);
		text-shadow: 0 0 6px rgba(255,255,255,0.6), 0 0 22px rgba(255,255,255,0.35), 0 0 44px rgba(255,255,255,0.15);
		transition: text-shadow 0.2s ease, color 0.2s ease;
	}
	.delete-confirm-no:hover {
		color: #ffffff;
		text-shadow: 0 0 8px rgba(255,255,255,1), 0 0 28px rgba(255,255,255,0.7), 0 0 55px rgba(255,255,255,0.4);
	}
</style>
