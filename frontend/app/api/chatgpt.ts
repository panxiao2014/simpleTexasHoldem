type JoinGameApiResult = {
    success: boolean;
    message: string;
};

import {
    BaseError,
    ContractFunctionRevertedError,
    decodeEventLog,
} from "viem";

async function playerJoinApi(): Promise<JoinGameApiResult> {
    try {
        // 1. 发送交易
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: SIMPLE_TEXAS_HOLDEM_ABI,
            functionName: "joinGame",
        });

        // 2. 等待交易确认
        const receipt = await publicClient.waitForTransactionReceipt({
            hash,
        });

        // 3. 查找 PlayerJoined event
        const logs = receipt.logs;

        for (const log of logs) {
            try {
                const decoded = decodeEventLog({
                    abi: SIMPLE_TEXAS_HOLDEM_ABI,
                    data: log.data,
                    topics: log.topics,
                });

                if (decoded.eventName === "PlayerJoined") {
                    const { gameId, player, holeCards } = decoded.args as {
                        gameId: bigint;
                        player: string;
                        holeCards: [number, number];
                    };

                    const message = `
                        PlayerJoined Event:
                        - gameId: ${gameId.toString()}
                        - player: ${player}
                        - holeCards: [${holeCards[0]}, ${holeCards[1]}]
                        `.trim();

                    return {
                        success: true,
                        message,
                    };
                }
            } catch (e) {
                // ignore 非目标 event
            }
        }

        return {
            success: true,
            message: "Transaction succeeded, but PlayerJoined event not found",
        };
    } catch (err) {
        // 4. 解析错误（重点）
        if (err instanceof BaseError) {
            const revertError = err.walk(
                (e) => e instanceof ContractFunctionRevertedError
            ) as ContractFunctionRevertedError | null;

            if (revertError?.data?.errorName) {
                return {
                    success: false,
                    message: revertError.data.errorName, // ✅ 自定义 error 名
                };
            }
        }

        // 5. fallback
        return {
            success: false,
            message: err instanceof Error ? err.message : "Unknown error",
        };
    }
}