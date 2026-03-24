import {
    type Address,
    type PublicClient,
} from "viem";
import { SIMPLE_TEXAS_HOLDEM_ABI } from "../api/contract-abi";
import { createContractPublicClient } from "../api/contract-api";
import { USING_CHAIN_CONFIG } from "../utils/netConfig";

/**
 * Subscribes to SimpleTexasHoldem contract events and logs each received event to the console.
 *
 * @param {Address} contractAddress Contract address of SimpleTexasHoldem.
 * @returns {() => void} Cleanup function that unsubscribes the event watcher.
 */
export function subscribeToSimpleTexasHoldemEvents(contractAddress: Address): () => void {
    const client: PublicClient = createContractPublicClient(USING_CHAIN_CONFIG.chain);

    const unwatch = client.watchContractEvent({
        address: contractAddress,
        abi: SIMPLE_TEXAS_HOLDEM_ABI,
        onLogs: (logs): void => {
            for (const log of logs) {
                console.log("[SimpleTexasHoldem] Event received:", log);
            }
        },
        onError: (error: Error): void => {
            console.error("[SimpleTexasHoldem] Event watch failed:", error);
        },
    });

    return (): void => {
        unwatch();
    };
}