// test/unit/player-actions.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import hre from "hardhat";
import { setupStandardGame } from "../helpers/fixtures";
import { assertBigIntEqual } from "../helpers/assertions";
import { parseEther } from "../helpers/utils";

describe("Player Actions", () => {
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

  describe("joinGame()", () => {
    it("Should allow player to join active game", async () => {
      await game.write.joinGame({ account: player1.account });

      const [hasParticipated] = await game.read.getPlayerInfo([
        player1.account.address,
      ]);
      assert.equal(hasParticipated, true, "Player should be marked as joined");
    });

    it("Should emit PlayerJoined event", async () => {
      await viem.assertions.emitWithArgs(
        game.write.joinGame({ account: player1.account }),
        game,
        "PlayerJoined"
        // Can't predict cards, so we don't check args
      );
    });

    it("Should assign two hole cards to player", async () => {
      await game.write.joinGame({ account: player1.account });

      const [, , holeCards] = await game.read.getPlayerInfo([
        player1.account.address,
      ]);

      assert.equal(holeCards.length, 2, "Player should have 2 hole cards");
      assert.notEqual(holeCards[0], holeCards[1], "Cards should be different");
    });

    it("Should allow multiple players to join", async () => {
      await game.write.joinGame({ account: player1.account });
      await game.write.joinGame({ account: player2.account });
      await game.write.joinGame({ account: player3.account });

      const gameInfo = await game.read.getCurrentGameInfo();
      assertBigIntEqual(
        gameInfo[4],
        3n,
        "Should have 3 total participations"
      );
    });

    it("Should revert if no active game", async () => {
      await game.write.endGame({ account: owner.account });

      await assert.rejects(
        async () => await game.write.joinGame({ account: player1.account }),
        /NoActiveGame/,
        "Should revert with NoActiveGame"
      );
    });

    it("Should revert if player already joined", async () => {
      await game.write.joinGame({ account: player1.account });

      await assert.rejects(
        async () => await game.write.joinGame({ account: player1.account }),
        /AlreadyParticipated/,
        "Should revert with AlreadyParticipated"
      );
    });

    it("Should revert if game is full (9 players)", async () => {
      const wallets = await viem.getWalletClients();

      // Join 9 players (skip owner at index 0)
      for (let i = 1; i <= 9; i++) {
        await game.write.joinGame({ account: wallets[i].account });
      }

      // Try to join 10th player
      await assert.rejects(
        async () => await game.write.joinGame({ account: wallets[10].account }),
        /MaxPlayersReached/,
        "Should revert with MaxPlayersReached"
      );
    });

    it("Should revert if joining too close to end time", async () => {
      // Fast forward to 56 minutes (cutoff is last 5 minutes)
      await viem.increaseTime(56 * 60);
      await viem.mine();

      await assert.rejects(
        async () => await game.write.joinGame({ account: player1.account }),
        /JoinPeriodClosed/,
        "Should revert with JoinPeriodClosed"
      );
    });
  });

  describe("placeBet()", () => {
    beforeEach(async () => {
      await game.write.joinGame({ account: player1.account });
    });

    it("Should allow player to place bet", async () => {
      const betAmount = parseEther("1");

      await game.write.placeBet([0n], {
        account: player1.account,
        value: betAmount,
      });

      const [, , , betAmount_stored] = await game.read.getPlayerInfo([
        player1.account.address,
      ]);
      assertBigIntEqual(betAmount_stored, betAmount, "Bet amount should match");
    });

    it("Should emit PlayerBet event", async () => {
      const betAmount = parseEther("1");

      await viem.assertions.emitWithArgs(
        game.write.placeBet([0n], {
          account: player1.account,
          value: betAmount,
        }),
        game,
        "PlayerBet",
        [1n, player1.account.address, betAmount]
      );
    });

    it("Should track player as active after betting", async () => {
      await game.write.placeBet([0n], {
        account: player1.account,
        value: parseEther("1"),
      });

      const gameInfo = await game.read.getCurrentGameInfo();
      assertBigIntEqual(gameInfo[3], 1n, "Should have 1 betting player");
    });

    it("Should revert if player hasn't joined", async () => {
      await assert.rejects(
        async () =>
          await game.write.placeBet([0n], {
            account: player2.account,
            value: parseEther("1"),
          }),
        /NotParticipating/,
        "Should revert with NotParticipating"
      );
    });

    it("Should revert if player already bet", async () => {
      await game.write.placeBet([0n], {
        account: player1.account,
        value: parseEther("1"),
      });

      await assert.rejects(
        async () =>
          await game.write.placeBet([0n], {
            account: player1.account,
            value: parseEther("1"),
          }),
        /AlreadyBet/,
        "Should revert with AlreadyBet"
      );
    });

    it("Should revert if bet amount is zero", async () => {
      await assert.rejects(
        async () =>
          await game.write.placeBet([0n], {
            account: player1.account,
            value: 0n,
          }),
        /InvalidBetAmount/,
        "Should revert with InvalidBetAmount"
      );
    });

    it("Should allow different bet amounts from different players", async () => {
      await game.write.joinGame({ account: player2.account });

      await game.write.placeBet([0n], {
        account: player1.account,
        value: parseEther("1"),
      });

      await game.write.placeBet([0n], {
        account: player2.account,
        value: parseEther("3"),
      });

      const [, , , bet1] = await game.read.getPlayerInfo([
        player1.account.address,
      ]);
      const [, , , bet2] = await game.read.getPlayerInfo([
        player2.account.address,
      ]);

      assertBigIntEqual(bet1, parseEther("1"));
      assertBigIntEqual(bet2, parseEther("3"));
    });
  });

  describe("fold()", () => {
    beforeEach(async () => {
      await game.write.joinGame({ account: player1.account });
      await game.write.joinGame({ account: player2.account });
    });

    it("Should allow player to fold", async () => {
      await game.write.fold({ account: player1.account });

      const [, hasFolded] = await game.read.getPlayerInfo([
        player1.account.address,
      ]);
      assert.equal(hasFolded, true, "Player should be marked as folded");
    });

    it("Should emit PlayerFolded event", async () => {
      await viem.assertions.emitWithArgs(
        game.write.fold({ account: player1.account }),
        game,
        "PlayerFolded"
      );
    });

    it("Should return cards to pool when folding", async () => {
      const [, , , , , cardsBeforeFold] =
        await game.read.getCurrentGameInfo();

      await game.write.fold({ account: player1.account });

      const [, , , , , cardsAfterFold] = await game.read.getCurrentGameInfo();

      assertBigIntEqual(
        cardsAfterFold,
        cardsBeforeFold + 2n,
        "Should return 2 cards to pool"
      );
    });

    it("Should revert if player hasn't joined", async () => {
      await assert.rejects(
        async () => await game.write.fold({ account: player3.account }),
        /NotParticipating/,
        "Should revert with NotParticipating"
      );
    });

    it("Should revert if player already folded", async () => {
      await game.write.fold({ account: player1.account });

      await assert.rejects(
        async () => await game.write.fold({ account: player1.account }),
        /AlreadyFolded/,
        "Should revert with AlreadyFolded"
      );
    });

    it("Should revert if player already bet", async () => {
      await game.write.placeBet([0n], {
        account: player1.account,
        value: parseEther("1"),
      });

      await assert.rejects(
        async () => await game.write.fold({ account: player1.account }),
        /AlreadyBet/,
        "Should revert with AlreadyBet"
      );
    });

    it("Should allow other players to continue after one folds", async () => {
      await game.write.fold({ account: player1.account });

      // Player2 should still be able to bet
      await game.write.placeBet([0n], {
        account: player2.account,
        value: parseEther("1"),
      });

      const [, , , betAmount] = await game.read.getPlayerInfo([
        player2.account.address,
      ]);
      assertBigIntEqual(betAmount, parseEther("1"));
    });
  });

  describe("Player State Management", () => {
    it("Should track all participants correctly", async () => {
      await game.write.joinGame({ account: player1.account });
      await game.write.joinGame({ account: player2.account });
      await game.write.joinGame({ account: player3.account });

      await game.write.placeBet([0n], {
        account: player1.account,
        value: parseEther("1"),
      });
      await game.write.fold({ account: player2.account });

      const [, , , bettingPlayers, totalParticipations] =
        await game.read.getCurrentGameInfo();

      assertBigIntEqual(bettingPlayers, 1n, "Should have 1 betting player");
      assertBigIntEqual(
        totalParticipations,
        3n,
        "Should have 3 total participants"
      );
    });

    it("Should return correct player info", async () => {
      await game.write.joinGame({ account: player1.account });
      await game.write.placeBet([0n], {
        account: player1.account,
        value: parseEther("2"),
      });

      const [hasParticipated, hasFolded, holeCards, betAmount] =
        await game.read.getPlayerInfo([player1.account.address]);

      assert.equal(hasParticipated, true);
      assert.equal(hasFolded, false);
      assert.equal(holeCards.length, 2);
      assertBigIntEqual(betAmount, parseEther("2"));
    });
  });
});
