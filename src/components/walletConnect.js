import Moralis from 'moralis';
import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';


const MORALIS_API_KEY = process.env.REACT_APP_MORALIS_KEY;

// Supported chains configuration
const SUPPORTED_CHAINS = [
    { id: '0x1', name: 'Ethereum', symbol: 'ETH', rpc: 'https://ethereum.publicnode.com' },
    { id: '0x89', name: 'Polygon', symbol: 'MATIC', rpc: 'https://polygon.publicnode.com' },
    { id: '0x38', name: 'BSC', symbol: 'BNB', rpc: 'https://bsc.publicnode.com' },
    { id: '0xa4b1', name: 'Arbitrum', symbol: 'ETH', rpc: 'https://arbitrum.publicnode.com' },
    { id: '0xa', name: 'Optimism', symbol: 'ETH', rpc: 'https://optimism.publicnode.com' },
    { id: '0x2105', name: 'Base', symbol: 'ETH', rpc: 'https://base.publicnode.com' },
];

export default function WalletConnect() {
    const [walletAddress, setWalletAddress] = useState(undefined);
    const [chainBalances, setChainBalances] = useState({});
    const [customTokens, setCustomTokens] = useState({});
    const [isConnecting, setIsConnecting] = useState(false);
    const [isFetchingBalances, setIsFetchingBalances] = useState(false);
    const [error, setError] = useState(null);
    const [showAddToken, setShowAddToken] = useState(false);
    const [tokenAddress, setTokenAddress] = useState('');
    const [selectedChain, setSelectedChain] = useState('0x1');
    const [isAddingToken, setIsAddingToken] = useState(false);

    // Colors for pie chart
    const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

    // Function to get token metadata and balance by contract address
    const getTokenByAddress = async (address, tokenAddress, chainId) => {
        try {
            // Get token metadata
            const tokenResponse = await Moralis.EvmApi.token.getTokenMetadata({
                addresses: [tokenAddress],
                chain: chainId,
            });

            // Get token balance for the wallet
            const balanceResponse = await Moralis.EvmApi.token.getWalletTokenBalances({
                address: address,
                chain: chainId,
                tokenAddresses: [tokenAddress],
            });

            const tokenMetadata = tokenResponse.toJSON()[0];
            const tokenBalance = balanceResponse.toJSON()[0];

            if (tokenMetadata && tokenBalance) {
                return {
                    token_address: tokenAddress,
                    name: tokenMetadata.name,
                    symbol: tokenMetadata.symbol,
                    decimals: tokenMetadata.decimals,
                    balance: tokenBalance.balance,
                    balance_formatted: tokenBalance.balance_formatted,
                    usd_value: tokenBalance.usd_value,
                    logo: tokenMetadata.logo,
                    isCustom: true
                };
            }
            return null;
        } catch (err) {
            console.error('Error fetching token by address:', err);
            throw err;
        }
    };

    // Function to add custom token
    const addCustomToken = async () => {
        if (!tokenAddress || !walletAddress) return;

        setIsAddingToken(true);
        setError(null);

        try {
            const token = await getTokenByAddress(walletAddress, tokenAddress, selectedChain);
            
            if (token && parseFloat(token.balance_formatted || 0) > 0) {
                // Add to custom tokens
                const chainKey = selectedChain;
                setCustomTokens(prev => ({
                    ...prev,
                    [chainKey]: [
                        ...(prev[chainKey] || []),
                        token
                    ]
                }));

                // Reset form
                setTokenAddress('');
                setShowAddToken(false);
                
                // Refresh balances to include the new token
                await fetchAllChainBalances(walletAddress);
                
            } else {
                setError('Token not found or zero balance for this address');
            }
        } catch (err) {
            setError('Failed to add token: ' + err.message);
        } finally {
            setIsAddingToken(false);
        }
    };

    // Function to prepare pie chart data
    const preparePieChartData = () => {
        const data = [];
        let totalValue = 0;

        // Collect all tokens with USD values
        SUPPORTED_CHAINS.forEach(chain => {
            const chainData = chainBalances[chain.id];
            if (!chainData) return;

            // Add native token
            if (chainData.nativeBalance && parseFloat(chainData.nativeBalance.balance) > 0) {
                // For demo purposes, assign estimated USD values if not available
                const estimatedValue = parseFloat(chainData.nativeBalance.balance) * getEstimatedPrice(chain.symbol);
                data.push({
                    name: chain.symbol,
                    value: estimatedValue,
                    chain: chain.name,
                    type: 'native'
                });
                totalValue += estimatedValue;
            }

            // Add ERC-20 tokens
            if (chainData.tokens) {
                chainData.tokens.forEach(token => {
                    const usdValue = parseFloat(token.usd_value || 0);
                    if (usdValue > 0.01) { // Only include tokens worth more than $0.01
                        data.push({
                            name: token.symbol,
                            value: usdValue,
                            chain: chain.name,
                            type: 'token'
                        });
                        totalValue += usdValue;
                    }
                });
            }

            // Add custom tokens
            const customChainTokens = customTokens[chain.id] || [];
            customChainTokens.forEach(token => {
                const usdValue = parseFloat(token.usd_value || 0);
                if (usdValue > 0.01) {
                    data.push({
                        name: token.symbol,
                        value: usdValue,
                        chain: chain.name,
                        type: 'custom'
                    });
                    totalValue += usdValue;
                }
            });
        });

        return { data: data.sort((a, b) => b.value - a.value), totalValue };
    };

    // Helper function to get estimated prices (you can replace with real price API)
    const getEstimatedPrice = (symbol) => {
        const prices = {
            'ETH': 2500,
            'MATIC': 0.8,
            'BNB': 300,
        };
        return prices[symbol] || 0;
    };
    const getNativeBalance = async (address, chain) => {
        try {
            const provider = new ethers.JsonRpcProvider(chain.rpc);
            const balance = await provider.getBalance(address);
            return {
                symbol: chain.symbol,
                balance: ethers.formatEther(balance),
                name: `${chain.name} Native Token`,
                decimals: 18
            // Initialize Moralis once when component mounts
            }
        } catch (err) {
            console.error(`Error fetching native balance for ${chain.name}:`, err);
            return null;
        }
    };

    // Function to fetch token balances for a specific chain
    const getTokenBalances = async (address, chainId) => {
        try {
            const response = await Moralis.EvmApi.token.getWalletTokenBalances({
                address: address,
                chain: chainId,
                excludeSpam: true, // Filter out spam tokens
                excludeUnverifiedContracts: false, // Include unverified but legitimate tokens
            });
            
            const tokens = response.toJSON();
            console.log(`Tokens found on chain ${chainId}:`, tokens);
            
            // Return all tokens, including those with small balances
            return tokens;
        } catch (err) {
            console.error(`Error fetching token balances for chain ${chainId}:`, err);
            return [];
        }
    };

    // Function to fetch all balances across all chains
    const fetchAllChainBalances = async (address) => {
        setIsFetchingBalances(true);
        const allBalances = {};

        // Process chains concurrently for better performance
        const chainPromises = SUPPORTED_CHAINS.map(async (chain) => {
            const chainData = {
                chainInfo: chain,
                nativeBalance: null,
                tokens: []
            };

            try {
                // Fetch native balance and token balances concurrently
                const [nativeBalance, tokenBalances] = await Promise.all([
                    getNativeBalance(address, chain),
                    getTokenBalances(address, chain.id)
                ]);

                chainData.nativeBalance = nativeBalance;
                chainData.tokens = [...(tokenBalances || []), ...(customTokens[chain.id] || [])];
                
                // Don't filter out small balances - show all tokens
                console.log(`Chain ${chain.name} - Native:`, nativeBalance, 'Tokens:', chainData.tokens);

            } catch (err) {
                console.error(`Error processing chain ${chain.name}:`, err);
            }

            return { chainId: chain.id, data: chainData };
        });

        // Wait for all chains to complete
        const results = await Promise.all(chainPromises);
        
        // Organize results by chain ID
        results.forEach(({ chainId, data }) => {
            allBalances[chainId] = data;
        });

        setChainBalances(allBalances);
        setIsFetchingBalances(false);
    };
    useEffect(() => {
        const initMoralis = async () => {
            try {
                if (!Moralis.Core.isStarted) {
                    await Moralis.start({
                        apiKey: MORALIS_API_KEY,
                    });
                }
            } catch (err) {
                console.error("Moralis initialization failed:", err);
                setError("Failed to initialize Moralis");
            }
        };

        initMoralis();
    }, []);

    // Function to connect wallet
    const connectWallet = async () => {
        if (!window.ethereum) {
            setError("MetaMask is not installed!");
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            
            setWalletAddress(address);

            // Fetch balances from all chains
            await fetchAllChainBalances(address);
            
        } catch (err) {
            console.error("Wallet connection failed:", err);
            setError("Wallet connection failed: " + err.message);
        } finally {
            setIsConnecting(false);
        }
    };


    // Function to disconnect wallet
    const disconnectWallet = () => {
        setWalletAddress(undefined);
        setChainBalances({});
        setCustomTokens({});
        setError(null);

    };

    // Function to refresh balances
    const refreshBalances = async () => {
        if (walletAddress) {
            await fetchAllChainBalances(walletAddress);
        }
    };

    const { data: pieData, totalValue } = preparePieChartData();

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            {error && (
                <div style={{ color: 'red', marginBottom: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
                    {error}
                </div>
            )}
            
            <div style={{ marginBottom: '20px' }}>
                <button 
                    className="btn-disconnect rounded-pill" onClick={walletAddress ? disconnectWallet : connectWallet}
                    disabled={isConnecting}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: walletAddress ? '#f44336' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isConnecting ? 'not-allowed' : 'pointer',
                        marginRight: '10px'
                    }}
                >
                    {isConnecting 
                        ? "Connecting..." 
                        : walletAddress 
                            ? `Disconnect` 
                            : "Connect Wallet"
                    }
                </button>

                {walletAddress && (
                    <>
                        <button 
                            className="rounded-pill" onClick={refreshBalances}
                            disabled={isFetchingBalances}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isFetchingBalances ? 'not-allowed' : 'pointer',
                                marginRight: '10px'
                            }}
                        >
                            {isFetchingBalances ? "Refreshing..." : "Refresh Balances"}
                        </button>

                        <button 
                            className="rounded-pill" onClick={() => setShowAddToken(!showAddToken)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#FF9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {showAddToken ? "Cancel" : "Add Custom Token"}
                        </button>
                    </>
                )}
            </div>

            {/* Add Custom Token Form */}
            {showAddToken && walletAddress && (
                <div className='bg-change' style={{
                    padding: '20px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #ddd'
                }}>
                    <h4 className='bg-change' style={{ margin: '0 0 15px 0' }}>Add Custom Token</h4>
                    
                    <div className='bg-change' style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                            Select Chain:
                        </label>
                        <select className=" bg-change rounded-pill mb-3" 
                            value={selectedChain}
                            onChange={(e) => setSelectedChain(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                            }}
                        >
                            {SUPPORTED_CHAINS.map(chain => (
                                <option key={chain.id} value={chain.id}>
                                    {chain.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='bg-change' style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Token Contract Address:
                        </label>
                        <input className="bg-change rounded-pill"
                            type="text"
                            value={tokenAddress}
                            onChange={(e) => setTokenAddress(e.target.value)}
                            placeholder="0x..."
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                            }}
                        />
                    </div>

                    <button className=" rounded-pill"
                        onClick={addCustomToken}
                        disabled={!tokenAddress || isAddingToken}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: isAddingToken ? '#ccc' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isAddingToken ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isAddingToken ? "Adding Token..." : "Add Token"}
                    </button>
                </div>
            )}
            
            {walletAddress && (
                <div>
                    <h3 className='bg-change rounded-pill' style={{ marginBottom: '10px' }}>
                        Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </h3>

                    {/* Portfolio Pie Chart */}
                    {pieData.length > 0 && (
                        <div style={{ 
                            marginBottom: '30px', 
                            padding: '20px', 
                            backgroundColor: '#f9f9f9', 
                            borderRadius: '8px' 
                        }}>
                            <h4 style={{ marginBottom: '15px', color:'black' }}>Portfolio Distribution</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ flex: '1', height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                fill="red"
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value) => [`${value.toFixed(2)}`, 'Value']}
                                                labelFormatter={(label) => `Token: ${label}`}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ flex: '1' }}>
                                    <h5>Total Portfolio Value: ${totalValue.toFixed(2)}</h5>
                                    <div style={{ marginTop: '15px' }}>
                                        {pieData.slice(0, 5).map((item, index) => (
                                            <div key={index} style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                marginBottom: '8px',
                                                fontSize: '14px'
                                            }}>
                                                <div style={{ 
                                                    width: '12px', 
                                                    height: '12px', 
                                                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                                                    marginRight: '8px',
                                                    borderRadius: '2px'
                                                }}></div>
                                                <span>{item.name}: ${item.value.toFixed(2)} ({item.chain})</span>
                                            </div>
                                        ))}
                                        {pieData.length > 5 && (
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                                +{pieData.length - 5} more tokens
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {isFetchingBalances && (
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                            <p>Fetching balances across all chains...</p>
                        </div>
                    )}

                    {Object.keys(chainBalances).length > 0 && (
                        <div style={{ marginTop: '20px', color:'black'}}>
                            <h4 style={{color:"black"}}>Multi-Chain Portfolio</h4>
                            {SUPPORTED_CHAINS.map((chain) => {
                                const chainData = chainBalances[chain.id];
                                if (!chainData) return null;

                                const hasBalances = (chainData.nativeBalance && parseFloat(chainData.nativeBalance.balance) > 0) || 
                                                  (chainData.tokens && chainData.tokens.length > 0);

                                // Show chain even if only tokens exist (not just native balance)
                                return (
                                    <div key={chain.id} style={{ 
                                        marginBottom: '20px', 
                                        padding: '15px', 
                                        border: '1px solid #ddd', 
                                        borderRadius: '8px',
                                        backgroundColor: '#f9f9f9'
                                    }}>
                                        <h5 style={{ margin: '0 0 10px 0', color: '#333' }}>
                                            🔗 {chain.name}
                                        </h5>
                                        
                                        {/* Native Token Balance */}
                                        {chainData.nativeBalance && parseFloat(chainData.nativeBalance.balance) > 0 && (
                                            <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                                                <strong>{chainData.nativeBalance.symbol}</strong>: {parseFloat(chainData.nativeBalance.balance).toFixed(6)}
                                                <span style={{ color: '#666', fontSize: '12px', marginLeft: '10px' }}>
                                                    (Native Token)
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* ERC-20 Tokens */}
                                        {chainData.tokens && chainData.tokens.length > 0 ? (
                                            <div>
                                                <h6 style={{ margin: '10px 0 5px 0' }}>Tokens ({chainData.tokens.length}):</h6>
                                                {chainData.tokens.map((token, index) => {
                                                    const balance = parseFloat(token.balance_formatted || token.balance || 0);
                                                    const displayBalance = balance > 0.000001 ? balance.toFixed(6) : balance.toExponential(2);
                                                    
                                                    return (
                                                        <div key={`${token.token_address}-${index}`} style={{ 
                                                            marginBottom: '5px', 
                                                            padding: '8px', 
                                                            backgroundColor: 'white', 
                                                            borderRadius: '4px',
                                                            fontSize: '14px',
                                                            position: 'relative'
                                                        }}>
                                                            <strong>{token.symbol || 'Unknown'}</strong>: {displayBalance}
                                                            {token.name && (
                                                                <span style={{ color: '#666', fontSize: '12px', marginLeft: '10px' }}>
                                                                    ({token.name})
                                                                </span>
                                                            )}
                                                            {token.usd_value && (
                                                                <span style={{ color: '#4CAF50', fontSize: '12px', marginLeft: '10px' }}>
                                                                    ≈ ${parseFloat(token.usd_value).toFixed(2)}
                                                                </span>
                                                            )}
                                                            {token.isCustom && (
                                                                <span style={{ 
                                                                    backgroundColor: '#FF9800', 
                                                                    color: 'white', 
                                                                    fontSize: '10px', 
                                                                    padding: '2px 6px', 
                                                                    borderRadius: '10px',
                                                                    marginLeft: '10px'
                                                                }}>
                                                                    CUSTOM
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ padding: '10px', fontStyle: 'italic', color: '#666' }}>
                                                No tokens found on {chain.name}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            
        </div>
    );
}