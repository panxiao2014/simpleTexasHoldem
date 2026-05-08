import {
    type Address,
    type Hash,
    type PublicClient,
    type TransactionReceipt,
} from "viem";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as Address;

import { SIMPLE_TEXAS_HOLDEM_ABI } from "./contract-abi";
import { USING_CHAIN_CONFIG } from "../utils/netConfig";
import {
    createContractPublicClient,
    type ContractEventLog,
} from "./ether-api";

export interface ContractCallResult {
    transactionHash: Hash;
    status: TransactionReceipt["status"];
    events: ContractEventLog[];
}



export async function getAccumulatedHouseFees(): Promise<bigint> {
    const publicClient: PublicClient = createContractPublicClient(USING_CHAIN_CONFIG.chain);

    return (await publicClient.readContract({
        address: CONTRACT_ADDRESS as Address,
        abi: SIMPLE_TEXAS_HOLDEM_ABI,
        functionName: "accumulatedHouseFees",
    })) as bigint;
}
