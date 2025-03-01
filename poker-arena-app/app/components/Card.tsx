import { Card as CardType } from "../types"

interface CardProps {
  card: CardType
  hidden?: boolean
}

export default function Card({ card, hidden = false }: CardProps) {
  const { suit, rank, faceUp } = card

  // If card is face down or explicitly hidden, show the back
  if (!faceUp || hidden) {
    return (
      <div className="w-16 h-24 rounded-md bg-blue-800 border-2 border-white flex items-center justify-center">
        <div className="w-12 h-20 rounded bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold">♠️</span>
        </div>
      </div>
    )
  }

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

  return (
    <div className="w-16 h-24 rounded-md bg-white border-2 border-gray-300 flex flex-col items-center justify-between p-1">
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
