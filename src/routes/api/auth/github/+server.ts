import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GITHUB_CLIENT_ID } from '$env/static/private';
import { auth } from '$lib/server/auth';

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) redirect(302, '/login');

	const projectId = url.searchParams.get('project_id');
	if (!projectId) redirect(302, '/forge');

	const params = new URLSearchParams({
		client_id:    GITHUB_CLIENT_ID,
		redirect_uri: `${url.origin}/api/auth/github/callback`,
		scope:        'repo read:user',
		state:        projectId,
	});

	redirect(302, `https://github.com/login/oauth/authorize?${params}`);
};
