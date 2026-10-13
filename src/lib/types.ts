export type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  /** Last 7 days of prices, oldest first. */
  sparkline: number[];
};

export type Direction = 'up' | 'down';

export type Timeframe = '24h' | '7d' | '30d';

export type Call = {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  direction: Direction;
  entryPrice: number;
  targetPrice?: number;
  timeframe: Timeframe;
  createdAt: number;
  expiresAt: number;
  status: CallStatus;
  exitPrice?: number;
};

export type CallStatus = 'open' | 'hit' | 'miss' | 'void';
