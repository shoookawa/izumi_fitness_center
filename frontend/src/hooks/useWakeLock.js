import { useEffect, useRef, useState } from 'react';

export function useWakeLock() {
	const [isSupported, setIsSupported] = useState(false);
	const [isActive, setIsActive] = useState(false);
	const wakeLockRef = useRef(null);

	useEffect(() => {
		// Wake Lock API のサポート確認
		if ('wakeLock' in navigator) {
			setIsSupported(true);
		}
	}, []);

	async function requestWakeLock() {
		if (!isSupported) {
			console.warn('Wake Lock API not supported');
			return false;
		}

		try {
			wakeLockRef.current = await navigator.wakeLock.request('screen');
			setIsActive(true);
			
			// ロックが解除された時の処理
			wakeLockRef.current.addEventListener('release', () => {
				setIsActive(false);
			});
			
			return true;
		} catch (error) {
			console.error('Wake Lock request failed:', error);
			return false;
		}
	}

	function releaseWakeLock() {
		if (wakeLockRef.current) {
			wakeLockRef.current.release();
			wakeLockRef.current = null;
			setIsActive(false);
		}
	}

	// ページが非表示になった時の処理
	useEffect(() => {
		function handleVisibilityChange() {
			if (document.hidden && wakeLockRef.current) {
				// ページが非表示になったらWake Lockを解除
				releaseWakeLock();
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, []);

	// クリーンアップ
	useEffect(() => {
		return () => {
			releaseWakeLock();
		};
	}, []);

	return {
		isSupported,
		isActive,
		requestWakeLock,
		releaseWakeLock
	};
}
