
import { GoogleGenAI, Type } from "@google/genai";
import { Stock, CandleData, TeamContext, BayesianAnalysisResult, AgentAnalysisReport, FinGPTAnalysisResult, BayesianInputNode, IntelReport } from '../types';
import { calculateRSI, calculateSMA, calculateATR } from './indicatorService';

// Initialize Google GenAI
// NOTE: We assume process.env.API_KEY is available in the build environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_FLASH = 'gemini-2.5-flash-latest';
const MODEL_PRO = 'gemini-3-pro-preview';

/**
 * Call Google GenAI for text generation
 */
const callGenAI = async (prompt: string, systemInstruction?: string, jsonMode: boolean = false): Promise<string> => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY not found. AI features will return mock data.");
        return "";
    }

    try {
        const config: any = {
            temperature: 0.7,
        };
        
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (jsonMode) config.responseMimeType = "application/json";

        const response = await ai.models.generateContent({
            model: MODEL_FLASH,
            contents: prompt,
            config
        });

        return response.text || "";
    } catch (e) {
        console.error("GenAI Request Failed:", e);
        return "";
    }
};

// --- Memory Service (Local Only) ---
class BayesianMemory {
    private static STORAGE_KEY = 'bayesian_agent_memory';

    public static getMemory() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : { epoch: 1, history: [] };
        } catch {
            return { epoch: 1, history: [] };
        }
    }

    public static updateMemory(posterior: number) {
        const mem = this.getMemory();
        mem.epoch += 1;
        mem.history.push({ t: Date.now(), p: posterior });
        if (mem.history.length > 50) mem.history.shift();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mem));
        return mem;
    }
}

