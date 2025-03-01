import { Card as CardType } from "../types"
import { useState, useEffect } from "react"

interface CardProps {
  card: CardType
  hidden?: boolean
}

export default function Card({ card, hidden = false }: CardProps) {
  const { suit, rank, faceUp } = card
  const [isFlipping, setIsFlipping] = useState(false)
  const [showFront, setShowFront] = useState(faceUp && !hidden)

  // Handle changes to the faceUp or hidden state with animation
  useEffect(() => {
    const shouldShowFront = faceUp && !hidden
    if (showFront === shouldShowFront) return

    setIsFlipping(true)
    const timer = setTimeout(() => {
      setShowFront(shouldShowFront)
      setIsFlipping(false)
    }, 150) // Half of the transition duration

    return () => clearTimeout(timer)
  }, [faceUp, hidden])

  // Color based on suit
  const isRed = suit === "hearts" || suit === "diamonds"
  const textColor = isRed ? "text-red-600" : "text-black"
  const suitColor = isRed ? "text-red-600" : "text-gray-900"

  // Emoji for suit
  const suitEmoji = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  }[suit]

  // Enhance card dimensions and style
  const cardStyle = "w-16 h-24 rounded-md transition-all duration-300 select-none"

  // Apply flipping animation with 3D effect
  const transform = isFlipping 
    ? "transform rotateY(90deg) scale-105" 
    : "transform rotateY(0deg)"

  // Premium shadow effect for cards
  const cardShadow = "shadow-lg hover:shadow-xl"

  // Card back design - more sophisticated pattern
  if (!showFront) {
    return (
      <div
        className={`${cardStyle} ${transform} ${cardShadow} bg-gradient-to-br from-blue-900 to-blue-800 border-2 border-blue-300 flex items-center justify-center`}
        style={{ 
          perspective: '1000px',
          transformStyle: 'preserve-3d',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="w-12 h-20 rounded bg-blue-700 flex items-center justify-center p-1"
             style={{ backgroundImage: 'repeating-linear-gradient(45deg, #3b82f6 0, #3b82f6 2px, #2563eb 2px, #2563eb 4px)' }}>
          <div className="border-2 border-blue-300 rounded-sm w-full h-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">♠</span>
          </div>
        </div>
      </div>
    )
  }

  // Premium card front design
  return (
    <div
      className={`${cardStyle} ${transform} ${cardShadow} bg-white border border-gray-300 flex flex-col items-center justify-between p-1`}
      style={{ 
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.8)',
        background: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)'
      }}
    >
      {/* Top rank and suit */}
      <div className={`${textColor} text-left self-start font-bold flex items-center`}>
        <span className="text-lg">{rank}</span>
        <span className={`${suitColor} text-sm ml-0.5`}>{suitEmoji}</span>
      </div>
      
      {/* Center suit - larger and with custom styling */}
      <div className={`${suitColor} text-3xl flex items-center justify-center flex-grow`} 
           style={{ 
             textShadow: isRed ? '0 0 1px rgba(220, 38, 38, 0.3)' : '0 0 1px rgba(0, 0, 0, 0.3)',
             transform: 'scale(1.2)',
             filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))'
           }}>
        {suitEmoji}
      </div>
      
      {/* Bottom rank and suit - rotated */}
      <div
        className={`${textColor} text-right self-end font-bold transform rotate-180 flex items-center`}
      >
        <span className="text-lg">{rank}</span>
        <span className={`${suitColor} text-sm ml-0.5`}>{suitEmoji}</span>
      </div>
    </div>
  )
}
