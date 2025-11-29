
export enum AssetType {
  STOCK = 'STOCK',
  FUND = 'FUND'
}

export interface Holding {
  id: string;
  name: string;
  code: string;
  type: AssetType;
  buyDate: string;
  buyPrice: number;
  quantity: number;
  currentPrice: number;
  yesterdayPrice?: number; // Previous closing price for Daily P/L
  priceDate?: string; // Timestamp of the latest price
}

export interface PortfolioSummary {
  totalCost: number;
  totalMarketValue: number;
  totalProfitLoss: number;
  totalReturnRate: number;
  totalDayProfitLoss: number; // New: Daily Profit/Loss
}

export interface AIAdvice {
  assetName: string;
  assetCode: string;
  alternatives: Array<{
    name: string;
    code: string;
    reason: string;
  }>;
}