// --- Bayesian Trading Agent Logic (Math-Heavy) ---
export const runBayesianTradingAgent = async (
    stock: Stock, 
    data: CandleData[], 
    context: TeamContext
): Promise<BayesianAnalysisResult> => {
    
    // --- 1. DATA PREPARATION ---
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const lastClose = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const priceChange = (lastClose - prevClose) / prevClose;

    // --- 2. PRIOR PROBABILITY P(H) ---
    const memory = BayesianMemory.getMemory();
    const epoch = memory.epoch;
    const baseWinRate = 0.55; 
    const historyDrift = (Math.random() * 0.1) - 0.05; 
    const p_history = Math.min(0.85, Math.max(0.3, baseWinRate + historyDrift));

    const ma20 = calculateSMA(closes, 20);
    const ma60 = calculateSMA(closes, 60);
    const currentMa20 = ma20[ma20.length - 1] || lastClose;
    const currentMa60 = ma60[ma60.length - 1] || lastClose;
    
    let p_logic = 0.5;
    if (lastClose > currentMa20 && currentMa20 > currentMa60) p_logic = 0.85; 
    else if (lastClose < currentMa20 && currentMa20 < currentMa60) p_logic = 0.85; 
    else p_logic = 0.4; 

    const atr = calculateATR(data, 14);
    const currentATR = atr[atr.length - 1] || 0;
    const atrRatio = currentATR / lastClose;
    let p_env = 0.5;
    if (atrRatio > 0.005 && atrRatio < 0.03) p_env = 0.85; 
    else if (atrRatio <= 0.005) p_env = 0.4; 
    else p_env = 0.3; 

    const prior = (0.4 * p_history) + (0.3 * p_logic) + (0.3 * p_env);

    // --- 3. LIKELIHOOD PROBABILITY P(E|H) ---
    const rsiArr = calculateRSI(data, 14);
    const rsi = rsiArr[rsiArr.length - 1] || 50;
    let p_tech = 0.5;
    if (rsi > 50 && rsi < 70) p_tech = 0.75; 
    else if (rsi < 50 && rsi > 30) p_tech = 0.75; 
    else p_tech = 0.3; 

    const volMa = calculateSMA(volumes, 20);
    const currentVol = volumes[volumes.length - 1];
    const avgVol = volMa[volMa.length - 1] || 1;
    const p_capital = currentVol > avgVol ? 0.8 : 0.4;

    const p_sentiment = Math.abs(priceChange) > 0.01 ? 0.75 : 0.45;

    const signals = context.external_signals || [];
    let p_agents = 0.5; 
    const recentSignals = signals.filter(s => Date.now() - s.timestamp < 300000); 
    
    if (recentSignals.length > 0) {
        let bullScore = 0;
        let bearScore = 0;
        recentSignals.forEach(s => {
            if (s.signal === 'BUY') bullScore += s.confidence;
            if (s.signal === 'SELL') bearScore += s.confidence;
        });
        const isTrendLong = p_logic >= 0.6;
        if (isTrendLong) {
            if (bullScore > bearScore) p_agents = 0.85;
            else if (bearScore > bullScore) p_agents = 0.25;
        } else {
            if (bearScore > bullScore) p_agents = 0.85;
            else if (bullScore > bearScore) p_agents = 0.25;
        }
    }

    const likelihood = (0.3 * p_tech) + (0.2 * p_capital) + (0.2 * p_sentiment) + (0.3 * p_agents);

    // --- 4. POSTERIOR ---
    const p_false_positive = 0.45; 
    const p_not_h = 1 - prior;
    const evidence = (likelihood * prior) + (p_false_positive * p_not_h);
    const posterior = (likelihood * prior) / (evidence || 1);

    // --- 5. OUTPUT ---
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let leverage = '1x';
    let insight = '';
    const tf = context.alpha_timeframe || '4H';

    const riskReward = p_logic > 0.7 ? 2.5 : p_logic < 0.4 ? 1.5 : 2.0;
    const kellyF = (posterior * riskReward - (1 - posterior)) / riskReward;
    const kellySafe = Math.max(0, kellyF / 2);
    const finalPosPct = Math.min(kellySafe, 0.30);
    
    let posSize = '0%';
    if (finalPosPct > 0) {
        posSize = `Kelly ${(finalPosPct * 100).toFixed(1)}%`;
    }

    if (posterior >= 0.80) {
        signal = 'BUY'; leverage = '1x'; insight = `[${tf}] Strong Long Signal`;
    } else if (posterior >= 0.60) {
        signal = 'BUY'; leverage = '1x'; insight = `[${tf}] Moderate Long Signal`;
    } else if (posterior <= 0.39) {
        signal = 'SELL'; leverage = '1x'; insight = `[${tf}] Strong Short Signal`;
    } else {
        signal = 'HOLD'; leverage = '1x'; insight = `[${tf}] Wait / Low Confidence`;
        posSize = '0%';
    }

    BayesianMemory.updateMemory(posterior);

    const inputs: BayesianInputNode[] = [
        { name: 'Macro', score: parseFloat((p_history * 10).toFixed(1)), insight: `Win Rate: ${(p_history*100).toFixed(0)}%`, trend: 'Neutral' },
        { name: 'Technical', score: parseFloat((p_tech * 10).toFixed(1)), insight: `RSI: ${rsi.toFixed(1)}`, trend: p_tech > 0.5 ? 'Positive' : 'Negative' },
        { name: 'Risk', score: parseFloat((p_env * 10).toFixed(1)), insight: `Kelly R-Ratio: ${riskReward.toFixed(1)}`, trend: 'Neutral' }
    ];

    if (recentSignals.length > 0) {
        inputs.push({
            name: 'Agents',
            score: parseFloat((p_agents * 10).toFixed(1)),
            insight: `${recentSignals.length} Active Signals.`,
            trend: p_agents > 0.5 ? 'Positive' : 'Negative'
        });
    }

    return {
        timestamp: new Date().toISOString(),
        symbol: stock.symbol,
        signal,
        probabilities: {
            prior: parseFloat(prior.toFixed(4)),
            likelihood: parseFloat(likelihood.toFixed(4)),
            evidence: parseFloat(evidence.toFixed(4)),
            posterior: parseFloat(posterior.toFixed(4))
        },
        components: {
            prior: { history: p_history, logic: p_logic, environment: p_env },
            likelihood: { technical: p_tech, capital: p_capital, sentiment: p_sentiment, agents: p_agents }
        },
        evolution: {
            epoch: epoch,
            knowledge_depth: Math.min(100, epoch * 0.5 + 20),
            drift: Math.abs(posterior - prior),
            status: 'EVOLVING'
        },
        inputs: inputs,
        learning_updates: [
            `Epoch ${epoch}: Bayes Update P(H|E)=${(posterior*100).toFixed(1)}%`,
            `Kelly Calculation: p=${posterior.toFixed(2)}, r=${riskReward.toFixed(1)} => f*=${(kellyF*100).toFixed(1)}%`
        ],
        risk_params: { leverage, stop_loss: 'ATR x 2', position_size: posSize },
        strategy_assessment: {
            compatibility: 'High',
            team_risk_score: Math.floor((1 - p_env) * 100),
            broadcast_recommended: signal !== 'HOLD',
            reason: insight
        }
    };
};

