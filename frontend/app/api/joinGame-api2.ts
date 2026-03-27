/*
Contract interaction API for joining a game of Simple Texas Hold'em using ethers.js.
This module provides the `playerJoinApi` function which allows a user to join an
active game by interacting with the smart contract. It also handles custom error
parsing and `PlayerJoined` event decoding.
*/

import {
    BrowserProvider,
    Contract,
    Interface,
    type ContractTransactionReceipt,
    type InterfaceAbi,
    type Log,
} from "ethers";
import { SIMPLE_TEXAS_HOLDEM_ABI } from "./contract-abi";
import { CONTRACT_ADDRESS } from "../utils/contractInfo";

interface EthereumProvider {
    request: (args: { method: string; params?: readonly unknown[] | object }) => Promise<unknown>;
}

interface WindowWithEthereum extends Window {
    ethereum?: EthereumProvider;
}

export type JoinGameApiResult = {
    success: boolean;
    message: string;
    stage: "Simulate" | "Execution";
};

type EthersErrorLike = {
    code?: string;
    message?: string;
    shortMessage?: string;
    reason?: string;
    data?: unknown;
    error?: unknown;
    info?: unknown;
    revert?: {
        name?: string;
        signature?: string;
        args?: readonly unknown[];
    };
};

function getEthereumProvider(): EthereumProvider {
    const { ethereum } = window as WindowWithEthereum;

    if (ethereum === undefined) {
        throw new Error("Wallet provider not found.");
    }

    return ethereum;
}

async function createBrowserProvider(): Promise<BrowserProvider> {
    const ethereum: EthereumProvider = getEthereumProvider();
    return new BrowserProvider(ethereum);
}

function isHexString(value: unknown): value is `0x${string}` {
    return typeof value === "string" && value.startsWith("0x");
}

function extractHexData(value: unknown, depth: number = 0): `0x${string}` | null {
    if (depth > 6 || value === null || value === undefined) {
        return null;
    }

    if (isHexString(value)) {
        return value;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const nestedHex: `0x${string}` | null = extractHexData(item, depth + 1);
            if (nestedHex !== null) {
                return nestedHex;
            }
        }
        return null;
    }

    if (typeof value === "object") {
        const candidateObject: Record<string, unknown> = value as Record<string, unknown>;
        const candidateKeys: string[] = [
            "data",
            "error",
            "info",
            "revert",
            "result",
            "payload",
            "value",
            "body",
        ];

        for (const key of candidateKeys) {
            if (key in candidateObject) {
                const nestedHex: `0x${string}` | null = extractHexData(candidateObject[key], depth + 1);
                if (nestedHex !== null) {
                    return nestedHex;
                }
            }
        }

        for (const nestedValue of Object.values(candidateObject)) {
            const nestedHex: `0x${string}` | null = extractHexData(nestedValue, depth + 1);
            if (nestedHex !== null) {
                return nestedHex;
            }
        }
    }

    return null;
}

function stringifyError(error: unknown): string {
    return JSON.stringify(
        error,
        (_key: string, value: unknown): unknown => {
            if (typeof value === "bigint") {
                return value.toString();
            }

            return value;
        },
        2
    );
}

function extractRevertReason(error: unknown, contractInterface: Interface): string {
    console.error("ethers playerJoinApi error:", stringifyError(error));

    if (typeof error !== "object" || error === null) {
        return error instanceof Error ? error.message : "Unknown error";
    }

    const ethersError: EthersErrorLike = error as EthersErrorLike;

    if (typeof ethersError.revert?.name === "string" && ethersError.revert.name.length > 0) {
        return ethersError.revert.name;
    }

    const rawHexData: `0x${string}` | null = extractHexData(error);

    if (rawHexData !== null) {
        try {
            const parsedError = contractInterface.parseError(rawHexData);

            if (parsedError !== null) {
                return parsedError.name;
            }
        } catch {
            // Continue to fallback parsing below.
        }
    }

    if (typeof ethersError.reason === "string" && ethersError.reason.length > 0) {
        return ethersError.reason;
    }

    if (typeof ethersError.shortMessage === "string" && ethersError.shortMessage.length > 0) {
        return ethersError.shortMessage;
    }

    if (typeof ethersError.message === "string" && ethersError.message.length > 0) {
        return ethersError.message;
    }

    return "Unknown error";
}

function buildPlayerJoinedMessage(log: Log, contractInterface: Interface): string | null {
    try {
        const parsedLog = contractInterface.parseLog({
            topics: [...log.topics],
            data: log.data,
        });

        if (parsedLog === null || parsedLog.name !== "PlayerJoined") {
            return null;
        }

        const gameId: bigint = parsedLog.args.gameId as bigint;
        const player: string = parsedLog.args.player as string;
        const holeCardsLike: readonly unknown[] = parsedLog.args.holeCards as readonly unknown[];
        const holeCard0: string = String(holeCardsLike[0]);
        const holeCard1: string = String(holeCardsLike[1]);

        return `
            PlayerJoined Event:
            - gameId: ${gameId.toString()}
            - player: ${player}
            - holeCards: [${holeCard0}, ${holeCard1}]
        `.trim();
    } catch (error: unknown) {
        console.error("joinGameApi2 parseLog error:", error);
        return null;
    }
}

export async function playerJoinApi(): Promise<JoinGameApiResult> {
    const provider: BrowserProvider = await createBrowserProvider();
    const signer = await provider.getSigner();
    const ethersAbi: InterfaceAbi = SIMPLE_TEXAS_HOLDEM_ABI as unknown as InterfaceAbi;
    const contractInterface: Interface = new Interface(ethersAbi);
    const contract: Contract = new Contract(CONTRACT_ADDRESS, ethersAbi, signer);

    try {
        try {
            await contract.joinGame.staticCall();
        } catch (simulateError: unknown) {
            return {
                success: false,
                message: extractRevertReason(simulateError, contractInterface),
                stage: "Simulate",
            };
        }

        const transactionResponse = await contract.joinGame();
        const receipt = (await transactionResponse.wait()) as ContractTransactionReceipt | null;

        if (receipt === null) {
            return {
                success: false,
                message: "Transaction receipt not found",
                stage: "Execution",
            };
        }

        for (const log of receipt.logs) {
            const playerJoinedMessage: string | null = buildPlayerJoinedMessage(log, contractInterface);

            if (playerJoinedMessage !== null) {
                return {
                    success: true,
                    message: playerJoinedMessage,
                    stage: "Execution",
                };
            }
        }

        return {
            success: true,
            message: "Transaction succeeded, but PlayerJoined event not found",
            stage: "Execution",
        };
    } catch (executionError: unknown) {
        return {
            success: false,
            message: extractRevertReason(executionError, contractInterface),
            stage: "Execution",
        };
    }
}
