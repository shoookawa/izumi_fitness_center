import { useEffect, useRef, useState } from 'react';

// MediaPipe Face Detection の設定
const DETECTION_CONFIG = {
	// 合意パラメータ
	confidence: 0.8,           // 確信度閾値
	sizeThresholdOn: 0.12,     // 顔サイズ閾値（短辺比）ON
	sizeThresholdOff: 0.06,    // 顔サイズ閾値（短辺比）OFF
	appearDuration: 250,       // 出現継続時間（ms）
	resetDuration: 400,        // リセット継続時間（ms）
	smoothingFrames: 5         // スムージングフレーム数
};

export function useFaceDetection(videoRef, canvasRef, isActive) {
	const [currentCount, setCurrentCount] = useState(0);
	const [isDetecting, setIsDetecting] = useState(false);
	const [detectionState, setDetectionState] = useState('idle'); // idle, detecting, confirmed
	
	const faceDetectionRef = useRef(null);
	const lastDetectionRef = useRef(null);
	const smoothingBufferRef = useRef([]);
	const stateRef = useRef({
		isVisible: false,
		lastVisibleTime: 0,
		lastHiddenTime: 0,
		canCount: true
	});

	// MediaPipe Face Detection の初期化
	useEffect(() => {
		async function initFaceDetection() {
			try {
				// MediaPipe Face Detection をCDNから読み込み
				const { FaceDetection } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/face_detection.js');
				const { Camera } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js');
				
				faceDetectionRef.current = new FaceDetection({
					locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`
				});
				
				faceDetectionRef.current.setOptions({
					model: 'short',
					minDetectionConfidence: DETECTION_CONFIG.confidence
				});
				
				faceDetectionRef.current.onResults(handleDetectionResults);
				
			} catch (error) {
				console.error('MediaPipe initialization failed:', error);
			}
		}
		
		initFaceDetection();
	}, []);

	// 検出結果の処理
	function handleDetectionResults(results) {
		if (!isActive || !canvasRef.current || !videoRef.current) return;
		
		const canvas = canvasRef.current;
		const video = videoRef.current;
		const ctx = canvas.getContext('2d');
		
		// キャンバスサイズをビデオに合わせる
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		
		// 前フレームをクリア
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		if (results.detections && results.detections.length > 0) {
			const detection = results.detections[0]; // 最初の検出結果を使用
			const bbox = detection.locationData.relativeBoundingBox;
			
			// 顔のサイズを計算（短辺比）
			const faceSize = Math.min(bbox.width, bbox.height);
			const shortSide = Math.min(video.videoWidth, video.videoHeight);
			const sizeRatio = faceSize * shortSide / shortSide;
			
			// スムージング（中央値）
			smoothingBufferRef.current.push(sizeRatio);
			if (smoothingBufferRef.current.length > DETECTION_CONFIG.smoothingFrames) {
				smoothingBufferRef.current.shift();
			}
			
			const smoothedSize = getMedian(smoothingBufferRef.current);
			const now = Date.now();
			
			// ヒステリシス判定
			const state = stateRef.current;
			
			if (smoothedSize >= DETECTION_CONFIG.sizeThresholdOn) {
				// 顔が検出された
				if (!state.isVisible) {
					state.isVisible = true;
					state.lastVisibleTime = now;
					setDetectionState('detecting');
				}
				
				// 継続時間チェック
				if (state.isVisible && state.canCount && 
					(now - state.lastVisibleTime) >= DETECTION_CONFIG.appearDuration) {
					// カウント確定
					setCurrentCount(prev => prev + 1);
					state.canCount = false;
					setDetectionState('confirmed');
					
					// リセットタイマー
					setTimeout(() => {
						state.canCount = true;
						setDetectionState('idle');
					}, DETECTION_CONFIG.resetDuration);
				}
				
				// 顔枠を描画
				drawFaceBox(ctx, bbox, detectionState === 'confirmed' ? 'confirmed' : 'detecting');
				
			} else if (smoothedSize < DETECTION_CONFIG.sizeThresholdOff) {
				// 顔が隠れた
				if (state.isVisible) {
					state.isVisible = false;
					state.lastHiddenTime = now;
					setDetectionState('idle');
				}
			}
		}
	}

	// 顔枠の描画
	function drawFaceBox(ctx, bbox, state) {
		const x = bbox.xCenter * canvasRef.current.width - (bbox.width * canvasRef.current.width) / 2;
		const y = bbox.yCenter * canvasRef.current.height - (bbox.height * canvasRef.current.height) / 2;
		const width = bbox.width * canvasRef.current.width;
		const height = bbox.height * canvasRef.current.height;
		
		ctx.strokeStyle = state === 'confirmed' ? '#10b981' : '#f59e0b';
		ctx.lineWidth = 3;
		ctx.strokeRect(x, y, width, height);
	}

	// 中央値計算
	function getMedian(arr) {
		const sorted = [...arr].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	}

	// 検出の開始/停止
	useEffect(() => {
		if (!faceDetectionRef.current || !videoRef.current) return;
		
		if (isActive) {
			// 検出開始
			const video = videoRef.current;
			faceDetectionRef.current.send({ image: video });
			setIsDetecting(true);
		} else {
			setIsDetecting(false);
			setDetectionState('idle');
		}
	}, [isActive]);

	// フレームごとの検出実行
	useEffect(() => {
		if (!isActive || !faceDetectionRef.current || !videoRef.current) return;
		
		const video = videoRef.current;
		const interval = setInterval(() => {
			if (video.readyState === video.HAVE_ENOUGH_DATA) {
				faceDetectionRef.current.send({ image: video });
			}
		}, 1000 / 30); // 30FPS
		
		return () => clearInterval(interval);
	}, [isActive]);

	return {
		currentCount,
		isDetecting,
		detectionState,
		resetCount: () => setCurrentCount(0)
	};
}
