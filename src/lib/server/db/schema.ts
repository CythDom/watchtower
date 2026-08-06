import { sql } from 'drizzle-orm';
import { text, integer, boolean, timestamp, pgTable, primaryKey } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id:            text('id').primaryKey(),
	name:          text('name').notNull(),
	email:         text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image:         text('image'),
	createdAt:     timestamp('created_at').notNull().default(sql`now()`),
	updatedAt:     timestamp('updated_at').notNull().default(sql`now()`)
});

export const session = pgTable('session', {
	id:        text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token:     text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

export const account = pgTable('account', {
	id:                    text('id').primaryKey(),
	accountId:             text('account_id').notNull(),
	providerId:            text('provider_id').notNull(),
	userId:                text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	accessToken:           text('access_token'),
	refreshToken:          text('refresh_token'),
	idToken:               text('id_token'),
	accessTokenExpiresAt:  timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope:                 text('scope'),
	password:              text('password'),
	createdAt:             timestamp('created_at').notNull().default(sql`now()`),
	updatedAt:             timestamp('updated_at').notNull().default(sql`now()`)
});

export const verification = pgTable('verification', {
	id:         text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value:      text('value').notNull(),
	expiresAt:  timestamp('expires_at').notNull(),
	createdAt:  timestamp('created_at').default(sql`now()`),
	updatedAt:  timestamp('updated_at').default(sql`now()`)
});

export const scrapeQuota = pgTable('scrape_quota', {
	userId:        text('user_id').primaryKey().references(() => user.id),
	lastScrapedAt: timestamp('last_scraped_at').notNull(),
});

export const projects = pgTable('projects', {
	id:           text('id').primaryKey(),
	userId:       text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	name:         text('name').notNull(),
	integrations: text('integrations').notNull().default('[]'),
	skills:       text('skills').notNull().default('[]'),
	connections:  text('connections').notNull().default('{}'),
	repoFullName: text('repo_full_name'),
	createdAt:    timestamp('created_at').notNull().default(sql`now()`),
});

export const credentials = pgTable('credentials', {
	id:             text('id').primaryKey(),
	projectId:      text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	userId:         text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	tool:           text('tool').notNull(),
	encryptedToken: text('encrypted_token').notNull(),
	createdAt:      timestamp('created_at').notNull().default(sql`now()`),
});

export const mcpTokens = pgTable('mcp_tokens', {
	token:     text('token').primaryKey(),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
});

export const itemStatus = pgTable('item_status', {
	projectId:     text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	itemKey:       text('item_key').notNull(),
	status:        text('status').notNull(),
	deferredUntil: timestamp('deferred_until'),
	updatedAt:     timestamp('updated_at').notNull().default(sql`now()`),
}, (t) => [primaryKey({ columns: [t.projectId, t.itemKey] })]);

export const activityLog = pgTable('activity_log', {
	id:        text('id').primaryKey(),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	type:      text('type').notNull().default('info'),
	message:   text('message').notNull(),
	source:    text('source').notNull().default('claude'),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
});

export const finds = pgTable('finds', {
	id:        text('id').primaryKey(),
	title:     text('title').notNull(),
	url:       text('url').notNull(),
	source:    text('source').notNull(),
	topic:     text('topic').notNull().default(''),
	relevance: integer('relevance').notNull().default(0),
	points:    integer('points').notNull().default(0),
	scrapedAt: timestamp('scraped_at').notNull().default(sql`now()`),
});

export const userTags = pgTable('user_tags', {
	id:        text('id').primaryKey(),
	userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	tag:       text('tag').notNull(),
	source:    text('source').notNull().default('standalone'),
	rating:    integer('rating').notNull().default(3),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
});

export const userSkills = pgTable('user_skills', {
	id:        text('id').primaryKey(),
	userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	skill:     text('skill').notNull(),
	level:     integer('level').notNull().default(0),
	source:    text('source').notNull().default('onboarding'),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
});
