// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/PokerHandEvaluator.sol";

/**
 * @title PokerHandEvaluatorTest
 * @dev Comprehensive tests for poker hand evaluation
 * @notice Run with: pnpm hardhat test
 */
contract PokerHandEvaluatorTest {
    
    // ============ Helper Functions ============
    
    /**
     * @dev Create a card index from rank and suit
     * @param rank Card rank (2-14, where 14 is Ace)
     * @param suit Card suit (0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades)
     * @return cardIndex Card index (0-51)
     */
    function makeCard(uint8 rank, uint8 suit) internal pure returns (uint8) {
        require(rank >= 2 && rank <= 14, "Invalid rank");
        require(suit <= 3, "Invalid suit");
        return (rank - 2) + suit * 13;
    }
    
    /**
     * @dev Helper to create readable hand descriptions in tests
     */
    function logHand(string memory desc, PokerHandEvaluator.HandRank rank, uint256 value) internal pure returns (string memory, uint8, uint256) {
        return (desc, uint8(rank), value);
    }
    
    // ============ Test: Card Encoding ============
    
    function test_getCardRank_BasicCards() public pure {
        // 2 of Clubs (card 0)
        assert(PokerHandEvaluator.getCardRank(0) == 2);
        
        // 7 of Clubs (card 5)
        assert(PokerHandEvaluator.getCardRank(5) == 7);
        
        // Ace of Clubs (card 12)
        assert(PokerHandEvaluator.getCardRank(12) == 14);
        
        // Ace of Spades (card 51)
        assert(PokerHandEvaluator.getCardRank(51) == 14);
    }
    
    function test_getCardSuit_AllSuits() public pure {
        // Clubs (0)
        assert(PokerHandEvaluator.getCardSuit(0) == 0);
        assert(PokerHandEvaluator.getCardSuit(12) == 0);
        
        // Diamonds (1)
        assert(PokerHandEvaluator.getCardSuit(13) == 1);
        assert(PokerHandEvaluator.getCardSuit(25) == 1);
        
        // Hearts (2)
        assert(PokerHandEvaluator.getCardSuit(26) == 2);
        assert(PokerHandEvaluator.getCardSuit(38) == 2);
        
        // Spades (3)
        assert(PokerHandEvaluator.getCardSuit(39) == 3);
        assert(PokerHandEvaluator.getCardSuit(51) == 3);
    }
    
    // ============ Test: Hand Rankings ============
    
    function test_evaluateFiveCardHand_HighCard() public pure {
        // High card: A-K-Q-J-9 (different suits, no straight)
        uint8[5] memory cards = [
            makeCard(14, 0), // Ace of Clubs
            makeCard(13, 1), // King of Diamonds
            makeCard(12, 2), // Queen of Hearts
            makeCard(11, 3), // Jack of Spades
            makeCard(9, 0)   // 9 of Clubs
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.HIGH_CARD));
    }
    
    function test_evaluateFiveCardHand_OnePair() public pure {
        // One pair: A-A-K-Q-J
        uint8[5] memory cards = [
            makeCard(14, 0), // Ace of Clubs
            makeCard(14, 1), // Ace of Diamonds
            makeCard(13, 2), // King of Hearts
            makeCard(12, 3), // Queen of Spades
            makeCard(11, 0)  // Jack of Clubs
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.ONE_PAIR));
    }
    
    function test_evaluateFiveCardHand_TwoPair() public pure {
        // Two pair: A-A-K-K-Q
        uint8[5] memory cards = [
            makeCard(14, 0), // Ace of Clubs
            makeCard(14, 1), // Ace of Diamonds
            makeCard(13, 2), // King of Hearts
            makeCard(13, 3), // King of Spades
            makeCard(12, 0)  // Queen of Clubs
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.TWO_PAIR));
    }
    
    function test_evaluateFiveCardHand_ThreeOfAKind() public pure {
        // Three of a kind: A-A-A-K-Q
        uint8[5] memory cards = [
            makeCard(14, 0), // Ace of Clubs
            makeCard(14, 1), // Ace of Diamonds
            makeCard(14, 2), // Ace of Hearts
            makeCard(13, 3), // King of Spades
            makeCard(12, 0)  // Queen of Clubs
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.THREE_OF_A_KIND));
    }
    
    function test_evaluateFiveCardHand_Straight() public pure {
        // Straight: 10-9-8-7-6 (different suits)
        uint8[5] memory cards = [
            makeCard(10, 0), // 10 of Clubs
            makeCard(9, 1),  // 9 of Diamonds
            makeCard(8, 2),  // 8 of Hearts
            makeCard(7, 3),  // 7 of Spades
            makeCard(6, 0)   // 6 of Clubs
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.STRAIGHT));
    }
    
    function test_evaluateFiveCardHand_Straight_AceLow() public pure {
        // Ace-low straight: A-2-3-4-5 (wheel)
        uint8[5] memory cards = [
            makeCard(14, 0), // Ace of Clubs
            makeCard(2, 1),  // 2 of Diamonds
            makeCard(3, 2),  // 3 of Hearts
            makeCard(4, 3),  // 4 of Spades
            makeCard(5, 0)   // 5 of Clubs
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.STRAIGHT));
    }
    
    function test_evaluateFiveCardHand_Flush() public pure {
        // Flush: A-K-Q-J-9 all hearts (not a straight)
        uint8[5] memory cards = [
            makeCard(14, 2), // Ace of Hearts
            makeCard(13, 2), // King of Hearts
            makeCard(12, 2), // Queen of Hearts
            makeCard(11, 2), // Jack of Hearts
            makeCard(9, 2)   // 9 of Hearts
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.FLUSH));
    }
    
    function test_evaluateFiveCardHand_FullHouse() public pure {
        // Full house: A-A-A-K-K
        uint8[5] memory cards = [
            makeCard(14, 0), // Ace of Clubs
            makeCard(14, 1), // Ace of Diamonds
            makeCard(14, 2), // Ace of Hearts
            makeCard(13, 3), // King of Spades
            makeCard(13, 0)  // King of Clubs
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.FULL_HOUSE));
    }
    
    function test_evaluateFiveCardHand_FourOfAKind() public pure {
        // Four of a kind: A-A-A-A-K
        uint8[5] memory cards = [
            makeCard(14, 0), // Ace of Clubs
            makeCard(14, 1), // Ace of Diamonds
            makeCard(14, 2), // Ace of Hearts
            makeCard(14, 3), // Ace of Spades
            makeCard(13, 0)  // King of Clubs
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.FOUR_OF_A_KIND));
    }
    
    function test_evaluateFiveCardHand_StraightFlush() public pure {
        // Straight flush: 10-9-8-7-6 all hearts
        uint8[5] memory cards = [
            makeCard(10, 2), // 10 of Hearts
            makeCard(9, 2),  // 9 of Hearts
            makeCard(8, 2),  // 8 of Hearts
            makeCard(7, 2),  // 7 of Hearts
            makeCard(6, 2)   // 6 of Hearts
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.STRAIGHT_FLUSH));
    }
    
    function test_evaluateFiveCardHand_RoyalFlush() public pure {
        // Royal flush: A-K-Q-J-10 all spades
        uint8[5] memory cards = [
            makeCard(14, 3), // Ace of Spades
            makeCard(13, 3), // King of Spades
            makeCard(12, 3), // Queen of Spades
            makeCard(11, 3), // Jack of Spades
            makeCard(10, 3)  // 10 of Spades
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateFiveCardHand(cards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.STRAIGHT_FLUSH));
        // Royal flush is just the highest straight flush
    }
    
    // ============ Test: Tiebreakers ============
    
    function test_tiebreaker_HigherPairWins() public pure {
        // Pair of Aces vs Pair of Kings
        uint8[5] memory acePair = [
            makeCard(14, 0), makeCard(14, 1), 
            makeCard(10, 2), makeCard(9, 3), makeCard(8, 0)
        ];
        uint8[5] memory kingPair = [
            makeCard(13, 0), makeCard(13, 1), 
            makeCard(10, 2), makeCard(9, 3), makeCard(8, 0)
        ];
        
        (, uint256 aceValue) = PokerHandEvaluator.evaluateFiveCardHand(acePair);
        (, uint256 kingValue) = PokerHandEvaluator.evaluateFiveCardHand(kingPair);
        
        assert(aceValue > kingValue);
    }
    
    function test_tiebreaker_SamePairHigherKicker() public pure {
        // Pair of Aces with King kicker vs Pair of Aces with Queen kicker
        uint8[5] memory aceKingKicker = [
            makeCard(14, 0), makeCard(14, 1), 
            makeCard(13, 2), makeCard(10, 3), makeCard(9, 0)
        ];
        uint8[5] memory aceQueenKicker = [
            makeCard(14, 0), makeCard(14, 1), 
            makeCard(12, 2), makeCard(10, 3), makeCard(9, 0)
        ];
        
        (, uint256 kingValue) = PokerHandEvaluator.evaluateFiveCardHand(aceKingKicker);
        (, uint256 queenValue) = PokerHandEvaluator.evaluateFiveCardHand(aceQueenKicker);
        
        assert(kingValue > queenValue);
    }
    
    // ============ Test: 7-Card Best Hand Selection ============
    
    function test_evaluateBestHand_UsesBothHoleCards() public pure {
        // Hole cards: A-K (both spades)
        // Board: Q-J-10 (spades), 2-3 (clubs)
        // Best hand: Royal Flush (A-K-Q-J-10 of spades) - uses both hole cards
        uint8[2] memory holeCards = [
            makeCard(14, 3), // Ace of Spades
            makeCard(13, 3)  // King of Spades
        ];
        uint8[5] memory boardCards = [
            makeCard(12, 3), // Queen of Spades
            makeCard(11, 3), // Jack of Spades
            makeCard(10, 3), // 10 of Spades
            makeCard(2, 0),  // 2 of Clubs
            makeCard(3, 0)   // 3 of Clubs
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateBestHand(holeCards, boardCards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.STRAIGHT_FLUSH));
    }
    
    function test_evaluateBestHand_UsesOnlyBoard() public pure {
        // Hole cards: 2-3 (low cards)
        // Board: A-K-Q-J-10 all hearts (royal flush on board)
        // Best hand: Straight flush (using all 5 board cards)
        uint8[2] memory holeCards = [
            makeCard(2, 0), // 2 of Clubs
            makeCard(3, 1)  // 3 of Diamonds
        ];
        uint8[5] memory boardCards = [
            makeCard(14, 2), // Ace of Hearts
            makeCard(13, 2), // King of Hearts
            makeCard(12, 2), // Queen of Hearts
            makeCard(11, 2), // Jack of Hearts
            makeCard(10, 2)  // 10 of Hearts
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateBestHand(holeCards, boardCards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.STRAIGHT_FLUSH));
    }
    
    function test_evaluateBestHand_ComplexScenario() public pure {
        // Hole cards: A-2 of hearts
        // Board: 3-4-5 of hearts, K of clubs, 7 of diamonds
        // Best hand: Straight flush (A-2-3-4-5 of hearts)
        uint8[2] memory holeCards = [
            makeCard(14, 2), // Ace of Hearts
            makeCard(2, 2)   // 2 of Hearts
        ];
        uint8[5] memory boardCards = [
            makeCard(3, 2),  // 3 of Hearts
            makeCard(4, 2),  // 4 of Hearts
            makeCard(5, 2),  // 5 of Hearts
            makeCard(13, 0), // King of Clubs
            makeCard(7, 1)   // 7 of Diamonds
        ];
        
        (PokerHandEvaluator.HandRank rank, ) = 
            PokerHandEvaluator.evaluateBestHand(holeCards, boardCards);
        
        assert(uint8(rank) == uint8(PokerHandEvaluator.HandRank.STRAIGHT_FLUSH));
    }
    
    // ============ Test: Edge Cases ============
    
    function test_checkStraight_NormalStraight() public pure {
        uint8[5] memory ranks = [10, 9, 8, 7, 6];
        assert(PokerHandEvaluator.checkStraight(ranks));
    }
    
    function test_checkStraight_AceLow() public pure {
        uint8[5] memory ranks = [14, 5, 4, 3, 2]; // A-5-4-3-2
        assert(PokerHandEvaluator.checkStraight(ranks));
    }
    
    function test_checkStraight_NotStraight() public pure {
        uint8[5] memory ranks = [14, 13, 11, 10, 9]; // Missing Q
        assert(!PokerHandEvaluator.checkStraight(ranks));
    }
    
    function test_sortDescending() public pure {
        uint8[5] memory arr = [5, 2, 9, 3, 7];
        PokerHandEvaluator.sortDescending(arr);
        
        assert(arr[0] == 9);
        assert(arr[1] == 7);
        assert(arr[2] == 5);
        assert(arr[3] == 3);
        assert(arr[4] == 2);
    }
    
    // ============ Test: Hand Comparisons ============
    
    function test_handComparison_StraightFlushBeatsQuads() public pure {
        uint8[5] memory straightFlush = [
            makeCard(10, 2), makeCard(9, 2), makeCard(8, 2), 
            makeCard(7, 2), makeCard(6, 2)
        ];
        uint8[5] memory fourOfKind = [
            makeCard(14, 0), makeCard(14, 1), makeCard(14, 2), 
            makeCard(14, 3), makeCard(13, 0)
        ];
        
        (PokerHandEvaluator.HandRank rank1, ) = PokerHandEvaluator.evaluateFiveCardHand(straightFlush);
        (PokerHandEvaluator.HandRank rank2, ) = PokerHandEvaluator.evaluateFiveCardHand(fourOfKind);
        
        assert(rank1 > rank2);
    }
    
    function test_handComparison_FullHouseBeatsFlush() public pure {
        uint8[5] memory fullHouse = [
            makeCard(10, 0), makeCard(10, 1), makeCard(10, 2),
            makeCard(9, 3), makeCard(9, 0)
        ];
        uint8[5] memory flush = [
            makeCard(14, 2), makeCard(13, 2), makeCard(11, 2),
            makeCard(9, 2), makeCard(7, 2)
        ];
        
        (PokerHandEvaluator.HandRank rank1, ) = PokerHandEvaluator.evaluateFiveCardHand(fullHouse);
        (PokerHandEvaluator.HandRank rank2, ) = PokerHandEvaluator.evaluateFiveCardHand(flush);
        
        assert(rank1 > rank2);
    }
}
