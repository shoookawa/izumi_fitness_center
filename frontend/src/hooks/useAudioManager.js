import { useEffect, useRef, useState } from 'react';

// 音声の優先度定義
const AUDIO_PRIORITIES = {
	start: 1,
	half: 2,
	last5: 2,
	finish: 3,
	retire: 3,
	count: 0  // カウント音声は最低優先度
};

export function useAudioManager() {
	const [audioAssets, setAudioAssets] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	
	const audioCacheRef = useRef(new Map());
	const currentAudioRef = useRef(null);
	const audioQueueRef = useRef([]);
	const isPlayingRef = useRef(false);

	// 音声アセットの読み込み
	useEffect(() => {
		loadAudioAssets();
	}, []);

	async function loadAudioAssets() {
		try {
			const response = await fetch('http://localhost:3000/trainer-assets');
			if (!response.ok) throw new Error('Failed to fetch audio assets');
			
			const assets = await response.json();
			setAudioAssets(assets);
			
			// 重要音声のプリロード
			await preloadImportantAudio(assets.audio);
			
			setIsLoading(false);
		} catch (err) {
			console.error('Audio loading error:', err);
			setError('音声の読み込みに失敗しました');
			setIsLoading(false);
		}
	}

	// 重要音声のプリロード
	async function preloadImportantAudio(audio) {
		const importantAudio = [
			audio.start,
			audio.half,
			audio.last5,
			audio.finish,
			audio.retire,
			...Object.values(audio.count).slice(0, 5) // カウント1-5
		].filter(Boolean);

		const preloadPromises = importantAudio.map(url => preloadAudio(url));
		await Promise.all(preloadPromises);
	}

	// 個別音声のプリロード
	function preloadAudio(url) {
		return new Promise((resolve, reject) => {
			if (audioCacheRef.current.has(url)) {
				resolve();
				return;
			}

			const audio = new Audio();
			audio.preload = 'auto';
			audio.oncanplaythrough = () => {
				audioCacheRef.current.set(url, audio);
				resolve();
			};
			audio.onerror = reject;
			audio.src = url;
		});
	}

	// 音声再生（優先度付きキュー）
	function playAudio(audioType, countNumber = null) {
		if (!audioAssets) return;

		let url;
		if (audioType === 'count' && countNumber) {
			url = audioAssets.audio.count[String(countNumber)];
		} else {
			url = audioAssets.audio[audioType];
		}

		if (!url) {
			console.warn(`Audio not found: ${audioType}${countNumber ? ` (${countNumber})` : ''}`);
			return;
		}

		const priority = AUDIO_PRIORITIES[audioType] || 0;
		const audioItem = { url, priority, audioType, countNumber };

		// カウント音声の場合は直接再生（キューを使わない）
		if (audioType === 'count') {
			playCountAudioDirectly(url, countNumber);
			return;
		}

		// 現在再生中の音声を停止
		if (currentAudioRef.current) {
			currentAudioRef.current.pause();
			currentAudioRef.current.currentTime = 0;
		}

		// 優先度に基づいてキューに追加
		insertByPriority(audioItem);
		
		// 再生開始
		playNextInQueue();
	}

	// 優先度に基づいてキューに挿入
	function insertByPriority(audioItem) {
		const queue = audioQueueRef.current;
		let insertIndex = queue.length;

		// より高い優先度の音声を探して挿入位置を決定
		for (let i = 0; i < queue.length; i++) {
			if (audioItem.priority > queue[i].priority) {
				insertIndex = i;
				break;
			}
		}

		queue.splice(insertIndex, 0, audioItem);
	}

	// キューから次の音声を再生
	async function playNextInQueue() {
		if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

		const audioItem = audioQueueRef.current.shift();
		isPlayingRef.current = true;

		try {
			// キャッシュから取得または新規作成
			let audio = audioCacheRef.current.get(audioItem.url);
			if (!audio) {
				audio = new Audio(audioItem.url);
				audioCacheRef.current.set(audioItem.url, audio);
			}

			currentAudioRef.current = audio;

			// 再生完了時の処理
			audio.onended = () => {
				isPlayingRef.current = false;
				currentAudioRef.current = null;
				// キューに残りがあれば次を再生
				if (audioQueueRef.current.length > 0) {
					setTimeout(() => playNextInQueue(), 100);
				}
			};

			audio.onerror = () => {
				console.error(`Audio playback error: ${audioItem.url}`);
				isPlayingRef.current = false;
				currentAudioRef.current = null;
				// エラー時も次の音声を再生
				if (audioQueueRef.current.length > 0) {
					setTimeout(() => playNextInQueue(), 100);
				}
			};

			// 音声再生
			await audio.play();

		} catch (error) {
			console.error('Audio play error:', error);
			isPlayingRef.current = false;
			currentAudioRef.current = null;
		}
	}

	// カウント音声の直接再生
	function playCountAudioDirectly(url, countNumber) {
		console.log(`🔊 カウント音声再生: ${countNumber} - ${url}`);
		
		// キャッシュから取得または新規作成
		let audio = audioCacheRef.current.get(url);
		if (!audio) {
			audio = new Audio(url);
			audioCacheRef.current.set(url, audio);
		}

		// 音声再生
		audio.play().catch(error => {
			console.error(`カウント音声再生エラー (${countNumber}):`, error);
		});
	}

	// 音声停止
	function stopAudio() {
		if (currentAudioRef.current) {
			currentAudioRef.current.pause();
			currentAudioRef.current.currentTime = 0;
		}
		audioQueueRef.current = [];
		isPlayingRef.current = false;
	}

	// 遅延読み込み（カウント6-30）
	async function loadCountAudio(countNumber) {
		if (!audioAssets || countNumber < 6 || countNumber > 30) return;
		
		const url = audioAssets.audio.count[String(countNumber)];
		if (url && !audioCacheRef.current.has(url)) {
			await preloadAudio(url);
		}
	}

	return {
		audioAssets,
		isLoading,
		error,
		playAudio,
		stopAudio,
		loadCountAudio,
		isPlaying: isPlayingRef.current
	};
}
