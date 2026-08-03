declare global {
	namespace App {
		interface Locals {
			session: Awaited<ReturnType<typeof import('$lib/server/auth').auth.api.getSession>>;
		}
	}
}

export {};
