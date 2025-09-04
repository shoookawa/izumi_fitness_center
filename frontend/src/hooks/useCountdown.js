import { useEffect, useRef, useState } from 'react';

export function useCountdown(onComplete) {
	const [countdown, setCountdown] = useState(null);
	const [isActive, setIsActive] = useState(false);
	const timeoutRef = useRef(null);

	function startCountdown() {
		setIsActive(true);
		setCountdown(3);
	}

	useEffect(() => {
		if (!isActive || countdown === null) return;

		if (countdown > 0) {
			timeoutRef.current = setTimeout(() => {
				setCountdown(countdown - 1);
			}, 1000);
		} else {
			// カウントダウン完了
			setTimeout(() => {
				setIsActive(false);
				setCountdown(null);
				onComplete();
			}, 500); // 0.5秒待機
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [countdown, isActive, onComplete]);

	// クリーンアップ
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return {
		countdown,
		isActive,
		startCountdown
	};
}
