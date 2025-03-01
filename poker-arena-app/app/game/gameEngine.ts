import {
  ActivityLogEntry,
  Card,
  GameState,
  Player,
  PlayerAction,
  Rank,
  Suit,
  Emotion,
} from "../types"
import {
  determineAction,
  assignPersonalities,
  getActionDescription,
} from "./pokerAI"
import { evaluateHand, compareHands, HandResult } from "./handEvaluator"
import { calculateEquity } from "./equityCalculator"

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

// Add this new function to generate unique poker player names with personalities
export const generatePokerPlayerName = (
  id: number
): { name: string; personality: string } => {
  const pokerPersonalities = [
    "aggressive",
    "tight",
    "analytical",
    "loose",
    "conservative",
    "bluffer",
    "aggressive",
    "passive",
    "analytical",
    "loose",
    "tight",
    "unpredictable",
    "balanced",
    "aggressive",
    "cautious",
    "aggressive",
    "passive",
    "loose",
    "tight",
    "risk-taker",
  ]

  // Use modulo to cycle through the personalities if there are more players than personalities
  const personalityIndex = id % pokerPersonalities.length
  const personality = pokerPersonalities[personalityIndex]
  const name = `Player ${id + 1}`

  return { name, personality }
}

export const createInitialGameState = (playerCount: number): GameState => {
  const deck = createNewDeck()
  const players: Player[] = []

  for (let i = 0; i < playerCount; i++) {
    const personality = generatePokerPlayerName(i)
    players.push({
      id: i,
      name: `Player ${i + 1}`, // The actual name will be set by page.tsx
      personality: personality.personality, // Store personality separately
      hand: null,
      chips: 100, // Starting chips
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
    activityLog: [], // Initialize with empty activity log
  }
}

export const dealPlayerCards = (gameState: GameState): GameState => {
  const newState = {
    ...gameState,
    // Clear winner information when dealing new cards
    winningPlayers: undefined,
    handResults: undefined,
  }
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

  newState.currentPhase = "dealing"

  // Add a phase change log entry
  const stateWithLog = logPhaseChange(
    newState,
    "dealing",
    "Cards are being dealt to players"
  )

  // Calculate initial equity after dealing
  return calculateEquity(stateWithLog)
}

export const dealFlop = (gameState: GameState): GameState => {
  const newState = {
    ...gameState,
    // Clear winner information when dealing new cards
    winningPlayers: undefined,
    handResults: undefined,
  }
  const { deck } = newState

  // Burn one card
  deck.pop()

  // Deal three cards for the flop
  for (let i = 0; i < 3; i++) {
    const card = deck.pop()
    if (card) {
      newState.communityCards.push({ ...card, faceUp: true })
    }
  }

  newState.currentPhase = "flop"

  // Add a phase change log entry
  const stateWithLog = logPhaseChange(newState, "flop", "Flop cards are dealt")

  // Calculate equity after the flop
  return calculateEquity(stateWithLog)
}

export const dealTurn = (gameState: GameState): GameState => {
  const newState = {
    ...gameState,
    // Clear winner information when dealing new cards
    winningPlayers: undefined,
    handResults: undefined,
  }
  const { deck } = newState

  // Burn one card
  deck.pop()

  // Deal one card for the turn
  const card = deck.pop()
  if (card) {
    newState.communityCards.push({ ...card, faceUp: true })
  }

  newState.currentPhase = "turn"

  // Add a phase change log entry
  const stateWithLog = logPhaseChange(newState, "turn", "Turn card is dealt")

  // Calculate equity after the turn
  return calculateEquity(stateWithLog)
}

export const dealRiver = (gameState: GameState): GameState => {
  const newState = {
    ...gameState,
    // Clear winner information when dealing new cards
    winningPlayers: undefined,
    handResults: undefined,
  }
  const { deck } = newState

  // Burn one card
  deck.pop()

  // Deal one card for the river
  const card = deck.pop()
  if (card) {
    newState.communityCards.push({ ...card, faceUp: true })
  }

  newState.currentPhase = "river"

  // Add a phase change log entry
  const stateWithLog = logPhaseChange(newState, "river", "River card is dealt")

  // Calculate equity after the river
  return calculateEquity(stateWithLog)
}

export const nextPlayer = (gameState: GameState): GameState => {
  const newState = { ...gameState }
  const { players } = newState

  let nextIndex = (newState.activePlayerIndex + 1) % players.length

  // Find next active player who has chips and is not all-in
  while (
    !players[nextIndex].isActive ||
    players[nextIndex].isAllIn ||
    players[nextIndex].chips <= 0
  ) {
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

// Helper function to add a log entry
export const addLogEntry = (
  state: GameState,
  playerId: number,
  action: ActivityLogEntry["action"],
  description: string,
  amount?: number,
  chainOfThought: string = "",
  emotion?: Emotion,
  reasoningSummary?: string
): GameState => {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return state

  const newState = { ...state }
  if (!newState.activityLog) {
    newState.activityLog = []
  }

  // Add equity to the log entry if available
  newState.activityLog.push({
    playerId,
    playerName: player.name,
    action,
    description,
    timestamp: Date.now(),
    phase: state.currentPhase,
    amount,
    equity: player.equity, // Include current equity in the log
    chainOfThought,
    reasoningSummary,
    emotion: emotion || player.emotion || "neutral", // Include emotion in the log
  })

  return newState
}

// Log a phase change
export const logPhaseChange = (
  state: GameState,
  phase: GameState["currentPhase"],
  description: string
): GameState => {
  // Use dealer as the "actor" for phase changes
  const dealerId = state.players[state.dealerIndex]?.id ?? 0

  return addLogEntry(state, dealerId, "phase", description)
}

// Initialize blinds
export const initializeBlinds = (gameState: GameState): GameState => {
  let newState = { ...gameState }
  const { players, dealerIndex, minBet } = newState

  // Small blind is to the left of the dealer, skipping eliminated players
  let smallBlindIndex = (dealerIndex + 1) % players.length
  while (!players[smallBlindIndex].isActive) {
    smallBlindIndex = (smallBlindIndex + 1) % players.length
    // If we've gone full circle, break to avoid infinite loop
    if (smallBlindIndex === dealerIndex) {
      // No active players left for small blind
      return newState
    }
  }

  // Big blind is to the left of the small blind, skipping eliminated players
  let bigBlindIndex = (smallBlindIndex + 1) % players.length
  while (!players[bigBlindIndex].isActive) {
    bigBlindIndex = (bigBlindIndex + 1) % players.length
    // If we've gone back to small blind, break to avoid infinite loop
    if (bigBlindIndex === smallBlindIndex) {
      // Only one active player - game should end
      return newState
    }
  }

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

  // Handle case where a player goes negative from posting blinds
  if (smallBlind.chips < 0) {
    // Add the negative amount back to the pot (they only contributed what they had)
    const correction = -smallBlind.chips
    newState.pot -= correction
    smallBlind.currentBet -= correction
    smallBlind.chips = 0
    smallBlind.isAllIn = true
    // Log that player is all-in from small blind
    newState = addLogEntry(
      newState,
      smallBlind.id,
      "allIn",
      `${smallBlind.name} is all-in from small blind`,
      smallBlind.currentBet
    )
  }

  if (bigBlind.chips < 0) {
    // Add the negative amount back to the pot (they only contributed what they had)
    const correction = -bigBlind.chips
    newState.pot -= correction
    bigBlind.currentBet -= correction
    bigBlind.chips = 0
    bigBlind.isAllIn = true
    // Log that player is all-in from big blind
    newState = addLogEntry(
      newState,
      bigBlind.id,
      "allIn",
      `${bigBlind.name} is all-in from big blind`,
      bigBlind.currentBet
    )
  }

  // Update pot
  newState.pot = smallBlind.currentBet + bigBlind.currentBet

  // Set active player to be after the big blind, skipping eliminated players
  let activeIndex = (bigBlindIndex + 1) % players.length
  while (!players[activeIndex].isActive) {
    activeIndex = (activeIndex + 1) % players.length
    // If we've gone full circle, use the small blind as the active player
    if (activeIndex === bigBlindIndex) {
      activeIndex = smallBlindIndex
      break
    }
  }
  newState.activePlayerIndex = activeIndex

  // Log blind actions
  let updatedState = addLogEntry(
    newState,
    smallBlind.id,
    "blind",
    `Posts small blind of $${smallBlind.currentBet}`,
    smallBlind.currentBet
  )

  updatedState = addLogEntry(
    updatedState,
    bigBlind.id,
    "blind",
    `Posts big blind of $${bigBlind.currentBet}`,
    bigBlind.currentBet
  )

  return updatedState
}

// Process a betting round
export const processBettingRound = async (
  gameState: GameState,
  setGameState: (state: GameState) => void,
  delay: number,
  getPlayerDecision?: (
    player: Player,
    gameState: GameState
  ) =>
    | Promise<{
        action: PlayerAction
        betAmount?: number
        chainOfThought?: string
        emotion?: Emotion
        reasoningSummary?: string
      }>
    | {
        action: PlayerAction
        betAmount?: number
        chainOfThought?: string
        emotion?: Emotion
        reasoningSummary?: string
      }
): Promise<GameState> => {
  // This is a work in progress implementation
  let currentState = { ...gameState }

  // Calculate initial equity at the start of the betting round
  currentState = calculateEquity(currentState)
  setGameState(currentState)

  // Track the highest bet in this round
  let highestBet = Math.max(...currentState.players.map((p) => p.currentBet))

  // Keep track of which players have acted
  const hasActed = new Set<number>()

  // Track the player who made the last raise
  let lastRaiser = -1

  // Check if there are any active players who can still act
  const canActPlayerCount = currentState.players.filter(
    (p) => p.isActive && !p.isAllIn && p.chips > 0
  ).length

  // If no players can act, end the betting round immediately
  if (canActPlayerCount === 0) {
    return currentState
  }

  // Continue until all active players have acted and all bets are matched
  // or only one player remains active
  while (true) {
    const activePlayer = currentState.players[currentState.activePlayerIndex]

    // Check for the case where we've gone full circle without finding an active player
    const initialIndex = currentState.activePlayerIndex

    // Skip players who have folded, are all-in, or have no chips
    if (
      !activePlayer.isActive ||
      activePlayer.isAllIn ||
      activePlayer.chips <= 0
    ) {
      // Move to next player
      const nextState = nextPlayer(currentState)

      // If we couldn't find a next player (went full circle), end the round
      if (nextState.activePlayerIndex === initialIndex) {
        return currentState
      }

      currentState = nextState
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

    // Get player's action - use provided getPlayerDecision if available, otherwise fall back to determineAction
    let action: PlayerAction
    let betAmount: number = 0
    let chainOfThought: string = ""
    let emotion: Emotion = "neutral"
    let reasoningSummary: string = ""

    if (getPlayerDecision) {
      // Use the provided decision function (could be from Llama or other source)
      const decision = await getPlayerDecision(activePlayer, currentState)
      action = decision.action
      betAmount = decision.betAmount || 0
      chainOfThought = decision.chainOfThought || ""
      emotion = decision.emotion || "neutral"
      reasoningSummary = decision.reasoningSummary || ""

      // Update player's emotion
      activePlayer.emotion = emotion
    } else {
      // Fall back to the default AI decision
      const decision = determineAction(currentState, activePlayer.id)
      action = decision.action
      betAmount = decision.betAmount || 0

      // Set appropriate emotions based on action
      switch (action) {
        case "fold":
          activePlayer.emotion = "disappointed"
          break
        case "check":
          activePlayer.emotion = "neutral"
          break
        case "call":
          activePlayer.emotion = "thoughtful"
          break
        case "bet":
        case "raise":
          activePlayer.emotion = Math.random() > 0.5 ? "confident" : "bluffing"
          break
        case "allIn":
          activePlayer.emotion = Math.random() > 0.7 ? "excited" : "nervous"
          break
      }
    }

    // Get a description of the AI's thought process for the log
    const actionDescription = getActionDescription(
      activePlayer.id,
      action,
      betAmount
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
        const callAmount = highestBet - activePlayer.currentBet
        activePlayer.chips -= callAmount
        currentState.pot += callAmount
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
        if (activePlayer.chips <= 0) {
          activePlayer.isAllIn = true
          // Ensure chips don't go negative
          if (activePlayer.chips < 0) {
            // Add the negative amount back to the pot
            currentState.pot += activePlayer.chips
            // Adjust the current bet
            activePlayer.currentBet += activePlayer.chips
            // Set chips to exactly zero
            activePlayer.chips = 0
          }
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

    // Log the player action with emotion
    currentState = addLogEntry(
      currentState,
      activePlayer.id,
      action,
      actionDescription,
      action === "bet" || action === "raise"
        ? activePlayer.currentBet
        : undefined,
      chainOfThought,
      activePlayer.emotion,
      reasoningSummary
    )

    // Mark this player as having acted
    hasActed.add(activePlayer.id)

    // Update the game state to show the action
    setGameState({ ...currentState })

    // Pause to show the action
    await new Promise((resolve) => setTimeout(resolve, delay))

    // Count active players (not folded or all-in)
    const activePlayerCount = currentState.players.filter(
      (p) => p.isActive && !p.isAllIn && p.chips > 0
    ).length

    // If only one player remains active or no players can act, end the round
    if (activePlayerCount <= 1) {
      break
    }

    // Move to next player
    const nextState = nextPlayer(currentState)

    // If we couldn't find a next player (went full circle), end the round
    if (nextState.activePlayerIndex === currentState.activePlayerIndex) {
      // No more players can act, end the betting round
      break
    }

    currentState = nextState
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
  // Deep clone the players array to preserve chip counts
  const newPlayers = gameState.players.map((player) => ({ ...player }))

  const newState: GameState = {
    ...gameState,
    players: newPlayers,
    // Explicitly clear winner information
    winningPlayers: undefined,
    handResults: undefined,
  }

  // Move dealer button to the next player with chips > 0
  let nextDealerIndex = (newState.dealerIndex + 1) % newPlayers.length
  // Find next player with chips
  while (newPlayers[nextDealerIndex].chips <= 0) {
    nextDealerIndex = (nextDealerIndex + 1) % newPlayers.length
    // If we've gone full circle and no players have chips, break to avoid infinite loop
    if (nextDealerIndex === newState.dealerIndex) {
      break
    }
  }
  newState.dealerIndex = nextDealerIndex

  // Reset player round-specific states without changing chip counts
  newPlayers.forEach((player) => {
    player.hand = null
    player.currentBet = 0
    // Only set player as active if they have chips
    player.isActive = player.chips > 0
    player.isAllIn = false
    player.isDealer = player.id === newState.dealerIndex
    player.isTurn = false
  })

  // Reset game state for the new round
  newState.deck = createNewDeck()
  newState.communityCards = []
  newState.pot = 0
  newState.currentPhase = "idle"
  // Increment round counter
  newState.round = gameState.round ? gameState.round + 1 : 1

  // Log new round
  const updatedState = addLogEntry(
    newState,
    newState.players[newState.dealerIndex].id,
    "phase",
    `New hand begins. Round ${newState.round}`,
    undefined
  )

  // Initialize blinds and set the active player
  return initializeBlinds(updatedState)
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

  let updatedState = { ...newState }

  winners.forEach((winner, index) => {
    const playerIndex = newState.players.findIndex((p) => p.id === winner.id)
    if (playerIndex !== -1) {
      // Add an extra chip to early winners if there's a remainder
      const extra = index < remainder ? 1 : 0
      const totalWinAmount = winAmount + extra
      newState.players[playerIndex].chips += totalWinAmount

      // Log the win
      updatedState = addLogEntry(
        updatedState,
        winner.id,
        "win",
        `Wins $${totalWinAmount} from the pot`,
        totalWinAmount
      )
    }
  })

  // Reset the pot
  updatedState.pot = 0

  return updatedState
}

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// New roundLoop: plays one round, resetting round-specific data while preserving player data
export const roundLoop = async (
  gameState: GameState,
  setGameState: (state: GameState) => void,
  delay: number,
  getPlayerDecision: (
    player: Player,
    gameState: GameState
  ) =>
    | Promise<{
        action: PlayerAction
        betAmount?: number
        chainOfThought?: string
        emotion?: Emotion
        reasoningSummary?: string
      }>
    | {
        action: PlayerAction
        betAmount?: number
        chainOfThought?: string
        emotion?: Emotion
        reasoningSummary?: string
      }
): Promise<GameState> => {
  // Prepare new round: reset round-specific info while keeping persistent data (chips, etc.)
  let currentState = setupNextHand(gameState)

  // Deal player cards
  currentState = dealPlayerCards(currentState)
  setGameState(currentState)
  await wait(delay)

  // Pre-flop betting round
  currentState = await processBettingRound(
    currentState,
    setGameState,
    delay / 2,
    getPlayerDecision
  )

  // Check if the hand should continue (at least one active player remains)
  const hasActivePlayers = currentState.players.some((p) => p.isActive)
  if (!hasActivePlayers) {
    // No active players left, end the hand and determine winner
    const showdownState = {
      ...currentState,
      currentPhase: "showdown" as GameState["currentPhase"],
      winningPlayers: undefined,
      handResults: undefined,
    }
    const stateWithEquity = calculateEquity(showdownState)
    setGameState(stateWithEquity)
    await wait(delay / 2)

    const { winners, handDescriptions } = determineWinners(stateWithEquity)
    const finalState = {
      ...awardPot(stateWithEquity, winners),
      currentPhase: "showdown" as GameState["currentPhase"],
      winningPlayers: winners.map((w) => w.id),
      handResults: handDescriptions,
    }
    setGameState(finalState)
    await wait(delay * 3)
    return finalState
  }

  // Check if we need to continue with betting rounds (more than one active player and not everyone is all-in)
  const activePlayers = currentState.players.filter((p) => p.isActive)
  const allInCount = activePlayers.filter((p) => p.isAllIn).length
  const needMoreBetting =
    activePlayers.length > 1 && allInCount < activePlayers.length

  // Deal flop
  currentState = dealFlop(currentState)
  setGameState(currentState)
  await wait(delay)

  // Flop betting round only if there are players who can still bet
  if (needMoreBetting) {
    currentState = await processBettingRound(
      currentState,
      setGameState,
      delay / 2,
      getPlayerDecision
    )
  }

  // Deal turn
  currentState = dealTurn(currentState)
  setGameState(currentState)
  await wait(delay)

  // Turn betting round only if there are players who can still bet
  if (needMoreBetting) {
    currentState = await processBettingRound(
      currentState,
      setGameState,
      delay / 2,
      getPlayerDecision
    )
  }

  // Deal river
  currentState = dealRiver(currentState)
  setGameState(currentState)
  await wait(delay)

  // River betting round only if there are players who can still bet
  if (needMoreBetting) {
    currentState = await processBettingRound(
      currentState,
      setGameState,
      delay / 2,
      getPlayerDecision
    )
  }

  // Showdown phase
  const showdownState = {
    ...currentState,
    currentPhase: "showdown" as GameState["currentPhase"],
    // Clear any previous winner information to start fresh
    winningPlayers: undefined,
    handResults: undefined,
  }
  const stateWithEquity = calculateEquity(showdownState)
  setGameState(stateWithEquity)
  await wait(delay / 2)

  // Determine winners and award pot
  const { winners, handDescriptions } = determineWinners(stateWithEquity)
  const finalState = {
    ...awardPot(stateWithEquity, winners),
    // Only set winner information during showdown
    currentPhase: "showdown" as GameState["currentPhase"],
    winningPlayers: winners.map((w) => w.id),
    handResults: handDescriptions,
  }
  setGameState(finalState)
  await wait(delay * 3)

  return finalState
}

// New gameLoop: runs rounds continuously until only one player with chips remains or an external stop condition is met
export const gameLoop = async (
  initialGameState: GameState,
  setGameState: (state: GameState) => void,
  delay: number,
  getPlayerDecision: (
    player: Player,
    gameState: GameState
  ) =>
    | Promise<{
        action: PlayerAction
        betAmount?: number
        chainOfThought?: string
        emotion?: Emotion
        reasoningSummary?: string
      }>
    | {
        action: PlayerAction
        betAmount?: number
        chainOfThought?: string
        emotion?: Emotion
        reasoningSummary?: string
      },
  shouldStop: () => boolean
): Promise<void> => {
  let currentState = initialGameState
  while (!shouldStop()) {
    // Mark any players with zero or negative chips as eliminated
    currentState.players.forEach((player) => {
      if (player.chips <= 0) {
        player.isActive = false
        player.chips = 0 // Ensure chips don't go negative
      }
    })

    // Check game over: if only one player has chips remaining, end the loop
    const playersWithChips = currentState.players.filter((p) => p.chips > 0)
    if (playersWithChips.length <= 1) {
      if (playersWithChips.length === 1) {
        const winner = playersWithChips[0]
        // Update final state to include winningPlayers and handResults for showing winner result card
        const finalState = {
          ...currentState,
          winningPlayers: [winner.id],
          handResults: {
            [winner.id]: `Game over! ${winner.name} wins the tournament with ${winner.chips} chips!`,
          },
        }
        // Optionally, add a log entry
        const stateWithLog = addLogEntry(
          finalState,
          winner.id,
          "win",
          `Game over! ${winner.name} wins the tournament with ${winner.chips} chips!`,
          winner.chips
        )
        setGameState(stateWithLog)
      }
      break
    }
    currentState = await roundLoop(
      currentState,
      setGameState,
      delay,
      getPlayerDecision
    )
  }
}

// To be implemented: hand evaluation, betting logic, round progression, etc.