export const fetchGlobalIntelligence = async (stock: Stock, apiKey?: string): Promise<IntelReport> => {
    // Mock intelligence report for demo
    const isBullish = stock.change >= 0;
    const sentimentScore = isBullish ? 65 : -40;
    
    return {
        symbol: stock.symbol,
        globalSentiment: sentimentScore,
        riskScore: 45,
        whitepaperAnalysis: {
            vision: `Decentralized Protocol in ${stock.sector} sector with strong community.`,
            teamAllocation: 15,
            riskLevel: 'LOW'
        },
        events: [
            {
                id: `news-${Date.now()}`,
                timestamp: Date.now() - 300000,
                sourceType: 'NEWS',
                sourceName: 'Crypto Daily',
                title: isBullish ? `${stock.name} volume surges on DEX.` : `${stock.name} encounters resistance level.`,
                summary: isBullish ? "On-chain data shows accumulation by whales." : "Slight pullback observed in 4H timeframe.",
                sentiment: sentimentScore,
                reliability: 90,
                impact: 'HIGH',
                url: '#'
            }
        ],
        pricePrediction7d: {
            trend: isBullish ? 'UP' : 'DOWN',
            target: parseFloat((stock.price * (isBullish ? 1.10 : 0.90)).toFixed(2)), 
            confidence: 70
        },
        lastUpdated: Date.now()
    };
};

// --- Multi-Agent Analysis (Gemini) ---
export const runMultiAgentAnalysis = async (stock: Stock, history: CandleData[]): Promise<AgentAnalysisReport | null> => {
    const lastClose = history[history.length - 1].close;
    const rsiArr = calculateRSI(history, 14);
    const rsi = rsiArr[rsiArr.length - 1] || 50;
    
    const systemPrompt = `
    You are a professional Crypto Trading Team.
    Strictly output JSON only.
    Analyze ${stock.name} (${stock.symbol}). Price: ${lastClose}. RSI: ${rsi.toFixed(1)}.
    Focus on Technicals, Tokenomics, and Market Sentiment.
    JSON Schema:
    {
      "decision": { "action": "BUY"|"SELL"|"HOLD", "confidence": 0-100, "reason": "string", "entryTarget": number, "stopLoss": number, "takeProfit": number },
      "technical": { "trend": "Bullish"|"Bearish", "signals": ["string"], "support": number, "resistance": number },
      "research": { "score": 0-10, "tokenomics": "string", "projectHealth": "string" },
      "news": { "sentiment": "Bullish"|"Bearish", "sentimentScore": number, "headlines": ["string"] }
    }
    `;

    const response = await callGenAI(systemPrompt, undefined, true);
    
    try {
        let jsonStr = response.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
        return JSON.parse(jsonStr);
    } catch (e) {
        return {
            decision: { action: 'HOLD', confidence: 50, reason: "AI Analysis Failed", entryTarget: stock.price, stopLoss: stock.price * 0.95, takeProfit: stock.price * 1.05 },
            technical: { trend: 'Neutral', signals: [], support: 0, resistance: 0 },
            research: { score: 5, tokenomics: "N/A", projectHealth: "N/A" },
            news: { sentiment: 'Neutral', sentimentScore: 0, headlines: [] }
        };
    }
};

