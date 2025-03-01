import { Card, GameState, Player, PlayerAction } from "../types"
import { generatePokerPlayerName } from "./gameEngine"

// Personality traits for Claude NPCs to create varied playing styles
interface AIPersonality {
  aggressiveness: number // 0-1 (how likely to bet/raise)
  bluffFrequency: number // 0-1 (how often will bluff with weak hands)
  tightness: number // 0-1 (how selective with starting hands)
  adaptability: number // 0-1 (how much it adjusts to table dynamics)
}

// Map to store personality traits for each NPC
const npcPersonalities = new Map<number, AIPersonality>()

// Generate a personality based on player's name and personality type
export const generatePersonality = (playerId: number): AIPersonality => {
  const playerPersona = generatePokerPlayerName(playerId);
  
  // Default baseline personality
  let personality: AIPersonality = {
    aggressiveness: 0.5,
    bluffFrequency: 0.3,
    tightness: 0.5,
    adaptability: 0.5,
  };
  
  // Adjust personality based on the persona type
  switch (playerPersona.personality) {
    case "aggressive":
      personality.aggressiveness = 0.8 + Math.random() * 0.2;
      personality.bluffFrequency = 0.5 + Math.random() * 0.3;
      personality.tightness = 0.3 + Math.random() * 0.2;
      personality.adaptability = 0.4 + Math.random() * 0.3;
      break;
    case "tight":
      personality.aggressiveness = 0.3 + Math.random() * 0.2;
      personality.bluffFrequency = 0.1 + Math.random() * 0.2;
      personality.tightness = 0.7 + Math.random() * 0.3;
      personality.adaptability = 0.5 + Math.random() * 0.3;
      break;
    case "analytical":
      personality.aggressiveness = 0.4 + Math.random() * 0.3;
      personality.bluffFrequency = 0.2 + Math.random() * 0.2;
      personality.tightness = 0.6 + Math.random() * 0.3;
      personality.adaptability = 0.7 + Math.random() * 0.3;
      break;
    case "loose":
      personality.aggressiveness = 0.6 + Math.random() * 0.3;
      personality.bluffFrequency = 0.5 + Math.random() * 0.4;
      personality.tightness = 0.2 + Math.random() * 0.3;
      personality.adaptability = 0.4 + Math.random() * 0.3;
      break;
    case "conservative":
      personality.aggressiveness = 0.2 + Math.random() * 0.2;
      personality.bluffFrequency = 0.1 + Math.random() * 0.1;
      personality.tightness = 0.7 + Math.random() * 0.2;
      personality.adaptability = 0.3 + Math.random() * 0.3;
      break;
    case "bluffer":
      personality.aggressiveness = 0.5 + Math.random() * 0.3;
      personality.bluffFrequency = 0.7 + Math.random() * 0.3;
      personality.tightness = 0.4 + Math.random() * 0.2;
      personality.adaptability = 0.5 + Math.random() * 0.3;
      break;
    case "passive":
      personality.aggressiveness = 0.2 + Math.random() * 0.2;
      personality.bluffFrequency = 0.2 + Math.random() * 0.2;
      personality.tightness = 0.5 + Math.random() * 0.3;
      personality.adaptability = 0.6 + Math.random() * 0.3;
      break;
    case "unpredictable":
      personality.aggressiveness = 0.3 + Math.random() * 0.7; // highly variable
      personality.bluffFrequency = 0.3 + Math.random() * 0.6;
      personality.tightness = 0.2 + Math.random() * 0.6;
      personality.adaptability = 0.5 + Math.random() * 0.5;
      break;
    case "balanced":
      personality.aggressiveness = 0.4 + Math.random() * 0.3;
      personality.bluffFrequency = 0.3 + Math.random() * 0.2;
      personality.tightness = 0.4 + Math.random() * 0.3;
      personality.adaptability = 0.6 + Math.random() * 0.3;
      break;
    case "risk-taker":
      personality.aggressiveness = 0.7 + Math.random() * 0.3;
      personality.bluffFrequency = 0.6 + Math.random() * 0.3;
      personality.tightness = 0.2 + Math.random() * 0.3;
      personality.adaptability = 0.5 + Math.random() * 0.3;
      break;
    case "cautious":
      personality.aggressiveness = 0.2 + Math.random() * 0.3;
      personality.bluffFrequency = 0.2 + Math.random() * 0.2;
      personality.tightness = 0.6 + Math.random() * 0.3;
      personality.adaptability = 0.4 + Math.random() * 0.3;
      break;
    default:
      // Add some randomness to make each player unique even with same personality type
      personality.aggressiveness = 0.2 + Math.random() * 0.6;
      personality.bluffFrequency = 0.1 + Math.random() * 0.4;
      personality.tightness = 0.3 + Math.random() * 0.5;
      personality.adaptability = 0.4 + Math.random() * 0.4;
  }
  
  return personality;
}

