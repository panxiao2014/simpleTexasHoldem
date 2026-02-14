// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SimpleTexasHoldem.sol";
import "../contracts/PokerHandEvaluator.sol";
import "../contracts/TexasHoldemConstants.sol";

/**
 * @title SimpleTexasHoldemTest
 * @dev Comprehensive tests for SimpleTexasHoldem contract
 * @notice Run with: pnpm hardhat test test/SimpleTexasHoldem.t.sol
 */
contract SimpleTexasHoldemTest is TexasHoldemConstants, Test {
    SimpleTexasHoldem public game;
    
    // Test accounts (private - only used within this test contract)
    address private owner;
    address private player1;
    address private player2;
    address private player3;
    
    // Constants inherited from TexasHoldemConstants:
    // - MIN_PLAYERS = 2
    // - MAX_PLAYERS = 9
    // - MAX_TOTAL_PLAYERS = 50
    // - HOUSE_FEE_PERCENTAGE = 1
    // - JOIN_CUTOFF = 5 minutes
    // - MIN_CARDS_REQUIRED = 7
    // - DECK_SIZE = 52
    
    // Test-specific constants (not in TexasHoldemConstants)
    uint256 constant TEST_GAME_DURATION = 1 hours;
    uint256 constant TEST_BET_AMOUNT = 1 ether;
    uint256 constant INITIAL_PLAYER_BALANCE = 100 ether;
    
    // Events inherited from TexasHoldemConstants:
    // - GameStarted
    // - PlayerJoined
    // - PlayerFolded
    // - PlayerBet
    // - BoardCardsDealt
    // - GameEnded
    // - HouseFeeWithdrawn
    // - EmergencyPauseToggled
    
    function setUp() public {
        // Setup test accounts
        owner = makeAddr("contractOwner");  // Separate owner account
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");
        player3 = makeAddr("player3");
        
        // Fund owner with ETH
        vm.deal(owner, 100 ether);
        
        // Deploy game contract as owner (ETH mode)
        vm.prank(owner);
        game = new SimpleTexasHoldem(address(0));
        
        // Fund players with ETH
        vm.deal(player1, INITIAL_PLAYER_BALANCE);
        vm.deal(player2, INITIAL_PLAYER_BALANCE);
        vm.deal(player3, INITIAL_PLAYER_BALANCE);
    }
    
    // ============ Constructor Tests ============
    
    function test_Constructor_ETHMode() public view {
        // setUp() already created ETH mode contract, just verify it
        assertTrue(game.useETH());
        assertEq(game.currentGameId(), 0);
        assertFalse(game.gameActive());
    }
    
    function test_Constructor_OwnerSet() public view {
        assertEq(game.owner(), owner);
    }
    
    // ============ Game Lifecycle Tests ============
    
    function test_StartGame_Success() public {
        uint256 duration = TEST_GAME_DURATION;
        
        vm.expectEmit(true, false, false, false);
        emit GameStarted(1, block.timestamp, block.timestamp + duration);
        
        vm.prank(owner);
        game.startGame(duration);
        
        assertTrue(game.gameActive());
        assertEq(game.currentGameId(), 1);
    }
    
    function test_StartGame_RevertsIfGameActive() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.expectRevert(SimpleTexasHoldem.GameAlreadyActive.selector);
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
    }
    
    function test_StartGame_RevertsIfDurationTooShort() public {
        vm.expectRevert(SimpleTexasHoldem.DurationTooShort.selector);
        vm.prank(owner);
        game.startGame(JOIN_CUTOFF - 1 minutes); // Less than JOIN_CUTOFF
    }
    
    function test_StartGame_OnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", player1));
        game.startGame(TEST_GAME_DURATION);
    }
    
    // ============ Join Game Tests ============
    
    function test_JoinGame_Success() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        // Note: Can't predict exact cards, so we skip checking the cards parameter in expectEmit
        vm.expectEmit(true, true, false, false);
        emit PlayerJoined(1, player1, [uint8(0), uint8(0)]);
        
        game.joinGame();
        
        (bool hasParticipated, , , ) = game.getPlayerInfo(player1);
        assertTrue(hasParticipated);
    }
    
    function test_JoinGame_RevertsIfNoActiveGame() public {
        vm.prank(player1);
        vm.expectRevert(SimpleTexasHoldem.NoActiveGame.selector);
        game.joinGame();
    }
    
    function test_JoinGame_RevertsIfAlreadyParticipated() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        
        vm.prank(player1);
        vm.expectRevert(SimpleTexasHoldem.AlreadyParticipated.selector);
        game.joinGame();
    }
    
    function test_JoinGame_RevertsIfGameFull() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // Fill game with MAX_PLAYERS who bet
        for (uint i = 0; i < MAX_PLAYERS; i++) {
            address player = makeAddr(string(abi.encodePacked("filler", vm.toString(i))));
            vm.deal(player, 10 ether);
            
            vm.prank(player);
            game.joinGame();
            
            vm.prank(player);
            game.placeBet{value: TEST_BET_AMOUNT}(0);
        }
        
        // Now try to join with a NEW player (not one of the fillers)
        address newPlayer = makeAddr("extraPlayer");
        vm.prank(newPlayer);
        vm.expectRevert(SimpleTexasHoldem.GameFull.selector);
        game.joinGame();
    }
    
    function test_JoinGame_RevertsIfJoinPeriodClosed() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // Warp to within JOIN_CUTOFF period before end
        vm.warp(block.timestamp + TEST_GAME_DURATION - JOIN_CUTOFF + 1);
        
        vm.prank(player1);
        vm.expectRevert(SimpleTexasHoldem.JoinPeriodClosed.selector);
        game.joinGame();
    }
    
    function test_JoinGame_ReceivesTwoCards() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        
        (, , , uint8[2] memory cards) = game.getPlayerInfo(player1);
        
        // Should have two different cards
        assertTrue(cards[0] != cards[1]);
        assertTrue(cards[0] < 52);
        assertTrue(cards[1] < 52);
    }
    
    // ============ Fold Tests ============
    
    function test_Fold_Success() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        
        vm.prank(player1);
        // Note: Can't predict exact cards, so we skip checking the cards parameter in expectEmit
        vm.expectEmit(true, true, false, false);
        emit PlayerFolded(1, player1, [uint8(0), uint8(0)]);
        
        game.fold();
    }
    
    function test_Fold_RevertsIfNotInGame() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        vm.expectRevert(SimpleTexasHoldem.NotInGame.selector);
        game.fold();
    }
    
    function test_Fold_RevertsIfAlreadyBet() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        
        vm.prank(player1);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        vm.prank(player1);
        vm.expectRevert(SimpleTexasHoldem.AlreadyBet.selector);
        game.fold();
    }
    
    function test_Fold_ReturnsCardsToPool() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // Get initial card count
        (, , , , , uint256 cardsRemaining1, ) = game.getCurrentGameInfo();
        assertEq(cardsRemaining1, 52);
        
        vm.prank(player1);
        game.joinGame();
        
        // Cards used (2)
        (, , , , , uint256 cardsRemaining2, ) = game.getCurrentGameInfo();
        assertEq(cardsRemaining2, 50);
        
        vm.prank(player1);
        game.fold();
        
        // Cards returned
        (, , , , , uint256 cardsRemaining3, ) = game.getCurrentGameInfo();
        assertEq(cardsRemaining3, 52);
    }
    
    // ============ Place Bet Tests ============
    
    function test_PlaceBet_Success() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        
        vm.prank(player1);
        vm.expectEmit(true, true, false, true);
        emit PlayerBet(1, player1, TEST_BET_AMOUNT);
        
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        (, bool hasBet, uint256 betAmount, ) = game.getPlayerInfo(player1);
        assertTrue(hasBet);
        assertEq(betAmount, TEST_BET_AMOUNT);
    }
    
    function test_PlaceBet_RevertsIfMustJoinFirst() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        vm.expectRevert(SimpleTexasHoldem.MustJoinFirst.selector);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
    }
    
    function test_PlaceBet_RevertsIfAlreadyBet() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        
        vm.prank(player1);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        vm.prank(player1);
        vm.expectRevert(SimpleTexasHoldem.AlreadyBet.selector);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
    }
    
    function test_PlaceBet_RevertsIfZeroAmount() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        
        vm.prank(player1);
        vm.expectRevert(SimpleTexasHoldem.MustBetSome.selector);
        game.placeBet{value: 0}(0);
    }
    
    // ============ End Game Tests ============
    
    function test_EndGame_WithTwoPlayers() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // Two players join and bet
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        // End game
        vm.prank(owner);
        game.endGame();
        
        assertFalse(game.gameActive());
    }
    
    function test_EndGame_CancelsIfLessThanTwoPlayers() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // Only one player bets
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        uint256 balanceBefore = player1.balance;
        
        vm.prank(owner);
        game.endGame();
        
        // Bet should be returned
        assertEq(player1.balance, balanceBefore + 1 ether);
        assertFalse(game.gameActive());
    }
    
    function test_EndGame_OnlyOwner() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", player1));
        game.endGame();
    }
    
    function test_EndGame_RevertsIfNoActiveGame() public {
        vm.expectRevert(SimpleTexasHoldem.NoActiveGame.selector);
        vm.prank(owner);
        game.endGame();
    }
    
    // ============ Pot Distribution Tests ============
    
    function test_PotDistribution_SingleWinner() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        uint256 betAmount = 2 ether;
        
        // Two players bet same amount
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: betAmount}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: betAmount}(0);
        
        uint256 player1BalanceBefore = player1.balance;
        uint256 player2BalanceBefore = player2.balance;
        
        // End game
        vm.prank(owner);
        game.endGame();
        
        // Calculate expected amounts
        uint256 pot = betAmount * 2;
        uint256 houseFee = (pot * HOUSE_FEE_PERCENTAGE) / 100;
        uint256 netPot = pot - houseFee;
        
        // Calculate actual payouts
        uint256 player1Payout = player1.balance - player1BalanceBefore;
        uint256 player2Payout = player2.balance - player2BalanceBefore;
        uint256 totalPayout = player1Payout + player2Payout;
        
        // Verify total payout equals net pot (after house fee)
        assertEq(totalPayout, netPot, "Total payout should equal net pot");
        
        // Verify one of three scenarios:
        // 1. Player1 wins all
        // 2. Player2 wins all  
        // 3. Both split equally (tie)
        bool scenario1 = player1Payout == netPot && player2Payout == 0;
        bool scenario2 = player1Payout == 0 && player2Payout == netPot;
        bool scenario3 = player1Payout == netPot / 2 && player2Payout == netPot / 2;
        
        assertTrue(
            scenario1 || scenario2 || scenario3,
            "Should be either single winner or equal split"
        );
    }
    
    function test_PotDistribution_SplitPot() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        uint256 betAmount = 3 ether;
        
        // Three players bet same amount
        // With random cards, there's a chance of ties
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: betAmount}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: betAmount}(0);
        
        vm.prank(player3);
        game.joinGame();
        vm.prank(player3);
        game.placeBet{value: betAmount}(0);
        
        uint256 player1BalanceBefore = player1.balance;
        uint256 player2BalanceBefore = player2.balance;
        uint256 player3BalanceBefore = player3.balance;
        
        // End game
        vm.prank(owner);
        game.endGame();
        
        // Calculate payouts
        uint256 player1Payout = player1.balance - player1BalanceBefore;
        uint256 player2Payout = player2.balance - player2BalanceBefore;
        uint256 player3Payout = player3.balance - player3BalanceBefore;
        uint256 totalPayout = player1Payout + player2Payout + player3Payout;
        
        // Calculate expected total
        uint256 pot = betAmount * 3;
        uint256 houseFee = (pot * HOUSE_FEE_PERCENTAGE) / 100;
        uint256 netPot = pot - houseFee;
        
        // Verify total distribution is correct
        assertEq(totalPayout, netPot, "Total payout should equal net pot");
        
        // Count winners (anyone who got paid)
        uint256 winnerCount = 0;
        if (player1Payout > 0) winnerCount++;
        if (player2Payout > 0) winnerCount++;
        if (player3Payout > 0) winnerCount++;
        
        // Should have at least 1 winner, at most 3 winners
        assertTrue(winnerCount >= 1 && winnerCount <= 3, "Should have 1-3 winners");
        
        // If multiple winners, each should get equal share
        if (winnerCount > 1) {
            uint256 expectedShare = netPot / winnerCount;
            if (player1Payout > 0) assertEq(player1Payout, expectedShare);
            if (player2Payout > 0) assertEq(player2Payout, expectedShare);
            if (player3Payout > 0) assertEq(player3Payout, expectedShare);
        }
    }
    
    function test_PotDistribution_HouseFeeCollected() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        uint256 betAmount = 10 ether;
        
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: betAmount}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: betAmount}(0);
        
        vm.prank(owner);
        game.endGame();
        
        // Calculate expected house fee
        uint256 pot = betAmount * 2;
        uint256 expectedFee = (pot * HOUSE_FEE_PERCENTAGE) / 100;
        
        // Verify fee is correctly accumulated (not withdrawn yet)
        assertEq(game.accumulatedHouseFees(), expectedFee);
    }
    
    function test_PotDistribution_ExcessBetsReturned() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        // Players bet different amounts
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: 5 ether}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: 2 ether}(0);
        
        uint256 player1BalanceBefore = player1.balance;
        
        vm.prank(owner);
        game.endGame();
        
        // Pot is min(5, 2) * 2 = 4 ether
        // Player1 should get back: 5 - 2 = 3 ether excess
        // Plus either win or lose the pot
        assertGe(player1.balance, player1BalanceBefore + 3 ether);
    }
    
    // ============ House Fee Withdrawal Tests ============
    
    function test_WithdrawHouseFees_Success() public {
        // Setup and play a game to accumulate fees
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: 10 ether}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: 10 ether}(0);
        
        vm.prank(owner);
        game.endGame();
        
        uint256 fees = game.accumulatedHouseFees();
        uint256 ownerBalanceBefore = owner.balance;
        
        vm.prank(owner);
        game.withdrawHouseFees();
        
        assertEq(owner.balance, ownerBalanceBefore + fees);
        assertEq(game.accumulatedHouseFees(), 0);
    }
    
    function test_WithdrawHouseFees_RevertsIfNoFees() public {
        vm.expectRevert(SimpleTexasHoldem.NoFees.selector);
        vm.prank(owner);
        game.withdrawHouseFees();
    }
    
    function test_WithdrawHouseFees_OnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", player1));
        game.withdrawHouseFees();
    }
    
    // ============ Pause Functionality Tests ============
    
    function test_TogglePause_Success() public {
        assertFalse(game.gamePaused());
        
        vm.prank(owner);
        game.togglePause();
        assertTrue(game.gamePaused());
        
        vm.prank(owner);
        game.togglePause();
        assertFalse(game.gamePaused());
    }
    
    function test_TogglePause_OnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", player1));
        game.togglePause();
    }
    
    function test_Paused_BlocksJoinGame() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        vm.prank(owner);
        game.togglePause();
        
        vm.prank(player1);
        vm.expectRevert(SimpleTexasHoldem.ContractPaused.selector);
        game.joinGame();
    }
    
    function test_Paused_BlocksPlaceBet() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        
        vm.prank(owner);
        game.togglePause();
        
        vm.prank(player1);
        vm.expectRevert(SimpleTexasHoldem.ContractPaused.selector);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
    }
    
    // ============ View Function Tests ============
    
    function test_GetCurrentGameInfo() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        (
            uint256 gameId,
            uint256 startTime,
            uint256 endTime,
            uint256 playerCount,
            uint256 totalParticipations,
            uint256 cardsRemaining,
            bool isActive
        ) = game.getCurrentGameInfo();
        
        assertEq(gameId, 1);
        assertEq(startTime, block.timestamp);
        assertEq(endTime, block.timestamp + TEST_GAME_DURATION);
        assertEq(playerCount, 0);
        assertEq(totalParticipations, 0);
        assertEq(cardsRemaining, 52);
        assertTrue(isActive);
    }
    
    function test_GetPlayerInfo() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        
        (bool hasParticipated, bool hasBet, uint256 betAmount, uint8[2] memory cards) = 
            game.getPlayerInfo(player1);
        
        assertTrue(hasParticipated);
        assertFalse(hasBet);
        assertEq(betAmount, 0);
        assertTrue(cards[0] < 52);
        assertTrue(cards[1] < 52);
    }
    
    function test_GetGamePlayers() public {
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        
        address[] memory players = game.getGamePlayers();
        
        assertEq(players.length, 2);
        assertEq(players[0], player1);
        assertEq(players[1], player2);
    }
    
    // ============ Integration Tests ============
    
    function test_FullGameFlow() public {
        // Start game
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        
        uint256 bet1 = 5 ether;
        uint256 bet2 = 3 ether;
        
        // Three players join
        vm.prank(player1);
        game.joinGame();
        vm.prank(player2);
        game.joinGame();
        vm.prank(player3);
        game.joinGame();
        
        // One folds
        vm.prank(player3);
        game.fold();
        
        // Two bet
        vm.prank(player1);
        game.placeBet{value: bet1}(0);
        vm.prank(player2);
        game.placeBet{value: bet2}(0);
        
        // End game
        vm.prank(owner);
        game.endGame();
        
        // Verify game ended
        assertFalse(game.gameActive());
        
        // Calculate expected house fee
        uint256 pot = bet2 * 2; // min(5, 3) * 2 = 6 ether
        uint256 expectedFee = (pot * HOUSE_FEE_PERCENTAGE) / 100;
        
        assertEq(game.accumulatedHouseFees(), expectedFee);
    }
    
    function test_MultipleGamesSequentially() public {
        // Game 1
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        vm.prank(owner);
        game.endGame();
        
        assertEq(game.currentGameId(), 1);
        
        // Game 2
        vm.prank(owner);
        game.startGame(TEST_GAME_DURATION);
        vm.prank(player1);
        game.joinGame();
        vm.prank(player1);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        vm.prank(player2);
        game.joinGame();
        vm.prank(player2);
        game.placeBet{value: TEST_BET_AMOUNT}(0);
        vm.prank(owner);
        game.endGame();
        
        assertEq(game.currentGameId(), 2);
    }
}
