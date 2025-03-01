import { Card, GameState, Player, PlayerAction, Rank, Suit } from "../types"
import { determineAction, assignPersonalities } from "./pokerAI"
import { evaluateHand, compareHands, HandResult } from "./handEvaluator"

export const createNewDeck = (): Card[] => {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"]
  const ranks: Rank[] = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ]
  const deck: Card[] = []

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, faceUp: false })
    }
  }

  return shuffleDeck(deck)
}

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const createInitialGameState = (playerCount: number): GameState => {
  const deck = createNewDeck()
  const players: Player[] = []

  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: i,
      name: `Claude NPC ${i + 1}`,
      hand: null,
      chips: 1000, // Starting chips
      currentBet: 0,
      isActive: true,
      isAllIn: false,
      isDealer: i === 0, // First player starts as dealer
      isTurn: i === 1, // Second player starts (small blind)
    })
  }

  return {
    players,
    deck,
    communityCards: [], // Empty array for community cards
    pot: 0,
    currentPhase: "idle",
    activePlayerIndex: 1,
    dealerIndex: 0,
    minBet: 10, // Small blind amount
    isRunning: false,
  }
}

export const dealPlayerCards = (gameState: GameState): GameState => {
  const newState = { ...gameState }
  const { deck, players } = newState

  // Deal two cards to each player
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < players.length; j++) {
      if (players[j].isActive) {
        const card = deck.pop()
        if (card) {
          if (!players[j].hand) {
            players[j].hand = [card, card] // Initialize with same card (will be replaced)
          }
          players[j].hand![i] = { ...card, faceUp: false }
        }
      }
    }
  }

  newState.currentPhase = "preFlop"
  return newState
}

export const dealFlop = (gameState: GameState): GameState => {
  const newState = { ...gameState }
  const { deck } = newState

  // Burn a card
  deck.pop()

  // Deal three cards for the flop
  for (let i = 0; i < 3; i++) {
    const card = deck.pop()
    if (card) {
      newState.communityCards.push({ ...card, faceUp: true })
    }
  }

  newState.currentPhase = "flop"
  return newState
}

export const dealTurn = (gameState: GameState): GameState => {
  const newState = { ...gameState }
  const { deck } = newState

  // Burn a card
  deck.pop()

  // Deal one card for the turn
  const card = deck.pop()
  if (card) {
    newState.communityCards.push({ ...card, faceUp: true })
  }

  newState.currentPhase = "turn"
  return newState
}

export const dealRiver = (gameState: GameState): GameState => {
  const newState = { ...gameState }
  const { deck } = newState

  // Burn a card
  deck.pop()

  // Deal one card for the river
  const card = deck.pop()
  if (card) {
    newState.communityCards.push({ ...card, faceUp: true })
  }

  newState.currentPhase = "river"
  return newState
}

export const nextPlayer = (gameState: GameState): GameState => {
  const newState = { ...gameState }
  const { players } = newState

  let nextIndex = (newState.activePlayerIndex + 1) % players.length

  // Find next active player
  while (!players[nextIndex].isActive || players[nextIndex].isAllIn) {
    nextIndex = (nextIndex + 1) % players.length

    // If we've gone full circle, break to avoid infinite loop
    if (nextIndex === newState.activePlayerIndex) {
      break
    }
  }

  // Update current player turn status
  players[newState.activePlayerIndex].isTurn = false
  players[nextIndex].isTurn = true
  newState.activePlayerIndex = nextIndex

  return newState
}

// Initialize blinds
export const initializeBlinds = (gameState: GameState): GameState => {
  const newState = { ...gameState }
  const { players, dealerIndex, minBet } = newState

  // Small blind is to the left of the dealer
  const smallBlindIndex = (dealerIndex + 1) % players.length
  // Big blind is to the left of the small blind
  const bigBlindIndex = (smallBlindIndex + 1) % players.length

  // Post small blind
  const smallBlindAmount = minBet
  const smallBlind = players[smallBlindIndex]
  smallBlind.chips -= smallBlindAmount
  smallBlind.currentBet = smallBlindAmount

  // Post big blind
  const bigBlindAmount = minBet * 2
  const bigBlind = players[bigBlindIndex]
  bigBlind.chips -= bigBlindAmount
  bigBlind.currentBet = bigBlindAmount

  // Update pot
  newState.pot = smallBlindAmount + bigBlindAmount

  // Set active player to be after the big blind
  newState.activePlayerIndex = (bigBlindIndex + 1) % players.length

  return newState
}

