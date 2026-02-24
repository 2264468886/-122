
import { CandleData } from '../types';
import { calculateSMA, calculateRSI } from './indicatorService';
import { MemoryService } from './memoryService';

export type ActionType = 'BUY' | 'SELL' | 'HOLD';

interface BeliefState {
    BULL: number; // 看涨概率
    BEAR: number; // 看跌概率
    FLAT: number; // 震荡/不确定概率
}

/**
 * 强化递归贝叶斯智能体 (Reinforcement Bayesian Agent)
 * 核心思想：
 * 1. Evidence 1 (客观): K线数据 (RSI, MA)
 * 2. Evidence 2 (主观): 账户盈亏 (PnL)
 * 
 * Posterior ∝ Likelihood(Data) * PnL_Adjustment(Prior)
 */
export class BasicBayesianAgent {
    // 初始信念 (Uniform Prior) - 保持最大熵状态
    private belief: BeliefState = { BULL: 0.3333, BEAR: 0.3333, FLAT: 0.3334 };
    
    // 记忆上一刻的状态，用于计算 PnL
    private lastTotalValue: number = 0;
    private lastAction: ActionType = 'HOLD';

    // 状态转移惯性 (Transition Model)
    // 降低惯性 (0.9 -> 0.85) 增加对新数据的敏感度
    private readonly PERSISTENCE = 0.85; 
    // 防止概率坍缩的极小值 (Epsilon Floor)
    private readonly EPSILON = 0.05; 
    private readonly MEMORY_KEY = 'BASIC_AGENT_V2';

    constructor() {
        this.loadMemory(); 
    }

    public async loadMemory() {
        const saved = await MemoryService.loadAgentMemory(this.MEMORY_KEY);
        if (saved) {
            if (saved.belief) this.belief = saved.belief;
            if (saved.lastAction) this.lastAction = saved.lastAction;
        }
    }

    public async saveMemory() {
        await MemoryService.saveAgentMemory(this.MEMORY_KEY, {
            belief: this.belief,
            lastAction: this.lastAction,
            timestamp: Date.now()
        });
    }

    /**
     * 核心递归更新函数
     */
    public updateBelief(data: CandleData[], currentTotalValue: number): string {
        if (data.length < 30) { // 需要更多数据初始化
            this.lastTotalValue = currentTotalValue;
            return "数据积累中 (Initializing)...";
        }

        // --- 0. 盈亏反馈 (PnL Feedback) ---
        let pnlLog = "";
        
        if (this.lastTotalValue > 0 && this.lastAction !== 'HOLD') {
            const pnl = currentTotalValue - this.lastTotalValue;
            const changeRatio = Math.abs((currentTotalValue - this.lastTotalValue) / this.lastTotalValue);
            
            // 动态学习率
            const learnRate = 0.4; 

            if (this.lastAction === 'BUY') {
                if (pnl > 0) {
                    this.belief.BULL += learnRate * changeRatio * 10; 
                    pnlLog = `💰 持仓浮盈 -> 增强多头信心`;
                } else if (pnl < 0) {
                    this.belief.BULL -= learnRate * changeRatio * 20; // 亏损惩罚更重
                    this.belief.FLAT += learnRate * changeRatio * 10;
                    pnlLog = `💸 持仓浮亏 -> 修正多头偏见`;
                }
            } else if (this.lastAction === 'SELL') {
                if (pnl > 0) {
                    this.belief.BEAR += learnRate * changeRatio * 10; 
                    pnlLog = `💰 空单浮盈 -> 增强空头信心`;
                } else if (pnl < 0) {
                    this.belief.BEAR -= learnRate * changeRatio * 20;
                    this.belief.FLAT += learnRate * changeRatio * 10;
                    pnlLog = `💸 空单浮亏 -> 修正空头偏见`;
                }
            }
            this.normalizeBelief();
        }

        this.lastTotalValue = currentTotalValue;

        // --- 1. 提取市场证据 (Evidence) ---
        const last = data[data.length - 1];
        const prev = data[data.length - 2];
        
        // 价格动量 (Momentum)
        const changePct = (last.close - prev.close) / prev.close * 100;
        
        // 均线系统 (MA20)
        const ma20Arr = calculateSMA(data.map(d => d.close), 20);
        const ma20 = ma20Arr[ma20Arr.length - 1] || last.close;
        const distMa = (last.close - ma20) / ma20 * 100; // 价格偏离均线的百分比
        
        // RSI (Relative Strength)
        const rsiArr = calculateRSI(data, 14);
        const rsi = rsiArr[rsiArr.length - 1] || 50;

        // --- 2. 预测步骤 (Prediction / Time Update) ---
        // 引入熵增 (Entropy Injection)：每一轮都让信念稍微回归均匀分布 (0.33)
        // 这防止了概率锁死在 100% 导致“不作为”
        this.belief = {
            BULL: this.belief.BULL * this.PERSISTENCE + (1 - this.PERSISTENCE) / 3,
            BEAR: this.belief.BEAR * this.PERSISTENCE + (1 - this.PERSISTENCE) / 3,
            FLAT: this.belief.FLAT * this.PERSISTENCE + (1 - this.PERSISTENCE) / 3,
        };

        // --- 3. 似然估计 (Likelihood P(Data|State)) ---
        
        // 牛市似然：价格大涨，RSI > 50
        const p_change_bull = this.sigmoid(changePct * 2); 
        const p_rsi_bull = Math.max(0, Math.min(1, (rsi - 40) / 60)); 

        const l_bull = p_change_bull * 0.5 + p_rsi_bull * 0.5;
        
        // 熊市似然：价格大跌，RSI < 50
        const l_bear = (1 - p_change_bull) * 0.5 + (1 - p_rsi_bull) * 0.5;
        
        // 震荡似然：变化率接近0，RSI 接近 50
        const l_flat_change = Math.exp(-Math.pow(changePct, 2) / 0.5); 
        const l_flat_rsi = Math.exp(-Math.pow(rsi - 50, 2) / 200); 
        
        const l_flat = l_flat_change * 0.6 + l_flat_rsi * 0.4;

        // --- 4. 贝叶斯修正 (Correction / Measurement Update) ---
        // Posterior = Prior * Likelihood
        this.belief.BULL = this.belief.BULL * (l_bull + 0.1); 
        this.belief.BEAR = this.belief.BEAR * (l_bear + 0.1);
        this.belief.FLAT = this.belief.FLAT * (l_flat + 0.1);

        this.normalizeBelief();
        this.saveMemory();

        const formatP = (v: number) => (v * 100).toFixed(1);
        
        if (pnlLog) return `[修正] ${pnlLog}`;
        
        let stateStr = "震荡 (Flat)";
        if (this.belief.BULL > this.belief.BEAR && this.belief.BULL > this.belief.FLAT) stateStr = "看多 (Bull)";
        if (this.belief.BEAR > this.belief.BULL && this.belief.BEAR > this.belief.FLAT) stateStr = "看空 (Bear)";

        return `[贝叶斯] ${stateStr} | Bull:${formatP(this.belief.BULL)}% Bear:${formatP(this.belief.BEAR)}% Flat:${formatP(this.belief.FLAT)}%`;
    }

