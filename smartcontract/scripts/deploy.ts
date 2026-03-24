//First, run command:
// pnpm hardhat node
//This will start a local Hardhat network and print out the accounts and their private keys. You can use these accounts for testing and deployment. The first account is usually the default deployer account.
//Then, in another terminal, run the deploy script:
// pnpm hardhat run --network localhost scripts/deploy.ts
//This will deploy the SimpleTexasHoldem contract to the local Hardhat network and print the deployed address and owner address. It will also write both values to frontend/app/utils/contractInfo.ts for use in the frontend application.

import { writeFileSync } from "fs";
import hre from "hardhat";

type HexAddress = `0x${string}`;

function writeContractInfoFile(contractAddress: HexAddress, ownerAddress: HexAddress): void {
  const fileContent: string =
    `export const CONTRACT_ADDRESS = "${contractAddress}";\n` +
    `export const CONTRACT_OWNER_ADDRESS = "${ownerAddress}";\n`;

  writeFileSync("../frontend/app/utils/contractInfo.ts", fileContent, { encoding: "utf-8" });
}

async function main(): Promise<void> {
  // connect via viem client (Hardhat plugin)
  const network = await hre.network.connect();
  const viem = network.viem;
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];
  const ownerAddress: HexAddress = deployer.account.address as HexAddress;

  // deploy contract using viem helper
  const simple = await viem.deployContract("SimpleTexasHoldem", [
    "0x0000000000000000000000000000000000000000", // ETH mode
  ]);
  const contractAddress: HexAddress = simple.address as HexAddress;

  console.log(`SimpleTexasHoldem deployed to: ${contractAddress}`);
  console.log(`Contract owner (deployer): ${ownerAddress}`);

  //write contract info to frontend file
  //writeContractInfoFile(contractAddress, ownerAddress);
}

main().catch((error: unknown): void => {
  console.error(error);
  process.exitCode = 1;
});
