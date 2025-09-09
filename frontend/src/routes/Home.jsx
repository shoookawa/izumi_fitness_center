import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainerAssets } from '../hooks/useTrainerAssets.js';
import { useAudioManager } from '../hooks/useAudioManager.js';

export default function Home() {
	const navigate = useNavigate();
	const [goal, setGoal] = useState(10);
	const { trainerData, isLoading, error } = useTrainerAssets();
	const { playAudio, isLoading: audioLoading } = useAudioManager();

	function handleStart() {
		navigate('/train', { state: { goal } });
	}

	// ローディング状態
	if (isLoading) {
		return (
			<div className="home">
				<div className="loading-container">
					<div>データを読み込み中...</div>
				</div>
			</div>
		);
	}

	// エラー状態
	if (error) {
		return (
			<div className="home">
				<div className="error-container">
					<div>エラーが発生しました: {error}</div>
					<button onClick={() => window.location.reload()}>再読み込み</button>
				</div>
			</div>
		);
	}

	// データが取得できない場合のフォールバック
	const trainerPhoto = trainerData?.photoUrl || '/placeholder-trainer.jpg';

	return (
		<div className="home">
			<div className="trainer-photo">
				<img src={trainerPhoto} alt="トレーナー泉" />
			</div>
			<label className="goal-label" htmlFor="goal">目標回数</label>
			<select id="goal" value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
				<option value={10}>10回</option>
				<option value={20}>20回</option>
				<option value={30}>30回</option>
			</select>
			<button className="start-button" onClick={handleStart}>開始</button>
		</div>
	);
} 