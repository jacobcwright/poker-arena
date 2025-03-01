import { Card, Hand } from "../types"

// Hand types in ascending order of strength
export enum HandType {
  HighCard,
  Pair,
  TwoPair,
  ThreeOfAKind,
  Straight,
  Flush,
  FullHouse,
  FourOfAKind,
  StraightFlush,
  RoyalFlush,
}

export interface HandResult {
  handType: HandType
  handRank: number // Numerical rank for comparing same hand types
  description: string // Human-readable description
}

// Convert card rank to numeric value for comparison
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

// Main function to evaluate a poker hand
export const evaluateHand = (
  playerHand: Hand,
  communityCards: Card[]
): HandResult => {
  // Combine player's hand with community cards
  const allCards = [...playerHand, ...communityCards]

  // Sort cards by rank (high to low)
  allCards.sort((a, b) => rankToValue(b.rank) - rankToValue(a.rank))

  // Check for each hand type from highest to lowest
  let result: HandResult | null = null

  result =
    checkRoyalFlush(allCards) ||
    checkStraightFlush(allCards) ||
    checkFourOfAKind(allCards) ||
    checkFullHouse(allCards) ||
    checkFlush(allCards) ||
    checkStraight(allCards) ||
    checkThreeOfAKind(allCards) ||
    checkTwoPair(allCards) ||
    checkPair(allCards) ||
    getHighCard(allCards)

  return result
}

// Check for royal flush
const checkRoyalFlush = (cards: Card[]): HandResult | null => {
  const straightFlush = checkStraightFlush(cards)
  if (straightFlush && rankToValue(cards[0].rank) === 14) {
    return {
      handType: HandType.RoyalFlush,
      handRank: 10,
      description: "Royal Flush",
    }
  }
  return null
}

// Check for straight flush
const checkStraightFlush = (cards: Card[]): HandResult | null => {
  // Group cards by suit
  const suitGroups = cards.reduce((groups, card) => {
    if (!groups[card.suit]) {
      groups[card.suit] = []
    }
    groups[card.suit].push(card)
    return groups
  }, {} as Record<string, Card[]>)

  // Check if any suit group has a straight
  for (const suit in suitGroups) {
    if (suitGroups[suit].length >= 5) {
      const sortedCards = suitGroups[suit].sort(
        (a, b) => rankToValue(b.rank) - rankToValue(a.rank)
      )
      const straight = checkStraightInCards(sortedCards)
      if (straight) {
        return {
          handType: HandType.StraightFlush,
          handRank: rankToValue(straight.highestCard.rank),
          description: `Straight Flush, ${straight.highestCard.rank} high`,
        }
      }
    }
  }

  return null
}

// Check for four of a kind
const checkFourOfAKind = (cards: Card[]): HandResult | null => {
  const rankGroups = groupByRank(cards)

  for (const rank in rankGroups) {
    if (rankGroups[rank].length === 4) {
      return {
        handType: HandType.FourOfAKind,
        handRank: rankToValue(rank),
        description: `Four of a Kind, ${rank}s`,
      }
    }
  }

  return null
}

// Check for full house
const checkFullHouse = (cards: Card[]): HandResult | null => {
  const rankGroups = groupByRank(cards)
  let threeOfAKindRank: string | null = null
  let pairRank: string | null = null

  // Find three of a kind (highest if multiple)
  for (const rank in rankGroups) {
    if (rankGroups[rank].length >= 3) {
      if (
        !threeOfAKindRank ||
        rankToValue(rank) > rankToValue(threeOfAKindRank)
      ) {
        threeOfAKindRank = rank
      }
    }
  }

  // Find a pair (highest if multiple, different from three of a kind)
  for (const rank in rankGroups) {
    if (rankGroups[rank].length >= 2 && rank !== threeOfAKindRank) {
      if (!pairRank || rankToValue(rank) > rankToValue(pairRank)) {
        pairRank = rank
      }
    }
  }

  if (threeOfAKindRank && pairRank) {
    return {
      handType: HandType.FullHouse,
      handRank: rankToValue(threeOfAKindRank) * 100 + rankToValue(pairRank),
      description: `Full House, ${threeOfAKindRank}s over ${pairRank}s`,
    }
  }

  return null
}

// Check for flush
const checkFlush = (cards: Card[]): HandResult | null => {
  // Group cards by suit
  const suitGroups = cards.reduce((groups, card) => {
    if (!groups[card.suit]) {
      groups[card.suit] = []
    }
    groups[card.suit].push(card)
    return groups
  }, {} as Record<string, Card[]>)

  // Find the suit with at least 5 cards
  for (const suit in suitGroups) {
    if (suitGroups[suit].length >= 5) {
      const sortedBySuit = suitGroups[suit].sort(
        (a, b) => rankToValue(b.rank) - rankToValue(a.rank)
      )
      const highCard = sortedBySuit[0]

      return {
        handType: HandType.Flush,
        handRank: rankToValue(highCard.rank),
        description: `Flush, ${highCard.rank} high`,
      }
    }
  }

  return null
}