    /**
     * 决策函数
     * 使用更激进的“方向性偏差”判断，而非绝对阈值
     */
    public decide(): { action: ActionType, confidence: number } {
        const { BULL, BEAR, FLAT } = this.belief;
        
        const directionalBias = BULL - BEAR;
        const BIAS_THRESHOLD = 0.15; // 15% 偏差即视为有趋势
        const ABS_THRESHOLD = 0.30; // 绝对值需 > 30%

        let action: ActionType = 'HOLD';
        let confidence = FLAT;

        // 激进策略：只要多空偏差大，且绝对概率不低，就开仓
        if (directionalBias > BIAS_THRESHOLD && BULL > ABS_THRESHOLD) {
            action = 'BUY';
            confidence = BULL;
        } else if (directionalBias < -BIAS_THRESHOLD && BEAR > ABS_THRESHOLD) {
            action = 'SELL';
            confidence = BEAR;
        } else {
            // 如果 Flat 确实太高 (> 60%)，则观望
            action = 'HOLD';
            confidence = Math.max(BULL, BEAR, FLAT);
        }

        this.lastAction = action;
        return { action, confidence };
    }

    private normalizeBelief() {
        // 1. 应用概率下限 (Epsilon Floor)，彻底防止 0% 或 100% 锁死
        this.belief.BULL = Math.max(this.EPSILON, this.belief.BULL);
        this.belief.BEAR = Math.max(this.EPSILON, this.belief.BEAR);
        this.belief.FLAT = Math.max(this.EPSILON, this.belief.FLAT);

        // 2. 归一化
        const sum = this.belief.BULL + this.belief.BEAR + this.belief.FLAT;
        if (sum > 0) {
            this.belief.BULL /= sum;
            this.belief.BEAR /= sum;
            this.belief.FLAT /= sum;
        } else {
            this.belief = { BULL: 0.3333, BEAR: 0.3333, FLAT: 0.3334 };
        }
    }

    private sigmoid(t: number) {
        return 1 / (1 + Math.exp(-t));
    }

    public getBelief() {
        return this.belief;
    }
    
    public reset() {
        this.belief = { BULL: 0.3333, BEAR: 0.3333, FLAT: 0.3334 };
        this.lastTotalValue = 0;
        this.lastAction = 'HOLD';
        MemoryService.clearAgentMemory(this.MEMORY_KEY);
    }
}
