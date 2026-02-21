import React, { useState, useEffect } from 'react';
import '../styles.css';

// Add global type for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export const CryptoWallet: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance] = useState<string>('0.00'); // Mock balance
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAddress(accounts[0]);
      } catch (err) {
        console.error(err);
        setStatus('Failed to connect wallet');
      }
    } else {
      setStatus('Please install MetaMask!');
    }
  };

  const sendTransaction = async () => {
    if (!address || !amount || !recipient) return;
    setStatus('Processing...');

    try {
      // Convert Eth to Wei (basic logic for demo)
      const valueHex = (parseFloat(amount) * 1e18).toString(16);

      const transactionParameters = {
        to: recipient, // Required except during contract publications.
        from: address, // must match user's active address.
        value: '0x' + Number(valueHex).toString(16),
      };

      await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });
      setStatus('Transaction Sent!');
    } catch (error: any) {
      console.error(error);
      setStatus('Transaction Failed: ' + error.message);
    }
  };

  useEffect(() => {
    if (window.ethereum?.selectedAddress) {
      setAddress(window.ethereum.selectedAddress);
    }
  }, []);

  return (
    <div className="page-container">
      <h1>Crypto Wallet</h1>

      {!address ? (
        <button onClick={connectWallet} className="btn btn-primary">Connect Wallet</button>
      ) : (
        <div className="wallet-dashboard">
          <div className="feature-card">
            <h3>Your Wallet</h3>
            <p><strong>Address:</strong> {address}</p>
            <p><strong>Balance:</strong> {balance} ETH</p>
            {/* Note: In a real app, fetch balance via eth_getBalance */}
          </div>

          <div className="row" style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
            {/* Send Section */}
            <div className="feature-card" style={{ flex: 1 }}>
              <h2>Send Crypto</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Recipient Address (0x...)"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="number"
                  placeholder="Amount (ETH)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button onClick={sendTransaction} className="btn btn-primary">Send Now</button>
                {status && <p>{status}</p>}
              </div>
            </div>

            {/* Receive Section */}
            <div className="feature-card" style={{ flex: 1 }}>
              <h2>Receive Crypto</h2>
              <p>Share your wallet address to receive payments.</p>
              <div style={{ background: '#eee', padding: '1rem', borderRadius: '4px', wordBreak: 'break-all' }}>
                {address}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(address)}
                className="btn btn-secondary"
                style={{ marginTop: '1rem', color: '#333', borderColor: '#333' }}
              >
                Copy Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
