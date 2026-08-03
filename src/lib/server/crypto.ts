import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { SECRET } from '$env/static/private';

function key(): Buffer {
	return createHash('sha256').update(SECRET).digest();
}

export function encrypt(plaintext: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key(), iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(data: string): string {
	const buf = Buffer.from(data, 'base64');
	const iv  = buf.subarray(0, 12);
	const tag = buf.subarray(12, 28);
	const enc = buf.subarray(28);
	const decipher = createDecipheriv('aes-256-gcm', key(), iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
