/*
Contract interaction API for joining a game of Simple Texas Hold'em. This module provides the `joinGameApi` function which allows a user to join an active game by interacting with the smart contract. It also defines error handling and event parsing related to the join game process.
*/

import {
    decodeErrorResult,
    decodeEventLog,
    BaseError,
    ContractFunctionRevertedError,
    type Address,
    type PublicClient,
    type TransactionReceipt,
    type Transport,
    type WalletClient,
} from "viem";
import { SIMPLE_TEXAS_HOLDEM_ABI } from "./contract-abi";
import { CONTRACT_ADDRESS } from "../utils/contractInfo";
import { USING_CHAIN_CONFIG } from "../utils/netConfig";
import { createContractWalletClient, createContractPublicClient, getConnectedAccount } from "./ether-api";

function extractRevertReason(err: unknown): string {
    console.error('Full error object:', JSON.stringify(err, (key, value) => {
        if (typeof value === 'bigint') return value.toString();
        return value;
    }, 2));

    if (!(err instanceof BaseError)) {
        return "error is not an instance of BaseError";
    }

    const revertError = err.walk(err => err instanceof ContractFunctionRevertedError);

    if (revertError instanceof ContractFunctionRevertedError) {
        const errorName = revertError.data?.errorName ?? 'Unknown';
        const errorSignature = revertError.signature;
        const rawData = revertError.data;

        console.error(`extractRevertReason errorName: ${errorName}`);
        console.error(`extractRevertReason errorSignature: ${errorSignature}`);
        console.error(`extractRevertReason rawData:`, rawData);

        return errorName;

    } else {
        return "No ContractFunctionRevertedError found in error chain";
    }
}

export type JoinGameApiResult = {
    success: boolean;
    message: string;
    stage: "Simulate" | "Execution";
};

export async function joinGameApi(): Promise<JoinGameApiResult> {
    const walletClient: WalletClient<Transport, typeof USING_CHAIN_CONFIG.chain> = createContractWalletClient(USING_CHAIN_CONFIG.chain);
    const publicClient: PublicClient<Transport, typeof USING_CHAIN_CONFIG.chain> = createContractPublicClient(USING_CHAIN_CONFIG.chain);
    const connectedAccount: Address = await getConnectedAccount();

    try {
        // 0. simulate
        try {
            await publicClient.simulateContract({
                address: CONTRACT_ADDRESS,
                abi: SIMPLE_TEXAS_HOLDEM_ABI,
                functionName: "joinGame",
                account: connectedAccount,
            });
        } catch (simErr: unknown) {
            return {
                success: false,
                message: extractRevertReason(simErr),
                stage: "Simulate",
            };
        }

        // 1. send transaction
        const transactionHash: `0x${string}` = await walletClient.writeContract({
            account: connectedAccount,
            address: CONTRACT_ADDRESS,
            abi: SIMPLE_TEXAS_HOLDEM_ABI,
            functionName: "joinGame",
        });

        // 2. wait for transaction confirmation
        const receipt: TransactionReceipt = await publicClient.waitForTransactionReceipt({
            hash: transactionHash,
        });

        // 3. find PlayerJoined event
        const logs = receipt.logs;

        for (const log of logs) {
            try {
                const decoded = decodeEventLog({
                    abi: SIMPLE_TEXAS_HOLDEM_ABI,
                    data: log.data,
                    topics: log.topics,
                });

                if (decoded.eventName === "PlayerJoined") {
                    const { gameId, player, holeCards } = (decoded.args as unknown) as {
                        gameId: bigint;
                        player: string;
                        holeCards: [number, number];
                    };

                    const message: string = `
                        PlayerJoined Event:
                        - gameId: ${gameId.toString()}
                        - player: ${player}
                        - holeCards: [${holeCards[0]}, ${holeCards[1]}]
                        `.trim();

                    return {
                        success: true,
                        message,
                        stage: "Execution",
                    };
                }
            } catch (e: unknown) {
                console.error("joinGameApi decodeEventLog error: ", e);
            }
        }

        return {
            success: true,
            message: "Transaction succeeded, but PlayerJoined event not found",
            stage: "Execution",
        };
    } catch (err: unknown) {
        // 4. parse error
        if (err instanceof BaseError) {
            const revertError: ContractFunctionRevertedError | null = err.walk(
                (e: Error): e is ContractFunctionRevertedError => e instanceof ContractFunctionRevertedError
            );

            if (revertError?.data?.errorName) {
                return {
                    success: false,
                    message: revertError.data.errorName,
                    stage: "Execution",
                };
            } else {
                return {
                    success: false,
                    message: "joinGameApi Failed, no ContractFunctionRevertedError caught",
                    stage: "Execution",
                };
            }
        }

        // 5. fallback
        return {
            success: false,
            message: err instanceof Error ? err.message : "joinGameApi Unknown error",
            stage: "Execution",
        };
    }
}

