import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function App() {
	const location = useLocation();
	return (
		<div className="app-root">
			<header className="app-header">
				<h1>イズミフィットネスセンター</h1>
				<nav>
					{location.pathname !== '/' && <Link to="/">ホーム</Link>}
				</nav>
			</header>
			<main>
				<Outlet />
			</main>
		</div>
	);
} 