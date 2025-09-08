import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const R2_BASE_URL = 'https://pub-fa5e655402aa46b2a81a64279ceaa631.r2.dev/';

async function updateR2Urls() {
	const client = new Client({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT || 5432),
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		ssl: false
	});

	try {
		await client.connect();
		console.log('Connected to database');

		// ホーム画像を更新
		await client.query(
			`UPDATE trainer_assets 
			 SET photo_url = $1 
			 WHERE audio_type = 'home' AND trainer_name = 'Izumi'`,
			[`${R2_BASE_URL}home.jpg`]
		);
		console.log('Updated home image URL');

		// カウント画像を更新（1-30）
		for (let i = 1; i <= 30; i++) {
			const padded = String(i).padStart(2, '0');
			await client.query(
				`UPDATE trainer_assets 
				 SET photo_url = $1 
				 WHERE audio_type = 'count' AND count_number = $2 AND trainer_name = 'Izumi'`,
				[`${R2_BASE_URL}count_${padded}.jpg`, i]
			);
		}
		console.log('Updated count image URLs (1-30)');

		// 音声URLも更新
		await client.query(
			`UPDATE trainer_assets 
			 SET audio_url = $1 
			 WHERE audio_type = 'start' AND trainer_name = 'Izumi'`,
			[`${R2_BASE_URL}start.m4a`]
		);

		await client.query(
			`UPDATE trainer_assets 
			 SET audio_url = $1 
			 WHERE audio_type = 'half' AND trainer_name = 'Izumi'`,
			[`${R2_BASE_URL}half.m4a`]
		);

		await client.query(
			`UPDATE trainer_assets 
			 SET audio_url = $1 
			 WHERE audio_type = 'last5' AND trainer_name = 'Izumi'`,
			[`${R2_BASE_URL}last5.m4a`]
		);

		await client.query(
			`UPDATE trainer_assets 
			 SET audio_url = $1 
			 WHERE audio_type = 'finish' AND trainer_name = 'Izumi'`,
			[`${R2_BASE_URL}finish.m4a`]
		);

		await client.query(
			`UPDATE trainer_assets 
			 SET audio_url = $1 
			 WHERE audio_type = 'retire' AND trainer_name = 'Izumi'`,
			[`${R2_BASE_URL}retire.m4a`]
		);

		// カウント音声を更新（1-30）
		for (let i = 1; i <= 30; i++) {
			const padded = String(i).padStart(2, '0');
			await client.query(
				`UPDATE trainer_assets 
				 SET audio_url = $1 
				 WHERE audio_type = 'count' AND count_number = $2 AND trainer_name = 'Izumi'`,
				[`${R2_BASE_URL}count_${padded}.m4a`, i]
			);
		}
		console.log('Updated audio URLs');

		console.log('R2 URLs update completed successfully');

	} catch (error) {
		console.error('Update error:', error);
	} finally {
		await client.end();
	}
}

updateR2Urls();
