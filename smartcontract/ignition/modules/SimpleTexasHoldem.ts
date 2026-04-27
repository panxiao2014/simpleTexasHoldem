/* 
Required setup:

1. Store RPC URL:

pnpm hardhat keystore set SEPOLIA_RPC_URL

When use MetaMask, go to https://developer.metamask.io/. Click "Infura RPC" --> "Active Endpoints". Copy URL for Ethereum
Sepolia and paste it to terminal.

2. Store private key:

pnpm hardhat keystore set SEPOLIA_PRIVATE_KEY

To get the private key, open MetaMask in web browser. Select network "Sepolia". Choose the account which you want to use for deployment. Click the three dots on the right of the account and select "Account details". Then click "Private keys" and reveal the key.
 */

// Use following command to deploy this contract to local hardhat network:
// pnpm hardhat ignition deploy ./ignition/modules/SimpleTexasHoldem.ts --network localhost

// Use following command to deploy this contract to Sepolia testnet:
// pnpm hardhat ignition deploy ./ignition/modules/SimpleTexasHoldem.ts --network sepolia

// If you have updated contract code and want to redeploy:
// pnpm hardhat ignition deploy ./ignition/modules/SimpleTexasHoldem.ts --network sepolia --reset

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SimpleTexasHoldem = buildModule("SimpleTexasHoldem", (m) => {
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const simpleTexasHoldem = m.contract("SimpleTexasHoldem", [ZERO_ADDRESS]);

    return { simpleTexasHoldem };
});

export default SimpleTexasHoldem;