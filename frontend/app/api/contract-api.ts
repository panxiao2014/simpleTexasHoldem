import {
    type Address,
    type Chain,
    type Hash,
    type PublicClient,
    type TransactionReceipt,
    type Transport,
    type WalletClient,
} from "viem";

import { SIMPLE_TEXAS_HOLDEM_ABI } from "./contract-abi";
import { CONTRACT_ADDRESS } from "../utils/contractInfo";
import { USING_CHAIN_CONFIG } from "../utils/netConfig";
import { type CurrentGameInfo } from "../utils/contractParse";
import {
    createContractPublicClient,
    createContractWalletClient,
    extractDecodedEvents,
    getConnectedAccount,
    type ContractEventLog,
} from "./ether-api";

export interface ContractCallResult {
    transactionHash: Hash;
    status: TransactionReceipt["status"];
    events: ContractEventLog[];
}

export async function getCurrentGameInfo(): Promise<CurrentGameInfo> {
    const publicClient: PublicClient = createContractPublicClient(USING_CHAIN_CONFIG.chain);

    const result: readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean] =
        (await publicClient.readContract({
            address: CONTRACT_ADDRESS as Address,
            abi: SIMPLE_TEXAS_HOLDEM_ABI,
            functionName: "getCurrentGameInfo",
        })) as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];

    const gameInfo: CurrentGameInfo = {
        gameId: result[0],
        startTime: result[1],
        endTime: result[2],
        playerCount: result[3],
        totalParticipations: result[4],
        cardsRemaining: result[5],
        gameActive: result[6],
    };

    console.log("Current Game Info:", gameInfo);

    return gameInfo;
}

export async function startGameApi(duration: bigint): Promise<ContractCallResult> {
    const walletClient: WalletClient<Transport, Chain> = createContractWalletClient(USING_CHAIN_CONFIG.chain);
    const publicClient: PublicClient<Transport, Chain> = createContractPublicClient(USING_CHAIN_CONFIG.chain);
    const account: Address = await getConnectedAccount();

    const transactionHash: Hash = await walletClient.writeContract({
        account,
        address: CONTRACT_ADDRESS as Address,
        abi: SIMPLE_TEXAS_HOLDEM_ABI,
        functionName: "startGame",
        args: [duration],
    });

    const receipt: TransactionReceipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
    });

    const events: ContractEventLog[] = extractDecodedEvents(receipt);

    return {
        transactionHash,
        status: receipt.status,
        events,
    };
}

export async function getAccumulatedHouseFees(): Promise<bigint> {
    const publicClient: PublicClient = createContractPublicClient(USING_CHAIN_CONFIG.chain);

    return (await publicClient.readContract({
        address: CONTRACT_ADDRESS as Address,
        abi: SIMPLE_TEXAS_HOLDEM_ABI,
        functionName: "accumulatedHouseFees",
    })) as bigint;
}

export async function endGameApi(): Promise<ContractCallResult> {
    const walletClient: WalletClient<Transport, Chain> = createContractWalletClient(USING_CHAIN_CONFIG.chain);
    const publicClient: PublicClient<Transport, Chain> = createContractPublicClient(USING_CHAIN_CONFIG.chain);
    const account: Address = await getConnectedAccount();

    const transactionHash: Hash = await walletClient.writeContract({
        account,
        address: CONTRACT_ADDRESS as Address,
        abi: SIMPLE_TEXAS_HOLDEM_ABI,
        functionName: "endGame",
        args: [],
    });

    const receipt: TransactionReceipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
    });

    const events: ContractEventLog[] = extractDecodedEvents(receipt);

    return {
        transactionHash,
        status: receipt.status,
        events,
    };
}
