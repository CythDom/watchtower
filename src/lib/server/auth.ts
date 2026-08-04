import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from './db/schema';
import { SECRET, BETTER_AUTH_URL } from '$env/static/private';

export const auth = betterAuth({
	baseURL: BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		schema: {
			user:         schema.user,
			session:      schema.session,
			account:      schema.account,
			verification: schema.verification
		}
	}),
	secret: SECRET,
	emailAndPassword: {
		enabled: true
	}
});
