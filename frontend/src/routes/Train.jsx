import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFaceDetection } from '../hooks/useFaceDetection.js';
import { useAudioManager } from '../hooks/useAudioManager.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { useBackgroundHandling } from '../hooks/useBackgroundHandling.js';

export default function Train() {
	const location = useLocation();
	const navigate = useNavigate();
	const goal = location.state?.goal ?? 10;
	
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const [stream, setStream] = useState(null);
	const [error, setError] = useState(null);
	const [isCameraReady, setIsCameraReady] = useState(false);
	const [isDetectionActive, setIsDetectionActive] = useState(false);
	const [hasStarted, setHasStarted] = useState(false);
	
	// 音声管理
	const { audioAssets, isLoading: audioLoading, playAudio, stopAudio, loadCountAudio } = useAudioManager();
	
	// カウントダウン
	const { countdown, isActive: countdownActive, startCountdown } = useCountdown(() => {
		setIsDetectionActive(true);
		setHasStarted(true);
	});
	
	// Wake Lock
	const { isSupported: wakeLockSupported, requestWakeLock, releaseWakeLock } = useWakeLock();
	
	// バックグラウンド処理
	const { isVisible, onPause, onResume } = useBackgroundHandling();
	
	// 顔検出フック
	const { currentCount, isDetecting, detectionState, resetCount } = useFaceDetection(
		videoRef, 
		canvasRef, 
		isDetectionActive && isVisible // 可視状態でのみ検出
	);

	useEffect(() => {
		startCamera();
		return () => {
			if (stream) {
				stream.getTracks().forEach(track => track.stop());
			}
			stopAudio();
			releaseWakeLock();
		};
	}, []);

	// バックグラウンド時の処理
	useEffect(() => {
		const unsubscribePause = onPause(() => {
			// バックグラウンド時は検出を停止
			setIsDetectionActive(false);
			// 音声も停止
			stopAudio();
		});

		const unsubscribeResume = onResume(() => {
			// 復帰時は検出を再開（トレーニング開始済みの場合のみ）
			if (hasStarted && !countdownActive) {
				setIsDetectionActive(true);
			}
		});

		return () => {
			unsubscribePause();
			unsubscribeResume();
		};
	}, [hasStarted, countdownActive, onPause, onResume, stopAudio]);

	// カウント時の音声再生
	useEffect(() => {
		if (currentCount > 0 && hasStarted && isVisible) {
			// カウント音声再生
			playAudio('count', currentCount);
			
			// 遅延読み込み（カウント6-30）
			if (currentCount >= 6 && currentCount <= 30) {
				loadCountAudio(currentCount);
			}
			
			// 応援音声のトリガー
			if (currentCount === Math.floor(goal / 2)) {
				playAudio('half');
			} else if (currentCount === goal - 5) {
				playAudio('last5');
			}
		}
	}, [currentCount, hasStarted, goal, isVisible, playAudio, loadCountAudio]);

	// 目標達成チェック
	useEffect(() => {
		if (currentCount >= goal && hasStarted) {
			handleComplete();
		}
	}, [currentCount, goal, hasStarted]);

	async function startCamera() {
		try {
			const mediaStream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'user',
					width: { ideal: 640 },
					height: { ideal: 480 },
					frameRate: { ideal: 30, min: 15 }
				}
			});
			
			setStream(mediaStream);
			
			if (videoRef.current) {
				videoRef.current.srcObject = mediaStream;
				videoRef.current.onloadedmetadata = () => {
					setIsCameraReady(true);
				};
			}
		} catch (err) {
			console.error('Camera error:', err);
			setError('カメラを起動できませんでした。ホームに戻ります。');
			setTimeout(() => navigate('/'), 2000);
		}
	}

	async function handleStart() {
		if (audioAssets && !audioLoading) {
			// Wake Lock を要求
			if (wakeLockSupported) {
				await requestWakeLock();
			}
			
			// 開始音声再生
			playAudio('start');
			
			// 開始音声終了後、カウントダウン開始
			setTimeout(() => {
				startCountdown();
			}, 2000); // 開始音声の長さを想定
		}
	}

	function handleComplete() {
		setIsDetectionActive(false);
		releaseWakeLock();
		playAudio('complete');
		
		// 完了音声終了後、ホームに戻る
		setTimeout(() => {
			navigate('/');
		}, 3000); // 完了音声の長さを想定
	}

	function handleRetire() {
		setIsDetectionActive(false);
		releaseWakeLock();
		playAudio('retire');
		
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
		}
		
		// リタイア音声終了後、ホームに戻る
		setTimeout(() => {
			navigate('/');
		}, 2000); // リタイア音声の長さを想定
	}

	// ローディング状態
	if (audioLoading) {
		return (
			<div className="train">
				<div className="loading-container">
					<div>音声を読み込み中...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="train">
			<div className="video-container">
				{error ? (
					<div className="error-message">{error}</div>
				) : (
					<>
						<video
							ref={videoRef}
							autoPlay
							playsInline
							muted
							className="camera-video"
							style={{
								transform: 'scaleX(-1)', // ミラー表示
								width: '100%',
								height: '100%',
								objectFit: 'cover'
							}}
						/>
						<canvas
							ref={canvasRef}
							className="overlay"
							style={{
								transform: 'scaleX(-1)', // ミラー表示に合わせる
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								height: '100%',
								pointer-events: 'none'
							}}
						/>
						
						{!isCameraReady && (
							<div className="loading-overlay">
								<div>カメラを起動中...</div>
							</div>
						)}
						
						{isCameraReady && !hasStarted && !countdownActive && (
							<div className="start-overlay">
								<button className="start-training-button" onClick={handleStart}>
									トレーニング開始
								</button>
								{wakeLockSupported && (
									<div className="wake-lock-info">
										画面スリープ防止機能が利用可能です
									</div>
								)}
							</div>
						)}
						
						{countdownActive && countdown && (
							<div className="countdown-overlay">
								{countdown}
							</div>
						)}
						
						{isCameraReady && !isDetecting && hasStarted && (
							<div className="loading-overlay">
								<div>顔検出を初期化中...</div>
							</div>
						)}
						
						{!isVisible && hasStarted && (
							<div className="background-overlay">
								<div>アプリがバックグラウンドに移行しました</div>
								<div>画面に戻ると検出を再開します</div>
							</div>
						)}
					</>
				)}
			</div>
			<div className="hud">
				<div className="count">
					現在：{currentCount}回 / 目標：{goal}回
					{detectionState === 'detecting' && <span className="status"> (検出中)</span>}
					{detectionState === 'confirmed' && <span className="status"> (カウント確定!)</span>}
				</div>
				<button className="retire-button" onClick={handleRetire}>リタイア</button>
			</div>
		</div>
	);
}