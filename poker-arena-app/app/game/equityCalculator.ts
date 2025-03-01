import { Card, GameState, Player } from "../types"
import { evaluateHand, compareHands } from "./handEvaluator"
import { createNewDeck, shuffleDeck } from "./gameEngine"

// Number of simulations to run for Monte Carlo equity calculation
const SIMULATION_COUNT = 500

/**
 * Calculate equity (winning probability) for all active players
 * @param gameState Current game state
 * @returns Updated game state with equity for each player
 */
export const calculateEquity = (gameState: GameState): GameState => {
  const { players, communityCards, currentPhase } = gameState
  const activePlayers = players.filter((p) => p.isActive && p.hand)

  // Early return if we have 0 or 1 active players
  if (activePlayers.length <= 1) {
    const newPlayers = [...players].map((p) => ({
      ...p,
      equity: p.isActive && p.hand ? 100 : 0,
    }))
    return { ...gameState, players: newPlayers }
  }

  // For pre-flop equity calculations, we use a simplified approach
  // because full Monte Carlo would be too computationally expensive
  if (currentPhase === "preFlop" || currentPhase === "dealing") {
    return calculatePreflopEquity(gameState)
  }

  // For other phases, run Monte Carlo simulations
  return calculateEquityMonteCarlo(gameState)
}

/**
 * Calculate equity for pre-flop scenarios using precomputed ranges
 */
export const calculatePreflopEquity = (gameState: GameState): GameState => {
  const { players } = gameState
  const newPlayers = [...players]

  // Get active players with hands
  const activePlayers = newPlayers.filter((p) => p.isActive && p.hand)

  for (const player of activePlayers) {
    if (!player.hand) continue

    // Calculate simple hand strength based on ranks and whether they're suited
    const card1 = player.hand[0]
    const card2 = player.hand[1]
    const rank1 = getRankValue(card1.rank)
    const rank2 = getRankValue(card2.rank)
    const suited = card1.suit === card2.suit

    // Higher ranks and pairs get better equity
    let baseEquity = 0

    // Pairs
    if (card1.rank === card2.rank) {
      // Pair strength from 55% for 22 to 85% for AA
      baseEquity = 55 + (rank1 - 2) * 2.5
    }
    // Suited cards
    else if (suited) {
      // Higher cards and connected cards get better equity
      const rankDiff = Math.abs(rank1 - rank2)
      baseEquity = 45 + (rank1 + rank2) / 5 - rankDiff * 2
    }
    // Offsuit cards
    else {
      // Higher cards get better equity
      const rankDiff = Math.abs(rank1 - rank2)
      baseEquity = 40 + (rank1 + rank2) / 6 - rankDiff * 2.5
    }

    // Adjust based on number of players (equity decreases with more players)
    const playerAdjustment = 100 / activePlayers.length
    player.equity = Math.min(
      Math.max((baseEquity * playerAdjustment) / 100, 5),
      95
    )
  }

  // Set equity to 0 for inactive players
  for (const player of newPlayers) {
    if (!player.isActive || !player.hand) {
      player.equity = 0
    }
  }

  return { ...gameState, players: newPlayers }
}

/**
 * Calculate equity using Monte Carlo simulation
 */
export const calculateEquityMonteCarlo = (gameState: GameState): GameState => {
  const { players, communityCards, deck } = gameState
  const newPlayers = [...players]

  // Get active players with hands
  const activePlayers = newPlayers.filter((p) => p.isActive && p.hand)

  // Initialize win counters
  const winCounts: Record<number, number> = {}
  activePlayers.forEach((p) => (winCounts[p.id] = 0))

  // Run simulations
  for (let i = 0; i < SIMULATION_COUNT; i++) {
    // Create a copy of the community cards and available cards
    const usedCards = [...communityCards]

    // Add player hole cards to used cards list
    activePlayers.forEach((p) => {
      if (p.hand) {
        usedCards.push(...p.hand)
      }
    })

    // Create a new shuffled deck without the used cards
    const remainingDeck = createRemainingDeck(usedCards)

    // Calculate how many more community cards we need
    const neededCardCount = 5 - communityCards.length

    // Draw the remaining community cards
    const simulatedCommunityCards = [
      ...communityCards,
      ...remainingDeck.slice(0, neededCardCount),
    ]

    // Evaluate each player's hand with the simulated community cards
    const handResults = activePlayers.map((p) => {
      if (!p.hand) return { playerId: p.id, handResult: null }
      return {
        playerId: p.id,
        handResult: evaluateHand(p.hand, simulatedCommunityCards),
      }
    })

    // Find winners
    const validResults = handResults.filter((r) => r.handResult !== null)
    if (validResults.length === 0) continue

    let bestHandResult = validResults[0].handResult!
    let winners = [validResults[0].playerId]

    for (let j = 1; j < validResults.length; j++) {
      const comparison = compareHands(
        validResults[j].handResult!,
        bestHandResult
      )

      if (comparison > 0) {
        // This hand is better
        bestHandResult = validResults[j].handResult!
        winners = [validResults[j].playerId]
      } else if (comparison === 0) {
        // This hand ties the best hand
        winners.push(validResults[j].playerId)
      }
    }

    // Increment win counter for each winner (split wins count as partial wins)
    winners.forEach((winnerId) => {
      winCounts[winnerId] += 1 / winners.length
    })
  }

  // Calculate final equity percentages
  for (const player of newPlayers) {
    player.equity =
      player.isActive && player.hand
        ? (winCounts[player.id] / SIMULATION_COUNT) * 100
        : 0
  }

  return { ...gameState, players: newPlayers }
}

/**
 * Create a deck without the already used cards
 */
const createRemainingDeck = (usedCards: Card[]): Card[] => {
  const fullDeck = createNewDeck()

  // Filter out cards that are already in use
  return fullDeck.filter(
    (card) =>
      !usedCards.some(
        (usedCard) => usedCard.rank === card.rank && usedCard.suit === card.suit
      )
  )
}

/**
 * Get numerical value of card rank
 */
const getRankValue = (rank: string): number => {
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
