
import { AgentLog } from '../types';
import { complianceService } from './complianceService';

export interface EvoAgent {
    id: string;
    name: string;
    role: string;
    status: 'Idle' | 'Working' | 'Learning' | 'Optimizing';
    skills: string[];
    lastOutput?: string;
    color: string;
}

export interface BeliefState {
    strategies: Record<string, number>;
    learningRate: number;
    lastUpdate: string;
}

export interface KnowledgeNode {
    id: string;
    topic: string;
    source: string;
    timestamp: number;
    impact: string;
}

export interface FinancialUpdate {
    pnl: number;
    tradeInfo: string;
}

// --- Kelly Criterion Engine ---
class KellyPositionSizer {
    /**
     * Calculates optimal position size f*
     * @param p Win probability (0-1)
     * @param r Risk/Reward Ratio (e.g. 1.5)
     * @param k Fractional Kelly factor (e.g. 2 for Half-Kelly)
     * @param maxCap Maximum capital allocation per trade (0-1)
     */
    static calculate(p: number, r: number, k: number = 2, maxCap: number = 0.20): { f: number, fStar: number, reason: string } {
        if (p <= 0.5) return { f: 0, fStar: 0, reason: 'Win rate too low for Kelly' };
        
        // Kelly Formula: f* = (p * r - (1 - p)) / r
        const fStar = (p * r - (1 - p)) / r;
        
        if (fStar <= 0) return { f: 0, fStar, reason: 'Negative Expectancy' };
        
        // Fractional Adjustment
        let f = fStar / k;
        
        // Safety Constraints
        f = Math.min(f, maxCap);
        
        return { 
            f, 
            fStar, 
            reason: `Kelly f*=${(fStar*100).toFixed(1)}%, Applied (1/${k})=${(f*100).toFixed(1)}%` 
        };
    }
}

// Initial Beliefs
const INITIAL_BELIEFS = {
    "趋势跟踪策略": 0.30,
    "均值回归策略": 0.25,
    "突破交易策略": 0.25,
    "套利交易策略": 0.10,
    "高频交易策略": 0.10
};

export const EVO_AGENTS_CONFIG: EvoAgent[] = [
    { id: 'MONITOR', name: '监控扫描智能体', role: '24h 市场监控', status: 'Idle', color: 'text-blue-400', skills: ['实时价格监控', '技术信号识别', '链上异常捕捉'] },
    { id: 'DATA', name: '数据分析智能体', role: '深度数据挖掘', status: 'Idle', color: 'text-blue-300', skills: ['回测验证', '波动率分析', '资金流向追踪'] },
    { id: 'SENTIMENT', name: '舆情分析智能体', role: '情绪转折识别', status: 'Idle', color: 'text-purple-400', skills: ['NLP情感分析', '恐慌指数计算', '社群热度追踪'] },
    { id: 'STRATEGY', name: '策略生成智能体', role: '动态策略构建', status: 'Idle', color: 'text-emerald-400', skills: ['多策略生成', '风险收益评估', '参数自适应'] },
    { id: 'DECISION', name: '决策交易员', role: '核心决策大脑', status: 'Idle', color: 'text-yellow-400', skills: ['大势判断', '心态管理', '最终裁决'] },
    { id: 'POSITION', name: '仓位管理智能体', role: '仓库管理员', status: 'Idle', color: 'text-orange-400', skills: ['Kelly Criterion', '动态调仓', 'Fractional Kelly'] },
    { id: 'EXECUTION', name: '执行下单智能体', role: '精准交易执行', status: 'Idle', color: 'text-cyan-400', skills: ['多交易所API', '滑点控制', '算法拆单'] },
    { id: 'PERFORMANCE', name: '绩效评估智能体', role: '客观绩效审计', status: 'Idle', color: 'text-gray-400', skills: ['夏普比率计算', '归因分析', '缺陷识别'] },
    { id: 'BAYESIAN', name: '贝叶斯学习智能体', role: '信念更新专家', status: 'Idle', color: 'text-rose-400', skills: ['后验概率计算', '信念度更新', '策略权重优化'] },
    { id: 'AUTO_LEARN', name: '自主学习智能体', role: '全网知识猎手', status: 'Idle', color: 'text-indigo-400', skills: ['全网爬虫', '论文复现', '新策略整合'] },
    { id: 'RISK_ENGINE', name: '风控规则引擎', role: '硬性约束边界', status: 'Idle', color: 'text-red-500', skills: ['硬止损', '最大回撤限制', '合规检查'] }
];

