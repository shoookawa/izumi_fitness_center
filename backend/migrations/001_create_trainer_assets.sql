CREATE TABLE IF NOT EXISTS trainer_assets (
	id BIGINT PRIMARY KEY AUTO_INCREMENT,
	trainer_name VARCHAR(255) NOT NULL,
	photo_url VARCHAR(1024) NOT NULL,
	audio_url VARCHAR(1024) NOT NULL,
	audio_type ENUM('start','count','half','last5','complete','retire') NOT NULL,
	count_number INT NULL,
	INDEX idx_trainer_type_count (trainer_name, audio_type, count_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; 