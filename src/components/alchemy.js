import { Alchemy, Network } from "alchemy-sdk";

const settings = {
  apiKey: process.env.ALCHEMY_API , // 🔑 API key
  network: Network.BNB_MAINNET,
};

export const alchemy = new Alchemy(settings);
