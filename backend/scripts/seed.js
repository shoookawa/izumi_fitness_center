// backend/scripts/seed.js (このコードで完全に置き換える)

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const R2_BASE_URL = 'https://pub-fa5e655402aa46b2a81a64279ceaa631.r2.dev/';
const TRAINER_NAME = 'Izumi';

// ✅ 最初から全ての正しいR2のURLを持つデータを作成
const FINAL_DATA = [
    // --- イベント別アセット ---
    { trainer_name: TRAINER_NAME, photo_url: `${R2_BASE_URL}home.jpg`,   audio_url: `${R2_BASE_URL}home.m4a`,    audio_type: 'home',   count_number: null },
    { trainer_name: TRAINER_NAME, photo_url: `${R2_BASE_URL}start.jpg`,  audio_url: `${R2_BASE_URL}start.m4a`,   audio_type: 'start',  count_number: null },
    { trainer_name: TRAINER_NAME, photo_url: `${R2_BASE_URL}finish.jpg`, audio_url: `${R2_BASE_URL}finish.m4a`,  audio_type: 'finish', count_number: null },
    { trainer_name: TRAINER_NAME, photo_url: `${R2_BASE_URL}retire.jpg`, audio_url: `${R2_BASE_URL}retire.m4a`,  audio_type: 'retire', count_number: null },
    { trainer_name: TRAINER_NAME, photo_url: `${R2_BASE_URL}half.jpg`,   audio_url: `${R2_BASE_URL}half.m4a`,    audio_type: 'half',   count_number: null },
    { trainer_name: TRAINER_NAME, photo_url: `${R2_BASE_URL}last5.jpg`,  audio_url: `${R2_BASE_URL}last5.m4a`,   audio_type: 'last5',  count_number: null },
];

// --- カウント別アセット（1-30）を追加 ---
for (let i = 1; i <= 30; i++) {
    const padded = String(i).padStart(2, '0');
    FINAL_DATA.push({
        trainer_name: TRAINER_NAME,
        photo_url: `${R2_BASE_URL}count_${padded}.jpg`,
        audio_url: `${R2_BASE_URL}count_${padded}.m4a`,
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
        ssl: {
			rejectUnauthorized: false
		}
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // ✅ 安全なトランザクションを開始
        await client.query('BEGIN');

        // 既存のトレーナーデータを一旦全て削除
        await client.query('DELETE FROM trainer_assets WHERE trainer_name = $1', [TRAINER_NAME]);
        console.log(`Cleared existing data for trainer: ${TRAINER_NAME}`);

        // 新しいデータを一括で挿入
        for (const data of FINAL_DATA) {
            await client.query(
                `INSERT INTO trainer_assets (trainer_name, photo_url, audio_url, audio_type, count_number)
                 VALUES ($1, $2, $3, $4, $5)`,
                [data.trainer_name, data.photo_url, data.audio_url, data.audio_type, data.count_number]
            );
        }

        // ✅ 全て成功したら変更を確定
        await client.query('COMMIT');
        console.log(`Inserted ${FINAL_DATA.length} records. Seed completed successfully.`);

    } catch (error) {
        console.error('Seed script failed:', error);
        // ✅ エラーが発生したら変更を全て取り消し
        if (client) {
            try {
                await client.query('ROLLBACK');
                console.log('Transaction rolled back.');
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
        }
    } finally {
        if (client) await client.end();
    }
}

seed();