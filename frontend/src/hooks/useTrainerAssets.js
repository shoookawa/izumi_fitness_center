import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3000';

export function useTrainerAssets() {
	const [trainerData, setTrainerData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchTrainerAssets = async () => {
			try {
				setIsLoading(true);
				const response = await fetch(`${API_BASE_URL}/trainer-assets`);
				
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				
				const data = await response.json();
				setTrainerData(data);
				setError(null);
			} catch (err) {
				console.error('Failed to fetch trainer assets:', err);
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchTrainerAssets();
	}, []);

	return { trainerData, isLoading, error };
}
