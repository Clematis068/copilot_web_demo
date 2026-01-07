
import { GoogleGenAI, Type } from "@google/genai";
import { StrategyData, Role } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// 缓存版本号，随游戏大版本手动更新或通过 API 联动
const CACHE_VERSION = "14.24.1"; 

/**
 * 生成对局指纹，用于唯一标识一个特定的分析场景
 */
function generateFingerprint(myChamp: string, opponent: string, role: Role, context?: string): string {
  const raw = `${myChamp}-${opponent}-${role}-${context || ''}-${CACHE_VERSION}`;
  // 简单的哈希处理
  return btoa(unescape(encodeURIComponent(raw)));
}

/**
 * 从本地缓存获取数据
 */
function getFromCache(fingerprint: string): StrategyData | null {
  const cached = localStorage.getItem(`lol_strategy_${fingerprint}`);
  if (!cached) return null;
  try {
    const { data, timestamp } = JSON.parse(cached);
    // 缓存有效期设定为 24 小时
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`lol_strategy_${fingerprint}`);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * 保存数据到本地缓存
 */
function saveToCache(fingerprint: string, data: StrategyData) {
  const cacheObj = {
    data,
    timestamp: Date.now(),
    version: CACHE_VERSION
  };
  localStorage.setItem(`lol_strategy_${fingerprint}`, JSON.stringify(cacheObj));
}

export async function getStrategy(
  myChampion: string,
  opponent: string,
  role: Role,
  customContext?: string
): Promise<StrategyData & { isCached?: boolean }> {
  
  // 1. 尝试从缓存获取
  const fingerprint = generateFingerprint(myChampion, opponent, role, customContext);
  const cachedData = getFromCache(fingerprint);
  
  if (cachedData) {
    console.log("🚀 [Cache Hit] 命中本地战术缓存");
    return { ...cachedData, isCached: true };
  }

  // 2. 缓存未命中，调用 AI
  const modelName = "gemini-3-flash-preview"; 
  const prompt = `
    分析 LOL 对局：${role}位 我方【${myChampion}】 VS 敌方【${opponent}】。
    ${customContext ? `特定参考：${customContext}。` : ""}
    要求：提供极简、硬核的对线/开野指令。输出 JSON。
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            earlyGame: { type: Type.ARRAY, items: { type: Type.STRING } },
            midGame: { type: Type.ARRAY, items: { type: Type.STRING } },
            lateGame: { type: Type.ARRAY, items: { type: Type.STRING } },
            matchupTips: { type: Type.STRING },
            recommendedCreator: { type: Type.STRING },
          },
          required: ["summary", "earlyGame", "midGame", "lateGame", "matchupTips", "recommendedCreator"]
        },
        temperature: 0.1,
      },
    });

    const strategy = JSON.parse(response.text);

    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({ 
        web: { uri: chunk.web.uri, title: chunk.web.title || "参考资料" } 
      }));

    const result = {
      ...strategy,
      sources: sources.length > 0 ? sources.slice(0, 3) : [],
    };

    // 3. 存入缓存
    saveToCache(fingerprint, result);
    return result;
  } catch (error) {
    console.error("AI 获取失败:", error);
    throw error;
  }
}
