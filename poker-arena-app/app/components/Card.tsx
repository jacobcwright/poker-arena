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

  // Emoji for suit
  const suitEmoji = {
    hearts: "♥️",
    diamonds: "♦️",
    clubs: "♣️",
    spades: "♠️",
  }[suit]

  // Common card style
  const cardStyle = "w-16 h-24 rounded-md border-2 transition-all duration-300"

  // Apply flipping animation
  const transform = isFlipping ? "transform scale-x-0" : "transform scale-x-100"

  // Card back design
  if (!showFront) {
    return (
      <div
        className={`${cardStyle} ${transform} bg-blue-800 border-white flex items-center justify-center`}
      >
        <div className="w-12 h-20 rounded bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold">♠️</span>
        </div>
      </div>
    )
  }

  // Card front design
  return (
    <div
      className={`${cardStyle} ${transform} bg-white border-gray-300 flex flex-col items-center justify-between p-1`}
    >
      <div className={`${textColor} text-left self-start font-bold`}>
        {rank}
      </div>
      <div className="text-2xl">{suitEmoji}</div>
      <div
        className={`${textColor} text-right self-end font-bold transform rotate-180`}
      >
        {rank}
      </div>
    </div>
  )
}