let currentBeliefs = { ...INITIAL_BELIEFS };

export const simulateEvoCycle = (
    currentAgents: EvoAgent[],
    addLog: (log: AgentLog) => void
): { agents: EvoAgent[], beliefs: BeliefState, newKnowledge: KnowledgeNode | null, financial: FinancialUpdate | null } => {
    // Explicitly cast to EvoAgent[]
    const nextAgents: EvoAgent[] = currentAgents.map(a => ({ ...a, status: 'Idle' as const }));
    const timestamp = new Date().toLocaleTimeString();
    let newKnowledge: KnowledgeNode | null = null;
    let financial: FinancialUpdate | null = null;

    // Simulation Probabilities
    const rand = Math.random();

    // 1. MONITORING PHASE
    const monitor = nextAgents.find(a => a.id === 'MONITOR');
    if (monitor) monitor.status = 'Working';
    
    const targetSymbol = Math.random() > 0.5 ? 'BTCUSDT' : 'ETHUSDT';
    const signalConfidence = 0.55 + (Math.random() * 0.35); // 0.55 - 0.90
    const signalRRatio = 1.5 + (Math.random() * 2.0); // 1.5 - 3.5
    
    if (rand > 0.7) {
        addLog({
            id: Math.random().toString(), timestamp, agent: 'Monitor', level: 'INFO',
            message: `[信号] ${targetSymbol} 突破阻力位 (置信度 ${(signalConfidence*100).toFixed(0)}%, 盈亏比 ${signalRRatio.toFixed(1)})`
        });
    }

    // 2. AUTONOMOUS LEARNING
    if (Math.random() > 0.90) {
        const learner = nextAgents.find(a => a.id === 'AUTO_LEARN');
        if (learner) learner.status = 'Learning';
        
        const topics = [
            { t: '基于 Transformer 的高频预测模型', s: 'arXiv:2402.xxxxx' },
            { t: 'Kelly 公式在长尾资产中的修正', s: 'Quant Research' },
            { t: 'SEC 对 ETH ETF 的最新态度分析', s: 'Bloomberg' },
            { t: '跨链桥 MEV 保护策略', s: 'Flashbots Forum' }
        ];
        const learned = topics[Math.floor(Math.random() * topics.length)];
        
        newKnowledge = {
            id: Math.random().toString(),
            topic: learned.t,
            source: learned.s,
            timestamp: Date.now(),
            impact: '系统参数微调'
        };
        
        addLog({
            id: Math.random().toString(), timestamp, agent: 'AutoLearn', level: 'SUCCESS',
            message: `[新知识] 捕获主题: "${learned.t}"\n来源: ${learned.s}\n动作: 已整合至策略库`
        });
    }

    // 3. DECISION, POSITION SIZING & EXECUTION
    if (rand > 0.7) {
        // Compliance
        const riskEngine = nextAgents.find(a => a.id === 'RISK_ENGINE');
        if (riskEngine) riskEngine.status = 'Working';

        const validation = complianceService.validateTrade(targetSymbol, 'BUY', { cash: 100000, holdings: {}, initialCapital: 100000, totalValue: 100000, history: [] });
        
        if (!validation.allowed) {
            addLog({
                id: Math.random().toString(), timestamp, agent: 'RiskEngine', level: 'ERROR',
                message: `[合规拦截] 拒绝执行针对 ${targetSymbol} 的策略信号。\n原因: ${validation.reason}`
            });
            return { agents: nextAgents, beliefs: { strategies: currentBeliefs, learningRate: 0.2, lastUpdate: timestamp }, newKnowledge, financial };
        } else {
             addLog({
                id: Math.random().toString(), timestamp, agent: 'RiskEngine', level: 'SUCCESS',
                message: `[合规通过] 标的 ${targetSymbol} 在白名单内，且频率合规。`
            });
        }

        // Kelly Criterion
        const posAgent = nextAgents.find(a => a.id === 'POSITION');
        if (posAgent) posAgent.status = 'Working';

        const kellyResult = KellyPositionSizer.calculate(signalConfidence, signalRRatio, 2, 0.25);
        
        addLog({
            id: Math.random().toString(), timestamp, agent: 'Position', level: 'WARN',
            message: `[仓位管理] Kelly 计算: P=${(signalConfidence*100).toFixed(0)}%, R=${signalRRatio.toFixed(1)} -> ${kellyResult.reason}`
        });

        if (kellyResult.f < 0.01) {
             addLog({
                id: Math.random().toString(), timestamp, agent: 'Decision', level: 'INFO',
                message: `[决策] Kelly 建议仓位过低 (<1%)，放弃本次交易。`
            });
            return { agents: nextAgents, beliefs: { strategies: currentBeliefs, learningRate: 0.2, lastUpdate: timestamp }, newKnowledge, financial };
        }

        const decision = nextAgents.find(a => a.id === 'DECISION');
        if (decision) decision.status = 'Working';
        
        const topStrategy = Object.entries(currentBeliefs).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0][0];
        
        const exec = nextAgents.find(a => a.id === 'EXECUTION');
        if (exec) exec.status = 'Working';
        
        addLog({
            id: Math.random().toString(), timestamp, agent: 'Execution', level: 'INFO',
            message: `[执行] 按照 Kelly 建议仓位 ${(kellyResult.f*100).toFixed(1)}% 买入 ${targetSymbol}。`
        });

        // 4. PERFORMANCE & UPDATE
        const perf = nextAgents.find(a => a.id === 'PERFORMANCE');
        if (perf) perf.status = 'Optimizing';
        
        const bayes = nextAgents.find(a => a.id === 'BAYESIAN');
        if (bayes) bayes.status = 'Optimizing';

        const winChance = 0.4 + (signalConfidence * 0.2); 
        const win = Math.random() < winChance;
        const baseRisk = 100;
        const pnlAmount = win ? (baseRisk * signalRRatio * (kellyResult.f * 10)) : -(baseRisk * (kellyResult.f * 10));
        const pnlStr = win ? `盈利 (+${pnlAmount.toFixed(0)})` : `亏损 (${pnlAmount.toFixed(0)})`;
        
        financial = {
            pnl: pnlAmount,
            tradeInfo: `${win ? 'WIN' : 'LOSS'}: ${topStrategy} (Kelly)`
        };
        
        const stratKey = topStrategy as keyof typeof currentBeliefs;
        const currentP = currentBeliefs[stratKey];
        const likelihood = win ? 0.6 : 0.4; 
        const evidence = 0.55; 
        const newP = Math.min(0.9, Math.max(0.05, (likelihood * currentP) / evidence));
        
        currentBeliefs[stratKey] = newP;
        
        const total = Object.values(currentBeliefs).reduce((a, b) => a + b, 0);
        Object.keys(currentBeliefs).forEach(k => {
            currentBeliefs[k as keyof typeof currentBeliefs] /= total;
        });

        addLog({
            id: Math.random().toString(), timestamp, agent: 'Bayesian', level: 'INFO',
            message: `[信念更新] 交易结果: ${pnlStr}\n策略 "${topStrategy}" 后验概率调整: ${(currentP*100).toFixed(1)}% -> ${(currentBeliefs[stratKey]*100).toFixed(1)}%`
        });
    }

    return {
        agents: nextAgents,
        beliefs: {
            strategies: currentBeliefs,
            learningRate: 0.2,
            lastUpdate: timestamp
        },
        newKnowledge,
        financial
    };
};
