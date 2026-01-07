
export type Role = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export interface Champion {
  id: string; // 英文名，如 "Aatrox"
  key: string; // 数字 ID，如 "266"
  name: string; // 英雄名，如 "亚托克斯"
  title: string; // 称号，如 "暗裔剑魔"
  image: string; // 头像 URL
}

export interface StrategyData {
  summary: string;
  earlyGame: string[];
  midGame: string[];
  lateGame: string[];
  matchupTips: string;
  sources: Array<{ web: { uri: string; title: string } }>;
  recommendedCreator?: string;
}

export interface LcuStateResponse {
  isConnected: boolean;
  myChampionId: number;
  myPickIntentId: number;
  enemyIds: number[];
  assignedRole: string;
}
