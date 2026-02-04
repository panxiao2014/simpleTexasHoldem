// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Simplified Texas Hold'em Poker Game
 * @notice This contract implements a simplified version of Texas Hold'em poker
 * @dev Games run on an hourly schedule with automatic begin/end times
 * @dev Uses OpenZeppelin's Ownable for ownership management and ReentrancyGuard for security
 */
contract SimpleTexasHoldem is Ownable, ReentrancyGuard {
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // Current game round ID
    uint256 public currentGameId;
    
    // Accumulated commission balance
    uint256 public commissionBalance;
    
    // Game duration (1 hour)
    uint256 public constant GAME_DURATION = 1 hours;
    
    // House commission rate (1%)
    uint256 public constant HOUSE_COMMISSION_PERCENT = 1;
    
    // Maximum and minimum players
    uint8 public constant MAX_PLAYERS = 9;
    uint8 public constant MIN_PLAYERS = 2;
    
    // Total cards in deck (52 standard cards, represented as 0-51)
    uint8 public constant TOTAL_CARDS = 52;
    
    // Game states
    enum GameState { NotStarted, InProgress, Ended }
    
    // Player information for each game
    struct Player {
        uint256 betAmount;
        uint8[2] holeCards;
        bool hasFolded;
        bool hasReceivedCards;
        bool hasBet;
    }
    
    // Game information
    struct Game {
        uint256 gameId;
        uint256 startTime;
        uint256 endTime;
        GameState state;
        address[] playerAddresses;
        mapping(address => Player) players;
        mapping(address => uint256) playerIndex; // Track player index for gas optimization
        uint8[5] boardCards;
        bool boardCardsDealt;
        uint256 totalBetAmount;
        address[] winners;
        bool[52] usedCards; // Track which cards are in use
    }
    
    // Mapping from game ID to Game
    mapping(uint256 => Game) private games;
    
    
    // ============================================
    // EVENTS
    // ============================================
    
    event GameStarted(uint256 indexed gameId, uint256 startTime, uint256 endTime);
    event GameEnded(uint256 indexed gameId, address[] winners, uint256 potAmount);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event PlayerFolded(uint256 indexed gameId, address indexed player);
    event PlayerBet(uint256 indexed gameId, address indexed player, uint256 amount);
    event CardsDealt(uint256 indexed gameId, address indexed player);
    event BoardCardsRevealed(uint256 indexed gameId, uint8[5] boardCards);
    event PotDistributed(uint256 indexed gameId, address indexed winner, uint256 amount);
    event CommissionPaid(uint256 indexed gameId, uint256 amount);
    
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    /**
     * @dev Checks if game is in progress
     */
    modifier gameInProgress(uint256 gameId) {
        require(games[gameId].state == GameState.InProgress, "Game not in progress");
        require(block.timestamp <= games[gameId].endTime, "Game time expired");
        _;
    }
    
    /**
     * @dev Checks if caller is a player in the game
     */
    modifier onlyGamePlayer(uint256 gameId) {
        require(games[gameId].players[msg.sender].hasReceivedCards, "Not a player in this game");
        _;
    }
    
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @notice Initializes the contract
     * @dev Sets the contract deployer as the owner via Ownable
     */
    constructor() Ownable(msg.sender) {
        currentGameId = 0;
    }
    
    
    // ============================================
    // OWNER FUNCTIONS (Only callable by contract owner)
    // ============================================
    
    /**
     * @notice Starts a new game round
     * @dev Creates a new game with start and end times (1 hour duration)
     * @dev Can only be called by owner
     * @return gameId The ID of the newly created game
     */
    function startNewGame() external onlyOwner returns (uint256 gameId) {
        currentGameId++;
        gameId = currentGameId;
        
        Game storage game = games[gameId];
        game.gameId = gameId;
        game.startTime = block.timestamp;
        game.endTime = block.timestamp + GAME_DURATION;
        game.state = GameState.InProgress;
        
        emit GameStarted(gameId, game.startTime, game.endTime);
    }
    
    /**
     * @notice Manually ends the current game
     * @dev Triggers game end logic, calculates winners, distributes pot
     * @dev Can only be called by owner (useful for emergency or manual control)
     * @param gameId The ID of the game to end
     */
    function endGame(uint256 gameId) external onlyOwner nonReentrant {
        Game storage game = games[gameId];
        require(game.state == GameState.InProgress, "Game not in progress");
        
        game.state = GameState.Ended;
        
        // Check if minimum players requirement is met
        if (!_hasMinimumPlayers(gameId)) {
            // Return all bets to players
            _returnAllBets(gameId);
            emit GameEnded(gameId, new address[](0), 0);
            return;
        }
        
        // Determine winners
        address[] memory winners = _determineWinners(gameId);
        game.winners = winners;
        
        // Distribute pot
        uint256 potAmount = _distributePot(gameId);
        
        emit GameEnded(gameId, winners, potAmount);
    }
    
    /**
     * @notice Deals the five board cards for a game
     * @dev Should be called after all players have finished betting
     * @dev Can only be called by owner
     * @param gameId The ID of the game
     * @param boardCards Array of 5 card values representing the community cards (0-51)
     */
    function dealBoardCards(uint256 gameId, uint8[5] calldata boardCards) external onlyOwner gameInProgress(gameId) {
        Game storage game = games[gameId];
        require(!game.boardCardsDealt, "Board cards already dealt");
        
        // Validate cards are in valid range and not duplicates
        for (uint256 i = 0; i < 5; i++) {
            require(boardCards[i] < TOTAL_CARDS, "Invalid card value");
            require(!game.usedCards[boardCards[i]], "Card already in use");
            game.usedCards[boardCards[i]] = true;
        }
        
        game.boardCards = boardCards;
        game.boardCardsDealt = true;
        
        emit BoardCardsRevealed(gameId, boardCards);
    }
    
    /**
     * @notice Withdraws accumulated commission from the contract
     * @dev Can only be called by owner
     */
    function withdrawCommission() external onlyOwner nonReentrant {
        uint256 amount = commissionBalance;
        require(amount > 0, "No commission to withdraw");
        
        commissionBalance = 0;
        
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Commission transfer failed");
    }
    
    
    // ============================================
    // PLAYER FUNCTIONS (Callable by any user)
    // ============================================
    
    /**
     * @notice Request to receive hole cards and join the game
     * @dev Player must call this before they can bet
     * @dev Assigns two hole cards to the player from available pool
     * @param gameId The ID of the game to join
     * @param card1 First hole card (0-51)
     * @param card2 Second hole card (0-51)
     */
    function requestHoleCards(uint256 gameId, uint8 card1, uint8 card2) external gameInProgress(gameId) {
        Game storage game = games[gameId];
        require(!game.players[msg.sender].hasReceivedCards, "Already received cards");
        require(game.playerAddresses.length < MAX_PLAYERS, "Max players reached");
        
        // Validate cards
        require(card1 < TOTAL_CARDS && card2 < TOTAL_CARDS, "Invalid card value");
        require(card1 != card2, "Cards must be different");
        require(!game.usedCards[card1] && !game.usedCards[card2], "Card already in use");
        
        // Mark cards as used
        game.usedCards[card1] = true;
        game.usedCards[card2] = true;
        
        // Initialize player
        Player storage player = game.players[msg.sender];
        player.holeCards = [card1, card2];
        player.hasReceivedCards = true;
        
        // Add to player list
        game.playerIndex[msg.sender] = game.playerAddresses.length;
        game.playerAddresses.push(msg.sender);
        
        emit PlayerJoined(gameId, msg.sender);
        emit CardsDealt(gameId, msg.sender);
    }
    
    /**
     * @notice Player folds and quits the game
     * @dev Marks player as folded, their hole cards can be reused
     * @dev Player won't participate in pot distribution
     * @param gameId The ID of the game
     */
    function fold(uint256 gameId) external onlyGamePlayer(gameId) gameInProgress(gameId) {
        Game storage game = games[gameId];
        Player storage player = game.players[msg.sender];
        
        require(!player.hasFolded, "Already folded");
        require(!player.hasBet, "Cannot fold after betting");
        
        player.hasFolded = true;
        
        // Return cards to pool
        game.usedCards[player.holeCards[0]] = false;
        game.usedCards[player.holeCards[1]] = false;
        
        emit PlayerFolded(gameId, msg.sender);
    }
    
    /**
     * @notice Player places a bet
     * @dev Player must transfer ETH with this call
     * @dev Once bet is placed, player cannot fold
     * @param gameId The ID of the game
     */
    function bet(uint256 gameId) external payable onlyGamePlayer(gameId) gameInProgress(gameId) {
        Game storage game = games[gameId];
        Player storage player = game.players[msg.sender];
        
        require(!player.hasFolded, "Cannot bet after folding");
        require(!player.hasBet, "Already placed bet");
        require(msg.value > 0, "Bet amount must be greater than 0");
        
        player.betAmount = msg.value;
        player.hasBet = true;
        game.totalBetAmount += msg.value;
        
        emit PlayerBet(gameId, msg.sender, msg.value);
    }
    
    /**
     * @notice Reveals a player's hole cards
     * @dev Can be called by the player (for transparency)
     * @param gameId The ID of the game
     */
    function revealHoleCards(uint256 gameId) external view onlyGamePlayer(gameId) returns (uint8[2] memory) {
        return games[gameId].players[msg.sender].holeCards;
    }
    
    
    // ============================================
    // PUBLIC VIEW FUNCTIONS (Read-only, callable by anyone)
    // ============================================
    
    /**
     * @notice Gets the current game ID
     * @return The current active game ID
     */
    function getCurrentGameId() external view returns (uint256) {
        return currentGameId;
    }
    
    /**
     * @notice Gets basic information about a game
     * @param gameId The ID of the game
     * @return startTime Game start timestamp
     * @return endTime Game end timestamp
     * @return state Current game state
     * @return playerCount Number of players
     * @return totalBetAmount Total bet amount
     */
    function getGameInfo(uint256 gameId) external view returns (
        uint256 startTime,
        uint256 endTime,
        GameState state,
        uint256 playerCount,
        uint256 totalBetAmount
    ) {
        Game storage game = games[gameId];
        return (
            game.startTime,
            game.endTime,
            game.state,
            game.playerAddresses.length,
            game.totalBetAmount
        );
    }
    
    /**
     * @notice Gets a player's information in a specific game
     * @param gameId The ID of the game
     * @param playerAddress The address of the player
     * @return betAmount The amount the player bet
     * @return hasFolded Whether the player has folded
     * @return hasReceivedCards Whether the player has received cards
     * @return hasBet Whether the player has placed a bet
     */
    function getPlayerInfo(uint256 gameId, address playerAddress) external view returns (
        uint256 betAmount,
        bool hasFolded,
        bool hasReceivedCards,
        bool hasBet
    ) {
        Player storage player = games[gameId].players[playerAddress];
        return (
            player.betAmount,
            player.hasFolded,
            player.hasReceivedCards,
            player.hasBet
        );
    }
    
    /**
     * @notice Gets all player addresses in a game
     * @param gameId The ID of the game
     * @return Array of player addresses
     */
    function getPlayers(uint256 gameId) external view returns (address[] memory) {
        return games[gameId].playerAddresses;
    }
    
    /**
     * @notice Gets the board cards for a game
     * @param gameId The ID of the game
     * @return boardCards Array of 5 community cards
     */
    function getBoardCards(uint256 gameId) external view returns (uint8[5] memory) {
        require(games[gameId].boardCardsDealt, "Board cards not dealt yet");
        return games[gameId].boardCards;
    }
    
    /**
     * @notice Gets the winners of a completed game
     * @param gameId The ID of the game
     * @return Array of winner addresses
     */
    function getWinners(uint256 gameId) external view returns (address[] memory) {
        require(games[gameId].state == GameState.Ended, "Game not ended");
        return games[gameId].winners;
    }
    
    /**
     * @notice Checks if current time is past game end time
     * @param gameId The ID of the game
     * @return Whether the game time has expired
     */
    function isGameTimeExpired(uint256 gameId) external view returns (bool) {
        return block.timestamp > games[gameId].endTime;
    }
    
    
    // ============================================
    // INTERNAL/PRIVATE FUNCTIONS
    // ============================================
    
    /**
     * @dev Calculates pot allocation based on player bets
     * @dev Pot = lowest bet * number of non-folded betting players
     * @param gameId The ID of the game
     * @return potAmount The total pot amount
     * @return minBet The minimum bet amount
     */
    function _calculatePot(uint256 gameId) internal view returns (uint256 potAmount, uint256 minBet) {
        Game storage game = games[gameId];
        uint256 activePlayers = 0;
        minBet = type(uint256).max;
        
        // Find minimum bet and count active players
        for (uint256 i = 0; i < game.playerAddresses.length; i++) {
            Player storage player = game.players[game.playerAddresses[i]];
            if (!player.hasFolded && player.hasBet) {
                activePlayers++;
                if (player.betAmount < minBet) {
                    minBet = player.betAmount;
                }
            }
        }
        
        if (activePlayers == 0) {
            return (0, 0);
        }
        
        potAmount = minBet * activePlayers;
    }
    
    /**
     * @dev Returns excess bets to players
     * @dev Excess = player's bet - minimum bet
     * @param gameId The ID of the game
     * @param minBet The minimum bet amount
     */
    function _returnExcessBets(uint256 gameId, uint256 minBet) internal {
        Game storage game = games[gameId];
        
        for (uint256 i = 0; i < game.playerAddresses.length; i++) {
            address playerAddr = game.playerAddresses[i];
            Player storage player = game.players[playerAddr];
            
            if (player.hasBet && player.betAmount > minBet) {
                uint256 excess = player.betAmount - minBet;
                (bool success, ) = playerAddr.call{value: excess}("");
                require(success, "Excess return failed");
            }
        }
    }
    
    /**
     * @dev Returns all bets to players (when game ends with insufficient players)
     * @param gameId The ID of the game
     */
    function _returnAllBets(uint256 gameId) internal {
        Game storage game = games[gameId];
        
        for (uint256 i = 0; i < game.playerAddresses.length; i++) {
            address playerAddr = game.playerAddresses[i];
            Player storage player = game.players[playerAddr];
            
            if (player.hasBet && player.betAmount > 0) {
                uint256 amount = player.betAmount;
                player.betAmount = 0;
                (bool success, ) = playerAddr.call{value: amount}("");
                require(success, "Bet return failed");
            }
        }
    }
    
    /**
     * @dev Determines the strongest 5-card hand from 7 cards
     * @dev Combines player's 2 hole cards with 5 board cards
     * @param holeCards Player's two hole cards
     * @param boardCards The five community cards
     * @return handRank The rank of the best hand (0-9, higher is better)
     * @return handValue Additional value for tie-breaking (encoded card values)
     */
    function _evaluateHand(uint8[2] memory holeCards, uint8[5] memory boardCards) 
        internal 
        pure 
        returns (uint256 handRank, uint256 handValue) 
    {
        // Combine all 7 cards
        uint8[7] memory allCards;
        allCards[0] = holeCards[0];
        allCards[1] = holeCards[1];
        for (uint256 i = 0; i < 5; i++) {
            allCards[i + 2] = boardCards[i];
        }
        
        // Extract ranks and suits (card % 13 = rank, card / 13 = suit)
        uint8[7] memory ranks;
        uint8[7] memory suits;
        for (uint256 i = 0; i < 7; i++) {
            ranks[i] = allCards[i] % 13;
            suits[i] = allCards[i] / 13;
        }
        
        // Sort ranks for easier evaluation (bubble sort - simple for small arrays)
        for (uint256 i = 0; i < 7; i++) {
            for (uint256 j = i + 1; j < 7; j++) {
                if (ranks[i] < ranks[j]) {
                    (ranks[i], ranks[j]) = (ranks[j], ranks[i]);
                }
            }
        }
        
        // Check for flush
        bool hasFlush = false;
        uint8[5] memory flushCards;
        for (uint8 suit = 0; suit < 4; suit++) {
            uint8 count = 0;
            for (uint256 i = 0; i < 7; i++) {
                if (suits[i] == suit) {
                    if (count < 5) {
                        flushCards[count] = ranks[i];
                    }
                    count++;
                }
            }
            if (count >= 5) {
                hasFlush = true;
                break;
            }
        }
        
        // Check for straight
        (bool hasStraight, uint8 straightHigh) = _checkStraight(ranks);
        
        // Count rank occurrences
        uint8[13] memory rankCounts;
        for (uint256 i = 0; i < 7; i++) {
            rankCounts[ranks[i]]++;
        }
        
        // Find pairs, three of a kind, four of a kind
        uint8 fourKind = 0;
        uint8 threeKind = 0;
        uint8 pair1 = 0;
        uint8 pair2 = 0;
        
        for (uint8 r = 12; r < 255; r--) { // Use underflow to loop from 12 to 0
            if (r > 12) break;
            if (rankCounts[r] == 4) {
                fourKind = r;
            } else if (rankCounts[r] == 3) {
                if (threeKind == 0) threeKind = r;
            } else if (rankCounts[r] == 2) {
                if (pair1 == 0) pair1 = r;
                else if (pair2 == 0) pair2 = r;
            }
        }
        
        // Determine hand rank and value
        // Royal Flush (9)
        if (hasFlush && hasStraight && straightHigh == 12) {
            return (9, straightHigh);
        }
        
        // Straight Flush (8)
        if (hasFlush && hasStraight) {
            return (8, straightHigh);
        }
        
        // Four of a Kind (7)
        if (fourKind > 0) {
            return (7, uint256(fourKind) * 256 + _getKicker(ranks, fourKind));
        }
        
        // Full House (6)
        if (threeKind > 0 && pair1 > 0) {
            return (6, uint256(threeKind) * 256 + pair1);
        }
        
        // Flush (5)
        if (hasFlush) {
            uint256 value = 0;
            for (uint256 i = 0; i < 5; i++) {
                value = value * 256 + flushCards[i];
            }
            return (5, value);
        }
        
        // Straight (4)
        if (hasStraight) {
            return (4, straightHigh);
        }
        
        // Three of a Kind (3)
        if (threeKind > 0) {
            return (3, uint256(threeKind) * 65536 + _getTopKickers(ranks, threeKind, 2));
        }
        
        // Two Pair (2)
        if (pair1 > 0 && pair2 > 0) {
            uint8 highPair = pair1 > pair2 ? pair1 : pair2;
            uint8 lowPair = pair1 > pair2 ? pair2 : pair1;
            return (2, uint256(highPair) * 65536 + uint256(lowPair) * 256 + _getKicker(ranks, highPair));
        }
        
        // One Pair (1)
        if (pair1 > 0) {
            return (1, uint256(pair1) * 16777216 + _getTopKickers(ranks, pair1, 3));
        }
        
        // High Card (0)
        uint256 value = 0;
        uint8 count = 0;
        for (uint256 i = 0; i < 7 && count < 5; i++) {
            value = value * 256 + ranks[i];
            count++;
        }
        return (0, value);
    }
    
    /**
     * @dev Checks if ranks contain a straight
     * @param ranks Sorted array of card ranks (high to low)
     * @return hasStraight Whether a straight exists
     * @return highCard The highest card in the straight
     */
    function _checkStraight(uint8[7] memory ranks) internal pure returns (bool hasStraight, uint8 highCard) {
        // Check for Ace-low straight (A-2-3-4-5)
        bool hasAce = false;
        bool hasTwo = false;
        bool hasThree = false;
        bool hasFour = false;
        bool hasFive = false;
        
        for (uint256 i = 0; i < 7; i++) {
            if (ranks[i] == 12) hasAce = true;
            if (ranks[i] == 0) hasTwo = true;
            if (ranks[i] == 1) hasThree = true;
            if (ranks[i] == 2) hasFour = true;
            if (ranks[i] == 3) hasFive = true;
        }
        
        if (hasAce && hasTwo && hasThree && hasFour && hasFive) {
            return (true, 3); // Ace-low straight, high card is 5 (rank 3)
        }
        
        // Check for regular straights
        for (uint8 start = 12; start >= 4; start--) {
            bool found = true;
            for (uint8 offset = 0; offset < 5; offset++) {
                bool hasRank = false;
                for (uint256 i = 0; i < 7; i++) {
                    if (ranks[i] == start - offset) {
                        hasRank = true;
                        break;
                    }
                }
                if (!hasRank) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return (true, start);
            }
        }
        
        return (false, 0);
    }
    
    /**
     * @dev Gets the highest kicker excluding a specific rank
     * @param ranks Sorted ranks
     * @param excludeRank Rank to exclude
     * @return The highest kicker value
     */
    function _getKicker(uint8[7] memory ranks, uint8 excludeRank) internal pure returns (uint256) {
        for (uint256 i = 0; i < 7; i++) {
            if (ranks[i] != excludeRank) {
                return ranks[i];
            }
        }
        return 0;
    }
    
    /**
     * @dev Gets top N kickers excluding a specific rank
     * @param ranks Sorted ranks
     * @param excludeRank Rank to exclude
     * @param n Number of kickers needed
     * @return Encoded kicker values
     */
    function _getTopKickers(uint8[7] memory ranks, uint8 excludeRank, uint8 n) internal pure returns (uint256) {
        uint256 value = 0;
        uint8 count = 0;
        for (uint256 i = 0; i < 7 && count < n; i++) {
            if (ranks[i] != excludeRank) {
                value = value * 256 + ranks[i];
                count++;
            }
        }
        return value;
    }
    
    /**
     * @dev Finds all winners in the game
     * @dev Evaluates all non-folded players' hands
     * @param gameId The ID of the game
     * @return winners Array of winner addresses
     */
    function _determineWinners(uint256 gameId) internal view returns (address[] memory winners) {
        Game storage game = games[gameId];
        require(game.boardCardsDealt, "Board cards not dealt");
        
        address[] memory activePlayers = new address[](game.playerAddresses.length);
        uint256 activeCount = 0;
        
        // Get active players
        for (uint256 i = 0; i < game.playerAddresses.length; i++) {
            Player storage player = game.players[game.playerAddresses[i]];
            if (!player.hasFolded && player.hasBet) {
                activePlayers[activeCount] = game.playerAddresses[i];
                activeCount++;
            }
        }
        
        if (activeCount == 0) {
            return new address[](0);
        }
        
        // Evaluate hands
        uint256[] memory handRanks = new uint256[](activeCount);
        uint256[] memory handValues = new uint256[](activeCount);
        
        for (uint256 i = 0; i < activeCount; i++) {
            Player storage player = game.players[activePlayers[i]];
            (handRanks[i], handValues[i]) = _evaluateHand(player.holeCards, game.boardCards);
        }
        
        // Find best hand
        uint256 bestRank = 0;
        uint256 bestValue = 0;
        for (uint256 i = 0; i < activeCount; i++) {
            if (handRanks[i] > bestRank || (handRanks[i] == bestRank && handValues[i] > bestValue)) {
                bestRank = handRanks[i];
                bestValue = handValues[i];
            }
        }
        
        // Count winners
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < activeCount; i++) {
            if (handRanks[i] == bestRank && handValues[i] == bestValue) {
                winnerCount++;
            }
        }
        
        // Collect winners
        winners = new address[](winnerCount);
        uint256 winnerIndex = 0;
        for (uint256 i = 0; i < activeCount; i++) {
            if (handRanks[i] == bestRank && handValues[i] == bestValue) {
                winners[winnerIndex] = activePlayers[i];
                winnerIndex++;
            }
        }
    }
    
    /**
     * @dev Distributes the pot to winners after deducting commission
     * @dev Splits pot evenly among winners if there's a tie
     * @param gameId The ID of the game
     * @return potAmount The pot amount distributed
     */
    function _distributePot(uint256 gameId) internal returns (uint256 potAmount) {
        Game storage game = games[gameId];
        
        (uint256 pot, uint256 minBet) = _calculatePot(gameId);
        potAmount = pot;
        
        if (potAmount == 0) {
            return 0;
        }
        
        // Return excess bets
        _returnExcessBets(gameId, minBet);
        
        // Calculate commission (1%)
        uint256 commission = (potAmount * HOUSE_COMMISSION_PERCENT) / 100;
        uint256 netPot = potAmount - commission;
        
        commissionBalance += commission;
        emit CommissionPaid(gameId, commission);
        
        // Distribute to winners
        address[] memory winners = game.winners;
        if (winners.length > 0) {
            uint256 amountPerWinner = netPot / winners.length;
            
            for (uint256 i = 0; i < winners.length; i++) {
                (bool success, ) = winners[i].call{value: amountPerWinner}("");
                require(success, "Winner payment failed");
                emit PotDistributed(gameId, winners[i], amountPerWinner);
            }
        }
    }
    
    /**
     * @dev Checks if minimum player requirement is met
     * @param gameId The ID of the game
     * @return Whether there are at least MIN_PLAYERS non-folded betting players
     */
    function _hasMinimumPlayers(uint256 gameId) internal view returns (bool) {
        Game storage game = games[gameId];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < game.playerAddresses.length; i++) {
            Player storage player = game.players[game.playerAddresses[i]];
            if (!player.hasFolded && player.hasBet) {
                activeCount++;
            }
        }
        
        return activeCount >= MIN_PLAYERS;
    }
}
