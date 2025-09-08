import { useEffect, useRef, useState } from 'react';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-backend-webgl';

// グローバルフラグ（React StrictMode対応）
let globalFaceDetectionInitialized = false;

// TensorFlow.js Face Detection の設定
const DETECTION_CONFIG = {
	// 合意パラメータ
	confidence: 0.5,           // 確信度閾値（緩和）
	sizeThresholdOn: 0.12,     // 顔サイズ閾値（短辺比）ON（緩和）
	sizeThresholdOff: 0.03,    // 顔サイズ閾値（短辺比）OFF（緩和）
	appearDuration: 300,       // 出現継続時間（ms）（短縮）
	smoothingFrames: 3         // スムージングフレーム数（短縮）
};

export function useFaceDetection(videoRef, canvasRef, isActive) {
	const [currentCount, setCurrentCount] = useState(0);
	const [isDetecting, setIsDetecting] = useState(false);
	const [faceDetectionDebugInfo, setFaceDetectionDebugInfo] = useState({
		status: 'initializing',
		initializationStep: 'loading_scripts',
		lastDetection: null,
		detectionCount: 0,
		error: null
	});
	
	// 新しい状態管理システム（簡素化）
	const [detectionState, setDetectionState] = useState({
		phase: 'idle',           // 'idle', 'detecting', 'counted'
		startTime: 0,           // 検出開始時刻
		lastCountTime: 0        // 最後のカウント時刻（デバッグ用）
	});
	
	// デバッグ用の状態ログ
	useEffect(() => {
		console.log('🔍 検出状態変更:', detectionState);
	}, [detectionState]);
	
	const faceDetectionRef = useRef(null);
	const lastDetectionRef = useRef(null);
	const smoothingBufferRef = useRef([]);
	const detectionIntervalRef = useRef(null);


	// TensorFlow.js Face Detection の初期化
	useEffect(() => {
		async function initFaceDetection() {
			// 重複実行を防止（グローバルフラグ使用）
			if (globalFaceDetectionInitialized) {
				console.log('TensorFlow.js初期化は既に実行済みです（グローバルフラグ）');
				return;
			}
			
			console.log('TensorFlow.js初期化を開始します（グローバルフラグ）');
			globalFaceDetectionInitialized = true;
			
			try {
				console.log('TensorFlow.js初期化開始');
				setFaceDetectionDebugInfo(prev => ({ 
					...prev, 
					status: 'initializing',
					initializationStep: 'loading_model',
					error: null
				}));
				
				// TensorFlow.js Face Detection モデルを読み込み
				console.log('TensorFlow.js Face Detectionモデル読み込み中...');
				
				// 利用可能なモデルを確認
				console.log('利用可能なモデル:', faceDetection.SupportedModels);
				
				// MediaPipeFaceDetectorを使用（正しい設定）
				const detectorConfig = {
					runtime: 'mediapipe', // 'tfjs'ではなく'mediapipe'を使用
					solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
					modelType: 'short',
					maxFaces: 1
				};
				
				console.log('Detector設定:', detectorConfig);
				
				faceDetectionRef.current = await faceDetection.createDetector(
					faceDetection.SupportedModels.MediaPipeFaceDetector,
					detectorConfig
				);
				
				console.log('Detector作成完了:', {
					detector: faceDetectionRef.current,
					detectorMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(faceDetectionRef.current))
				});
				
				console.log('TensorFlow.js Face Detectionモデル読み込み完了');
				setFaceDetectionDebugInfo(prev => ({ 
					...prev, 
					status: 'ready',
					initializationStep: 'completed'
				}));
				
			} catch (error) {
				console.error('TensorFlow.js初期化エラー:', error);
				console.error('エラーの詳細:', {
					name: error.name,
					message: error.message,
					stack: error.stack
				});
				
				setFaceDetectionDebugInfo(prev => ({ 
					...prev, 
					status: 'error',
					error: `${error.name}: ${error.message}`
				}));
				
				// フォールバック機能を試行
				initFallbackFaceDetection();
			}
		}
		
		// フォールバック機能（簡易的な顔検出）
		function initFallbackFaceDetection() {
			console.log('フォールバック顔検出を初期化します');
			setFaceDetectionDebugInfo(prev => ({ 
				...prev, 
				status: 'fallback',
				initializationStep: 'fallback_mode',
				error: 'TensorFlow.js初期化失敗、フォールバックモードを使用'
			}));
			
			// 簡易的な顔検出ロジック（実際の顔検出は行わないが、システムは動作する）
			faceDetectionRef.current = {
				estimateFaces: async (video, options) => {
					// フォールバックモードでは空の配列を返す
					console.log('フォールバックモード: 空の検出結果を返す');
					return [];
				},
				send: (data) => {
					// フォールバックモードでは何もしない
					console.log('フォールバックモード: 検出要求を無視');
				},
				onResults: (callback) => {
					// フォールバックモードでは何もしない
					console.log('フォールバックモード: 結果コールバックを設定');
				},
				setOptions: (options) => {
					// フォールバックモードでは何もしない
					console.log('フォールバックモード: オプション設定を無視', options);
				}
			};
			
			// フォールバックモードでも検出状態を更新
			setFaceDetectionDebugInfo(prev => ({ 
				...prev, 
				status: 'fallback_ready',
				initializationStep: 'fallback_completed'
			}));
		}
		
		
		initFaceDetection();
		
		// クリーンアップ関数
		return () => {
			// グローバルフラグはリセットしない（React StrictMode対応）
		};
	}, []); // 依存配列は空のまま（一度だけ実行）

	// 検出結果の処理（TensorFlow.js用）
	async function handleDetectionResults() {
		if (!isActive || !canvasRef.current || !videoRef.current || !faceDetectionRef.current) return;
		
		try {
			const canvas = canvasRef.current;
			const video = videoRef.current;
			const ctx = canvas.getContext('2d');
			
			// キャンバスサイズをビデオに合わせる
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			
			// 前フレームをクリア
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			
			// TensorFlow.jsで顔検出を実行
			const faces = await faceDetectionRef.current.estimateFaces(video, {
				flipHorizontal: false,
				returnTensors: false
			});
			
			// デバッグ情報を更新
			setFaceDetectionDebugInfo(prev => ({
				...prev,
				detectionCount: prev.detectionCount + 1,
				lastDetection: faces ? faces.length : 0
			}));
			
			if (faces && faces.length > 0) {
				const face = faces[0]; // 最初の検出結果を使用
				
				const bbox = face.box;
				
				// TensorFlow.jsのbbox構造を確認して適切に処理
				let x, y, width, height;
				
				// 複数のbbox構造に対応
				if (bbox.x !== undefined && bbox.y !== undefined && bbox.width !== undefined && bbox.height !== undefined) {
					// 標準的な {x, y, width, height} 形式
					x = bbox.x;
					y = bbox.y;
					width = bbox.width;
					height = bbox.height;
				} else if (bbox.xCenter !== undefined && bbox.yCenter !== undefined && bbox.width !== undefined && bbox.height !== undefined) {
					// MediaPipe形式 {xCenter, yCenter, width, height}
					x = bbox.xCenter - bbox.width / 2;
					y = bbox.yCenter - bbox.height / 2;
					width = bbox.width;
					height = bbox.height;
				} else if (bbox.left !== undefined && bbox.top !== undefined && bbox.right !== undefined && bbox.bottom !== undefined) {
					// {left, top, right, bottom} 形式
					x = bbox.left;
					y = bbox.top;
					width = bbox.right - bbox.left;
					height = bbox.bottom - bbox.top;
				} else if (bbox.xMin !== undefined && bbox.xMax !== undefined && bbox.yMin !== undefined && bbox.yMax !== undefined) {
					// {xMin, xMax, yMin, yMax} 形式（TensorFlow.js MediaPipeFaceDetector）
					
					// MediaPipeFaceDetectorは相対座標（0-1の範囲）を使用
					// ただし、座標値が0の場合は別の処理が必要
					if (bbox.xMin === 0 && bbox.xMax === 0 && bbox.yMin === 0 && bbox.yMax === 0) {
						// keypointsから座標を推定
						if (face.keypoints && face.keypoints.length > 0) {
							const keypoints = face.keypoints;
							const xCoords = keypoints.map(kp => kp.x);
							const yCoords = keypoints.map(kp => kp.y);
							const minX = Math.min(...xCoords);
							const maxX = Math.max(...xCoords);
							const minY = Math.min(...yCoords);
							const maxY = Math.max(...yCoords);
							
							x = minX;
							y = minY;
							width = maxX - minX;
							height = maxY - minY;
						} else {
							return;
						}
					} else {
						// MediaPipeFaceDetectorは既に絶対座標（ピクセル値）を返す
						x = bbox.xMin;
						y = bbox.yMin;
						width = bbox.xMax - bbox.xMin;
						height = bbox.yMax - bbox.yMin;
					}
				} else {
					console.error('未知のbbox構造:', bbox);
					return;
				}
				
				// 座標値が0の場合はスキップ
				if (width === 0 || height === 0) {
					return;
				}
				
				// 顔のサイズを計算（短辺比）
				const faceSize = Math.min(width, height);
				const shortSide = Math.min(video.videoWidth, video.videoHeight);
				const sizeRatio = faceSize / shortSide;
				
				// サイズ計算（ログ削除）
				
							// スムージング（中央値）
			smoothingBufferRef.current.push(sizeRatio);
			if (smoothingBufferRef.current.length > DETECTION_CONFIG.smoothingFrames) {
				smoothingBufferRef.current.shift();
			}
			
			// スムージングバッファが空の場合は現在の値をそのまま使用
			const smoothedSize = smoothingBufferRef.current.length > 0 
				? getMedian(smoothingBufferRef.current) 
				: sizeRatio;
				const now = Date.now();
				
				// スムージング結果（ログ削除）
				
							// 新しいカウントロジック（修正版）
			if (smoothedSize >= DETECTION_CONFIG.sizeThresholdOn) {
				// 状態遷移の処理（修正版）
				if (detectionState.phase === 'idle') {
					// idle → detecting（検出開始）
					setDetectionState(prev => ({
						...prev,
						phase: 'detecting',
						startTime: now
					}));
					console.log('🔄 状態遷移: idle → detecting', {
						smoothedSize,
						threshold: DETECTION_CONFIG.sizeThresholdOn,
						timestamp: now
					});
					
					// 顔枠を描画
					drawFaceBox(ctx, {x, y, width, height}, 'detecting');
				} else if (detectionState.phase === 'detecting') {
					// detecting状態では顔検出を継続し、タイマーでチェック
					const elapsed = now - detectionState.startTime;
					if (elapsed >= DETECTION_CONFIG.appearDuration) {
						// カウント実行
						setCurrentCount(prev => {
							const newCount = prev + 1;
							console.log('🎯 カウントを増加:', newCount);
							return newCount;
						});
						
						setDetectionState(prev => ({
							...prev,
							phase: 'counted',
							lastCountTime: now
						}));
						console.log('✅ 状態遷移: detecting → counted');
					}
					
					// detecting状態でも顔枠を描画（継続表示）
					drawFaceBox(ctx, {x, y, width, height}, 'detecting');
				} else if (detectionState.phase === 'counted') {
					// counted状態では顔検出を継続し、顔が隠れるまで待機
					// 自動タイムアウトは削除（顔が検出されない時のみidleに遷移）
					
					// 顔枠を描画（確定状態）
					drawFaceBox(ctx, {x, y, width, height}, 'confirmed');
				}
				
			} else if (smoothedSize < DETECTION_CONFIG.sizeThresholdOff) {
				// 顔が隠れた場合はidle状態に戻る（全状態から）
				// ただし、counted状態の場合は少し遅延を入れる
				if (detectionState.phase !== 'idle') {
					if (detectionState.phase === 'counted') {
						// counted状態の場合は少し待機してからidleに戻る
						setTimeout(() => {
							setDetectionState(prev => ({
								...prev,
								phase: 'idle',
								startTime: 0
							}));
							console.log('👤 状態遷移: counted → idle（遅延後）', {
								smoothedSize,
								threshold: DETECTION_CONFIG.sizeThresholdOff,
								timestamp: Date.now()
							});
						}, 200); // 200ms遅延
					} else {
						setDetectionState(prev => ({
							...prev,
							phase: 'idle',
							startTime: 0
						}));
						console.log('👤 状態遷移: 任意の状態 → idle（顔が隠れた）', {
							previousPhase: detectionState.phase,
							smoothedSize,
							threshold: DETECTION_CONFIG.sizeThresholdOff,
							timestamp: now
						});
					}
				}
			} else {
				// 閾値の範囲内でも描画は行う
				drawFaceBox(ctx, {x, y, width, height}, 'detecting');
			}
			} else {
				// 顔が検出されない場合（faces.length === 0）
				const now = Date.now();
				if (detectionState.phase !== 'idle') {
					setDetectionState(prev => ({
						...prev,
						phase: 'idle',
						startTime: 0
					}));
					console.log('👤 状態遷移: 任意の状態 → idle（顔が検出されない）', {
						previousPhase: detectionState.phase,
						facesCount: faces ? faces.length : 0,
						timestamp: now
					});
				}
			}
		} catch (error) {
			console.error('検出結果処理エラー:', error);
			setFaceDetectionDebugInfo(prev => ({
				...prev,
				error: `検出結果処理エラー: ${error.message}`
			}));
		}
	}

	// 顔枠の描画（TensorFlow.js用）
	function drawFaceBox(ctx, bbox, state) {
		// TensorFlow.jsのbboxは {x, y, width, height} 形式
		const x = bbox.x;
		const y = bbox.y;
		const width = bbox.width;
		const height = bbox.height;
		
		// 描画パラメータ（ログ削除）
		
		ctx.strokeStyle = state === 'confirmed' ? '#10b981' : '#f59e0b';
		ctx.lineWidth = 3;
		ctx.strokeRect(x, y, width, height);
		
		// 顔枠を描画（ログ削除）
	}

	// 中央値計算（安全版）
	function getMedian(arr) {
		if (!arr || arr.length === 0) return 0;
		const sorted = [...arr].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	}

	// 検出の開始/停止
	useEffect(() => {
		if (!faceDetectionRef.current || !videoRef.current) return;
		
		if (isActive) {
			// 検出開始
			setIsDetecting(true);
		} else {
			setIsDetecting(false);
			setDetectionState(prev => ({
				...prev,
				phase: 'idle',
				startTime: 0
			}));
		}
	}, [isActive]);

	// フレームごとの検出実行（状態に応じた頻度制御）
	useEffect(() => {
		if (!isActive || !faceDetectionRef.current || !videoRef.current) return;
		
		const video = videoRef.current;
		
		// 検出頻度を状態に応じて制御
		const getDetectionInterval = () => {
			// すべての状態で同じ頻度を使用（20FPS）
			return 1000 / 20; // 20FPS (50ms)
		};
		
		const startDetection = () => {
			if (detectionIntervalRef.current) {
				clearInterval(detectionIntervalRef.current);
			}
			
			const interval = setInterval(async () => {
				if (video.readyState === video.HAVE_ENOUGH_DATA) {
					try {
						await handleDetectionResults();
					} catch (error) {
						console.error('顔検出実行エラー:', error);
						setFaceDetectionDebugInfo(prev => ({
							...prev,
							error: error.message
						}));
					}
				}
			}, getDetectionInterval());
			
			detectionIntervalRef.current = interval;
		};
		
		startDetection();
		
		return () => {
			if (detectionIntervalRef.current) {
				clearInterval(detectionIntervalRef.current);
			}
		};
	}, [isActive, detectionState.phase]); // detectionState.phaseを依存配列に追加

	return {
		currentCount,
		isDetecting,
		detectionState,
		faceDetectionDebugInfo,
		resetCount: () => setCurrentCount(0)
	};
}
