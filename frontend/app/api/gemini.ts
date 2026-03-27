import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  decodeErrorResult, 
  getContract,
  BaseError,
  ContractFunctionRevertError
} from 'viem';
import { mainnet } from 'viem/chains';

// 假设配置如下
const publicClient = createPublicClient({ chain: mainnet, transport: http() });
const walletClient = createWalletClient({ chain: mainnet, transport: http() });
const CONTRACT_ADDRESS = '0x...';

async function playerJoinApi(): Promise<JoinGameApiResult> {
  try {
    // 1. 模拟调用 (建议在实际写入前模拟，以便捕获大部分 Revert)
    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: SIMPLE_TEXAS_HOLDEM_ABI,
      functionName: 'joinGame',
    });

    // 2. 发起交易
    const hash = await walletClient.writeContract(request);

    // 3. 等待收据并解析 Event
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // 查找 PlayerJoined Event
    // 注意：parseEventLogs 是 Viem 推荐的处理方式
    const logs = receipt.logs;
    const contract = getContract({
      address: CONTRACT_ADDRESS,
      abi: SIMPLE_TEXAS_HOLDEM_ABI,
      publicClient,
    });

    // 假设我们只关心当前合约抛出的 PlayerJoined
    const eventDetailString = logs
      .map((log) => {
        try {
          // 尝试解析 log
          const event = decodeEventLog({
            abi: SIMPLE_TEXAS_HOLDEM_ABI,
            data: log.data,
            topics: log.topics,
          });
          
          if (event.eventName === 'PlayerJoined') {
            const { gameId, player, holeCards } = event.args as any;
            return `Event: PlayerJoined\nGameID: ${gameId}\nPlayer: ${player}\nCards: [${holeCards.join(', ')}]`;
          }
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .join('\n---\n');

    return {
      success: true,
      eventDetails: eventDetailString || "Executed successfully, but no event found.",
    };

  } catch (err: any) {
    // 4. 错误处理与自定义错误解析
    if (err instanceof BaseError) {
      const revertError = err.walk(err => err instanceof ContractFunctionRevertError);
      
      if (revertError instanceof ContractFunctionRevertError) {
        // 解析 Solidity 自定义错误 (AlreadyParticipated, GameFull 等)
        const errorName = revertError.data?.errorName;
        return {
          success: false,
          errorName: errorName ?? "UnknownCustomError",
          errorMessage: `Contract reverted: ${errorName}`,
        };
      }
    }

    // 5. 其他错误（如网络问题、用户拒绝签名等）
    return {
      success: false,
      errorMessage: err.shortMessage || err.message || "An unknown error occurred",
    };
  }
}