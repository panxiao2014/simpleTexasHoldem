// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimpleTexasHoldem.sol";

/**
 * @title SimpleTexasHoldemTestable
 * @dev Extended contract with test-only card injection capability
 * 
 * IMPORTANT: This requires modifying SimpleTexasHoldem.sol to change:
 *   Game private currentGame;  →  Game internal currentGame;
 * 
 * This allows the testable contract to access game state while keeping
 * the original contract's encapsulation for production use.
 * 
 * WARNING: This contract should ONLY be used for testing, never deploy to production!
 * 
 * Usage:
 *   1. Call startGame() to start a new game (this will shuffle the deck)
 *   2. Call setTestCards() to override the shuffled deck with specific cards
 *   3. Players join and play
 */
contract SimpleTexasHoldemTestable is SimpleTexasHoldem {
    
    // ============ Test Mode State ============
    
    bool public testMode;
    uint8[] private testCardSequence;
    uint256 private testCardIndex;
    
    // ============ Constructor ============
    
    constructor(address tokenAddress) SimpleTexasHoldem(tokenAddress) {
        testMode = false;
    }
    
    // ============ Test Mode Functions ============
    
    /**
     * @dev Override the shuffled deck with specific card sequence
     * Call this AFTER startGame() to replace the shuffled deck
     * 
     * @param cards Array of card indices (0-51) to deal in order
     * 
     * Card Format:
     * - Cards 0-51 represent all cards in deck
     * - cardIndex = (rank - 2) + (suit * 13)
     * - Ranks: 2-14 (2-10, J=11, Q=12, K=13, A=14)
     * - Suits: 0=Spades, 1=Hearts, 2=Diamonds, 3=Clubs
     * 
     * Example: A♠ = (14-2) + (0*13) = 12 + 0 = 12
     * 
     * Card dealing order:
     * 1-2: Player1 hole cards
     * 3-4: Player2 hole cards
     * 5-6: Player3 hole cards (if exists)
     * ...
     * Last 5: Board cards
     * 
     * Requirements:
     * - Game must be active (startGame must be called first)
     * - Cards array must have at least enough cards for the test scenario
     * 
     * WARNING: Only use in test environment!
     */
    function setTestCards(uint8[] calldata cards) external onlyOwner {
        require(gameActive, "Game must be active first. Call startGame() before setTestCards()");
        require(cards.length > 0, "Need at least one card");
        require(cards.length <= DECK_SIZE, "Too many cards");
        
        // Validate all cards are in range 0-51 and unique
        bool[52] memory seen;
        for (uint i = 0; i < cards.length; i++) {
            require(cards[i] < DECK_SIZE, "Invalid card index");
            require(!seen[cards[i]], "Duplicate card found");
            seen[cards[i]] = true;
        }
        
        // Build a complete deck with test cards at the beginning
        uint8[DECK_SIZE] memory newDeck;
        bool[52] memory used;
        
        // Place test cards at the beginning of the deck
        for (uint i = 0; i < cards.length; i++) {
            uint8 card = cards[i];
            used[card] = true;
            newDeck[i] = card;
        }
        
        // Fill remaining slots with unused cards in order
        uint256 deckIndex = cards.length;
        for (uint8 i = 0; i < DECK_SIZE && deckIndex < DECK_SIZE; i++) {
            if (!used[i]) {
                newDeck[deckIndex++] = i;
            }
        }
        
        // Override the shuffled deck
        for (uint8 i = 0; i < DECK_SIZE; i++) {
            currentGame.shuffledDeck[i] = newDeck[i];
        }
        
        // Reset the dealing index to start from the beginning
        currentGame.currentCardIndex = 0;
        
        // Update cards remaining for the joinGame check
        // Note: currentCardIndex is used to calculate remaining cards
        
        testMode = true;
        testCardIndex = 0;
    }
    
    
    /**
     * @dev Disable test mode and return to normal random dealing
     */
    function disableTestMode() external onlyOwner {
        testMode = false;
        delete testCardSequence;
        testCardIndex = 0;
    }
    
    /**
     * @dev Get current test mode status
     * @return isTestMode Whether test mode is enabled
     * @return cardsSet Number of cards in test sequence
     * @return cardsUsed Number of cards already dealt
     */
    function getTestModeInfo() external view returns (
        bool isTestMode,
        uint256 cardsSet,
        uint256 cardsUsed
    ) {
        return (testMode, testCardSequence.length, testCardIndex);
    }
    
    /**
     * @dev Get the current shuffled deck (for debugging)
     */
    function getShuffledDeck() external view returns (uint8[DECK_SIZE] memory) {
        return currentGame.shuffledDeck;
    }
    
    /**
     * @dev Get the current card index (for debugging)
     */
    function getCurrentCardIndex() external view returns (uint8) {
        return currentGame.currentCardIndex;
    }
}