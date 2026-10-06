export enum PositionType {
  Long = 'long',
  Short = 'short'
}

export interface Position {
  isOpen: boolean;
  symbol: string;
  type: PositionType;
  shares: number;
}

export interface BacktestPosition extends Position {
  investment: number;
  entryTimestamp: number;
  entryPrice: number;
  exitTimestamp?: number;
  exitPrice?: number;
  profit?: number;
  commission?: number;
  netProfit?: number;
}
