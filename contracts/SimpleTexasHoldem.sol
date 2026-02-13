// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PokerHandEvaluator.sol";

/**
 * @title SimpleTexasHoldem
 * @dev A simplified Texas Hold'em poker game implemented as a smart contract
 * Owner controls game lifecycle, players join and bet within time windows
 */
contract SimpleTexasHoldem is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Custom Errors ============
    
    error ContractPaused();
    error NoActiveGame();
    error GameAlreadyActive();
    error DurationTooShort();
    error NoFees();
    error AlreadyParticipated();
    error GameFull();
    error MaxAttemptsReached();
    error NotEnoughCards();
    error JoinPeriodClosed();
    error NotInGame();
    error AlreadyBet();
    error MustJoinFirst();
    error MustBetSome();
    error NoCardsToReturn();
    error NotEnoughPlayers();
    error NoPlayers();
    error NoWinners();
    error TransferFailed();
    error NoCardsRemaining();

    // ============ Constants ============

    // Game configuration
    uint256 public constant MIN_PLAYERS = 2;
    uint256 public constant MAX_PLAYERS = 9;  // Maximum active betting players
    uint256 public constant MAX_TOTAL_PLAYERS = 50; // Max participation attempts (joiners + folders)
    uint256 public constant HOUSE_FEE_PERCENTAGE = 1; // 1% fee to contract owner
    uint256 public constant JOIN_CUTOFF = 5 minutes; // No joins in last 5 minutes
    uint256 public constant MIN_CARDS_REQUIRED = 7; // 2 hole + 5 board

    // Card deck (52 cards: 0-51)
    // Card index to rank/suit mapping:
    // Rank: cardIndex % 13 → 0-12 represent ranks 2-Ace (add 2 to get actual rank)
    // Suit: cardIndex / 13 → 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades
    uint8 public constant DECK_SIZE = 52;

    // ============ State Variables ============
    
    // Packed slot 1: Booleans (3 bytes total, fit in 1 slot)
    bool public useETH;              // 1 byte - If true, use ETH instead of ERC20 token
    bool public gameActive;          // 1 byte - Is there an active game?
    bool public gamePaused;          // 1 byte - Emergency pause
    
    // Slot 2: IERC20 interface (20 bytes = address)
    IERC20 public gameToken;         // 20 bytes - Game token address
    
    // Slot 3: uint256
    uint256 public currentGameId;    // 32 bytes - Current game ID counter
    
    // Slot 4: uint256
    uint256 public accumulatedHouseFees; // 32 bytes - House fee tracking
    
    // Slot 5: uint256
    uint256 private nonce;           // 32 bytes - Random number generation (NOTE: Use Chainlink VRF in production!)

    // ============ Structures ============

    // Player in active game (only stores betting players)
    struct Player {
        uint8[2] holeCards; // Two hole cards
        uint256 betAmount; // Amount player has bet
    }

    // Game state
    struct Game {
        uint256 gameId;
        uint256 startTime;
        uint256 endTime; // Owner sets this when starting game
        
        // Card storage for all participants (even those who fold)
        mapping(address => uint8[2]) playerCards; // Cards for anyone who joined
        
        // Active players (only those who bet)
        mapping(address => Player) activePlayers;
        address[] activePlayerAddresses; // List of betting players
        
        // Participation tracking (anyone who got cards, including folders)
        mapping(address => bool) hasParticipated;
        address[] allParticipants; // Everyone who joined (for cleanup)
        uint256 totalParticipations; // Counter for MAX_TOTAL_PLAYERS limit
        
        // Card pool for reuse
        bool[52] cardsInUse; // Track which cards are dealt
        uint8 cardsRemaining; // Quick counter
        
        // Board cards
        uint8[5] boardCards; // Five community cards
        
        // Results
        uint256 totalPot;
        address[] winners;
        uint256 houseFee;
    }

    // Game result data (used for events and storage)
    struct GameResult {
        uint256 gameId;
        uint256 startTime;
        uint256 endTime;
        address[] players;
        uint256[] betAmounts;
        uint8[5] boardCards;
        address[] winners;
        uint256 potPerWinner;
        uint256 houseFee;
    }

    // ============ Storage ============

    // Current game
    Game private currentGame;

    // ============ Events ============

    event GameStarted(uint256 indexed gameId, uint256 startTime, uint256 endTime);
    event PlayerJoined(uint256 indexed gameId, address indexed player, uint8[2] holeCards);
    event PlayerFolded(uint256 indexed gameId, address indexed player, uint8[2] returnedCards);
    event PlayerBet(uint256 indexed gameId, address indexed player, uint256 amount);
    event BoardCardsDealt(uint256 indexed gameId, uint8[5] boardCards);
    event GameEnded(uint256 indexed gameId, GameResult result);
    event HouseFeeWithdrawn(address indexed owner, uint256 amount);
    event EmergencyPauseToggled(bool gamePaused);

    // ============ Modifiers ============

    modifier whenNotPaused() {
        if (gamePaused) revert ContractPaused();
        _;
    }

    modifier whenGameActive() {
        if (!gameActive) revert NoActiveGame();
        _;
    }

    modifier whenGameNotActive() {
        if (gameActive) revert GameAlreadyActive();
        _;
    }

    // ============ Constructor ============

    /**
     * @dev Constructor to initialize the contract
     * @param _gameToken Address of ERC20 token to use (address(0) for ETH)
     */
    constructor(address _gameToken) Ownable(msg.sender) {
        if (_gameToken == address(0)) {
            useETH = true;
        } else {
            gameToken = IERC20(_gameToken);
            useETH = false;
        }
        currentGameId = 0; // Will increment to 1 on first game
        gameActive = false;
    }

    // ============ Owner Functions - Game Management ============

    /**
     * @dev Start a new game
     * Only callable by owner
     * @param duration Game duration in seconds (e.g., 3600 for 1 hour)
     */
    function startGame(uint256 duration) external onlyOwner whenNotPaused whenGameNotActive {
        if (duration <= JOIN_CUTOFF) revert DurationTooShort();
        
        // Clean up previous game and initialize new game
        _cleanupGameData();
        
        currentGameId++;
        
        // Initialize new game
        currentGame.gameId = currentGameId;
        currentGame.startTime = block.timestamp;
        currentGame.endTime = block.timestamp + duration;
        
        emit GameStarted(currentGameId, currentGame.startTime, currentGame.endTime);
        
        // Activate game only after all initialization is complete
        gameActive = true;
    }

    /**
     * @dev End the current game and calculate results
     * Only callable by owner
     * Distributes pot to winners and collects house fee
     */
    function endGame() external onlyOwner whenNotPaused whenGameActive {
        // Deactivate game immediately to prevent reentrancy
        gameActive = false;
        
        uint256 playerCount = currentGame.activePlayerAddresses.length;
        
        // If less than 2 players bet, cancel game and return bets
        if (playerCount < MIN_PLAYERS) {
            // Return all bets to players
            for (uint256 i = 0; i < playerCount; i++) {
                address player = currentGame.activePlayerAddresses[i];
                uint256 betAmount = currentGame.activePlayers[player].betAmount;
                
                if (betAmount > 0) {
                    _transferTokens(player, betAmount);
                }
            }
            
            // Create empty game result for cancelled game
            GameResult memory result = GameResult({
                gameId: currentGameId,
                startTime: currentGame.startTime,
                endTime: currentGame.endTime,
                players: currentGame.activePlayerAddresses,
                betAmounts: new uint256[](0),
                boardCards: currentGame.boardCards,
                winners: new address[](0),
                potPerWinner: 0,
                houseFee: 0
            });
            
            emit GameEnded(currentGameId, result);
            return;
        }
        
        // Deal board cards
        _dealBoardCards();
        
        // Calculate results and distribute pot
        _calculateResults();
    }

    /**
     * @dev Clean up previous game data and reset for new game
     * Deletes all mapping entries and resets state variables
     * Called at the start of each new game to ensure clean state
     */
    function _cleanupGameData() internal {
        // Clean up all participants from previous game (if any)
        for (uint256 i = 0; i < currentGame.allParticipants.length; i++) {
            address player = currentGame.allParticipants[i];
            delete currentGame.playerCards[player];
            delete currentGame.activePlayers[player];
            delete currentGame.hasParticipated[player];
        }
        
        // Clear arrays
        delete currentGame.allParticipants;
        delete currentGame.activePlayerAddresses;
        delete currentGame.winners;
        
        // Reset state variables
        currentGame.totalParticipations = 0;
        currentGame.cardsRemaining = DECK_SIZE;
        currentGame.totalPot = 0;
        
        // Reset card pool - all cards available
        for (uint8 i = 0; i < DECK_SIZE; i++) {
            currentGame.cardsInUse[i] = false;
        }
    }

    // ============ Owner Functions - Configuration ============

    /**
     * @dev Withdraw accumulated house fees
     * Only callable by owner
     */
    function withdrawHouseFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedHouseFees;
        if (amount == 0) revert NoFees();
        
        accumulatedHouseFees = 0;
        _transferTokens(owner(), amount);
        
        emit HouseFeeWithdrawn(owner(), amount);
    }

    /**
     * @dev Emergency pause/unpause contract
     * Only callable by owner
     */
    function togglePause() external onlyOwner {
        gamePaused = !gamePaused;
        emit EmergencyPauseToggled(gamePaused);
    }

    // ============ Player Actions ============

    /**
     * @dev Request to join the current game and receive two hole cards
     * Requirements:
     * - Game must be active
     * - Player has not already participated in this game
     * - Total participations < MAX_TOTAL_PLAYERS
     * - At least 7 cards remaining in deck
     * - Join period not closed (before endTime - JOIN_CUTOFF)
     */
    function joinGame() external whenNotPaused whenGameActive {
        if (currentGame.hasParticipated[msg.sender]) revert AlreadyParticipated();
        if (currentGame.activePlayerAddresses.length >= MAX_PLAYERS) revert GameFull();
        if (currentGame.totalParticipations >= MAX_TOTAL_PLAYERS) revert MaxAttemptsReached();
        if (currentGame.cardsRemaining < MIN_CARDS_REQUIRED) revert NotEnoughCards();
        if (block.timestamp >= currentGame.endTime - JOIN_CUTOFF) revert JoinPeriodClosed();
        
        // Mark player as participated (prevents re-joining)
        currentGame.hasParticipated[msg.sender] = true;
        currentGame.allParticipants.push(msg.sender); // Track for cleanup
        currentGame.totalParticipations++;
        
        // Deal hole cards
        _dealHoleCards(msg.sender);
        
        emit PlayerJoined(currentGameId, msg.sender, currentGame.playerCards[msg.sender]);
    }

    /**
     * @dev Fold and quit the game
     * Returns cards to the pool for reuse
     * Player cannot rejoin this game after folding
     */
    function fold() external whenNotPaused whenGameActive {
        if (!currentGame.hasParticipated[msg.sender]) revert NotInGame();
        if (currentGame.activePlayers[msg.sender].betAmount != 0) revert AlreadyBet();
        
        // Return cards to pool
        uint8[2] memory returnedCards = currentGame.playerCards[msg.sender];
        _returnCards(msg.sender);
        
        // Delete player cards
        delete currentGame.playerCards[msg.sender];
        
        emit PlayerFolded(currentGameId, msg.sender, returnedCards);
    }

    /**
     * @dev Place a bet and commit to the game
     * For ETH games: msg.value is the bet
     * For ERC20 games: must approve tokens first, then call with betAmount
     * @param betAmount Amount of tokens to bet (ignored for ETH games)
     */
    function placeBet(uint256 betAmount) external payable whenNotPaused whenGameActive nonReentrant {
        if (!currentGame.hasParticipated[msg.sender]) revert MustJoinFirst();
        if (currentGame.activePlayers[msg.sender].betAmount != 0) revert AlreadyBet();
        
        uint256 actualBetAmount;
        
        if (useETH) {
            if (msg.value == 0) revert MustBetSome();
            actualBetAmount = msg.value;
        } else {
            if (betAmount == 0) revert MustBetSome();
            actualBetAmount = betAmount;
            // Transfer tokens from player to contract
            gameToken.safeTransferFrom(msg.sender, address(this), betAmount);
        }
        
        // Move cards from playerCards to players and record bet
        currentGame.activePlayers[msg.sender].holeCards = currentGame.playerCards[msg.sender];
        currentGame.activePlayers[msg.sender].betAmount = actualBetAmount;
        currentGame.activePlayerAddresses.push(msg.sender);
        
        emit PlayerBet(currentGameId, msg.sender, actualBetAmount);
    }

    // ============ Internal Game Logic Functions ============

    /**
     * @dev Deal two hole cards to a player
     * Uses card pool and marks cards as in use
     * @param player Address of the player
     */
    function _dealHoleCards(address player) internal {
        uint8[2] memory cards;
        cards[0] = _getRandomCard();
        cards[1] = _getRandomCard();
        
        currentGame.playerCards[player] = cards;
    }

    /**
     * @dev Return player's cards to the available pool
     * Cards are returned to pool for reuse by other players
     * @param player Address of the player
     */
    function _returnCards(address player) internal {
        uint8[2] memory cards = currentGame.playerCards[player];
        
        // Validate player has cards
        if (cards[0] == 0 && cards[1] == 0) revert NoCardsToReturn();
        
        // Return cards to pool
        currentGame.cardsInUse[cards[0]] = false;
        currentGame.cardsInUse[cards[1]] = false;
        currentGame.cardsRemaining += 2;
    }

    /**
     * @dev Deal five board cards after all players have bet
     * Called once when game ends
     */
    function _dealBoardCards() internal {
        uint8[5] memory cards;
        for (uint8 i = 0; i < 5; i++) {
            cards[i] = _getRandomCard();
        }
        
        currentGame.boardCards = cards;
        
        emit BoardCardsDealt(currentGameId, cards);
    }

    /**
     * @dev Calculate the strongest hand for a player
     * @param holeCards Player's two hole cards
     * @param boardCards Five community cards
     * @return handRank Poker hand ranking
     * @return handValue Tiebreaker value for same rank hands
     */
    function _evaluateHand(uint8[2] memory holeCards, uint8[5] memory boardCards) 
        internal 
        pure 
        returns (PokerHandEvaluator.HandRank handRank, uint256 handValue) 
    {
        return PokerHandEvaluator.evaluateBestHand(holeCards, boardCards);
    }

    /**
     * @dev Determine winners and distribute pot
     * Evaluates all player hands and finds winner(s)
     * Note: Can only be called once per game (protected by gameActive state)
     */
    function _calculateResults() internal {
        uint256 playerCount = currentGame.activePlayerAddresses.length;
        if (playerCount < MIN_PLAYERS) revert NotEnoughPlayers();
        
        // Calculate pot
        (uint256 potSize, uint256 minBet) = _calculatePot();
        currentGame.totalPot = potSize;
        
        // Return excess bets
        _returnExcessBets(minBet);
        
        // Evaluate all hands and find winners
        PokerHandEvaluator.HandRank bestRank = PokerHandEvaluator.HandRank.HIGH_CARD;
        uint256 bestValue = 0;
        
        for (uint256 i = 0; i < playerCount; i++) {
            address player = currentGame.activePlayerAddresses[i];
            (PokerHandEvaluator.HandRank rank, uint256 value) = _evaluateHand(
                currentGame.activePlayers[player].holeCards,
                currentGame.boardCards
            );
            
            if (rank > bestRank || (rank == bestRank && value > bestValue)) {
                bestRank = rank;
                bestValue = value;
                delete currentGame.winners;
                currentGame.winners.push(player);
            } else if (rank == bestRank && value == bestValue) {
                currentGame.winners.push(player);
            }
        }
        
        // Distribute pot to winners
        _distributePot(currentGame.winners, potSize);
    }

    /**
     * @dev Calculate pot size based on minimum bet
     * Pot = minimum bet × number of players
     * @return potSize Total pot size
     * @return minBet Minimum bet amount
     */
    function _calculatePot() internal view returns (uint256 potSize, uint256 minBet) {
        uint256 playerCount = currentGame.activePlayerAddresses.length;
        if (playerCount == 0) revert NoPlayers();
        
        // Find minimum bet
        minBet = type(uint256).max;
        for (uint256 i = 0; i < playerCount; i++) {
            address player = currentGame.activePlayerAddresses[i];
            uint256 bet = currentGame.activePlayers[player].betAmount;
            if (bet < minBet) {
                minBet = bet;
            }
        }
        
        potSize = minBet * playerCount;
        return (potSize, minBet);
    }

    /**
     * @dev Distribute winnings to winners
     * Deducts 1% house fee, splits remainder among winners
     * @param winners Array of winner addresses
     * @param potSize Total pot size
     */
    function _distributePot(address[] memory winners, uint256 potSize) internal {
        if (winners.length == 0) revert NoWinners();
        
        // Calculate house fee (1%)
        uint256 houseFee = (potSize * HOUSE_FEE_PERCENTAGE) / 100;
        uint256 netPot = potSize - houseFee;
        
        // Split among winners
        uint256 amountPerWinner = netPot / winners.length;
        
        // Accumulate house fee
        accumulatedHouseFees += houseFee;
        currentGame.houseFee = houseFee;
        
        // Transfer to winners
        for (uint256 i = 0; i < winners.length; i++) {
            _transferTokens(winners[i], amountPerWinner);
        }
        
        // Create and emit game result
        GameResult memory result = _createGameResult();
        emit GameEnded(currentGameId, result);
    }

    /**
     * @dev Create GameResult from current game state
     * @return result Complete game result with all data
     */
    function _createGameResult() internal view returns (GameResult memory result) {
        // Prepare bet amounts array
        uint256 playerCount = currentGame.activePlayerAddresses.length;
        uint256[] memory betAmounts = new uint256[](playerCount);
        for (uint256 i = 0; i < playerCount; i++) {
            betAmounts[i] = currentGame.activePlayers[currentGame.activePlayerAddresses[i]].betAmount;
        }
        
        // Calculate pot per winner
        uint256 potPerWinner = 0;
        if (currentGame.winners.length > 0) {
            uint256 netPot = currentGame.totalPot - currentGame.houseFee;
            potPerWinner = netPot / currentGame.winners.length;
        }
        
        // Create and return game result
        result = GameResult({
            gameId: currentGameId,
            startTime: currentGame.startTime,
            endTime: currentGame.endTime,
            players: currentGame.activePlayerAddresses,
            betAmounts: betAmounts,
            boardCards: currentGame.boardCards,
            winners: currentGame.winners,
            potPerWinner: potPerWinner,
            houseFee: currentGame.houseFee
        });
    }

    /**
     * @dev Return excess bets to players
     * Returns (betAmount - minBet) to each player
     * @param minBet Minimum bet amount
     */
    function _returnExcessBets(uint256 minBet) internal {
        for (uint256 i = 0; i < currentGame.activePlayerAddresses.length; i++) {
            address player = currentGame.activePlayerAddresses[i];
            uint256 betAmount = currentGame.activePlayers[player].betAmount;
            
            if (betAmount > minBet) {
                uint256 excess = betAmount - minBet;
                _transferTokens(player, excess);
            }
        }
    }

    /**
     * @dev Internal function to transfer tokens or ETH
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _transferTokens(address to, uint256 amount) internal {
        if (useETH) {
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            gameToken.safeTransfer(to, amount);
        }
    }

    // ============ Card Utility Functions ============

    /**
     * @dev Generate a random card that hasn't been dealt yet
     * NOTE: This uses pseudo-random generation. Use Chainlink VRF in production!
     * @return cardIndex Random card index (0-51)
     */
    function _getRandomCard() internal returns (uint8 cardIndex) {
        if (currentGame.cardsRemaining == 0) revert NoCardsRemaining();
        
        // Simple pseudo-random (NOT SECURE - use Chainlink VRF in production)
        uint256 randomNum = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            nonce++
        )));
        
        // Find an available card
        uint256 attempts = 0;
        while (attempts < DECK_SIZE) {
            uint8 candidate = uint8(randomNum % DECK_SIZE);
            
            if (!currentGame.cardsInUse[candidate]) {
                currentGame.cardsInUse[candidate] = true;
                currentGame.cardsRemaining--;
                return candidate;
            }
            
            randomNum = uint256(keccak256(abi.encodePacked(randomNum, attempts)));
            attempts++;
        }
        
        revert("Failed to find available card");
    }

    /**
     * @dev Get card rank (2-14, where 14 is Ace)
     * @param cardIndex Card index (0-51)
     * @return rank Card rank (2-14)
     */
    function _getCardRank(uint8 cardIndex) internal pure returns (uint8 rank) {
        return PokerHandEvaluator.getCardRank(cardIndex);
    }

    /**
     * @dev Get card suit (0-3: Clubs, Diamonds, Hearts, Spades)
     * @param cardIndex Card index (0-51)
     * @return suit Card suit (0-3)
     */
    function _getCardSuit(uint8 cardIndex) internal pure returns (uint8 suit) {
        return PokerHandEvaluator.getCardSuit(cardIndex);
    }

    // ============ View Functions ============

    /**
     * @dev Get current game information
     * @return gameId Current game ID
     * @return startTime Game start time
     * @return endTime Game end time
     * @return playerCount Number of betting players
     * @return totalParticipations Total participation attempts
     * @return cardsRemaining Cards available in pool
     * @return isActive Whether game is active
     */
    function getCurrentGameInfo() 
        external 
        view 
        returns (
            uint256 gameId,
            uint256 startTime,
            uint256 endTime,
            uint256 playerCount,
            uint256 totalParticipations,
            uint256 cardsRemaining,
            bool isActive
        )
    {
        return (
            currentGame.gameId,
            currentGame.startTime,
            currentGame.endTime,
            currentGame.activePlayerAddresses.length,
            currentGame.totalParticipations,
            currentGame.cardsRemaining,
            gameActive
        );
    }

    /**
     * @dev Get player's information in current game
     * @param player Address of the player
     * @return hasParticipated Whether player has participated (got cards)
     * @return hasBet Whether player has placed bet
     * @return betAmount Player's bet amount
     * @return holeCards Player's hole cards
     */
    function getPlayerInfo(address player) 
        external 
        view 
        returns (
            bool hasParticipated,
            bool hasBet,
            uint256 betAmount,
            uint8[2] memory holeCards
        )
    {
        hasParticipated = currentGame.hasParticipated[player];
        betAmount = currentGame.activePlayers[player].betAmount;
        hasBet = (betAmount > 0); // Player has bet if betAmount > 0
        
        // Return cards from activePlayers if they bet, otherwise from playerCards
        if (hasBet) {
            holeCards = currentGame.activePlayers[player].holeCards;
        } else {
            holeCards = currentGame.playerCards[player];
        }
        
        return (hasParticipated, hasBet, betAmount, holeCards);
    }

    /**
     * @dev Get all betting players in current game
     * @return players Array of player addresses who have bet
     */
    function getGamePlayers() 
        external 
        view 
        returns (address[] memory players)
    {
        return currentGame.activePlayerAddresses;
    }
}