// Check for straight
const checkStraight = (cards: Card[]): HandResult | null => {
  const result = checkStraightInCards(cards)
  if (result) {
    return {
      handType: HandType.Straight,
      handRank: rankToValue(result.highestCard.rank),
      description: `Straight, ${result.highestCard.rank} high`,
    }
  }
  return null
}

// Helper function to check for a straight in a set of cards
const checkStraightInCards = (cards: Card[]): { highestCard: Card } | null => {
  // Remove duplicate ranks
  const uniqueRanks = Array.from(
    new Set(cards.map((card) => rankToValue(card.rank)))
  )
  uniqueRanks.sort((a, b) => b - a)

  // Handle A-5-4-3-2 straight
  if (
    uniqueRanks.includes(14) &&
    uniqueRanks.includes(5) &&
    uniqueRanks.includes(4) &&
    uniqueRanks.includes(3) &&
    uniqueRanks.includes(2)
  ) {
    // Find the 5 card in the original set
    const fiveCard = cards.find((card) => rankToValue(card.rank) === 5)
    if (fiveCard) {
      return { highestCard: fiveCard }
    }
  }

  // Check for 5 consecutive cards
  for (let i = 0; i < uniqueRanks.length - 4; i++) {
    if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
      // Find the highest card in the straight from the original set
      const highestCard = cards.find(
        (card) => rankToValue(card.rank) === uniqueRanks[i]
      )
      if (highestCard) {
        return { highestCard }
      }
    }
  }

  return null
}

// Check for three of a kind
const checkThreeOfAKind = (cards: Card[]): HandResult | null => {
  const rankGroups = groupByRank(cards)

  for (const rank in rankGroups) {
    if (rankGroups[rank].length === 3) {
      return {
        handType: HandType.ThreeOfAKind,
        handRank: rankToValue(rank),
        description: `Three of a Kind, ${rank}s`,
      }
    }
  }

  return null
}

// Check for two pair
const checkTwoPair = (cards: Card[]): HandResult | null => {
  const rankGroups = groupByRank(cards)
  const pairs: number[] = []

  for (const rank in rankGroups) {
    if (rankGroups[rank].length === 2) {
      pairs.push(rankToValue(rank))
    }
  }

  if (pairs.length >= 2) {
    // Sort pairs in descending order
    pairs.sort((a, b) => b - a)

    // Get readable rank names for description
    const highPairRank = getReadableRank(pairs[0])
    const lowPairRank = getReadableRank(pairs[1])

    return {
      handType: HandType.TwoPair,
      handRank: pairs[0] * 100 + pairs[1],
      description: `Two Pair, ${highPairRank}s and ${lowPairRank}s`,
    }
  }

  return null
}

// Check for a pair
const checkPair = (cards: Card[]): HandResult | null => {
  const rankGroups = groupByRank(cards)

  for (const rank in rankGroups) {
    if (rankGroups[rank].length === 2) {
      return {
        handType: HandType.Pair,
        handRank: rankToValue(rank),
        description: `Pair of ${rank}s`,
      }
    }
  }

  return null
}

// Get high card result
const getHighCard = (cards: Card[]): HandResult => {
  const highCard = cards[0] // Cards are already sorted

  return {
    handType: HandType.HighCard,
    handRank: rankToValue(highCard.rank),
    description: `High Card ${highCard.rank}`,
  }
}

// Helper function to group cards by rank
const groupByRank = (cards: Card[]): Record<string, Card[]> => {
  return cards.reduce((groups, card) => {
    if (!groups[card.rank]) {
      groups[card.rank] = []
    }
    groups[card.rank].push(card)
    return groups
  }, {} as Record<string, Card[]>)
}

// Helper to convert numeric rank to readable format
const getReadableRank = (rank: number): string => {
  const readableRanks: Record<number, string> = {
    14: "A",
    13: "K",
    12: "Q",
    11: "J",
  }
  return readableRanks[rank] || rank.toString()
}

// Compare two hands to determine the winner
export const compareHands = (hand1: HandResult, hand2: HandResult): number => {
  // First compare by hand type
  if (hand1.handType !== hand2.handType) {
    return hand1.handType - hand2.handType
  }

  // If same hand type, compare by rank within that type
  return hand1.handRank - hand2.handRank
}
