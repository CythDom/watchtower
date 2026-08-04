import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, primaryKey } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id:            text('id').primaryKey(),
	name:          text('name').notNull(),
	email:         text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	image:         text('image'),
	createdAt:     integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
	updatedAt:     integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const session = sqliteTable('session', {
	id:        text('id').primaryKey(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	token:     text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const account = sqliteTable('account', {
	id:                   text('id').primaryKey(),
	accountId:            text('account_id').notNull(),
	providerId:           text('provider_id').notNull(),
	userId:               text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	accessToken:          text('access_token'),
	refreshToken:         text('refresh_token'),
	idToken:              text('id_token'),
	accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
	refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
	scope:                text('scope'),
	password:             text('password'),
	createdAt:            integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
	updatedAt:            integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const verification = sqliteTable('verification', {
	id:         text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value:      text('value').notNull(),
	expiresAt:  integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt:  integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt:  integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});

export const scrapeQuota = sqliteTable('scrape_quota', {
	userId:        text('user_id').primaryKey().references(() => user.id),
	lastScrapedAt: integer('last_scraped_at', { mode: 'timestamp' }).notNull(),
});

export const projects = sqliteTable('projects', {
	id:            text('id').primaryKey(),
	userId:        text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	name:          text('name').notNull(),
	integrations:  text('integrations').notNull().default('[]'),
	skills:        text('skills').notNull().default('[]'),
	connections:   text('connections').notNull().default('{}'),
	repoFullName:  text('repo_full_name'),
	createdAt:     integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const credentials = sqliteTable('credentials', {
	id:             text('id').primaryKey(),
	projectId:      text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	userId:         text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	tool:           text('tool').notNull(),
	encryptedToken: text('encrypted_token').notNull(),
	createdAt:      integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const mcpTokens = sqliteTable('mcp_tokens', {
	token:     text('token').primaryKey(),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const itemStatus = sqliteTable('item_status', {
	projectId:    text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	itemKey:      text('item_key').notNull(),
	status:       text('status').notNull(),
	deferredUntil: integer('deferred_until', { mode: 'timestamp' }),
	updatedAt:    integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => [primaryKey({ columns: [t.projectId, t.itemKey] })]);

export const activityLog = sqliteTable('activity_log', {
	id:        text('id').primaryKey(),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	type:      text('type').notNull().default('info'),
	message:   text('message').notNull(),
	source:    text('source').notNull().default('claude'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const finds = sqliteTable('finds', {
	id:        text('id').primaryKey(),
	title:     text('title').notNull(),
	url:       text('url').notNull(),
	source:    text('source').notNull(),
	topic:     text('topic').notNull().default(''),
	relevance: integer('relevance').notNull().default(0),
	points:    integer('points').notNull().default(0),
	scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
