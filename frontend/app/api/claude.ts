import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeErrorResult,
  parseAbiItem,
  http,
} from "viem";

// ── Types ────────────────────────────────────────────────────────────────────

export type JoinGameApiResult =
  | {
      success: true;
      eventSummary: string; // multi-line string of PlayerJoined fields
    }
  | {
      success: false;
      revertReason: string; // custom-error name OR fallback message
    };

// ── ABI fragments ────────────────────────────────────────────────────────────

const CUSTOM_ERRORS = [
  "error ContractPaused()",
  "error NoActiveGame()",
  "error GameAlreadyActive()",
  "error DurationTooShort()",
  "error NoFees()",
  "error AlreadyParticipated()",
  "error GameFull()",
  "error MaxAttemptsReached()",
  "error NotEnoughCards()",
  "error JoinPeriodClosed()",
  "error NotInGame()",
  "error AlreadyBet()",
  "error MustJoinFirst()",
  "error MustBetSome()",
  "error NoCardsToReturn()",
  "error NotEnoughPlayers()",
  "error NoPlayers()",
  "error NoWinners()",
  "error TransferFailed()",
  "error NoCardsRemaining()",
] as const;

const PLAYER_JOINED_EVENT = parseAbiItem(
  "event PlayerJoined(uint256 indexed gameId, address indexed player, uint8[2] holeCards)"
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Try to decode a revert payload as one of our custom errors.
 * Returns the error name if matched, otherwise undefined.
 */
function decodeCustomError(errorData: `0x${string}`): string | undefined {
  for (const fragment of CUSTOM_ERRORS) {
    try {
      const abi = [parseAbiItem(fragment)] as const;
      const decoded = decodeErrorResult({ abi, data: errorData });
      return decoded.errorName;
    } catch {
      // selector didn't match – try next
    }
  }
  return undefined;
}

/**
 * Best-effort extraction of a human-readable reason from an unknown thrown value.
 */
function extractErrorMessage(err: unknown): string {
  if (err == null) return "Unknown error";

  // viem / ethers ContractFunctionRevertedError carry a `data` field
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;

    // 1. Custom-error selector embedded in the error object
    const rawData =
      typeof e["data"] === "string"
        ? (e["data"] as `0x${string}`)
        : typeof e["cause"] === "object" && e["cause"] !== null
          ? ((e["cause"] as Record<string, unknown>)["data"] as
              | `0x${string}`
              | undefined)
          : undefined;

    if (rawData && rawData.startsWith("0x") && rawData.length >= 10) {
      const name = decodeCustomError(rawData);
      if (name) return name;
    }

    // 2. Plain reason string (e.g. require / revert "reason")
    if (typeof e["reason"] === "string" && e["reason"]) return e["reason"];

    // 3. shortMessage from viem
    if (typeof e["shortMessage"] === "string" && e["shortMessage"])
      return e["shortMessage"];

    // 4. Standard Error.message
    if (typeof e["message"] === "string" && e["message"]) return e["message"];
  }

  return String(err);
}

// ── Main function ────────────────────────────────────────────────────────────

export async function playerJoinApi(
  contractAddress: `0x${string}`
): Promise<JoinGameApiResult> {
  // Set up clients (assumes MetaMask / EIP-1193 provider in the browser)
  const walletClient = createWalletClient({
    transport: custom((window as any).ethereum),
  });

  const publicClient = createPublicClient({
    transport: http(), // or custom(window.ethereum) for same provider
  });

  const [account] = await walletClient.getAddresses();

  // ── 1. Send the transaction ──────────────────────────────────────────────
  let txHash: `0x${string}`;
  try {
    txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: SIMPLE_TEXAS_HOLDEM_ABI,
      functionName: "joinGame",
      account,
    });
  } catch (err: unknown) {
    // Transaction was rejected before mining (user rejected, pre-flight revert, etc.)
    return {
      success: false,
      revertReason: extractErrorMessage(err),
    };
  }

  // ── 2. Wait for the receipt ──────────────────────────────────────────────
  let receipt: Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>>;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  } catch (err: unknown) {
    return {
      success: false,
      revertReason: `Failed to get receipt: ${extractErrorMessage(err)}`,
    };
  }

  // ── 3. Check on-chain status ─────────────────────────────────────────────
  if (receipt.status === "reverted") {
    // Re-simulate to extract the revert reason
    try {
      await publicClient.simulateContract({
        address: contractAddress,
        abi: SIMPLE_TEXAS_HOLDEM_ABI,
        functionName: "joinGame",
        account,
        blockNumber: receipt.blockNumber,
      });
      // If simulate unexpectedly succeeds, fall through to generic message
    } catch (simErr: unknown) {
      return {
        success: false,
        revertReason: extractErrorMessage(simErr),
      };
    }

    return {
      success: false,
      revertReason: "Transaction reverted (unknown reason)",
    };
  }

  // ── 4. Parse the PlayerJoined event from the receipt ────────────────────
  try {
    const logs = receipt.logs;
    
    // Find and decode the PlayerJoined log
    const playerJoinedLogs = logs
      .map((log) => {
        try {
          // Use viem's decodeEventLog with the specific ABI item
          const { eventName, args } = decodeEventLog({
            abi: [PLAYER_JOINED_EVENT],
            data: log.data,
            topics: log.topics,
          });
          return eventName === "PlayerJoined" ? args : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (playerJoinedLogs.length === 0) {
      return {
        success: true,
        eventSummary: "(PlayerJoined event not found in logs)",
      };
    }

    const args = playerJoinedLogs[0] as {
      gameId: bigint;
      player: `0x${string}`;
      holeCards: readonly [number, number];
    };

    const eventSummary = [
      `Event   : PlayerJoined`,
      `gameId  : ${args.gameId.toString()}`,
      `player  : ${args.player}`,
      `holeCards: [${args.holeCards[0]}, ${args.holeCards[1]}]`,
    ].join("\n");

    return { success: true, eventSummary };
  } catch (err: unknown) {
    return {
      success: true,
      eventSummary: `(Could not parse event: ${extractErrorMessage(err)})`,
    };
  }
}