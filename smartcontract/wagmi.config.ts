import { defineConfig } from "@wagmi/cli";
import type { Abi } from "viem";
import SimpleTexasHoldemArtifact from "./artifacts/contracts/SimpleTexasHoldem.sol/SimpleTexasHoldem.json";

const simpleTexasHoldemAbi: Abi = SimpleTexasHoldemArtifact.abi as Abi;

export default defineConfig({
  out: "../frontend/app/api/wagmi-generated.ts",
  contracts: [
    {
      name: "SimpleTexasHoldem",
      abi: simpleTexasHoldemAbi,
    },
  ],
  plugins: [],
});
