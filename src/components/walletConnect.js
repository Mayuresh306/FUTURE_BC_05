import React, { useState } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { alchemy } from "./alchemy";

export const WalletConnect = ({ onWalletConnected }) => {
  const [address, setAddress] = useState(null);
  const [balances , setBalances] = useState([]);

  const connectWallet = async () => {
    try {
      const web3Modal = new Web3Modal({
        cacheProvider: true, // optional
      });

      const instance = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(instance);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      setAddress(userAddress);
      onWalletConnected(userAddress); // Pass to parent

       // 🔥 Fetch token balances from Alchemy
      const response = await alchemy.core.getTokenBalances(userAddress);

      // Filter non-zero balances
      const nonZeroTokens = response.tokenBalances.filter(
        (t) => t.tokenBalance !== "0"
      );

      // Fetch metadata for each token
      const tokensWithMeta = await Promise.all(
        nonZeroTokens.map(async (token) => {
          const metadata = await alchemy.core.getTokenMetadata(token.contractAddress);
          return {
            ...token,
            name: metadata.name,
            symbol: metadata.symbol,
            decimals: metadata.decimals,
          };
        })
      );
      setBalances(tokensWithMeta);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  return (
    <div className="text-center my-3">
      {address ? (
        <div>
          <button className="btn btn-success">
            ✅ Connected: {address.substring(0, 6)}...{address.substring(address.length - 4)}
          </button>

          <h3 className="mt-3">Token Balances</h3>
          <ul className="list-group">
            {balances.map((token, i) => (
              <li key={i} className="list-group-item">
                {token.symbol} -{" "}
                {Number(token.tokenBalance) / Math.pow(10, token.decimals)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
    </div>
  );
};

