import { Card, GameState, Player, PlayerAction } from "../types"
import { evaluateHand } from "./handEvaluator"

// Personality traits for Claude NPCs to create varied playing styles
interface AIPersonality {
  aggressiveness: number // 0-1 (how likely to bet/raise)
  bluffFrequency: number // 0-1 (how often will bluff with weak hands)
  tightness: number // 0-1 (how selective with starting hands)
  adaptability: number // 0-1 (how much it adjusts to table dynamics)
}

// Map to store personality traits for each NPC
const npcPersonalities = new Map<number, AIPersonality>()

// Generate a random personality
export const generatePersonality = (): AIPersonality => {
  return {
    aggressiveness: 0.2 + Math.random() * 0.6, // Between 0.2-0.8
    bluffFrequency: 0.1 + Math.random() * 0.4, // Between 0.1-0.5
    tightness: 0.3 + Math.random() * 0.5, // Between 0.3-0.8
    adaptability: 0.4 + Math.random() * 0.4, // Between 0.4-0.8
  }
}

// Assign personalities to each NPC
export const assignPersonalities = (players: Player[]): void => {
  npcPersonalities.clear()

  players.forEach((player) => {
    npcPersonalities.set(player.id, generatePersonality())
  })
}

// Calculate hand strength (simplified for now)
// Returns a value between 0-1 representing relative hand strength
const calculateHandStrength = (
  player: Player,
  communityCards: Card[]
): number => {
  if (!player.hand) return 0

  // Pre-flop hand strength is based on card ranks and if they're suited
  if (communityCards.length === 0) {
    const [card1, card2] = player.hand
    const isPair = card1.rank === card2.rank
    const isSuited = card1.suit === card2.suit
    const highCard = Math.max(rankToValue(card1.rank), rankToValue(card2.rank))
    const lowCard = Math.min(rankToValue(card1.rank), rankToValue(card2.rank))
    const gapSize = highCard - lowCard - 1

    // Premium pairs
    if (isPair && rankToValue(card1.rank) >= 10)
      return 0.85 + (rankToValue(card1.rank) - 10) / 40
    // Medium pairs
    if (isPair && rankToValue(card1.rank) >= 7) return 0.7
    // Small pairs
    if (isPair) return 0.6

    // High cards suited
    if (isSuited && highCard >= 12) return 0.75
    if (isSuited && highCard >= 10 && gapSize <= 2) return 0.65

    // High cards unsuited
    if (highCard >= 13 && lowCard >= 10) return 0.7
    if (highCard >= 12 && lowCard >= 10) return 0.6

    // Connected high cards
    if (gapSize <= 1 && lowCard >= 9) return 0.6

    // Mid-range hands
    if ((isSuited && gapSize <= 2) || (gapSize <= 1 && lowCard >= 7)) return 0.5

    // Weak hands
    return 0.3 + highCard / 40
  }

  // Post-flop: more sophisticated evaluation would go here
  // For now, we'll use a simplified random approach
  // In a real implementation, this would use hand evaluator logic
  return 0.3 + Math.random() * 0.5
}

// Helper to convert card rank to numeric value
const rankToValue = (rank: string): number => {
  const values: Record<string, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  }
  return values[rank] || 0
}

// Determine the AI action based on game state and personality
export const determineAction = (
  gameState: GameState,
  playerId: number
): { action: PlayerAction; betAmount?: number } => {
  const player = gameState.players.find((p) => p.id === playerId)
  if (!player || !player.isActive) {
    return { action: "fold" }
  }

  const personality = npcPersonalities.get(playerId) || generatePersonality()
  const handStrength = calculateHandStrength(player, gameState.communityCards)

  // Adjust hand strength based on personality
  const adjustedStrength = handStrength * (1 - personality.tightness * 0.3)

  // Calculate pot odds (simplified)
  const currentBet = Math.max(...gameState.players.map((p) => p.currentBet))
  const callAmount = currentBet - player.currentBet
  const potOdds = callAmount / (gameState.pot + callAmount)

  // Decide whether to bluff
  const shouldBluff = Math.random() < personality.bluffFrequency

  // Check if this is a free check opportunity
  const canCheckForFree = currentBet === player.currentBet

  // Make decision based on hand strength, personality, and game state
  if (
    adjustedStrength > 0.8 ||
    (adjustedStrength > 0.6 && personality.aggressiveness > 0.7)
  ) {
    // Strong hand - raise/bet
    const betSizeFactor = 0.5 + personality.aggressiveness * 0.5
    const betAmount = Math.min(
      Math.max(Math.floor(gameState.pot * betSizeFactor), gameState.minBet * 2),
      player.chips
    )

    return { action: currentBet > 0 ? "raise" : "bet", betAmount }
  }

  if (adjustedStrength > 0.5 || (shouldBluff && adjustedStrength > 0.3)) {
    // Medium strength hand or bluff
    if (canCheckForFree) {
      return { action: "check" }
    }

    // Call if the pot odds are favorable
    if (adjustedStrength > potOdds || personality.aggressiveness > 0.6) {
      return { action: "call" }
    }
  }

  // Weak hand
  if (canCheckForFree) {
    return { action: "check" }
  }

  // Small percentage chance to call even with weak hand based on adaptability
  if (Math.random() < personality.adaptability * 0.2) {
    return { action: "call" }
  }

  // Default action
  return { action: "fold" }
}

// Get a description of the AI's thought process (for UI display)
export const getActionDescription = (
  playerId: number,
  action: PlayerAction,
  betAmount?: number
): string => {
  const personality = npcPersonalities.get(playerId)
  if (!personality) return ""

  const personalityType = getPersonalityType(personality)

  switch (action) {
    case "fold":
      return `${personalityType} player folds, not worth the risk.`
    case "check":
      return `${personalityType} player checks, waiting to see more cards.`
    case "call":
      return `${personalityType} player calls, thinks the hand has potential.`
    case "bet":
      return `${personalityType} player bets $${betAmount}, showing confidence.`
    case "raise":
      return `${personalityType} player raises to $${betAmount}, ${
        personality.bluffFrequency > 0.6
          ? "could be bluffing."
          : "seems to have a strong hand."
      }`
    case "allIn":
      return `${personalityType} player goes ALL IN! ${
        personality.bluffFrequency > 0.7
          ? "Is this a massive bluff?"
          : "Must have a monster hand!"
      }`
    default:
      return ""
  }
}

// Helper to describe personality type
const getPersonalityType = (personality: AIPersonality): string => {
  if (personality.aggressiveness > 0.7 && personality.bluffFrequency > 0.6) {
    return "Aggressive"
  } else if (personality.tightness > 0.7) {
    return "Tight"
  } else if (personality.aggressiveness < 0.4 && personality.tightness < 0.4) {
    return "Loose passive"
  } else if (personality.bluffFrequency > 0.6) {
    return "Bluffer"
  } else if (personality.adaptability > 0.7) {
    return "Adaptive"
  } else {
    return "Balanced"
  }
}
