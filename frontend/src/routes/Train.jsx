import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Train() {
	const location = useLocation();
	const navigate = useNavigate();
	const goal = location.state?.goal ?? 10;

	function handleRetire() {
		alert('リタイアしました。ホームへ戻ります。');
		navigate('/');
	}

	return (
		<div className="train">
			<div className="video-container">
				<div className="video-placeholder">カメラ起動（実装予定）</div>
				<canvas className="overlay" />
			</div>
			<div className="hud">
				<div className="count">現在：0回 / 目標：{goal}回</div>
				<button className="retire-button" onClick={handleRetire}>リタイア</button>
			</div>
		</div>
	);
} 