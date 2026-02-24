import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

// Generate initial data points
const generateInitialData = () => {
  const data = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    data.push({
      time: new Date(now - i * 60000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      transactions: Math.floor(Math.random() * 150) + 50,
      volume: Math.floor(Math.random() * 25000) + 5000,
    });
  }
  return data;
};

const containerStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(96, 128, 245, 0.08) 0%, rgba(22, 32, 64, 0.95) 100%)',
  borderRadius: '16px',
  padding: '24px 32px',
  marginBottom: '48px',
  border: '1px solid rgba(96, 128, 245, 0.2)',
  position: 'relative',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '20px',
  flexWrap: 'wrap',
  gap: '16px',
};

const titleGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const liveIndicatorStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#10b981',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const pulseStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#10b981',
  animation: 'pulse 2s ease-in-out infinite',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#ffffff',
  margin: 0,
};

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '32px',
  flexWrap: 'wrap',
};

const statBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const statValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#6080f5',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const chartContainerStyle: React.CSSProperties = {
  height: '180px',
  width: '100%',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(15, 23, 41, 0.95)',
          border: '1px solid rgba(96, 128, 245, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, marginBottom: '8px' }}>
          {label}
        </p>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#6080f5', margin: 0 }}>
          {payload[0].value.toLocaleString()} transactions
        </p>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', margin: 0, marginTop: '4px' }}>
          ${payload[1]?.value.toLocaleString() || 0} volume
        </p>
      </div>
    );
  }
  return null;
};

export const LiveChartBanner: React.FC = () => {
  const [data, setData] = useState(generateInitialData);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);

  // Calculate totals
  useEffect(() => {
    const txSum = data.reduce((acc, d) => acc + d.transactions, 0);
    const volSum = data.reduce((acc, d) => acc + d.volume, 0);
    setTotalTransactions(txSum);
    setTotalVolume(volSum);
  }, [data]);

  // Update data every 5 seconds with new point
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [...prev.slice(1)];
        newData.push({
          time: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          transactions: Math.floor(Math.random() * 150) + 50,
          volume: Math.floor(Math.random() * 25000) + 5000,
        });
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={containerStyle}>
      {/* Add pulse keyframes via style tag */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
        `}
      </style>

      <div style={headerStyle}>
        <div style={titleGroupStyle}>
          <span style={liveIndicatorStyle}>
            <span style={pulseStyle} />
            Live Network Activity
          </span>
          <h3 style={titleStyle}>Real-Time Transaction Flow</h3>
        </div>

        <div style={statsRowStyle}>
          <div style={statBoxStyle}>
            <span style={statValueStyle}>{totalTransactions.toLocaleString()}</span>
            <span style={statLabelStyle}>Transactions (30m)</span>
          </div>
          <div style={statBoxStyle}>
            <span style={{ ...statValueStyle, color: '#10b981' }}>
              ${(totalVolume / 1000).toFixed(1)}K
            </span>
            <span style={statLabelStyle}>Volume (30m)</span>
          </div>
          <div style={statBoxStyle}>
            <span style={{ ...statValueStyle, color: '#f59e0b' }}>
              {((totalTransactions / 30) * 60).toFixed(0)}
            </span>
            <span style={statLabelStyle}>Tx/Hour Avg</span>
          </div>
        </div>
      </div>

      <div style={chartContainerStyle}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6080f5" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6080f5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              stroke="rgba(255,255,255,0.3)"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="rgba(255,255,255,0.3)"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="transactions"
              stroke="#6080f5"
              strokeWidth={2}
              fill="url(#txGradient)"
              animationDuration={300}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#volGradient)"
              animationDuration={300}
              yAxisId={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LiveChartBanner;