// Assign personalities to each NPC
export const assignPersonalities = (players: Player[]): void => {
  npcPersonalities.clear()

  players.forEach((player) => {
    npcPersonalities.set(player.id, generatePersonality(player.id))
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

  const personality = npcPersonalities.get(playerId) || generatePersonality(playerId)
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

// Improved action descriptions that reflect player personalities
export const getActionDescription = (
  playerId: number,
  action: PlayerAction,
  betAmount: number = 0
): string => {
  const personality = npcPersonalities.get(playerId)
  if (!personality) return `Performs a ${action}`

  const playerPersona = generatePokerPlayerName(playerId);
  const { name, personality: personalityType } = playerPersona;
  
  // Extract the nickname for flavor text
  const nicknameMatch = name.match(/'([^']+)'/);
  const nickname = nicknameMatch ? nicknameMatch[1] : "";

  // Base description templates that reflect personality traits
  const actionTemplates: Record<string, Record<PlayerAction, string[]>> = {
    aggressive: {
      fold: [
        "reluctantly throws in the cards",
        "angrily mucks the hand",
        "tosses cards away with frustration",
      ],
      check: [
        "checks with a challenging glare",
        "taps the table impatiently",
        "checks, but seems eager to bet",
      ],
      call: [
        "matches the bet with confidence",
        "calls quickly and stares down opponents",
        "slams chips forward for the call",
      ],
      bet: [
        "fires a strong bet",
        "pushes forward a hefty bet",
        "makes an intimidating bet",
      ],
      raise: [
        "raises with authority",
        "aggressively bumps the pot",
        "raises with a challenging smile",
      ],
      allIn: [
        "shoves all chips in forcefully",
        "dramatically moves all-in",
        "declares 'all-in!' with intensity",
      ],
    },
    tight: {
      fold: [
        "carefully folds after consideration",
        "protectively folds the hand",
        "cautiously releases the cards",
      ],
      check: [
        "checks conservatively",
        "checks with careful consideration",
        "signals a check after thought",
      ],
      call: [
        "calls after careful deliberation",
        "cautiously matches the bet",
        "reluctantly puts in the calling chips",
      ],
      bet: [
        "makes a calculated bet",
        "cautiously bets after thought",
        "places a precise bet",
      ],
      raise: [
        "makes a disciplined raise",
        "carefully increases the bet",
        "raises with strategic purpose",
      ],
      allIn: [
        "commits all chips after careful analysis",
        "reluctantly goes all-in",
        "pushes all chips in with certainty",
      ],
    },
    analytical: {
      fold: [
        "folds after calculating the odds",
        "discards after statistical analysis",
        "concludes the hand isn't worth pursuing",
      ],
      check: [
        "checks after running the numbers",
        "checks, still computing possibilities",
        "taps the table after probability assessment",
      ],
      call: [
        "calls based on pot odds",
        "matches the bet after equity calculation",
        "calls with mathematical precision",
      ],
      bet: [
        "bets a statistically optimal amount",
        "places a precisely calculated bet",
        "makes a mathematically sound bet",
      ],
      raise: [
        "raises to maximize expected value",
        "increases the bet after odds analysis",
        "makes a statistically aggressive raise",
      ],
      allIn: [
        "commits all chips based on calculated edge",
        "pushes all-in after probability assessment",
        "goes all-in with statistical confidence",
      ],
    },
    loose: {
      fold: [
        "surprisingly decides to fold",
        "gives up the hand with unusual restraint",
        "unexpectedly mucks the cards",
      ],
      check: [
        "checks with a mischievous smile",
        "playfully taps for a check",
        "checks, but seems ready for action",
      ],
      call: [
        "calls with a carefree attitude",
        "casually matches the bet",
        "calls with a playful grin",
      ],
      bet: [
        "makes a speculative bet",
        "bets with casual confidence",
        "puts chips in play adventurously",
      ],
      raise: [
        "playfully increases the bet",
        "raises with a wild gleam",
        "bumps the pot with enthusiasm",
      ],
      allIn: [
        "goes all-in with a thrilling laugh",
        "shoves chips in for the gamble",
        "pushes everything in for the excitement",
      ],
    },
    bluffer: {
      fold: [
        "folds while maintaining a perfect poker face",
        "surrenders the hand without revealing anything",
        "abandons the bluff with perfect composure",
      ],
      check: [
        "checks with a deceptive smile",
        "signals a check while studying reactions",
        "taps the table with mysterious confidence",
      ],
      call: [
        "calls with an inscrutable expression",
        "matches the bet, giving nothing away",
        "calls, eyes scanning for tells",
      ],
      bet: [
        "places a bet with perfect composure",
        "makes a bet that could mean anything",
        "bets with misleading confidence",
      ],
      raise: [
        "raises with a masterful bluff",
        "increases the bet with confidence that's hard to read",
        "makes a raise that leaves everyone guessing",
      ],
      allIn: [
        "moves all-in with unreadable composure",
        "pushes all chips forward in an ultimate bluff",
        "goes all-in with perfect deception",
      ],
    },
    conservative: {
      fold: [
        "prudently folds the hand",
        "safely discards without hesitation",
        "wisely steps away from the pot",
      ],
      check: [
        "checks with quiet restraint",
        "indicates a careful check",
        "cautiously taps the table",
      ],
      call: [
        "makes a measured call",
        "cautiously matches the bet",
        "conservatively puts in the minimum",
      ],
      bet: [
        "places a safe, small bet",
        "makes a conservative wager",
        "bets the minimum practical amount",
      ],
      raise: [
        "carefully increases by the minimum",
        "makes a modest raise",
        "bumps the bet with restraint",
      ],
      allIn: [
        "reluctantly commits all chips",
        "cautiously goes all-in",
        "pushes all chips in with careful consideration",
      ],
    },
    passive: {
      fold: [
        "calmly folds without drama",
        "peacefully relinquishes the hand",
        "quietly releases the cards",
      ],
      check: [
        "checks with a gentle tap",
        "peacefully passes the action",
        "checks with serene composure",
      ],
      call: [
        "calmly matches the bet",
        "calls with tranquil confidence",
        "placidly places the calling chips",
      ],
      bet: [
        "makes a modest, measured bet",
        "places a reasonable wager",
        "bets with quiet confidence",
      ],
      raise: [
        "gently increases the bet",
        "raises with surprising assertion",
        "makes a calm, measured raise",
      ],
      allIn: [
        "serenely commits all chips",
        "pushes all-in with quiet resolve",
        "calmly goes all-in",
      ],
    },
    unpredictable: {
      fold: [
        "suddenly throws in the cards",
        "unexpectedly abandons the hand",
        "folds with surprising timing",
      ],
      check: [
        "checks with unpredictable flair",
        "taps the table with mysterious intent",
        "checks, keeping everyone guessing",
      ],
      call: [
        "calls with unpredictable confidence",
        "matches the bet in surprising fashion",
        "calls after an unexpected pause",
      ],
      bet: [
        "makes a creatively sized bet",
        "bets an unusual amount",
        "places a bet that raises eyebrows",
      ],
      raise: [
        "raises to an unexpected amount",
        "increases the bet in surprising fashion",
        "makes a raise no one saw coming",
      ],
      allIn: [
        "dramatically moves all-in out of nowhere",
        "pushes all chips in with shocking confidence",
        "declares all-in when least expected",
      ],
    },
    balanced: {
      fold: [
        "folds with perfect balance of caution and strategy",
        "releases the hand with measured judgment",
        "discards in a balanced decision",
      ],
      check: [
        "checks with balanced composure",
        "indicates a check with even temperament",
        "taps the table with measured restraint",
      ],
      call: [
        "calls with balanced judgment",
        "matches the bet with even-handed play",
        "makes the call after balanced assessment",
      ],
      bet: [
        "places a well-balanced bet",
        "makes a perfectly measured wager",
        "bets with proportional judgment",
      ],
      raise: [
        "makes a strategically balanced raise",
        "increases with perfect proportion",
        "raises with measured aggression",
      ],
      allIn: [
        "commits all chips with perfect timing",
        "goes all-in after balanced assessment",
        "pushes all chips in with measured confidence",
      ],
    },
    "risk-taker": {
      fold: [
        "surprisingly decides the risk isn't worth it",
        "unexpectedly abandons the gamble",
        "folds despite loving a challenge",
      ],
      check: [
        "checks, perhaps setting a trap",
        "taps the table, planning the next move",
        "checks with a risk-calculating stare",
      ],
      call: [
        "calls, embracing the challenge",
        "matches the bet with a fearless attitude",
        "calls, ready for the next card",
      ],
      bet: [
        "makes a bold, risky bet",
        "places a daring wager",
        "pushes chips forward confidently",
      ],
      raise: [
        "raises with a fearless smile",
        "boldly increases the stakes",
        "makes a daring raise",
      ],
      allIn: [
        "goes all-in with a thrill-seeking grin",
        "pushes all chips in without hesitation",
        "fearlessly commits everything",
      ],
    },
    cautious: {
      fold: [
        "carefully folds to avoid danger",
        "prudently steps away from the hand",
        "cautiously relinquishes the cards",
      ],
      check: [
        "checks with careful observation",
        "cautiously taps the table",
        "signals a check with vigilant eyes",
      ],
      call: [
        "cautiously matches the bet",
        "calls with careful consideration",
        "places the calling chips with vigilance",
      ],
      bet: [
        "makes a carefully considered bet",
        "places a prudent wager",
        "bets with protective strategy",
      ],
      raise: [
        "cautiously increases the bet",
        "makes a careful, measured raise",
        "raises with protective intent",
      ],
      allIn: [
        "commits all chips after careful deliberation",
        "goes all-in with cautious confidence",
        "pushes all-in with unexpected decisiveness",
      ],
    },
  };

  // Default to a random description for unknown personality types
  const defaultTemplates = [
    "makes a move",
    "continues playing",
    "takes action",
    "decides to proceed",
  ];

  // Get appropriate templates for this personality and action
  const templates = actionTemplates[personalityType]?.[action] || defaultTemplates;
  
  // Choose a random description from available templates
  const baseDescription = templates[Math.floor(Math.random() * templates.length)];
  
  // Add nickname flavor and bet amount where applicable
  if (action === "bet" || action === "raise") {
    return `${nickname ? `"${nickname}" ` : ""}${baseDescription} ($${betAmount})`;
  }
  
  return `${nickname ? `"${nickname}" ` : ""}${baseDescription}`;
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
