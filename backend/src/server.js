import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
	origin: function(origin, callback) {
		// 開発環境では全てのオリジンを許可
		if (process.env.NODE_ENV !== 'production') {
			return callback(null, true);
		}
		if (!origin) return callback(null, true);
		if (allowedOrigins.includes(origin)) return callback(null, true);
		return callback(new Error('Not allowed by CORS'));
	}
}));

app.get('/health', (req, res) => res.json({ ok: true }));

const pool = new Pool({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT || 5432),
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	max: Number(process.env.DB_POOL_LIMIT || 10),
	ssl: false
});

app.get('/trainer-assets', async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT trainer_name, photo_url, audio_url, audio_type, count_number
			 FROM trainer_assets
			 WHERE trainer_name = $1
			 ORDER BY audio_type, count_number`,
			['Izumi']
		);

		const rows = result.rows;
		if (!rows || rows.length === 0) return res.status(404).json({ message: 'not found' });

		const trainerName = rows[0].trainer_name;
		let photoUrl = null;
		const audio = { start: null, half: null, last5: null, finish: null, retire: null, count: {} };
		const countImages = {}; // カウント画像用
		for (const r of rows) {
			if (r.audio_type === 'home') {
				photoUrl = r.photo_url;
			} else if (r.audio_type === 'count' && r.count_number != null) {
				audio.count[String(r.count_number)] = r.audio_url; // カウント音声はaudio_urlを使用
				countImages[String(r.count_number)] = r.photo_url; // カウント画像はphoto_urlを使用
			} else if (r.audio_type in audio) {
				audio[r.audio_type] = r.audio_url;
				// start, finish, retireの画像もcountImagesに追加
				if (['start', 'finish', 'retire'].includes(r.audio_type)) {
					countImages[r.audio_type] = r.photo_url;
				}
			}
		}

		return res.json({ trainerName, photoUrl, audio, countImages });
	} catch (e) {
		console.error(e);
		return res.status(500).json({ message: 'internal error' });
	}
});

app.listen(PORT, () => {
	console.log(`API listening on :${PORT}`);
});