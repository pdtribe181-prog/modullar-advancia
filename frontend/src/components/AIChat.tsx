import { useState, useRef, useEffect } from 'react';
import { Spinner } from './Spinner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  className?: string;
}

export function AIChat({ className = '' }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your Advancia AI assistant. I can help you with healthcare payments, booking MedBeds, managing your wallet, and more. How can I assist you today?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call backend AI endpoint
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          context: 'healthcare payments',
        }),
      });

      let aiResponse = '';

      if (response.ok) {
        const data = await response.json();
        aiResponse = data.response || data.aiResponse || data.message || 'Thanks for reaching out!';
      } else {
        // Fallback to local responses
        aiResponse = generateLocalResponse(userMessage.content);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      // Fallback to local response
      const localResponse = generateLocalResponse(userMessage.content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: localResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          transition: 'transform 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: '28px' }}>{isOpen ? '✕' : '🤖'}</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={className}
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            width: '380px',
            height: '520px',
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '16px 20px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🤖</span>
              <div>
                <h4 style={{ margin: 0, fontWeight: '600' }}>Advancia AI</h4>
                <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Healthcare Assistant</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#f8fafc',
          }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1a1a2e',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </p>
                  <p style={{
                    margin: '8px 0 0 0',
                    fontSize: '11px',
                    opacity: 0.7,
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                  }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}>
                <Spinner size={16} />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            background: 'white',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '24px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{
                  padding: '12px 20px',
                  borderRadius: '24px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !input.trim() ? 0.6 : 1,
                  fontWeight: '600',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Local response generator for fallback
function generateLocalResponse(input: string): string {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes('medbed') || lowerInput.includes('booking') || lowerInput.includes('chamber')) {
    return `I can help you book a MedBed or Hyperbaric Chamber session! 🛏️

Here's how to book:
1. Go to Dashboard → MedBed Booking
2. Select your preferred facility type
3. Choose an available date and time slot
4. Confirm your booking

Our facilities include:
• Quantum MedBed - Full-body regeneration ($150/hr)
• Holographic MedBed - Targeted healing ($200/hr)
• Hyperbaric Chamber - Oxygen therapy ($120/hr)

Would you like me to help you navigate to the booking page?`;
  }

  if (lowerInput.includes('payment') || lowerInput.includes('pay') || lowerInput.includes('stripe')) {
    return `For payments, Advancia supports multiple methods:

💳 **Credit/Debit Cards** - Via Stripe secure checkout
🪙 **Cryptocurrency** - ETH, SOL, and more via wallet connect
💰 **Bank Transfer** - ACH transfers for larger amounts

To make a payment:
1. Navigate to Dashboard → Make Payment
2. Enter the amount and select payment method
3. Complete the secure checkout

All transactions are HIPAA-compliant and encrypted.`;
  }

  if (lowerInput.includes('wallet') || lowerInput.includes('crypto') || lowerInput.includes('eth') || lowerInput.includes('connect')) {
    return `To connect your Web3 wallet:

1. Go to Dashboard → Connect Wallet
2. Select your blockchain network (Ethereum, Solana, Polygon, etc.)
3. Click "Connect" and approve in your wallet (MetaMask, Phantom, etc.)
4. Sign the verification message

Once connected, you can:
• Receive payments in crypto
• Send funds to other addresses
• Convert between currencies
• Enable crypto payouts

Your linked wallet will appear in your profile settings.`;
  }

  if (lowerInput.includes('balance') || lowerInput.includes('send') || lowerInput.includes('receive') || lowerInput.includes('convert')) {
    return `Your wallet balance is displayed on your Dashboard. You can:

**Send Funds** ↗️
- Enter recipient address or email
- Choose amount and currency (USD, ETH, SOL)
- Confirm transaction

**Receive Funds** ↙️
- Share your wallet address
- Accept payments from anyone

**Convert Currency** 🔄
- Swap between USD, ETH, and SOL
- Real-time exchange rates
- Low conversion fees

All transactions are recorded in your activity history.`;
  }

  if (lowerInput.includes('admin') || lowerInput.includes('approve') || lowerInput.includes('user')) {
    return `As an admin, you can manage users through the Admin Console:

👥 **User Management**
- View all registered users
- Approve pending registrations
- Suspend or reactivate accounts
- Monitor online users

📊 **Dashboard Analytics**
- Total users and transactions
- Revenue metrics
- System health status

Access the Admin Console from your Dashboard if you have admin privileges.`;
  }

  if (lowerInput.includes('help') || lowerInput.includes('support')) {
    return `I'm here to help! Here are some things I can assist with:

🏥 **Healthcare Services**
- MedBed & Chamber bookings
- Appointment scheduling
- Provider information

💳 **Payments**
- Payment processing
- Transaction history
- Invoice management

🔐 **Account**
- Profile settings
- Security & MFA setup
- Wallet management

What would you like to know more about?`;
  }

  // Default response
  return `Thanks for your message! I'm your Advancia AI assistant, here to help with:

• 🛏️ MedBed & Chamber bookings
• 💳 Payment processing
• 🔐 Account management
• 🦊 Wallet & crypto features

Please feel free to ask about any of these topics, or describe what you're looking for in more detail. I'm here to help make your healthcare payment experience seamless!`;
}

export default AIChat;
