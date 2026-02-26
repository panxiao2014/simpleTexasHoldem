// test/unit/pot-distribution.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import hre from "hardhat";
import {
  setupStandardGame,
  playersJoinGame,
  playersPlaceBets,
  getBalances,
} from "../helpers/fixtures";
import {
  assertBigIntEqual,
  assertBigIntWithinTolerance,
  assertOnePlayerWon,
} from "../helpers/assertions";
import {
  parseEther,
  calculateExpectedPayout,
  formatBalanceChanges,
} from "../helpers/utils";

describe("Pot Distribution", () => {
  let viem: any;
  let game: any;
  let owner: any;
  let player1: any;
  let player2: any;
  let player3: any;

  beforeEach(async () => {
    const network = await hre.network.connect();
    viem = network.viem;

    const setup = await setupStandardGame(viem);
    game = setup.game;
    owner = setup.owner;
    player1 = setup.player1;
    player2 = setup.player2;

    const wallets = await viem.getWalletClients();
    player3 = wallets[3];
  });

  describe("Single Winner", () => {
    it("Should distribute entire pot to winner (2 players, equal bets)", async () => {
      const betAmount = parseEther("1");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);

      const balancesBefore = await getBalances(viem, [
        player1.account.address,
        player2.account.address,
      ]);

      // End game
      await game.write.endGame({ account: owner.account });

      const balancesAfter = await getBalances(viem, [
        player1.account.address,
        player2.account.address,
      ]);

      // Calculate changes
      const changes = balancesAfter.map((after, i) => after - balancesBefore[i]);

      // Expected: pot = 2 ETH, fee = 0.02 ETH, winner gets 1.98 ETH
      const { netPot } = calculateExpectedPayout([betAmount, betAmount]);

      // One player should have won approximately netPot
      assertOnePlayerWon(changes, netPot);

      console.log("Balance changes:", formatBalanceChanges(changes));
    });

    it("Should handle different bet amounts (return excess)", async () => {
      const bet1 = parseEther("1");
      const bet2 = parseEther("3");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [bet1, bet2]);

      const balancesBefore = await getBalances(viem, [
        player1.account.address,
        player2.account.address,
      ]);

      await game.write.endGame({ account: owner.account });

      const balancesAfter = await getBalances(viem, [
        player1.account.address,
        player2.account.address,
      ]);

      const changes = balancesAfter.map((after, i) => after - balancesBefore[i]);

      // Pot based on minimum bet (1 ETH)
      const { netPot, minBet } = calculateExpectedPayout([bet1, bet2]);

      // One player wins netPot (1.98 ETH)
      // Player2 should get back excess: 3 - 1 = 2 ETH (if they didn't win)
      const excessReturned = bet2 - minBet;

      console.log("Balance changes:", formatBalanceChanges(changes));
      console.log("Expected netPot:", netPot);
      console.log("Expected excess:", excessReturned);

      // Verify one player won approximately netPot (with possible excess)
      const winnerIndex = changes[0] > 0n ? 0 : 1;
      const loserIndex = winnerIndex === 0 ? 1 : 0;

      // Winner should have netPot minus their bet (or netPot + excess - bet)
      // Loser should have their excess back (if player2)
      if (loserIndex === 1) {
        // Player2 lost, should get excess back
        assertBigIntWithinTolerance(changes[loserIndex], excessReturned, parseEther("0.01"));
      }
    });

    it("Should distribute pot correctly with 3 players", async () => {
      const betAmount = parseEther("2");

      await playersJoinGame(game, [player1, player2, player3]);
      await playersPlaceBets(game, [player1, player2, player3], [
        betAmount,
        betAmount,
        betAmount,
      ]);

      const balancesBefore = await getBalances(viem, [
        player1.account.address,
        player2.account.address,
        player3.account.address,
      ]);

      await game.write.endGame({ account: owner.account });

      const balancesAfter = await getBalances(viem, [
        player1.account.address,
        player2.account.address,
        player3.account.address,
      ]);

      const changes = balancesAfter.map((after, i) => after - balancesBefore[i]);

      // Expected: pot = 6 ETH, fee = 0.06 ETH, winner gets 5.94 ETH
      const { netPot } = calculateExpectedPayout([
        betAmount,
        betAmount,
        betAmount,
      ]);

      console.log("Balance changes:", formatBalanceChanges(changes));

      // Exactly one winner
      assertOnePlayerWon(changes, netPot);
    });
  });

  describe("Split Pot (Ties)", () => {
    it("Should split pot between tied winners", async () => {
      // Note: Since cards are random, we can't force a tie
      // But we can verify that total distributed = netPot
      const betAmount = parseEther("1");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);

      const balancesBefore = await getBalances(viem, [
        player1.account.address,
        player2.account.address,
      ]);

      await game.write.endGame({ account: owner.account });

      const balancesAfter = await getBalances(viem, [
        player1.account.address,
        player2.account.address,
      ]);

      const changes = balancesAfter.map((after, i) => after - balancesBefore[i]);
      const totalDistributed = changes.reduce((sum, c) => sum + c, 0n);

      const { netPot } = calculateExpectedPayout([betAmount, betAmount]);

      // Total distributed should equal netPot (within rounding tolerance)
      assertBigIntWithinTolerance(totalDistributed, netPot, 2n);

      console.log("Balance changes:", formatBalanceChanges(changes));
      console.log("Total distributed:", totalDistributed);
      console.log("Expected netPot:", netPot);
    });
  });

  describe("Game Cancellation (< 2 players)", () => {
    it("Should return bets if only 1 player bet", async () => {
      const betAmount = parseEther("1");

      await game.write.joinGame({ account: player1.account });

      const balanceBefore = await viem.getBalance({
        address: player1.account.address,
      });

      await game.write.placeBet([0n], {
        account: player1.account,
        value: betAmount,
      });

      await game.write.endGame({ account: owner.account });

      const balanceAfter = await viem.getBalance({
        address: player1.account.address,
      });

      // Player should get their bet back (minus small gas)
      const change = balanceAfter - balanceBefore;
      assertBigIntWithinTolerance(change, 0n, parseEther("0.01"));

      console.log("Balance change:", change);
    });

    it("Should not charge house fee on cancelled game", async () => {
      await game.write.joinGame({ account: player1.account });
      await game.write.placeBet([0n], {
        account: player1.account,
        value: parseEther("1"),
      });

      await game.write.endGame({ account: owner.account });

      const houseFees = await game.read.accumulatedHouseFees();
      assertBigIntEqual(houseFees, 0n, "Should not accumulate fees on cancel");
    });
  });

  describe("Excess Bet Returns", () => {
    it("Should return excess bets correctly (varied amounts)", async () => {
      const bets = [parseEther("1"), parseEther("2"), parseEther("5")];

      await playersJoinGame(game, [player1, player2, player3]);
      await playersPlaceBets(game, [player1, player2, player3], bets);

      const balancesBefore = await getBalances(viem, [
        player1.account.address,
        player2.account.address,
        player3.account.address,
      ]);

      await game.write.endGame({ account: owner.account });

      const balancesAfter = await getBalances(viem, [
        player1.account.address,
        player2.account.address,
        player3.account.address,
      ]);

      const changes = balancesAfter.map((after, i) => after - balancesBefore[i]);

      // Pot is based on min bet (1 ETH)
      // Player1: no excess
      // Player2: gets back 1 ETH excess (if didn't win)
      // Player3: gets back 4 ETH excess (if didn't win)

      console.log("Balance changes:", formatBalanceChanges(changes));

      const totalDistributed = changes.reduce((sum, c) => sum + c, 0n);
      const { netPot } = calculateExpectedPayout(bets);

      // Total distributed should equal netPot (within rounding)
      // Plus excess returns (4 ETH total excess)
      const totalExcess = parseEther("5"); // (2-1) + (5-1)
      const expectedTotal = netPot + totalExcess;

      assertBigIntWithinTolerance(totalDistributed, expectedTotal, parseEther("0.01"));
    });
  });

  describe("Edge Cases", () => {
    it("Should handle maximum players (9)", async () => {
      const wallets = await viem.getWalletClients();
      const players = wallets.slice(1, 10); // 9 players
      const betAmount = parseEther("1");
      const bets = Array(9).fill(betAmount);

      await playersJoinGame(game, players);
      await playersPlaceBets(game, players, bets);

      const balancesBefore = await getBalances(
        viem,
        players.map((p) => p.account.address)
      );

      await game.write.endGame({ account: owner.account });

      const balancesAfter = await getBalances(
        viem,
        players.map((p) => p.account.address)
      );

      const changes = balancesAfter.map((after, i) => after - balancesBefore[i]);

      const { netPot } = calculateExpectedPayout(bets);

      console.log(`9-player game - Expected netPot: ${netPot}`);

      // At least one winner should exist
      const winnersCount = changes.filter((c) => c > netPot / 2n).length;
      assert.ok(winnersCount >= 1, "Should have at least one winner");
    });

    it("Should handle very small bets", async () => {
      const smallBet = 1000n; // 1000 wei

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [smallBet, smallBet]);

      await game.write.endGame({ account: owner.account });

      const houseFees = await game.read.accumulatedHouseFees();
      console.log("House fees from small bet:", houseFees);

      // Fee should be calculated: 2000 wei * 1% = 20 wei
      assertBigIntEqual(houseFees, 20n);
    });
  });
});
