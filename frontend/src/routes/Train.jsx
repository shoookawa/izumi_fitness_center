import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFaceDetection } from '../hooks/useFaceDetection.js';
import { useAudioManager } from '../hooks/useAudioManager.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { useBackgroundHandling } from '../hooks/useBackgroundHandling.js';
import { useTrainerAssets } from '../hooks/useTrainerAssets.js';

// グローバルフラグ（React StrictMode対応）
let globalCameraInitialized = false;

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
	const lastPlayedCountRef = useRef(0); // 前回再生したカウント

	// トレーナーデータ管理
	const { trainerData, isLoading: trainerLoading, error: trainerError } = useTrainerAssets();

	// 画像管理
	const [currentImage, setCurrentImage] = useState(null);

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
	const { currentCount, isDetecting, detectionState, faceDetectionDebugInfo, resetCount } = useFaceDetection(
		videoRef, 
		canvasRef, 
		isDetectionActive && isVisible // 可視状態でのみ検出
	);
	

	useEffect(() => {
		const initializeCamera = async () => {
					if (globalCameraInitialized) {
			return;
		}
			globalCameraInitialized = true;
			await startCamera();
		};
		
		initializeCamera();
		
		return () => {
			// クリーンアップ時はグローバルフラグをリセットしない
			// （React StrictModeでの重複実行を防ぐため）
			if (stream) {
				stream.getTracks().forEach(track => track.stop());
			}
			stopAudio();
			releaseWakeLock();
		};
	}, []); // 依存配列は空のまま（一度だけ実行）

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

	// カウント時の音声再生と画像表示
	useEffect(() => {
		if (currentCount > 0 && hasStarted && isVisible) {
			// 同じカウントでの重複再生を防止
			if (lastPlayedCountRef.current === currentCount) return;

			lastPlayedCountRef.current = currentCount;

			// カウント音声再生（useAudioManagerを使用）
			console.log(`🎯 カウント音声再生要求: ${currentCount}`);
			playAudio('count', currentCount);

			// データベースからカウント画像を取得
			if (trainerData?.countImages && trainerData.countImages[currentCount]) {
				console.log(`🎯 カウント${currentCount}画像URL:`, trainerData.countImages[currentCount]);
				setCurrentImage(trainerData.countImages[currentCount]);
			} else {
				// フォールバック: ローカル画像を使用
				console.log(`🎯 カウント${currentCount}画像フォールバック: /count_photo/count_${padded}.jpg`);
				setCurrentImage(`/count_photo/count_${padded}.jpg`);
			}
			
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
	}, [currentCount, hasStarted, goal, isVisible, playAudio, loadCountAudio, trainerData]);

	// 目標達成チェック
	useEffect(() => {
		if (currentCount >= goal && hasStarted) {
			handleComplete();
		}
	}, [currentCount, goal, hasStarted]);

	useEffect(() => {
    	if (!hasStarted && trainerData?.countImages?.start) {
        	setCurrentImage(trainerData.countImages.start);
    	}
	}, [trainerData, hasStarted]);

	async function startCamera(retryCount = 0) {
		const maxRetries = 3;
		const timeoutMs = 10000; // 10秒タイムアウト
		
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
				
				// 複数の判定条件でカメラ準備完了を確認
				const checkCameraReady = () => {
					const video = videoRef.current;
					if (!video) return false;
					
					const hasMetadata = video.videoWidth > 0 && video.videoHeight > 0;
					const hasEnoughData = video.readyState >= video.HAVE_ENOUGH_DATA;
					
					
					return hasMetadata && hasEnoughData;
				};
				
				// タイムアウト付きでカメラ準備完了を待機
				const timeoutId = setTimeout(() => {
					if (retryCount < maxRetries) {
						setTimeout(() => startCamera(retryCount + 1), 1000);
					} else {
						setError('カメラを起動できませんでした。ホームに戻ります。');
						setTimeout(() => navigate('/'), 2000);
					}
				}, timeoutMs);
				
				// 定期的にカメラ準備完了をチェック
				const checkInterval = setInterval(() => {
					if (checkCameraReady()) {
						clearTimeout(timeoutId);
						clearInterval(checkInterval);
						
						setIsCameraReady(true);
					}
				}, 100);
				
				
			}
		} catch (err) {
			if (retryCount < maxRetries) {
				setTimeout(() => startCamera(retryCount + 1), 1000);
			} else {
				setError('カメラを起動できませんでした。ホームに戻ります。');
				setTimeout(() => navigate('/'), 2000);
			}
		}
	}

	async function handleStart() {
		
		try {
			// Wake Lock を要求
			if (wakeLockSupported) {
				await requestWakeLock();
			}
			
			// スタート画像を表示
			if (trainerData?.countImages && trainerData.countImages['start']) {
				console.log('🎯 スタート画像URL:', trainerData.countImages['start']);
				setCurrentImage(trainerData.countImages['start']);
			} else {
				console.log('🎯 スタート画像フォールバック: /start.jpg');
				setCurrentImage('/start.jpg');
			}
			
			// 音声が利用可能な場合は再生
			if (audioAssets && !audioLoading) {
				playAudio('start');
				
				// 開始音声終了後、カウントダウン開始
				setTimeout(() => {
					startCountdown();
				}, 3000); // 開始音声の長さを想定
			} else {
				// 音声なしでカウントダウン開始
				startCountdown();
			}
		} catch (error) {
			// エラーが発生してもカウントダウンは開始
			startCountdown();
		}
	}

	function handleComplete() {
		setIsDetectionActive(false);
		releaseWakeLock();
		
		// 変更点：navigateを100ミリ秒だけ遅らせる
		setTimeout(() => {
			// 結果ページに「状態: finish」と「最終カウント」を渡して遷移
			navigate('/result', { state: { status: 'finish', finalCount: currentCount } });
		}, 2000); // 100ミリ秒 = 0.1秒
	}

	function handleRetire() {
		cleanupTraining();
		
		// 音声が利用可能な場合は再生
		if (audioAssets && !audioLoading) {
			playAudio('retire');
			// リタイア音声終了後、ホームに戻る
			setTimeout(() => {
				navigate('/');
			}, 2000); // リタイア音声の長さを想定
		} else {
			// 音声なしで即座にホームに戻る
			navigate('/');
		}
	}

	// ローディング状態
	if (audioLoading || trainerLoading) {
		return (
			<div className="train">
				<div className="loading-container">
					<div>{audioLoading ? '音声を読み込み中...' : 'データを読み込み中...'}</div>
				</div>
			</div>
		);
	}

	// トレーナーデータのエラー状態
	if (trainerError) {
		return (
			<div className="train">
				<div className="error-container">
					<div>データの読み込みに失敗しました: {trainerError}</div>
					<button onClick={() => window.location.reload()}>再読み込み</button>
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
								pointerEvents: 'none'
							}}
						/>

						{currentImage && (
    						<img
								src={currentImage}
        						alt="トレーナー画像"
        						className="bottom-right-image" 
    						/>
						)}

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
								{!audioAssets && !audioLoading && (
									<div className="audio-warning" style={{
										background: 'rgba(255, 193, 7, 0.1)',
										border: '1px solid #ffc107',
										borderRadius: '8px',
										padding: '12px',
										margin: '16px 0',
										color: '#856404',
										fontSize: '14px'
									}}>
										⚠️ 音声ファイルの読み込みに失敗しました。音声なしでトレーニングを開始します。
									</div>
								)}
								{faceDetectionDebugInfo.status === 'ready' && (
									<div className="detection-success" style={{
										background: 'rgba(40, 167, 69, 0.1)',
										border: '1px solid #28a745',
										borderRadius: '8px',
										padding: '12px',
										margin: '16px 0',
										color: '#155724',
										fontSize: '14px'
									}}>
										✅ TensorFlow.js顔検出機能が正常に動作しています。
									</div>
								)}
								{faceDetectionDebugInfo.status === 'fallback_ready' && (
									<div className="detection-warning" style={{
										background: 'rgba(108, 117, 125, 0.1)',
										border: '1px solid #6c757d',
										borderRadius: '8px',
										padding: '12px',
										margin: '16px 0',
										color: '#495057',
										fontSize: '14px'
									}}>
										⚠️ 顔検出機能が利用できません。手動でカウントしてください。
									</div>
								)}
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
				</div>
				<button className="retire-button" onClick={handleRetire}>リタイア</button>
			</div>
		</div>
	);
}