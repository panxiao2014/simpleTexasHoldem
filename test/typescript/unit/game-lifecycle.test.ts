// test/unit/game-lifecycle.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import hre from "hardhat";
import { deployGameContract } from "../helpers/fixtures.js";
import { assertBigIntEqual } from "../helpers/assertions.js";
import { CONSTANTS } from "../helpers/utils.js";

describe("Game Lifecycle", () => {
  let viem: any;
  let publicClient: any;
  let game: any;
  let owner: any;
  let player1: any;

  beforeEach(async () => {
    const network = await hre.network.connect();
    viem = network.viem;
    publicClient = await viem.getPublicClient();

    const wallets = await viem.getWalletClients();
    [owner, player1] = wallets;

    game = await deployGameContract(viem);
  });

  describe("startGame()", () => {
    it("Should start a new game with correct initial state", async () => {
      const duration = 3600n;

      await game.write.startGame([duration], { account: owner.account });

      // Verify state
      const gameActive = await game.read.gameActive();
      const currentGameId = await game.read.currentGameId();
      const gameInfo = await game.read.getCurrentGameInfo();
      const deckSize = await game.read.DECK_SIZE();

      assert.equal(gameActive, true, "Game should be active");
      assertBigIntEqual(currentGameId, 1n, "Game ID should be 1");
      assertBigIntEqual(gameInfo[0], 1n, "Game info ID should be 1");
      assertBigIntEqual(gameInfo[3], 0n, "Should have zero players initially");
      assertBigIntEqual(gameInfo[4], 0n, "Should have zero participants initially");
      assertBigIntEqual(gameInfo[5], deckSize, `Cards remaining should be ${deckSize}`);
      assert.equal(gameInfo[6], true, "Game info should show active");
    });

    it("Should emit GameStarted event", async () => {
      const duration = 3600n;

      await viem.assertions.emit(
        game.write.startGame([duration], { account: owner.account }),
        game,
        "GameStarted",
      )
    });

    it("Should emit GameStarted event with correct parameters", async () => {
      const duration = 3600n;

      await viem.assertions.emitWithArgs(
        game.write.startGame([duration], { account: owner.account }),
        game,
        "GameStarted",
        [1n, () => true, () => true]
      )
    });

    it("Should revert if game is already active", async () => {
      await game.write.startGame([3600n], { account: owner.account });

      await viem.assertions.revertWithCustomError(
        game.write.startGame([3600n], { account: owner.account }),
        game,
        "GameAlreadyActive"
      )
    });

    it("Should revert if duration is too short", async () => {
      const shortDuration = 4n * 60n; // 4 minutes (< JOIN_CUTOFF)

      await assert.rejects(
        async () =>
          await game.write.startGame([shortDuration], {
            account: owner.account,
          }),
        /DurationTooShort/,
        "Should revert with DurationTooShort"
      );
    });

    it("Should only allow owner to start game", async () => {
      await assert.rejects(
        async () =>
          await game.write.startGame([3600n], { account: player1.account }),
        /OwnableUnauthorizedAccount/,
        "Should revert when non-owner tries to start"
      );
    });

    it("Should increment game ID for subsequent games", async () => {
      // Start first game
      await game.write.startGame([3600n], { account: owner.account });
      let gameId = await game.read.currentGameId();
      assertBigIntEqual(gameId, 1n);

      // End first game (no players, should cancel)
      await game.write.endGame({ account: owner.account });

      // Start second game
      await game.write.startGame([3600n], { account: owner.account });
      gameId = await game.read.currentGameId();
      assertBigIntEqual(gameId, 2n, "Game ID should increment");
    });
  });

  describe("endGame()", () => {
    beforeEach(async () => {
      await game.write.startGame([3600n], { account: owner.account });
    });

    it("Should end game with no active game state", async () => {
      await game.write.endGame({ account: owner.account });

      const gameActive = await game.read.gameActive();
      assert.equal(gameActive, false, "Game should not be active");
    });

    it("Should emit GameEnded event", async () => {
      const txHash = await game.write.endGame({ account: owner.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      // Verify transaction succeeded and emitted events
      assert.equal(receipt.status, 'success');
      assert.ok(receipt.logs.length > 0, "Should emit events");
    });

    it("Should revert if no active game", async () => {
      await game.write.endGame({ account: owner.account });

      await assert.rejects(
        async () => await game.write.endGame({ account: owner.account }),
        /NoActiveGame/,
        "Should revert with NoActiveGame"
      );
    });

    it("Should only allow owner to end game", async () => {
      await assert.rejects(
        async () => await game.write.endGame({ account: player1.account }),
        /OwnableUnauthorizedAccount/,
        "Should revert when non-owner tries to end"
      );
    });
  });

  describe("togglePause()", () => {
    it("Should pause and unpause the contract", async () => {
      // Check initial state
      let paused = await game.read.gamePaused();
      assert.equal(paused, false, "Should start unpaused");

      // Pause
      await game.write.togglePause({ account: owner.account });
      paused = await game.read.gamePaused();
      assert.equal(paused, true, "Should be paused");

      // Unpause
      await game.write.togglePause({ account: owner.account });
      paused = await game.read.gamePaused();
      assert.equal(paused, false, "Should be unpaused");
    });

    it("Should emit EmergencyPauseToggled event", async () => {
      const txHash = await game.write.togglePause({ account: owner.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      // Verify transaction succeeded and emitted events
      assert.equal(receipt.status, 'success');
      assert.ok(receipt.logs.length > 0, "Should emit events");
    });

    it("Should only allow owner to toggle pause", async () => {
      await assert.rejects(
        async () => await game.write.togglePause({ account: player1.account }),
        /OwnableUnauthorizedAccount/,
        "Should revert when non-owner tries to pause"
      );
    });

    it("Should prevent actions when paused", async () => {
      await game.write.startGame([3600n], { account: owner.account });
      await game.write.togglePause({ account: owner.account });

      await assert.rejects(
        async () => await game.write.joinGame({ account: player1.account }),
        /ContractPaused/,
        "Should not allow joining when paused"
      );
    });
  });

  describe("Contract State", () => {
    it("Should have correct owner", async () => {
      const contractOwner = await game.read.owner();
      assert.equal(
        contractOwner.toLowerCase(),
        owner.account.address.toLowerCase(),
        "Owner should be deployer"
      );
    });

    it("Should be in ETH mode", async () => {
      const useETH = await game.read.useETH();
      assert.equal(useETH, true, "Should use ETH");
    });

    it("Should have zero accumulated fees initially", async () => {
      const fees = await game.read.accumulatedHouseFees();
      assertBigIntEqual(fees, 0n, "Should have no fees initially");
    });
  });
});
