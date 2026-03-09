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
     * @dev Enable test mode with predetermined card sequence
     * @param cards Array of card indices (0-51) to deal in order
     * 
     * Card Format:
     * - Cards 0-51 represent all cards in deck
     * - cardIndex = (rank - 2) + (suit * 13)
     * - Ranks: 2-14 (2-10, J=11, Q=12, K=13, A=14)
     * - Suits: 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades
     * 
     * Example: A♠ = (14-2) + (3*13) = 12 + 39 = 51
     * 
     * Card dealing order:
     * 1-2: Player1 hole cards
     * 3-4: Player2 hole cards
     * 5-6: Player3 hole cards (if exists)
     * ...
     * Last 5: Board cards
     * 
     * WARNING: Only use in test environment!
     */
    function setTestCards(uint8[] calldata cards) external onlyOwner {
        require(cards.length > 0, "Need at least one card");
        
        // Validate all cards are in range 0-51
        for (uint i = 0; i < cards.length; i++) {
            require(cards[i] < 52, "Invalid card index");
        }
        
        testMode = true;
        delete testCardSequence;
        for (uint i = 0; i < cards.length; i++) {
            testCardSequence.push(cards[i]);
        }
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
    
    // ============ Override Random Card Generation ============
    
    /**
     * @dev Override _getRandomCard to use test cards when in test mode
     * Falls back to random generation when test mode is off or test cards exhausted
     * 
     * Requires: currentGame to be 'internal' in base contract
     */
    function _getRandomCard() internal override returns (uint8 cardIndex) {
        // If in test mode and have cards left, use test sequence
        if (testMode && testCardIndex < testCardSequence.length) {
            uint8 card = testCardSequence[testCardIndex];
            testCardIndex++;
            
            // Validate card is available
            require(currentGame.cardsRemaining > 0, "No cards remaining");
            require(!currentGame.cardsInUse[card], "Test card already in use");
            
            // Mark card as used
            currentGame.cardsInUse[card] = true;
            currentGame.cardsRemaining--;
            
            return card;
        }
        
        // Otherwise use normal random dealing
        return super._getRandomCard();
    }
}
