
import { AgentTrade, Portfolio } from '../types';

/**
 * COMPLIANCE & INCENTIVE ENGINE
 * 
 * Enforces:
 * 1. Trading Frequency Limits (Max 2/min)
 * 2. Minimum Holding Time (5 min)
 * 3. Asset Whitelist (BTC, ETH, BNB, SOL, XRP, DOGE)
 * 4. Real Fee Deduction
 * 5. Cash Reward/Penalty Logic based on Net PnL
 */

// Configuration Constants
const ASSET_WHITELIST = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE'];
const ASSET_COEFF: Record<string, number> = {
    'BTC': 0.8, 'ETH': 0.9, 'BNB': 1.0, 'SOL': 1.1, 'XRP': 1.2, 'DOGE': 1.3
};
const FEE_RATES = {
    SPOT: 0.001, // 0.1%
    FUTURES_OPEN: 0.0005, // 0.05% Taker
    FUTURES_CLOSE: 0.0005 // 0.05% Taker
};
const MIN_HOLD_TIME_MS = 5 * 60 * 1000; // 5 mins
const MAX_TRADES_PER_MIN = 2;

// Reward/Penalty Base Ratios
const BASE_REWARD_RATIO = 0.10; // 10% of Profit
const BASE_PENALTY_RATIO = 0.20; // 20% of Loss

export interface IncentiveResult {
    netPnL: number;
    fee: number;
    incentiveAmount: number; // Positive = Reward, Negative = Penalty
    log: string;
    violation?: string;
}

class ComplianceEngine {
    private tradeTimestamps: number[] = [];
    private dailyDrawdownStartBalance: number = 0;
    private dailyMinBalance: number = 0;
    
    // Track stats for adaptive parameters
    private totalTrades = 0;
    private wins = 0;
    
    constructor() {
        // Reset daily stats at midnight? Simplification: Reset on init
        this.dailyDrawdownStartBalance = 0; 
    }

    public setInitialBalance(balance: number) {
        if (this.dailyDrawdownStartBalance === 0) {
            this.dailyDrawdownStartBalance = balance;
            this.dailyMinBalance = balance;
        }
    }

    public checkDrawdown(currentBalance: number): { allowed: boolean, reason?: string } {
        if (currentBalance < this.dailyMinBalance) this.dailyMinBalance = currentBalance;
        
        const drawdown = (this.dailyDrawdownStartBalance - currentBalance) / this.dailyDrawdownStartBalance;
        if (drawdown > 0.20) {
            return { allowed: false, reason: `账户最大回撤 (${(drawdown*100).toFixed(1)}%) > 20%，交易权限已熔断暂停。` };
        }
        return { allowed: true };
    }

    public validateTrade(
        symbol: string, 
        action: 'BUY' | 'SELL', 
        portfolio: Portfolio, 
        holdingTimeMs: number = 0
    ): { allowed: boolean, reason?: string } {
        const now = Date.now();
        const baseSymbol = symbol.replace('USDT', '').toUpperCase();

        // 1. Asset Whitelist
        if (!ASSET_WHITELIST.includes(baseSymbol)) {
            return { allowed: false, reason: `资产 ${baseSymbol} 不在白名单 (BTC, ETH, BNB, SOL, XRP, DOGE)` };
        }

        // 2. Frequency Check
        this.tradeTimestamps = this.tradeTimestamps.filter(t => now - t < 60000); // Keep last min
        if (this.tradeTimestamps.length >= MAX_TRADES_PER_MIN) {
            return { allowed: false, reason: `交易频率超标 (>2笔/分)，请求被风控拦截。` };
        }

        // 3. Holding Time Check (For Close Orders)
        if (action === 'SELL' && holdingTimeMs > 0 && holdingTimeMs < MIN_HOLD_TIME_MS) {
             return { allowed: false, reason: `持仓时间不足 5 分钟 (${(holdingTimeMs/1000).toFixed(0)}s)，禁止刷单。` };
        }

        return { allowed: true };
    }

    public recordTrade() {
        this.tradeTimestamps.push(Date.now());
        this.totalTrades++;
    }

    public calculateFees(qty: number, price: number, isFutures: boolean): number {
        const volume = qty * price;
        const rate = isFutures ? FEE_RATES.FUTURES_OPEN : FEE_RATES.SPOT; // Simplify to worst case
        return volume * rate;
    }

    public calculateIncentive(
        symbol: string,
        entryPrice: number,
        exitPrice: number,
        qty: number,
        isShort: boolean,
        isFutures: boolean
    ): IncentiveResult {
        const baseSymbol = symbol.replace('USDT', '').toUpperCase();
        const coeff = ASSET_COEFF[baseSymbol] || 1.0;
        
        const openFee = this.calculateFees(qty, entryPrice, isFutures);
        const closeFee = this.calculateFees(qty, exitPrice, isFutures);
        const totalFee = openFee + closeFee;

        // Calculate Raw PnL
        let rawPnL = 0;
        if (isShort) {
            rawPnL = (entryPrice - exitPrice) * qty;
        } else {
            rawPnL = (exitPrice - entryPrice) * qty;
        }

        // Net PnL (Strict Deduction)
        const netPnL = rawPnL - totalFee;
        
        let incentive = 0;
        let note = "";

        // Profit
        if (netPnL > 0) {
            this.wins++;
            let rewardRatio = BASE_REWARD_RATIO;
            
            // Adaptive: High Win Rate Bonus
            const winRate = this.wins / Math.max(1, this.totalTrades);
            if (winRate >= 0.60) rewardRatio = 0.15;

            // Target Multiplier logic (Simple example: if ROI > 1%)
            const roi = netPnL / (entryPrice * qty);
            if (roi > 0.01) {
                rewardRatio *= 1.2;
                note += "[目标达成x1.2] ";
            } else {
                rewardRatio *= 0.5;
                note += "[微利惩罚x0.5] ";
            }

            incentive = netPnL * rewardRatio * coeff;
            note += `奖励 (净利$${netPnL.toFixed(2)} * ${rewardRatio*100}% * 系数${coeff})`;
        } 
        // Loss
        else {
            let penaltyRatio = BASE_PENALTY_RATIO;
            
            // Stop Loss Multiplier (e.g. loss > 2%)
            const lossRate = Math.abs(netPnL) / (entryPrice * qty);
            if (lossRate > 0.02) {
                penaltyRatio *= 1.5;
                note += "[止损触发x1.5] ";
            }

            incentive = -1 * Math.abs(netPnL) * penaltyRatio * coeff;
            note += `惩罚 (净亏$${Math.abs(netPnL).toFixed(2)} * ${penaltyRatio*100}% * 系数${coeff})`;
        }

        return {
            netPnL,
            fee: totalFee,
            incentiveAmount: incentive,
            log: note
        };
    }
}

export const complianceService = new ComplianceEngine();
