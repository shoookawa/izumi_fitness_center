import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
	const dir = path.resolve(process.cwd(), 'backend/migrations');
	const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
	const conn = await mysql.createConnection({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT || 3306),
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		ssl: { rejectUnauthorized: true }
	});
	for (const f of files) {
		const sql = fs.readFileSync(path.join(dir, f), 'utf8');
		console.log('Applying', f);
		await conn.query(sql);
	}
	await conn.end();
	console.log('Migrations complete');
}

run().catch((e) => { console.error(e); process.exit(1); }); 