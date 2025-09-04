import { useEffect, useRef, useState } from 'react';

export function useBackgroundHandling() {
	const [isVisible, setIsVisible] = useState(!document.hidden);
	const [wasPaused, setWasPaused] = useState(false);
	const pauseCallbacksRef = useRef([]);
	const resumeCallbacksRef = useRef([]);

	useEffect(() => {
		function handleVisibilityChange() {
			const visible = !document.hidden;
			setIsVisible(visible);

			if (visible && wasPaused) {
				// 復帰時の処理
				resumeCallbacksRef.current.forEach(callback => {
					try {
						callback();
					} catch (error) {
						console.error('Resume callback error:', error);
					}
				});
				setWasPaused(false);
			} else if (!visible && !wasPaused) {
				// バックグラウンド時の処理
				pauseCallbacksRef.current.forEach(callback => {
					try {
						callback();
					} catch (error) {
						console.error('Pause callback error:', error);
					}
				});
				setWasPaused(true);
			}
		}

		// ページの可視性変更を監視
		document.addEventListener('visibilitychange', handleVisibilityChange);

		// ページフォーカス/ブラーを監視（追加の安全性）
		window.addEventListener('focus', () => {
			if (wasPaused) {
				handleVisibilityChange();
			}
		});

		window.addEventListener('blur', () => {
			if (!wasPaused) {
				handleVisibilityChange();
			}
		});

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('focus', handleVisibilityChange);
			window.removeEventListener('blur', handleVisibilityChange);
		};
	}, [wasPaused]);

	// バックグラウンド時のコールバック登録
	function onPause(callback) {
		pauseCallbacksRef.current.push(callback);
		return () => {
			const index = pauseCallbacksRef.current.indexOf(callback);
			if (index > -1) {
				pauseCallbacksRef.current.splice(index, 1);
			}
		};
	}

	// 復帰時のコールバック登録
	function onResume(callback) {
		resumeCallbacksRef.current.push(callback);
		return () => {
			const index = resumeCallbacksRef.current.indexOf(callback);
			if (index > -1) {
				resumeCallbacksRef.current.splice(index, 1);
			}
		};
	}

	return {
		isVisible,
		wasPaused,
		onPause,
		onResume
	};
}
