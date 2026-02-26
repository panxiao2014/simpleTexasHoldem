// test/unit/house-fees.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import hre from "hardhat";
import {
  setupStandardGame,
  playersJoinGame,
  playersPlaceBets,
} from "../helpers/fixtures";
import { assertBigIntEqual, assertBigIntWithinTolerance } from "../helpers/assertions";
import { parseEther, calculateExpectedPayout } from "../helpers/utils";

describe("House Fees", () => {
  let viem: any;
  let game: any;
  let owner: any;
  let player1: any;
  let player2: any;

  beforeEach(async () => {
    const network = await hre.network.connect();
    viem = network.viem;

    const setup = await setupStandardGame(viem);
    game = setup.game;
    owner = setup.owner;
    player1 = setup.player1;
    player2 = setup.player2;
  });

  describe("Fee Calculation", () => {
    it("Should calculate 1% house fee correctly", async () => {
      const betAmount = parseEther("10");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);

      await game.write.endGame({ account: owner.account });

      const houseFees = await game.read.accumulatedHouseFees();
      const { houseFee } = calculateExpectedPayout([betAmount, betAmount]);

      assertBigIntEqual(houseFees, houseFee);
      assertBigIntEqual(houseFees, parseEther("0.2")); // 20 ETH * 1% = 0.2 ETH
    });

    it("Should accumulate fees from pot calculation", async () => {
      const betAmount = parseEther("5");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);

      await game.write.endGame({ account: owner.account });

      const houseFees = await game.read.accumulatedHouseFees();

      // pot = 5 * 2 = 10 ETH
      // fee = 10 * 1% = 0.1 ETH
      assertBigIntEqual(houseFees, parseEther("0.1"));
    });

    it("Should handle fees with different bet amounts", async () => {
      // Pot based on minimum bet
      const bet1 = parseEther("2");
      const bet2 = parseEther("7");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [bet1, bet2]);

      await game.write.endGame({ account: owner.account });

      const houseFees = await game.read.accumulatedHouseFees();

      // pot = min(2, 7) * 2 = 4 ETH
      // fee = 4 * 1% = 0.04 ETH
      assertBigIntEqual(houseFees, parseEther("0.04"));
    });
  });

  describe("Fee Accumulation", () => {
    it("Should accumulate fees across multiple games", async () => {
      const betAmount = parseEther("1");

      // Game 1
      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);
      await game.write.endGame({ account: owner.account });

      let houseFees = await game.read.accumulatedHouseFees();
      assertBigIntEqual(houseFees, parseEther("0.02")); // 2 * 1% = 0.02

      // Game 2
      await game.write.startGame([3600n], { account: owner.account });
      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);
      await game.write.endGame({ account: owner.account });

      houseFees = await game.read.accumulatedHouseFees();
      assertBigIntEqual(houseFees, parseEther("0.04")); // 0.02 + 0.02
    });

    it("Should not accumulate fees on cancelled game", async () => {
      await game.write.joinGame({ account: player1.account });
      await game.write.placeBet([0n], {
        account: player1.account,
        value: parseEther("1"),
      });

      await game.write.endGame({ account: owner.account });

      const houseFees = await game.read.accumulatedHouseFees();
      assertBigIntEqual(houseFees, 0n);
    });
  });

  describe("withdrawHouseFees()", () => {
    it("Should allow owner to withdraw accumulated fees", async () => {
      const betAmount = parseEther("10");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);
      await game.write.endGame({ account: owner.account });

      const feesBefore = await game.read.accumulatedHouseFees();
      const ownerBalanceBefore = await viem.getBalance({
        address: owner.account.address,
      });

      // Withdraw fees
      await game.write.withdrawHouseFees({ account: owner.account });

      const feesAfter = await game.read.accumulatedHouseFees();
      const ownerBalanceAfter = await viem.getBalance({
        address: owner.account.address,
      });

      // Fees should be zero after withdrawal
      assertBigIntEqual(feesAfter, 0n);

      // Owner should receive the fees (minus gas)
      const balanceChange = ownerBalanceAfter - ownerBalanceBefore;
      assertBigIntWithinTolerance(balanceChange, feesBefore, parseEther("0.01"));

      console.log("Fees withdrawn:", feesBefore);
      console.log("Owner balance change:", balanceChange);
    });

    it("Should emit HouseFeeWithdrawn event", async () => {
      const betAmount = parseEther("1");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);
      await game.write.endGame({ account: owner.account });

      const fees = await game.read.accumulatedHouseFees();

      await viem.assertions.emitWithArgs(
        game.write.withdrawHouseFees({ account: owner.account }),
        game,
        "HouseFeeWithdrawn",
        [owner.account.address, fees]
      );
    });

    it("Should revert if no fees accumulated", async () => {
      await assert.rejects(
        async () =>
          await game.write.withdrawHouseFees({ account: owner.account }),
        /NoFees/,
        "Should revert with NoFees"
      );
    });

    it("Should only allow owner to withdraw fees", async () => {
      const betAmount = parseEther("1");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);
      await game.write.endGame({ account: owner.account });

      await assert.rejects(
        async () =>
          await game.write.withdrawHouseFees({ account: player1.account }),
        /OwnableUnauthorizedAccount/,
        "Should revert when non-owner tries to withdraw"
      );
    });

    it("Should allow multiple withdrawals", async () => {
      const betAmount = parseEther("1");

      // Game 1 - withdraw
      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);
      await game.write.endGame({ account: owner.account });
      await game.write.withdrawHouseFees({ account: owner.account });

      let fees = await game.read.accumulatedHouseFees();
      assertBigIntEqual(fees, 0n);

      // Game 2 - accumulate more fees
      await game.write.startGame([3600n], { account: owner.account });
      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);
      await game.write.endGame({ account: owner.account });

      fees = await game.read.accumulatedHouseFees();
      assertBigIntEqual(fees, parseEther("0.02"));

      // Withdraw again
      await game.write.withdrawHouseFees({ account: owner.account });
      fees = await game.read.accumulatedHouseFees();
      assertBigIntEqual(fees, 0n);
    });
  });

  describe("Fee Integration", () => {
    it("Should correctly split pot after deducting fee", async () => {
      const betAmount = parseEther("100");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);

      const player1Before = await viem.getBalance({
        address: player1.account.address,
      });
      const player2Before = await viem.getBalance({
        address: player2.account.address,
      });

      await game.write.endGame({ account: owner.account });

      const player1After = await viem.getBalance({
        address: player1.account.address,
      });
      const player2After = await viem.getBalance({
        address: player2.account.address,
      });

      const change1 = player1After - player1Before;
      const change2 = player2After - player2Before;

      const { netPot, houseFee } = calculateExpectedPayout([
        betAmount,
        betAmount,
      ]);

      console.log("Player1 change:", change1);
      console.log("Player2 change:", change2);
      console.log("Expected netPot:", netPot);
      console.log("Expected houseFee:", houseFee);

      // One player should win approximately netPot
      // Total distributed should be close to netPot
      const totalDistributed = change1 + change2;
      assertBigIntWithinTolerance(totalDistributed, netPot, 2n);

      // House fee should be accumulated
      const accumulatedFees = await game.read.accumulatedHouseFees();
      assertBigIntEqual(accumulatedFees, houseFee);
    });

    it("Should handle fees with rounding correctly", async () => {
      // Odd amount that might cause rounding
      const betAmount = 1001n; // 1001 wei

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);

      await game.write.endGame({ account: owner.account });

      const houseFees = await game.read.accumulatedHouseFees();

      // pot = 2002 wei
      // fee = 2002 * 1 / 100 = 20.02 = 20 wei (integer division)
      assertBigIntEqual(houseFees, 20n);
    });
  });
});
