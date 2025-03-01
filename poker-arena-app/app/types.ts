export type Suit = "hearts" | "diamonds" | "clubs" | "spades"
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A"

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export type Hand = [Card, Card]

export interface Player {
  id: number
  name: string
  hand: Hand | null
  chips: number
  currentBet: number
  isActive: boolean
  isAllIn: boolean
  isDealer: boolean
  isTurn: boolean
}

export type GamePhase =
  | "idle"
  | "dealing"
  | "preFlop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"

export interface GameState {
  players: Player[]
  deck: Card[]
  communityCards: Card[]
  pot: number
  currentPhase: GamePhase
  activePlayerIndex: number
  dealerIndex: number
  minBet: number
  isRunning: boolean
  round?: number
}

export type PlayerAction = "fold" | "check" | "call" | "bet" | "raise" | "allIn"
