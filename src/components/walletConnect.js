import React, { useState } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";

export const WalletConnect = ({ onWalletConnected }) => {
  const [address, setAddress] = useState(null);

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
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  return (
    <div className="text-center my-3">
      {address ? (
        <button className="btn btn-success">
          ✅ Connected: {address.substring(0, 6)}...{address.substring(address.length - 4)}
        </button>
      ) : (
        <button className="btn btn-primary" onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
    </div>
  );
};