// Process a betting round
export const processBettingRound = async (
  gameState: GameState,
  setGameState: (state: GameState) => void,
  delay: number
): Promise<GameState> => {
  let currentState = { ...gameState }

  // Track the highest bet in this round
  let highestBet = Math.max(...currentState.players.map((p) => p.currentBet))

  // Keep track of which players have acted
  const hasActed = new Set<number>()

  // Track the player who made the last raise
  let lastRaiser = -1

  // Continue until all active players have acted and all bets are matched
  // or only one player remains active
  while (true) {
    const activePlayer = currentState.players[currentState.activePlayerIndex]

    // Skip players who have folded or are all-in
    if (!activePlayer.isActive || activePlayer.isAllIn) {
      // Move to next player
      currentState = nextPlayer(currentState)
      continue
    }

    // If this player has already acted and their bet matches the highest bet,
    // and we've gone all the way around the table since the last raise,
    // then the betting round is complete
    if (
      hasActed.has(activePlayer.id) &&
      activePlayer.currentBet === highestBet &&
      (lastRaiser === -1 || currentState.activePlayerIndex === lastRaiser)
    ) {
      break
    }

    // Get player's action from AI
    const { action, betAmount = 0 } = determineAction(
      currentState,
      activePlayer.id
    )

    // Process the action
    switch (action) {
      case "fold":
        activePlayer.isActive = false
        break

      case "check":
        // Can only check if no one has bet yet or player has matched highest bet
        if (activePlayer.currentBet < highestBet) {
          // If check isn't valid, treat as call
          activePlayer.chips -= highestBet - activePlayer.currentBet
          currentState.pot += highestBet - activePlayer.currentBet
          activePlayer.currentBet = highestBet
        }
        break

      case "call":
        // Add the difference to the pot
        activePlayer.chips -= highestBet - activePlayer.currentBet
        currentState.pot += highestBet - activePlayer.currentBet
        activePlayer.currentBet = highestBet
        break

      case "bet":
      case "raise":
        // Ensure minimum bet is met
        const actualBet = Math.max(betAmount, currentState.minBet * 2)
        // Ensure player has enough chips
        const maxBet = Math.min(actualBet, activePlayer.chips)

        // Add the current highest bet difference plus the raise amount
        const additionalAmount = highestBet - activePlayer.currentBet + maxBet

        // Update player's chips and bet
        activePlayer.chips -= additionalAmount
        currentState.pot += additionalAmount
        activePlayer.currentBet = highestBet + maxBet

        // Update highest bet
        highestBet = activePlayer.currentBet

        // Update last raiser
        lastRaiser = currentState.activePlayerIndex

        // If player is now out of chips, mark as all-in
        if (activePlayer.chips === 0) {
          activePlayer.isAllIn = true
        }
        break

      case "allIn":
        // Put all remaining chips in the pot
        const allInAmount = activePlayer.chips
        activePlayer.chips = 0
        activePlayer.isAllIn = true

        currentState.pot += allInAmount
        activePlayer.currentBet += allInAmount

        // If this is a raise, update the highest bet and last raiser
        if (activePlayer.currentBet > highestBet) {
          highestBet = activePlayer.currentBet
          lastRaiser = currentState.activePlayerIndex
        }
        break
    }

    // Mark this player as having acted
    hasActed.add(activePlayer.id)

    // Update the game state to show the action
    setGameState({ ...currentState })

    // Pause to show the action
    await new Promise((resolve) => setTimeout(resolve, delay))

    // Count active players (not folded or all-in)
    const activePlayerCount = currentState.players.filter(
      (p) => p.isActive && !p.isAllIn
    ).length

    // If only one player remains active, end the round
    if (activePlayerCount <= 1) {
      break
    }

    // Move to next player
    currentState = nextPlayer(currentState)
  }

  return currentState
}

// Determine the winner(s) of the hand
export const determineWinners = (
  gameState: GameState
): {
  winners: Player[]
  handDescriptions: Record<number, string>
} => {
  const { players, communityCards } = gameState
  const activePlayers = players.filter((p) => p.isActive)

  if (activePlayers.length === 1) {
    // If only one player is active, they win by default
    return {
      winners: [activePlayers[0]],
      handDescriptions: {},
    }
  }

  // Evaluate each player's hand
  const handResults = activePlayers.reduce((results, player) => {
    if (player.hand) {
      results[player.id] = evaluateHand(player.hand, communityCards)
    }
    return results
  }, {} as Record<number, HandResult>)

  // Collect hand descriptions
  const handDescriptions = Object.entries(handResults).reduce(
    (descriptions, [playerId, result]) => {
      descriptions[Number(playerId)] = result.description
      return descriptions
    },
    {} as Record<number, string>
  )

  // Find the highest hand
  let bestHandType = -1
  let bestHandRank = -1
  let winners: Player[] = []

  activePlayers.forEach((player) => {
    const result = handResults[player.id]
    if (!result) return

    if (
      result.handType > bestHandType ||
      (result.handType === bestHandType && result.handRank > bestHandRank)
    ) {
      // This hand is better than the current best
      bestHandType = result.handType
      bestHandRank = result.handRank
      winners = [player]
    } else if (
      result.handType === bestHandType &&
      result.handRank === bestHandRank
    ) {
      // This is a tie
      winners.push(player)
    }
  })

  return { winners, handDescriptions }
}

// Reset for a new hand
export const setupNextHand = (gameState: GameState): GameState => {
  const newState = { ...gameState }

  // Move dealer button
  newState.dealerIndex = (newState.dealerIndex + 1) % newState.players.length

  // Reset player states
  newState.players.forEach((player) => {
    player.hand = null
    player.currentBet = 0
    player.isActive = true
    player.isAllIn = false
    player.isDealer = player.id === newState.dealerIndex
    player.isTurn = false
  })

  // Reset game state
  newState.deck = createNewDeck()
  newState.communityCards = []
  newState.pot = 0
  newState.currentPhase = "idle"

  // Initialize blinds and set the active player
  return initializeBlinds(newState)
}

// Award pot to winner(s)
export const awardPot = (
  gameState: GameState,
  winners: Player[]
): GameState => {
  const newState = { ...gameState }

  if (winners.length === 0) return newState

  // Split the pot evenly among winners
  const winAmount = Math.floor(newState.pot / winners.length)
  const remainder = newState.pot % winners.length

  winners.forEach((winner, index) => {
    const playerIndex = newState.players.findIndex((p) => p.id === winner.id)
    if (playerIndex !== -1) {
      // Add an extra chip to early winners if there's a remainder
      const extra = index < remainder ? 1 : 0
      newState.players[playerIndex].chips += winAmount + extra
    }
  })

  // Reset the pot
  newState.pot = 0

  return newState
}

// To be implemented: hand evaluation, betting logic, round progression, etc.
