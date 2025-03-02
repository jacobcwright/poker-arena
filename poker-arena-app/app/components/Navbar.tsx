"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <span className="font-bold text-xl">Poker Arena</span>
            <div className="hidden md:flex space-x-4">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === "/"
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                Game
              </Link>
              <Link
                href="/stats"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === "/stats"
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                Stats
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-400">AI Poker Analysis</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