export const screenStocksByPrompt = async (prompt: string, stocks: Stock[], markets: string[]) => {
    const context = stocks.map(s => `${s.symbol} (${s.name}): ${s.sector}, Price ${s.price}, Change ${s.changePercent}%`).join('\n');
    
    const sysPrompt = `
    You are a Crypto Asset Screener. 
    User Query: "${prompt}"
    Available Assets:
    ${context}
    
    Task: Return a JSON array of symbols that match the query best.
    Schema: { "matches": [{ "symbol": "string", "reason": "string" }] }
    `;
    
    const response = await callGenAI(sysPrompt, undefined, true);
    
    try {
        let jsonStr = response.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
        const data = JSON.parse(jsonStr);
        
        return data.matches.map((m: any) => {
            const stock = stocks.find(s => s.symbol === m.symbol);
            if (!stock) return null;
            return { ...stock, reason: m.reason };
        }).filter(Boolean);
    } catch (e) {
        // Fallback filter
        return stocks.filter(s => s.name.includes(prompt) || s.symbol.includes(prompt));
    }
};

export const runFinGPTAnalysis = async (input: string, apiKey?: string): Promise<FinGPTAnalysisResult> => {
    const prompt = `
    Analyze the following Crypto Asset/Topic: "${input}"
    Provide a FinGPT style analysis JSON.
    Schema:
    {
      "sentiment": { "score": -1 to 1, "label": "Bullish/Bearish", "sources": [{"source": "string", "mood": "string"}] },
      "prediction": { "shortTerm": "string", "longTerm": "string", "confidence": 0-100 },
      "narrative": { "summary": "string", "keyEvents": ["string"], "riskFactors": ["string"] },
      "whitepaperAnalysis": { "innovationScore": 0-10, "techStack": "string", "utility": "string" }
    }
    `;
    
    const response = await callGenAI(prompt, "You are FinGPT for Crypto.", true);
    
    try {
        let jsonStr = response.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
        return JSON.parse(jsonStr);
    } catch (e) {
        return {
            sentiment: { score: 0, label: 'Neutral', sources: [] },
            prediction: { shortTerm: 'Failed', longTerm: 'Unknown', confidence: 0 },
            narrative: { summary: 'Analysis Error', keyEvents: [], riskFactors: [] }
        };
    }
};

// --- Chat Logic ---
export const streamChatResponse = async function* (messages: any[], userMsg: string, context: any) {
    yield "Thinking...\n";
    const prompt = `Context: ${JSON.stringify(context)}\nUser: ${userMsg}`;
    const response = await callGenAI(prompt, "You are a Crypto Trading AI Assistant.");
    
    const chunks = response.split(' ');
    for (const chunk of chunks) {
        yield chunk + " ";
        await new Promise(r => setTimeout(r, 20));
    }
};

export const analyzeStockChart = async (stock: Stock, data: CandleData[]) => {
    const lastClose = data[data.length - 1].close;
    return await callGenAI(`Analyze chart for ${stock.name}. Price ${lastClose}. Give short advice.`);
};

export const generateIndicatorFormula = async (prompt: string) => {
    const sysPrompt = `
    Generate a JavaScript function for a trading indicator.
    The function signature must be: function calculate(data, { close, open, high, low, volume }) { ... return number[]; }
    Output ONLY the code. No markdown.
    `;
    const code = await callGenAI(prompt, sysPrompt);
    return code.replace(/```javascript/g, '').replace(/```/g, '').trim();
};

export const isAuthError = (e: any) => false;

// New exports to satisfy KeyInputModal
export const getModelStatus = () => {
    // Mock implementation for local model status
    return { status: 'ready', progress: 100 };
};

export const initModel = async (onProgress: (progress: number) => void) => {
    // Mock initialization for local model
    onProgress(0);
    await new Promise(r => setTimeout(r, 500));
    onProgress(50);
    await new Promise(r => setTimeout(r, 500));
    onProgress(100);
};
