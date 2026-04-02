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
import { type ContractCallResult } from "./contract-api";
import {
	createContractPublicClient,
	createContractWalletClient,
	extractDecodedEvents,
	getConnectedAccount,
	type ContractEventLog,
} from "./ether-api";

type OwnerActionFunctionName = "startGame" | "endGame" | "withdrawHouseFees";

async function executeOwnerAction(
    functionName: OwnerActionFunctionName,
    args: readonly unknown[],
): Promise<ContractCallResult> {
	const walletClient: WalletClient<Transport, Chain> = createContractWalletClient(USING_CHAIN_CONFIG.chain);
	const publicClient: PublicClient<Transport, Chain> = createContractPublicClient(USING_CHAIN_CONFIG.chain);
	const account: Address = await getConnectedAccount();

	const transactionHash: Hash = await walletClient.writeContract({
		account,
		address: CONTRACT_ADDRESS as Address,
		abi: SIMPLE_TEXAS_HOLDEM_ABI,
		functionName,
		args,
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

export async function startGameApi(duration: bigint): Promise<ContractCallResult> {
	return executeOwnerAction("startGame", [duration]);
}

export async function endGameApi(): Promise<ContractCallResult> {
	return executeOwnerAction("endGame", []);
}

export async function withdrawHouseFeesApi(): Promise<ContractCallResult> {
	return executeOwnerAction("withdrawHouseFees", []);
}