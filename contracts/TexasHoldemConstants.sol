// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TexasHoldemConstants
 * @dev Shared constants and events for SimpleTexasHoldem contract and tests
 * @notice Both the main contract and test files inherit from this
 */
contract TexasHoldemConstants {
    // ============ Constants ============
    
    // Game configuration
    uint256 public constant MIN_PLAYERS = 2;
    uint256 public constant MAX_PLAYERS = 9;
    uint256 public constant MAX_TOTAL_PLAYERS = 50; // Max participation attempts (joiners + folders)
    uint256 public constant HOUSE_FEE_PERCENTAGE = 1; // 1% fee to contract owner
    uint256 public constant JOIN_CUTOFF = 5 minutes; // No joins in last 5 minutes
    uint256 public constant MIN_CARDS_REQUIRED = 7; // 2 hole + 5 board
    
    // Card deck (52 cards: 0-51)
    uint8 public constant DECK_SIZE = 52;
    
    // ============ Shared Structures ============
    
    /**
     * @dev Complete game result data
     * Used both for event emission and storage
     */
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
    
    // ============ Events ============
    
    event GameStarted(uint256 indexed gameId, uint256 startTime, uint256 endTime);
    event PlayerJoined(uint256 indexed gameId, address indexed player, uint8[2] holeCards);
    event PlayerFolded(uint256 indexed gameId, address indexed player, uint8[2] returnedCards);
    event PlayerBet(uint256 indexed gameId, address indexed player, uint256 amount);
    event BoardCardsDealt(uint256 indexed gameId, uint8[5] boardCards);
    event GameEnded(uint256 indexed gameId, GameResult result);
    event HouseFeeWithdrawn(address indexed owner, uint256 amount);
    event EmergencyPauseToggled(bool gamePaused);
}
