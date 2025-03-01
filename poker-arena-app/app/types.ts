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

export type Emotion =
  | "neutral"
  | "happy"
  | "excited"
  | "nervous"
  | "thoughtful"
  | "suspicious"
  | "confident"
  | "disappointed"
  | "frustrated"
  | "surprised"
  | "poker-face"
  | "bluffing"
  | "calculating"
  | "intimidating"
  | "worried"

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
  equity?: number // Odds of winning as a percentage
  emotion?: Emotion // Current displayed emotion
  personality?: string // Player's poker personality/style
}

export type GamePhase =
  | "idle"
  | "dealing"
  | "preFlop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"

export interface ActivityLogEntry {
  playerId: number
  playerName: string
  action: PlayerAction | "deal" | "win" | "blind" | "phase"
  amount?: number
  description: string
  timestamp: number
  phase: GamePhase
  equity?: number // Player's equity at the time of this action
  chainOfThought?: string // AI's thought process for this action
  reasoningSummary?: string // A summary of the AI's reasoning
  emotion?: Emotion // Player's emotion during this action
}

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
  winningPlayers?: number[]
  handResults?: Record<number, string>
  playerActions?: Record<number, { type: PlayerAction; amount?: number }>
  stats?: GameStats
  activityLog?: ActivityLogEntry[]
}

export type PlayerAction = "fold" | "check" | "call" | "bet" | "raise" | "allIn"

export interface GameStats {
  handsPlayed: number
  biggestPot: number
  biggestWin: Record<number, number>
  handWins: Record<number, number>
}
