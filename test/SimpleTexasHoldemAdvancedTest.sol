// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SimpleTexasHoldemTestable.sol";
import "../contracts/PokerHandEvaluator.sol";
import "../contracts/TexasHoldemConstants.sol";

/**
 * @title SimpleTexasHoldemAdvancedTest
 * @dev Tests with specific cards and fuzzing for comprehensive coverage
 */
contract SimpleTexasHoldemAdvancedTest is TexasHoldemConstants, Test {
    SimpleTexasHoldemTestable public game;
    
    address private owner;
    address private player1;
    address private player2;
    address private player3;
    
    uint256 constant TEST_GAME_DURATION = 1 hours;
    uint256 constant TEST_BET_AMOUNT = 1 ether;
    uint256 constant INITIAL_PLAYER_BALANCE = 100 ether;
    
    receive() external payable {}
    
    function setUp() public {
        owner = makeAddr("contractOwner");
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");
        player3 = makeAddr("player3");
        
        vm.deal(owner, 100 ether);
        vm.deal(player1, INITIAL_PLAYER_BALANCE);
        vm.deal(player2, INITIAL_PLAYER_BALANCE);
        vm.deal(player3, INITIAL_PLAYER_BALANCE);
        
        vm.prank(owner);
        game = new SimpleTexasHoldemTestable(address(0));
    }
    
    // ============ Helper Functions ============
    
    /**
     * @dev Create card index from rank and suit
     * @param rank 2-14 (2-10, J=11, Q=12, K=13, A=14)
     * @param suit 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades
     */
    function makeCard(uint8 rank, uint8 suit) internal pure returns (uint8) {
        require(rank >= 2 && rank <= 14, "Invalid rank");
        require(suit <= 3, "Invalid suit");
        return (rank - 2) + suit * 13;
    }
    
    // ============ Specific Card Tests ============
    
    function test_SpecificCards_RoyalFlushBeatsFullHouse() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // Player1: A♠ K♠ → Royal Flush with board
        // Player2: K♥ K♦ → Full House with board  
        // Board: Q♠ J♠ 10♠ K♣ Q♣
        
        uint8[] memory cards = new uint8[](9);
        cards[0] = makeCard(14, 3); // A♠
        cards[1] = makeCard(13, 3); // K♠
        cards[2] = makeCard(13, 2); // K♥
        cards[3] = makeCard(13, 1); // K♦
        cards[4] = makeCard(12, 3); // Q♠
        cards[5] = makeCard(11, 3); // J♠
        cards[6] = makeCard(10, 3); // 10♠
        cards[7] = makeCard(13, 0); // K♣
        cards[8] = makeCard(12, 0); // Q♣
        
        vm.prank(owner);
        game.setTestCards(cards);
        
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        uint256 player1Before = player1.balance;
        uint256 player2Before = player2.balance;
        
        vm.prank(owner);
        game.endGame();
        
        // Player1 should win entire pot
        uint256 pot = TEST_BET_AMOUNT * 2;
        uint256 houseFee = (pot * HOUSE_FEE_PERCENTAGE) / 100;
        uint256 winnings = pot - houseFee;
        
        assertEq(player1.balance, player1Before + winnings, "Player1 should win with Royal Flush");
        assertEq(player2.balance, player2Before, "Player2 should lose");
    }
    
    function test_SpecificCards_EqualHandsSplitPot() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // Both players make same straight from board
        // Player1: 9♠ 8♠
        // Player2: 9♥ 8♥  
        // Board: 7♣ 6♣ 5♣ 2♦ 3♦ (both make 9-high straight: 9-8-7-6-5)
        
        uint8[] memory cards = new uint8[](9);
        cards[0] = makeCard(9, 3);  // 9♠
        cards[1] = makeCard(8, 3);  // 8♠
        cards[2] = makeCard(9, 2);  // 9♥
        cards[3] = makeCard(8, 2);  // 8♥
        cards[4] = makeCard(7, 0);  // 7♣
        cards[5] = makeCard(6, 0);  // 6♣
        cards[6] = makeCard(5, 0);  // 5♣
        cards[7] = makeCard(2, 1);  // 2♦
        cards[8] = makeCard(3, 1);  // 3♦
        
        vm.prank(owner);
        game.setTestCards(cards);
        
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: 2 ether}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: 2 ether}(0);
        
        uint256 player1Before = player1.balance;
        uint256 player2Before = player2.balance;
        
        vm.prank(owner);
        game.endGame();
        
        // Both should split pot
        uint256 pot = 4 ether;
        uint256 houseFee = (pot * HOUSE_FEE_PERCENTAGE) / 100;
        uint256 netPot = pot - houseFee;
        uint256 share = netPot / 2;
        
        assertEq(player1.balance, player1Before + share, "Player1 should get half");
        assertEq(player2.balance, player2Before + share, "Player2 should get half");
    }
    
    function test_SpecificCards_PairOfAcesBeatsPairOfKings() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // Player1: A♠ A♥ (pair of aces)
        // Player2: K♠ K♥ (pair of kings)
        // Board: 7♣ 4♦ 2♠ 9♥ 3♣ (rainbow, no help)
        
        uint8[] memory cards = new uint8[](9);
        cards[0] = makeCard(14, 3); // A♠
        cards[1] = makeCard(14, 2); // A♥
        cards[2] = makeCard(13, 3); // K♠
        cards[3] = makeCard(13, 2); // K♥
        cards[4] = makeCard(7, 0);  // 7♣
        cards[5] = makeCard(4, 1);  // 4♦
        cards[6] = makeCard(2, 3);  // 2♠
        cards[7] = makeCard(9, 2);  // 9♥
        cards[8] = makeCard(3, 0);  // 3♣
        
        vm.prank(owner);
        game.setTestCards(cards);
        
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        uint256 player1Before = player1.balance;
        
        vm.prank(owner);
        game.endGame();
        
        uint256 pot = TEST_BET_AMOUNT * 2;
        uint256 houseFee = (pot * HOUSE_FEE_PERCENTAGE) / 100;
        uint256 winnings = pot - houseFee;
        
        assertEq(player1.balance, player1Before + winnings, "Aces should beat Kings");
    }
    
    function test_SpecificCards_ThreeWayTieSplitsPot() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // All three players make same flush from board
        // Player1: 2♠ 3♠
        // Player2: 2♥ 3♥
        // Player3: 2♦ 3♦
        // Board: A♠ K♠ Q♠ J♠ 10♠ (all spades - board is royal flush)
        // All players make spade flush with A-high
        
        uint8[] memory cards = new uint8[](11);
        cards[0] = makeCard(2, 3);  // 2♠
        cards[1] = makeCard(3, 3);  // 3♠
        cards[2] = makeCard(2, 2);  // 2♥
        cards[3] = makeCard(3, 2);  // 3♥
        cards[4] = makeCard(2, 1);  // 2♦
        cards[5] = makeCard(3, 1);  // 3♦
        cards[6] = makeCard(14, 3); // A♠
        cards[7] = makeCard(13, 3); // K♠
        cards[8] = makeCard(12, 3); // Q♠
        cards[9] = makeCard(11, 3); // J♠
        cards[10] = makeCard(10, 3); // 10♠
        
        vm.prank(owner);
        game.setTestCards(cards);
        
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: 3 ether}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: 3 ether}(0);
        
        vm.prank(player3);
        game.joinGame();
        vm.prank(player3);
        game.placeBet{value: 3 ether}(0);
        
        uint256 player1Before = player1.balance;
        uint256 player2Before = player2.balance;
        uint256 player3Before = player3.balance;
        
        vm.prank(owner);
        game.endGame();
        
        // All three split pot equally
        uint256 pot = 9 ether;
        uint256 houseFee = (pot * HOUSE_FEE_PERCENTAGE) / 100;
        uint256 netPot = pot - houseFee;
        uint256 share = netPot / 3;
        
        assertEq(player1.balance, player1Before + share, "Player1 should get 1/3");
        assertEq(player2.balance, player2Before + share, "Player2 should get 1/3");
        assertEq(player3.balance, player3Before + share, "Player3 should get 1/3");
    }
    
    // ============ Fuzzing Tests ============
    
    /**
     * @dev Fuzz test: Play random games and verify pot distribution is always correct
     * @param seed1 Random seed for block timestamp
     * @param seed2 Random seed for nonce manipulation
     * @param numPlayers Number of players (2-5)
     */
    function testFuzz_PotDistributionAlwaysCorrect(
        uint256 seed1,
        uint256 seed2,
        uint8 numPlayers
    ) public {
        // Bound inputs to reasonable ranges
        numPlayers = uint8(bound(numPlayers, 2, 5));
        vm.warp(bound(seed1, 1, type(uint32).max));
        
        // Create player addresses
        address[] memory players = new address[](numPlayers);
        uint256[] memory balancesBefore = new uint256[](numPlayers);
        uint256[] memory betAmounts = new uint256[](numPlayers);
        
        for (uint8 i = 0; i < numPlayers; i++) {
            players[i] = makeAddr(string(abi.encodePacked("fuzzPlayer", uint256(i))));
            vm.deal(players[i], 100 ether);
        }
        
        // Start game
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // All players join and bet
        uint256 totalBet = 0;
        for (uint8 i = 0; i < numPlayers; i++) {
            vm.prank(players[i]);
            game.joinGame();
            
            // Vary bet amounts
            betAmounts[i] = 1 ether + (uint256(keccak256(abi.encodePacked(seed2, i))) % 5 ether);
            
            balancesBefore[i] = players[i].balance;
            
            vm.prank(players[i]);
            game.placeBet{value: betAmounts[i]}(0);
            
            totalBet += betAmounts[i];
        }
        
        // Record owner balance before
        uint256 ownerBalanceBefore = owner.balance;
        
        // End game
        vm.prank(owner);
        game.endGame();
        
        // Calculate total pot (minimum bet * number of players)
        uint256 minBet = type(uint256).max;
        for (uint8 i = 0; i < numPlayers; i++) {
            if (betAmounts[i] < minBet) minBet = betAmounts[i];
        }
        uint256 pot = minBet * numPlayers;
        uint256 houseFee = (pot * HOUSE_FEE_PERCENTAGE) / 100;
        uint256 netPot = pot - houseFee;
        
        // Withdraw house fees
        vm.prank(owner);
        game.withdrawHouseFees();
        
        // INVARIANT 1: Owner should receive exactly the house fee
        assertEq(
            owner.balance,
            ownerBalanceBefore + houseFee,
            "Owner should receive exactly house fee"
        );
        
        // INVARIANT 2: Total distributed to players should equal net pot
        uint256 totalDistributed = 0;
        for (uint8 i = 0; i < numPlayers; i++) {
            // Current balance - (initial - bet) = payout
            uint256 balanceAfterBet = balancesBefore[i] - betAmounts[i];
            if (players[i].balance > balanceAfterBet) {
                totalDistributed += players[i].balance - balanceAfterBet;
            }
        }
        
        assertEq(
            totalDistributed,
            netPot,
            "Total distributed should equal net pot"
        );
        
        // INVARIANT 3: No money created or destroyed
        uint256 totalReturned = 0;
        for (uint8 i = 0; i < numPlayers; i++) {
            // Players get back: their payout + excess bets
            // Balance change = current - (initial - bet)
            uint256 balanceAfterBet = balancesBefore[i] - betAmounts[i];
            totalReturned += players[i].balance - balanceAfterBet;
        }
        totalReturned += houseFee; // Owner got house fee
        
        assertEq(
            totalReturned,
            totalBet,
            "Total returned should equal total bet"
        );
    }
    
    /**
     * @dev Fuzz test: Multiple rounds with different scenarios
     */
    function testFuzz_MultipleRoundsAlwaysValid(uint256 seed) public {
        seed = bound(seed, 1, type(uint64).max);
        
        // Play 3 rounds
        for (uint256 round = 0; round < 3; round++) {
            vm.warp(seed + round * 1000);
            
            vm.prank(owner);
            game.startGame(TEST_GAME_DURATION);
            
            uint256 player1BeforeBet = player1.balance;
            uint256 player2BeforeBet = player2.balance;
            uint256 ownerBefore = owner.balance;
            
            // Two players join and bet
            vm.prank(player1);
            game.joinGame();
            vm.prank(player1);
            game.placeBet{value: TEST_BET_AMOUNT}(0);
            
            vm.prank(player2);
            game.joinGame();
            vm.prank(player2);
            game.placeBet{value: TEST_BET_AMOUNT}(0);
            
            // Record balances after bets placed
            uint256 player1AfterBet = player1.balance;
            uint256 player2AfterBet = player2.balance;
            
            vm.prank(owner);
            game.endGame();
            
            // Check invariants
            uint256 pot = TEST_BET_AMOUNT * 2;
            uint256 houseFee = (pot * HOUSE_FEE_PERCENTAGE) / 100;
            uint256 netPot = pot - houseFee;
            
            // Calculate payouts (current balance - balance after bet)
            uint256 player1Payout = 0;
            uint256 player2Payout = 0;
            
            if (player1.balance > player1AfterBet) {
                player1Payout = player1.balance - player1AfterBet;
            }
            if (player2.balance > player2AfterBet) {
                player2Payout = player2.balance - player2AfterBet;
            }
            
            assertEq(
                player1Payout + player2Payout,
                netPot,
                "Round payout should match net pot"
            );
            
            // Withdraw and check fees
            vm.prank(owner);
            game.withdrawHouseFees();
            
            assertEq(
                owner.balance,
                ownerBefore + houseFee,
                "Owner should receive house fee each round"
            );
        }
    }
}
