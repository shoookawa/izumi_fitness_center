import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// ダミーデータ
const DUMMY_DATA = [
	// ホーム画像
	{
		trainer_name: 'Izumi',
		photo_url: '/home.jpg',
		audio_url: '',
		audio_type: 'home',
		count_number: null
	},
	// 開始音声
	{
		trainer_name: 'Izumi',
		photo_url: '/start.jpg',
		audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // ダミー音声URL
		audio_type: 'start',
		count_number: null
	},
	// 半分音声
	{
		trainer_name: 'Izumi',
		photo_url: 'https://via.placeholder.com/400x400/0ea5e9/ffffff?text=Izumi',
		audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
		audio_type: 'half',
		count_number: null
	},
	// 残り5回音声
	{
		trainer_name: 'Izumi',
		photo_url: 'https://via.placeholder.com/400x400/0ea5e9/ffffff?text=Izumi',
		audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
		audio_type: 'last5',
		count_number: null
	},
	// 完了音声
	{
		trainer_name: 'Izumi',
		photo_url: '/finish.jpg',
		audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
		audio_type: 'finish',
		count_number: null
	},
	// リタイア音声
	{
		trainer_name: 'Izumi',
		photo_url: 'https://via.placeholder.com/400x400/0ea5e9/ffffff?text=Izumi',
		audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
		audio_type: 'retire',
		count_number: null
	}
];

// カウント音声（1-30）
for (let i = 1; i <= 30; i++) {
	const padded = String(i).padStart(2, '0');
	DUMMY_DATA.push({
		trainer_name: 'Izumi',
		photo_url: `/count_photo/count_${padded}.jpg`,
		audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
		audio_type: 'count',
		count_number: i
	});
}

async function seed() {
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

		// 既存データをクリア
		await client.query('DELETE FROM trainer_assets WHERE trainer_name = $1', ['Izumi']);
		console.log('Cleared existing data');

		// ダミーデータを挿入
		for (const data of DUMMY_DATA) {
			await client.query(
				`INSERT INTO trainer_assets (trainer_name, photo_url, audio_url, audio_type, count_number)
				 VALUES ($1, $2, $3, $4, $5)`,
				[data.trainer_name, data.photo_url, data.audio_url, data.audio_type, data.count_number]
			);
		}

		console.log(`Inserted ${DUMMY_DATA.length} records`);
		console.log('Seed completed successfully');

	} catch (error) {
		console.error('Seed error:', error);
	} finally {
		await client.end();
	}
}

seed();
