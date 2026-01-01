"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
	const router = useRouter();
	const [isCreating, setIsCreating] = useState(false);

	const createGame = async () => {
		setIsCreating(true);
		// Generate a random room ID
		const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
		router.push(`/host/${roomId}`);
	};

	return (
		<main className="min-h-screen flex flex-col items-center justify-center p-8">
			<div className="text-center max-w-2xl">
				<h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 text-transparent bg-clip-text">
					Dixon Family Quiplash 2026
				</h1>
				<p className="text-xl text-white/80 mb-8">
					The party game where your family&apos;s inside jokes become the
					punchlines!
				</p>

				<div className="space-y-4">
					<button
						onClick={createGame}
						disabled={isCreating}
						className="w-full max-w-md px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white text-2xl font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
					>
						{isCreating ? "Creating Game..." : "Start New Game"}
					</button>

					<p className="text-white/60 text-sm">
						Host displays QR code • Players join on their phones • Hilarity
						ensues
					</p>
				</div>
			</div>
		</main>
	);
}
