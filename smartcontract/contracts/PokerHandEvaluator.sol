// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PokerHandEvaluator
 * @dev Library for evaluating poker hands according to Texas Hold'em rules
 */
library PokerHandEvaluator {
    
    /**
     * @dev Poker hand rankings from lowest to highest
     */
    enum HandRank {
        HIGH_CARD,          // 0
        ONE_PAIR,           // 1
        TWO_PAIR,           // 2
        THREE_OF_A_KIND,    // 3
        STRAIGHT,           // 4
        FLUSH,              // 5
        FULL_HOUSE,         // 6
        FOUR_OF_A_KIND,     // 7
        STRAIGHT_FLUSH      // 8
    }
    
    /**
     * @dev Get card rank (2-14, where 14 is Ace)
     * @param cardIndex Card index (0-51)
     * @return rank Card rank (2-14)
     */
    function getCardRank(uint8 cardIndex) internal pure returns (uint8 rank) {
        require(cardIndex < 52, "Invalid card index");
        return (cardIndex % 13) + 2;
    }

    /**
     * @dev Get card suit (0-3: Clubs, Diamonds, Hearts, Spades)
     * @param cardIndex Card index (0-51)
     * @return suit Card suit (0-3)
     */
    function getCardSuit(uint8 cardIndex) internal pure returns (uint8 suit) {
        require(cardIndex < 52, "Invalid card index");
        return cardIndex / 13;
    }

    /**
     * @dev Evaluate the best 5-card poker hand from 7 cards
     * @param holeCards Player's two hole cards
     * @param boardCards Five community cards
     * @return handRank Poker hand ranking
     * @return handValue Tiebreaker value for same rank hands
     */
    function evaluateBestHand(uint8[2] memory holeCards, uint8[5] memory boardCards) 
        internal 
        pure 
        returns (HandRank handRank, uint256 handValue) 
    {
        // Combine hole cards and board cards (total 7 cards)
        uint8[7] memory allCards;
        allCards[0] = holeCards[0];
        allCards[1] = holeCards[1];
        for (uint8 i = 0; i < 5; i++) {
            allCards[i + 2] = boardCards[i];
        }
        
        // Find the best 5-card hand from 7 cards
        HandRank bestRank = HandRank.HIGH_CARD;
        uint256 bestValue = 0;
        
        // Check all possible 5-card combinations from 7 cards (21 combinations)
        for (uint8 i = 0; i < 7; i++) {
            for (uint8 j = i + 1; j < 7; j++) {
                // Skip cards i and j, evaluate remaining 5
                uint8[5] memory fiveCards;
                uint8 idx = 0;
                for (uint8 k = 0; k < 7; k++) {
                    if (k != i && k != j) {
                        fiveCards[idx] = allCards[k];
                        idx++;
                    }
                }
                
                (HandRank rank, uint256 value) = evaluateFiveCardHand(fiveCards);
                if (rank > bestRank || (rank == bestRank && value > bestValue)) {
                    bestRank = rank;
                    bestValue = value;
                }
            }
        }
        
        return (bestRank, bestValue);
    }

    /**
     * @dev Evaluate exactly 5 cards and determine hand rank
     * @param cards Exactly 5 cards
     * @return rank Poker hand ranking
     * @return value Tiebreaker value
     */
    function evaluateFiveCardHand(uint8[5] memory cards) 
        internal 
        pure 
        returns (HandRank rank, uint256 value) 
    {
        // Get ranks and suits
        uint8[5] memory ranks;
        uint8[5] memory suits;
        for (uint8 i = 0; i < 5; i++) {
            ranks[i] = getCardRank(cards[i]);
            suits[i] = getCardSuit(cards[i]);
        }
        
        // Sort ranks descending
        sortDescending(ranks);
        
        // Check for flush
        bool isFlush = (suits[0] == suits[1] && suits[1] == suits[2] && 
                       suits[2] == suits[3] && suits[3] == suits[4]);
        
        // Check for straight
        bool isStraight = checkStraight(ranks);
        
        // Count rank occurrences
        uint8[15] memory rankCounts;
        for (uint8 i = 0; i < 5; i++) {
            rankCounts[ranks[i]]++;
        }
        
        // Find patterns
        uint8 fourOfAKind = 0;
        uint8 threeOfAKind = 0;
        uint8 pairs = 0;
        uint8 pairRank1 = 0;
        uint8 pairRank2 = 0;
        
        for (uint8 r = 14; r >= 2; r--) {
            if (rankCounts[r] == 4) fourOfAKind = r;
            if (rankCounts[r] == 3) threeOfAKind = r;
            if (rankCounts[r] == 2) {
                if (pairRank1 == 0) pairRank1 = r;
                else if (pairRank2 == 0) pairRank2 = r;
                pairs++;
            }
            if (r == 2) break;
        }
        
        // Determine hand rank and value
        if (isStraight && isFlush) {
            return (HandRank.STRAIGHT_FLUSH, uint256(ranks[0]) * 1e10);
        } else if (fourOfAKind > 0) {
            uint8 kicker = 0;
            for (uint8 i = 0; i < 5; i++) {
                if (ranks[i] != fourOfAKind) kicker = ranks[i];
            }
            return (HandRank.FOUR_OF_A_KIND, uint256(fourOfAKind) * 1e10 + uint256(kicker));
        } else if (threeOfAKind > 0 && pairs > 0) {
            return (HandRank.FULL_HOUSE, uint256(threeOfAKind) * 1e10 + uint256(pairRank1));
        } else if (isFlush) {
            return (HandRank.FLUSH, uint256(ranks[0]) * 1e10 + uint256(ranks[1]) * 1e8 + 
                       uint256(ranks[2]) * 1e6 + uint256(ranks[3]) * 1e4 + 
                       uint256(ranks[4]));
        } else if (isStraight) {
            return (HandRank.STRAIGHT, uint256(ranks[0]) * 1e10);
        } else if (threeOfAKind > 0) {
            uint256 kickers = 0;
            for (uint8 i = 0; i < 5; i++) {
                if (ranks[i] != threeOfAKind) {
                    kickers = kickers * 100 + uint256(ranks[i]);
                }
            }
            return (HandRank.THREE_OF_A_KIND, uint256(threeOfAKind) * 1e10 + kickers);
        } else if (pairs == 2) {
            uint8 kicker = 0;
            for (uint8 i = 0; i < 5; i++) {
                if (ranks[i] != pairRank1 && ranks[i] != pairRank2) kicker = ranks[i];
            }
            return (HandRank.TWO_PAIR, uint256(pairRank1) * 1e10 + uint256(pairRank2) * 1e8 + 
                       uint256(kicker));
        } else if (pairs == 1) {
            uint256 kickers = 0;
            for (uint8 i = 0; i < 5; i++) {
                if (ranks[i] != pairRank1) {
                    kickers = kickers * 100 + uint256(ranks[i]);
                }
            }
            return (HandRank.ONE_PAIR, uint256(pairRank1) * 1e10 + kickers);
        } else {
            return (HandRank.HIGH_CARD, uint256(ranks[0]) * 1e10 + uint256(ranks[1]) * 1e8 + 
                       uint256(ranks[2]) * 1e6 + uint256(ranks[3]) * 1e4 + 
                       uint256(ranks[4]));
        }
    }

    /**
     * @dev Check if 5 sorted ranks form a straight
     * @param sortedRanks Array of 5 ranks sorted in descending order
     * @return isStraight True if the ranks form a straight
     */
    function checkStraight(uint8[5] memory sortedRanks) 
        internal 
        pure 
        returns (bool) 
    {
        // Normal straight (e.g., 10-9-8-7-6)
        if (sortedRanks[0] == sortedRanks[1] + 1 &&
            sortedRanks[1] == sortedRanks[2] + 1 &&
            sortedRanks[2] == sortedRanks[3] + 1 &&
            sortedRanks[3] == sortedRanks[4] + 1) {
            return true;
        }
        
        // Ace-low straight (A-2-3-4-5, where Ace is 14)
        if (sortedRanks[0] == 14 && sortedRanks[1] == 5 && 
            sortedRanks[2] == 4 && sortedRanks[3] == 3 && 
            sortedRanks[4] == 2) {
            return true;
        }
        
        return false;
    }

    /**
     * @dev Sort array in descending order using bubble sort
     * @param arr Array to sort (modified in place)
     */
    function sortDescending(uint8[5] memory arr) internal pure {
        for (uint8 i = 0; i < 5; i++) {
            for (uint8 j = i + 1; j < 5; j++) {
                if (arr[j] > arr[i]) {
                    uint8 temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
                }
            }
        }
    }

    /**
     * @dev Get human-readable hand name
     * @param handRank Poker hand ranking
     * @return name Hand name as string
     */
    function getHandName(HandRank handRank) internal pure returns (string memory) {
        if (handRank == HandRank.STRAIGHT_FLUSH) return "Straight Flush";
        if (handRank == HandRank.FOUR_OF_A_KIND) return "Four of a Kind";
        if (handRank == HandRank.FULL_HOUSE) return "Full House";
        if (handRank == HandRank.FLUSH) return "Flush";
        if (handRank == HandRank.STRAIGHT) return "Straight";
        if (handRank == HandRank.THREE_OF_A_KIND) return "Three of a Kind";
        if (handRank == HandRank.TWO_PAIR) return "Two Pair";
        if (handRank == HandRank.ONE_PAIR) return "One Pair";
        return "High Card";
    }
}
