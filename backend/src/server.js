import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
	origin: function(origin, callback) {
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
	ssl: { rejectUnauthorized: false }
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
		const photoUrl = rows[0].photo_url;
		const audio = { start: null, half: null, last5: null, complete: null, retire: null, count: {} };
		for (const r of rows) {
			if (r.audio_type === 'count' && r.count_number != null) {
				audio.count[String(r.count_number)] = r.audio_url;
			} else if (r.audio_type in audio) {
				audio[r.audio_type] = r.audio_url;
			}
		}

		return res.json({ trainerName, photoUrl, audio });
	} catch (e) {
		console.error(e);
		return res.status(500).json({ message: 'internal error' });
	}
});

app.listen(PORT, () => {
	console.log(`API listening on :${PORT}`);
});