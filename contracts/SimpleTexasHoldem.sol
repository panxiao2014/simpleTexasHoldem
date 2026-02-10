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

    // ============ Constants ============

    // Game configuration
    uint256 public constant MIN_PLAYERS = 2;
    uint256 public constant MAX_PLAYERS = 9;
    uint256 public constant MAX_TOTAL_PLAYERS = 50; // Max participation attempts per game
    uint256 public constant HOUSE_FEE_PERCENTAGE = 1; // 1% fee to contract owner
    uint256 public constant JOIN_CUTOFF = 5 minutes; // No joins in last 5 minutes
    uint256 public constant MIN_CARDS_REQUIRED = 7; // 2 hole + 5 board

    // Card deck (52 cards: 0-51)
    // Card index to rank/suit mapping:
    // Rank: cardIndex % 13 → 0-12 represent ranks 2-Ace (add 2 to get actual rank)
    // Suit: cardIndex / 13 → 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades
    uint8 public constant DECK_SIZE = 52;

    // ============ State Variables ============
    
    // Packed slot 1: Booleans (4 bytes total, fit in 1 slot)
    bool public useETH;              // 1 byte - If true, use ETH instead of ERC20 token
    bool public gameActive;          // 1 byte - Is there an active game?
    bool public storeDetailedRecords; // 1 byte - Toggle for detailed storage vs events only
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
        uint256 totalParticipations; // Counter for MAX_TOTAL_PLAYERS limit
        
        // Card pool for reuse
        bool[52] cardsInUse; // Track which cards are dealt
        uint8 cardsRemaining; // Quick counter
        
        // Board cards
        uint8[5] boardCards; // Five community cards
        bool boardCardsDealt;
        
        // Game status
        bool resultsCalculated;
        
        // Results
        uint256 totalPot;
        address[] winners;
        uint256 houseFee;
    }

    // Detailed game record for storage (optional, for debugging)
    struct GameRecord {
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
    
    // Historical game records (only if storeDetailedRecords is true)
    mapping(uint256 => GameRecord) public gameRecords;

    // ============ Events ============

    event GameStarted(uint256 indexed gameId, uint256 startTime, uint256 endTime);
    event PlayerJoined(uint256 indexed gameId, address indexed player, uint8[2] holeCards);
    event PlayerFolded(uint256 indexed gameId, address indexed player, uint8[2] returnedCards);
    event PlayerBet(uint256 indexed gameId, address indexed player, uint256 amount);
    event BoardCardsDealt(uint256 indexed gameId, uint8[5] boardCards);
    event GameEnded(
        uint256 indexed gameId, 
        address[] winners, 
        uint256 potPerWinner,
        uint256 houseFee,
        address[] allPlayers,
        uint256[] betAmounts
    );
    event HouseFeeWithdrawn(address indexed owner, uint256 amount);
    event DetailedRecordsToggled(bool enabled);
    event EmergencyPauseToggled(bool gamePaused);

    // ============ Modifiers ============

    modifier whenNotPaused() {
        require(!gamePaused, "Contract is paused");
        _;
    }

    modifier whenGameActive() {
        require(gameActive, "No active game");
        _;
    }

    modifier whenGameNotActive() {
        require(!gameActive, "Game already active");
        _;
    }

    // ============ Constructor ============

    /**
     * @dev Constructor to initialize the contract
     * @param _gameToken Address of ERC20 token to use (address(0) for ETH)
     * @param _storeDetailedRecords Whether to store detailed game records in storage
     */
    constructor(address _gameToken, bool _storeDetailedRecords) Ownable(msg.sender) {
        if (_gameToken == address(0)) {
            useETH = true;
        } else {
            gameToken = IERC20(_gameToken);
            useETH = false;
        }
        storeDetailedRecords = _storeDetailedRecords;
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
        require(duration > JOIN_CUTOFF, "Duration must be longer than join cutoff");
        
        currentGameId++;
        gameActive = true;
        
        // Initialize new game
        currentGame.gameId = currentGameId;
        currentGame.startTime = block.timestamp;
        currentGame.endTime = block.timestamp + duration;
        currentGame.boardCardsDealt = false;
        currentGame.resultsCalculated = false;
        currentGame.totalParticipations = 0;
        currentGame.cardsRemaining = DECK_SIZE;
        currentGame.totalPot = 0;
        
        // Reset card pool - all cards available
        for (uint8 i = 0; i < DECK_SIZE; i++) {
            currentGame.cardsInUse[i] = false;
        }
        
        // Clear previous game data if any
        delete currentGame.activePlayerAddresses;
        delete currentGame.winners;
        
        emit GameStarted(currentGameId, currentGame.startTime, currentGame.endTime);
    }

    /**
     * @dev End the current game and calculate results
     * Only callable by owner
     * Distributes pot to winners and collects house fee
     */
    function endGame() external onlyOwner whenNotPaused whenGameActive {
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
            
            gameActive = false;
            emit GameEnded(currentGameId, new address[](0), 0, 0, currentGame.activePlayerAddresses, new uint256[](0));
            return;
        }
        
        // Deal board cards if not already dealt
        if (!currentGame.boardCardsDealt) {
            _dealBoardCards();
        }
        
        // Calculate results and distribute pot
        _calculateResults();
        
        // Store record if enabled
        if (storeDetailedRecords) {
            _storeGameRecord();
        }
        
        gameActive = false;
    }

    // ============ Owner Functions - Configuration ============

    /**
     * @dev Toggle detailed record storage on/off
     * Only callable by owner
     * @param enabled True to store detailed records, false for events only
     */
    function setDetailedRecords(bool enabled) external onlyOwner {
        storeDetailedRecords = enabled;
        emit DetailedRecordsToggled(enabled);
    }

    /**
     * @dev Withdraw accumulated house fees
     * Only callable by owner
     */
    function withdrawHouseFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedHouseFees;
        require(amount > 0, "No fees to withdraw");
        
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
        require(!currentGame.hasParticipated[msg.sender], "Already participated in this game");
        require(currentGame.totalParticipations < MAX_TOTAL_PLAYERS, "Game is full");
        require(currentGame.cardsRemaining >= MIN_CARDS_REQUIRED, "Not enough cards remaining");
        require(block.timestamp < currentGame.endTime - JOIN_CUTOFF, "Join period closed");
        
        // Mark player as participated (prevents re-joining)
        currentGame.hasParticipated[msg.sender] = true;
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
        require(currentGame.hasParticipated[msg.sender], "Not in this game");
        require(currentGame.activePlayers[msg.sender].betAmount == 0, "Already bet, cannot fold");
        
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
        require(currentGame.hasParticipated[msg.sender], "Must join game first");
        require(currentGame.activePlayers[msg.sender].betAmount == 0, "Already bet");
        
        uint256 actualBetAmount;
        
        if (useETH) {
            require(msg.value > 0, "Must bet some ETH");
            actualBetAmount = msg.value;
        } else {
            require(betAmount > 0, "Must bet some tokens");
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
        require(cards[0] != 0 || cards[1] != 0, "Player has no cards to return");
        
        // Return cards to pool
        currentGame.cardsInUse[cards[0]] = false;
        currentGame.cardsInUse[cards[1]] = false;
        currentGame.cardsRemaining += 2;
    }

    /**
     * @dev Deal five board cards after all players have bet
     * Can only be called once per game
     */
    function _dealBoardCards() internal {
        require(!currentGame.boardCardsDealt, "Board cards already dealt");
        
        uint8[5] memory cards;
        for (uint8 i = 0; i < 5; i++) {
            cards[i] = _getRandomCard();
        }
        
        currentGame.boardCards = cards;
        currentGame.boardCardsDealt = true;
        
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
     */
    function _calculateResults() internal {
        require(!currentGame.resultsCalculated, "Results already calculated");
        currentGame.resultsCalculated = true;
        
        uint256 playerCount = currentGame.activePlayerAddresses.length;
        require(playerCount >= MIN_PLAYERS, "Not enough players");
        
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
        require(playerCount > 0, "No players");
        
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
        require(winners.length > 0, "No winners");
        
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
        
        // Prepare bet amounts array for event
        uint256[] memory betAmounts = new uint256[](currentGame.activePlayerAddresses.length);
        for (uint256 i = 0; i < currentGame.activePlayerAddresses.length; i++) {
            betAmounts[i] = currentGame.activePlayers[currentGame.activePlayerAddresses[i]].betAmount;
        }
        
        emit GameEnded(currentGameId, winners, amountPerWinner, houseFee, currentGame.activePlayerAddresses, betAmounts);
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
     * @dev Store game record if detailed storage is enabled
     */
    function _storeGameRecord() internal {
        GameRecord storage record = gameRecords[currentGameId];
        record.gameId = currentGameId;
        record.startTime = currentGame.startTime;
        record.endTime = currentGame.endTime;
        record.boardCards = currentGame.boardCards;
        record.winners = currentGame.winners;
        record.houseFee = currentGame.houseFee;
        
        // Store player data
        uint256 playerCount = currentGame.activePlayerAddresses.length;
        record.players = new address[](playerCount);
        record.betAmounts = new uint256[](playerCount);
        
        for (uint256 i = 0; i < playerCount; i++) {
            address player = currentGame.activePlayerAddresses[i];
            record.players[i] = player;
            record.betAmounts[i] = currentGame.activePlayers[player].betAmount;
        }
        
        if (currentGame.winners.length > 0) {
            uint256 netPot = currentGame.totalPot - currentGame.houseFee;
            record.potPerWinner = netPot / currentGame.winners.length;
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
            require(success, "ETH transfer failed");
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
        require(currentGame.cardsRemaining > 0, "No cards remaining");
        
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
     * @dev Get board cards for current game
     * @return boardCards Five community cards
     * @return dealt Whether board cards have been dealt
     */
    function getBoardCards() 
        external 
        view 
        returns (uint8[5] memory boardCards, bool dealt)
    {
        return (currentGame.boardCards, currentGame.boardCardsDealt);
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

    /**
     * @dev Check if player can join current game
     * @param player Address to check
     * @return canJoin Whether player can join
     * @return reason Reason if cannot join
     */
    function canPlayerJoin(address player) 
        external 
        view 
        returns (bool canJoin, string memory reason)
    {
        if (gamePaused) {
            return (false, "Contract is paused");
        }
        
        if (!gameActive) {
            return (false, "No active game");
        }
        
        if (currentGame.hasParticipated[player]) {
            return (false, "Already participated in this game");
        }
        
        if (currentGame.totalParticipations >= MAX_TOTAL_PLAYERS) {
            return (false, "Game is full");
        }
        
        if (currentGame.cardsRemaining < MIN_CARDS_REQUIRED) {
            return (false, "Not enough cards remaining");
        }
        
        if (block.timestamp >= currentGame.endTime - JOIN_CUTOFF) {
            return (false, "Join period closed");
        }
        
        return (true, "");
    }
}
