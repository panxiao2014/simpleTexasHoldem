//First, run command:
// pnpm hardhat node
//This will start a local Hardhat network and print out the accounts and their private keys. You can use these accounts for testing and deployment. The first account is usually the default deployer account.
//Then, in another terminal, run the deploy script:
// pnpm hardhat run --network localhost Scripts/deploy.ts
//This will deploy the SimpleTexasHoldem contract to the local Hardhat network and print the deployed address. It will also write the contract address to frontendOwner/src/utils/contractAddress.ts for use in the frontend application.

import { writeFileSync } from "fs";
import hre from "hardhat";
  
async function main() {
  // connect via viem client (Hardhat plugin)
  const network = await hre.network.connect();
  const viem = network.viem;

  // deploy contract using viem helper
  const simple = await viem.deployContract("SimpleTexasHoldem", [
    "0x0000000000000000000000000000000000000000", // ETH mode
  ]);

  console.log(`SimpleTexasHoldem deployed to: ${simple.address}`);

  //write address to frontend file
  writeFileSync("frontendOwner/src/utils/contractAddress.ts",
    `export const CONTRACT_ADDRESS = "${simple.address}";\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
