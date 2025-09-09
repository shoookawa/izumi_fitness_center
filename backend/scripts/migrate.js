import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function run() {
	const dir = path.resolve(process.cwd(), 'migrations');
	const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
	const client = new Client({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT || 5432),
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		ssl: false
	});
	
	await client.connect();
	
	for (const f of files) {
		const sql = fs.readFileSync(path.join(dir, f), 'utf8');
		console.log('Applying', f);
		await client.query(sql);
	}
	
	await client.end();
	console.log('Migrations complete');
}

run().catch((e) => { console.error(e); process.exit(1); });