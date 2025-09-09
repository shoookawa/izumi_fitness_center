CREATE TABLE IF NOT EXISTS trainer_assets (
    id BIGSERIAL PRIMARY KEY,
    trainer_name VARCHAR(255) NOT NULL,
    photo_url VARCHAR(1024) NOT NULL,
    audio_url VARCHAR(1024) NOT NULL,
    audio_type VARCHAR(20) CHECK (audio_type IN ('home', 'start', 'count', 'half', 'last5', 'finish', 'retire')) NOT NULL,
    count_number INTEGER NULL
);

CREATE INDEX IF NOT EXISTS idx_trainer_type_count ON trainer_assets (trainer_name, audio_type, count_number);