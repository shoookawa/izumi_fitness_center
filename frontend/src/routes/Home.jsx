import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
	const navigate = useNavigate();
	const [goal, setGoal] = useState(10);

	function handleStart() {
		navigate('/train', { state: { goal } });
	}

	return (
		<div className="home">
			<div className="trainer-photo">
				<img src="/placeholder-trainer.jpg" alt="トレーナー泉" />
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