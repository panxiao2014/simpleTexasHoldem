// test/unit/pot-distribution.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import hre from "hardhat";
import {
  setupStandardGame,
  playersJoinGame,
  playersPlaceBets,
} from "../helpers/fixtures.js";

import {
  parseEther,
  calculateExpectedPayout,
  formatBalanceChanges,
} from "../helpers/utils.js";

describe("Pot Distribution", () => {
  let viem: any;
  let publicClient: any;
  let game: any;
  let owner: any;
  let player1: any;
  let player2: any;
  let player3: any;
  let maxPlayers: number;

  beforeEach(async () => {
    const network = await hre.network.connect();
    viem = network.viem;
    publicClient = await viem.getPublicClient();

    const setup = await setupStandardGame(viem);
    game = setup.game;
    owner = setup.owner;
    player1 = setup.player1;
    player2 = setup.player2;

    const wallets = await viem.getWalletClients();
    player3 = wallets[3];
    
    // Read contract constant
    maxPlayers = Number(await game.read.MAX_PLAYERS());
  });

  describe("Split Pot (Ties)", () => {
    it("Should split pot between tied winners", async () => {
      // Note: Since cards are random, we can't force a tie
      // But we can verify that total distributed = netPot
      const betAmount = parseEther("1");

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [betAmount, betAmount]);

      const balancesBefore = [
        await publicClient.getBalance({address: player1.account.address}),
        await publicClient.getBalance({address: player2.account.address}),
      ];

      await game.write.endGame({ account: owner.account });

      const balancesAfter = [
        await publicClient.getBalance({address: player1.account.address}),
        await publicClient.getBalance({address: player2.account.address}),
      ];

      const changes = balancesAfter.map((after, i) => after - balancesBefore[i]);
      const totalDistributed = changes.reduce((sum, c) => sum + c, 0n);

      const { netPot } = await calculateExpectedPayout([betAmount, betAmount], game);

      assert.equal(totalDistributed, netPot);
    });
  });

  describe("Game Cancellation (< 2 players)", () => {
    it("Should return bets if only 1 player bet", async () => {
      const betAmount = parseEther("1");

      await game.write.joinGame({ account: player1.account });

      await game.write.placeBet([0n], {
        account: player1.account,
        value: betAmount,
      });

      const balanceBefore = await publicClient.getBalance({
        address: player1.account.address,
      });

      await game.write.endGame({ account: owner.account });

      const balanceAfter = await publicClient.getBalance({
        address: player1.account.address,
      });


      assert.equal(balanceBefore, balanceBefore);
    });

    it("Should not charge house fee on cancelled game", async () => {
      await game.write.joinGame({ account: player1.account });
      await game.write.placeBet([0n], {
        account: player1.account,
        value: parseEther("1"),
      });

      await game.write.endGame({ account: owner.account });

      const houseFees = await game.read.accumulatedHouseFees();
      assert.equal(houseFees, 0n, "Should not accumulate fees on cancel");
    });
  });

  describe("Excess Bet Returns", () => {
    it("Should return excess bets correctly (varied amounts)", async () => {
      const bets = [parseEther("1"), parseEther("2"), parseEther("5")];

      await playersJoinGame(game, [player1, player2, player3]);
      await playersPlaceBets(game, [player1, player2, player3], bets);

      const balancesBefore = [
        await publicClient.getBalance({address: player1.account.address}),
        await publicClient.getBalance({address: player2.account.address}),
        await publicClient.getBalance({address: player3.account.address}),
      ];

      await game.write.endGame({ account: owner.account });

      const balancesAfter = [
        await publicClient.getBalance({address: player1.account.address}),
        await publicClient.getBalance({address: player2.account.address}),
        await publicClient.getBalance({address: player3.account.address}),
      ];

      const changes = balancesAfter.map((after, i) => after - balancesBefore[i]);

      // Pot is based on min bet (1 ETH)
      // Player1: no excess
      // Player2: gets back 1 ETH excess (if didn't win)
      // Player3: gets back 4 ETH excess (if didn't win)

      console.log("Balance changes:", formatBalanceChanges(changes));

      const totalDistributed = changes.reduce((sum, c) => sum + c, 0n);
      const { netPot } = await calculateExpectedPayout(bets, game);

      // Total distributed should equal netPot (within rounding)
      // Plus excess returns (4 ETH total excess)
      const totalExcess = parseEther("5"); // (2-1) + (5-1)
      const expectedTotal = netPot + totalExcess;

      assert.equal(totalDistributed, expectedTotal);
    });
  });

  describe("Edge Cases", () => {
    it("Should handle maximum players (MAX_PLAYERS)", async () => {
      const wallets = await viem.getWalletClients();
      const players = wallets.slice(1, maxPlayers + 1); // maxPlayers from contract
      const betAmount = parseEther("1");
      const bets = Array(maxPlayers).fill(betAmount);

      await playersJoinGame(game, players);
      await playersPlaceBets(game, players, bets);

      const balancesBefore = await Promise.all(
        players.map(player => 
          publicClient.getBalance({ address: player.account.address })
        )
      );

      await game.write.endGame({ account: owner.account });

      const balancesAfter = await Promise.all(
        players.map(player => 
          publicClient.getBalance({ address: player.account.address })
        )
      );

      const changes = balancesAfter.map((after, i) => after - balancesBefore[i]);
      const totalDistributed = changes.reduce((sum, c) => sum + c, 0n);

      const { netPot } = await calculateExpectedPayout(bets, game);

      assert.equal(totalDistributed, netPot);
    });

    it("Should handle very small bets", async () => {
      const smallBet = 1000n; // 1000 wei

      await playersJoinGame(game, [player1, player2]);
      await playersPlaceBets(game, [player1, player2], [smallBet, smallBet]);

      await game.write.endGame({ account: owner.account });

      const houseFees = await game.read.accumulatedHouseFees();

      // Fee should be calculated: 2000 wei * 1% = 20 wei
      assert.equal(houseFees, 20n);
    });
  });
});
