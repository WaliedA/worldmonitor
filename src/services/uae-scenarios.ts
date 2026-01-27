/**
 * UAE Economic Scenarios & Early Warning System
 * 
 * Analyzes multiple economic futures for the UAE and provides early warning alerts
 * based on real-time indicators and thresholds.
 */

export type UAEScenario = 
  | 'oil-dependent'
  | 'diversified-growth'
  | 'tech-hub'
  | 'regional-instability'
  | 'climate-crisis';

export type EarlyWarningLevel = 'green' | 'yellow' | 'orange' | 'red';

export interface UAEEconomicIndicators {
  // Oil & Energy
  oilPrice: number; // USD per barrel
  oilProduction: number; // million barrels per day
  gasRevenue: number; // billions USD annually
  renewableCapacity: number; // GW

  // Diversification Metrics
  nonOilGDPShare: number; // percentage (0-100)
  tourismRevenue: number; // billions USD annually
  techSectorGDP: number; // billions USD annually
  manufacturingGDP: number; // billions USD annually

  // Trade & Investment
  fdiInflows: number; // billions USD annually
  exportDiversification: number; // Herfindahl index (0-1, lower = more diversified)
  tradeBalance: number; // billions USD

  // Innovation & Technology
  techStartups: number; // count
  aiInvestment: number; // millions USD
  datacentersCount: number;
  digitalGDPShare: number; // percentage

  // Regional Stability
  geopoliticalRiskIndex: number; // 0-100, higher = more risk
  regionalConflicts: number; // count
  sanctionsImpact: number; // 0-100

  // Climate & Environment
  avgTemperature: number; // celsius
  waterStress: number; // 0-100, higher = more stress
  greenInvestment: number; // billions USD
  carbonEmissions: number; // million tonnes

  // Financial Health
  gdpGrowth: number; // annual percentage
  inflation: number; // annual percentage
  unemployment: number; // percentage
  foreignReserves: number; // billions USD
  debtToGDP: number; // percentage
}

export interface ScenarioProbability {
  scenario: UAEScenario;
  probability: number; // 0-1
  confidence: number; // 0-1
  trend: 'rising' | 'stable' | 'falling';
  keyDrivers: string[];
}

export interface EarlyWarning {
  level: EarlyWarningLevel;
  indicator: string;
  currentValue: number;
  threshold: number;
  message: string;
  recommendation: string;
  timestamp: Date;
}

export interface UAEAnalysisResult {
  timestamp: Date;
  scenarioProbabilities: ScenarioProbability[];
  topScenario: UAEScenario;
  earlyWarnings: EarlyWarning[];
  riskScore: number; // 0-1
  opportunityScore: number; // 0-1
  summary: string;
}

// Scenario definitions with characteristics
const SCENARIO_PROFILES: Record<UAEScenario, {
  name: string;
  description: string;
  positiveIndicators: Array<keyof UAEEconomicIndicators>;
  negativeIndicators: Array<keyof UAEEconomicIndicators>;
}> = {
  'oil-dependent': {
    name: 'Oil-Dependent Path',
    description: 'Economy remains heavily reliant on oil revenues with limited diversification progress',
    positiveIndicators: ['oilPrice', 'oilProduction', 'gasRevenue'],
    negativeIndicators: ['nonOilGDPShare', 'exportDiversification', 'techSectorGDP'],
  },
  'diversified-growth': {
    name: 'Diversified Growth',
    description: 'Successful economic diversification with strong non-oil sectors',
    positiveIndicators: ['nonOilGDPShare', 'tourismRevenue', 'manufacturingGDP', 'fdiInflows', 'gdpGrowth'],
    negativeIndicators: ['oilProduction', 'geopoliticalRiskIndex'],
  },
  'tech-hub': {
    name: 'Technology Hub',
    description: 'UAE becomes a leading regional technology and innovation center',
    positiveIndicators: ['techSectorGDP', 'techStartups', 'aiInvestment', 'datacentersCount', 'digitalGDPShare'],
    negativeIndicators: ['unemployment', 'waterStress'],
  },
  'regional-instability': {
    name: 'Regional Instability',
    description: 'Geopolitical tensions and regional conflicts impact economic stability',
    positiveIndicators: ['geopoliticalRiskIndex', 'regionalConflicts', 'sanctionsImpact'],
    negativeIndicators: ['fdiInflows', 'tourismRevenue', 'gdpGrowth'],
  },
  'climate-crisis': {
    name: 'Climate Crisis Impact',
    description: 'Climate change severely affects water, agriculture, and habitability',
    positiveIndicators: ['avgTemperature', 'waterStress', 'carbonEmissions'],
    negativeIndicators: ['greenInvestment', 'renewableCapacity', 'tourismRevenue'],
  },
};

// Early warning thresholds
const WARNING_THRESHOLDS: Record<string, {
  green: [number, number];
  yellow: [number, number];
  orange: [number, number];
  red: [number, number];
}> = {
  oilPrice: { green: [70, 200], yellow: [50, 70], orange: [30, 50], red: [0, 30] },
  nonOilGDPShare: { green: [60, 100], yellow: [50, 60], orange: [40, 50], red: [0, 40] },
  gdpGrowth: { green: [3, 10], yellow: [1, 3], orange: [-1, 1], red: [-10, -1] },
  inflation: { green: [1, 3], yellow: [3, 5], orange: [5, 8], red: [8, 100] },
  unemployment: { green: [0, 3], yellow: [3, 5], orange: [5, 8], red: [8, 100] },
  geopoliticalRiskIndex: { green: [0, 30], yellow: [30, 50], orange: [50, 70], red: [70, 100] },
  waterStress: { green: [0, 40], yellow: [40, 60], orange: [60, 80], red: [80, 100] },
  debtToGDP: { green: [0, 40], yellow: [40, 60], orange: [60, 80], red: [80, 200] },
  avgTemperature: { green: [20, 35], yellow: [35, 40], orange: [40, 45], red: [45, 60] },
};

function getWarningLevel(indicator: string, value: number): EarlyWarningLevel {
  const thresholds = WARNING_THRESHOLDS[indicator];
  if (!thresholds) return 'green';

  if (value >= thresholds.red[0] && value <= thresholds.red[1]) return 'red';
  if (value >= thresholds.orange[0] && value <= thresholds.orange[1]) return 'orange';
  if (value >= thresholds.yellow[0] && value <= thresholds.yellow[1]) return 'yellow';
  return 'green';
}

function calculateScenarioProbability(
  scenario: UAEScenario,
  indicators: UAEEconomicIndicators
): number {
  const profile = SCENARIO_PROFILES[scenario];
  let score = 0;
  let weight = 0;

  // Score positive indicators
  for (const indicator of profile.positiveIndicators) {
    const value = indicators[indicator];
    if (typeof value === 'number') {
      // Normalize based on typical ranges
      const normalized = normalizeIndicator(indicator, value);
      score += normalized;
      weight += 1;
    }
  }

  // Penalize negative indicators
  for (const indicator of profile.negativeIndicators) {
    const value = indicators[indicator];
    if (typeof value === 'number') {
      const normalized = normalizeIndicator(indicator, value);
      score -= normalized * 0.5; // Negative indicators have half weight
      weight += 0.5;
    }
  }

  return weight > 0 ? Math.max(0, Math.min(1, (score / weight + 1) / 2)) : 0;
}

function normalizeIndicator(indicator: keyof UAEEconomicIndicators, value: number): number {
  // Normalize indicators to -1 to 1 scale based on typical ranges
  const ranges: Record<string, [number, number]> = {
    oilPrice: [20, 150],
    oilProduction: [2, 4],
    nonOilGDPShare: [0, 100],
    gdpGrowth: [-5, 10],
    inflation: [0, 10],
    unemployment: [0, 15],
    geopoliticalRiskIndex: [0, 100],
    waterStress: [0, 100],
    techSectorGDP: [0, 100],
    tourismRevenue: [0, 50],
    avgTemperature: [20, 50],
  };

  const range = ranges[indicator];
  if (!range) return 0;

  const [min, max] = range;
  const normalized = (value - min) / (max - min);
  return Math.max(-1, Math.min(1, normalized * 2 - 1));
}

function calculateTrend(current: number, previous?: number): 'rising' | 'stable' | 'falling' {
  if (!previous) return 'stable';
  const change = (current - previous) / previous;
  if (change > 0.05) return 'rising';
  if (change < -0.05) return 'falling';
  return 'stable';
}

export function analyzeUAEEconomy(
  indicators: UAEEconomicIndicators,
  previousIndicators?: UAEEconomicIndicators
): UAEAnalysisResult {
  const timestamp = new Date();
  
  // Calculate scenario probabilities
  const scenarioProbabilities: ScenarioProbability[] = Object.keys(SCENARIO_PROFILES).map((scenario) => {
    const s = scenario as UAEScenario;
    const probability = calculateScenarioProbability(s, indicators);
    const previousProb = previousIndicators
      ? calculateScenarioProbability(s, previousIndicators)
      : probability;
    
    return {
      scenario: s,
      probability,
      confidence: 0.7, // Default confidence, can be improved with more data
      trend: calculateTrend(probability, previousProb),
      keyDrivers: SCENARIO_PROFILES[s].positiveIndicators
        .filter(ind => {
          const value = indicators[ind];
          return typeof value === 'number' && normalizeIndicator(ind, value) > 0.5;
        })
        .map(String),
    };
  });

  // Sort by probability
  scenarioProbabilities.sort((a, b) => b.probability - a.probability);
  const topScenario = scenarioProbabilities[0]?.scenario || 'diversified-growth';

  // Generate early warnings
  const earlyWarnings: EarlyWarning[] = [];
  
  const criticalIndicators: Array<keyof UAEEconomicIndicators> = [
    'oilPrice',
    'nonOilGDPShare',
    'gdpGrowth',
    'inflation',
    'unemployment',
    'geopoliticalRiskIndex',
    'waterStress',
    'debtToGDP',
    'avgTemperature',
  ];

  for (const indicator of criticalIndicators) {
    const value = indicators[indicator];
    if (typeof value !== 'number') continue;

    const level = getWarningLevel(String(indicator), value);
    if (level === 'yellow' || level === 'orange' || level === 'red') {
      const thresholds = WARNING_THRESHOLDS[String(indicator)];
      if (!thresholds) continue;
      const threshold = thresholds[level];
      
      earlyWarnings.push({
        level,
        indicator: String(indicator),
        currentValue: value,
        threshold: threshold[1],
        message: generateWarningMessage(String(indicator), value, level),
        recommendation: generateRecommendation(String(indicator), level),
        timestamp,
      });
    }
  }

  // Calculate risk and opportunity scores
  const riskScore = Math.max(
    indicators.geopoliticalRiskIndex / 100,
    indicators.waterStress / 100,
    Math.max(0, (8 - indicators.gdpGrowth) / 10)
  );

  const opportunityScore = Math.max(
    indicators.nonOilGDPShare / 100,
    indicators.techSectorGDP / 100,
    indicators.digitalGDPShare / 100
  );

  // Generate summary
  const summary = generateSummary(scenarioProbabilities, earlyWarnings, riskScore, opportunityScore);

  return {
    timestamp,
    scenarioProbabilities,
    topScenario,
    earlyWarnings,
    riskScore,
    opportunityScore,
    summary,
  };
}

function generateWarningMessage(indicator: string, value: number, level: EarlyWarningLevel): string {
  const messages: Record<string, Record<EarlyWarningLevel, string>> = {
    oilPrice: {
      green: 'Oil price stable',
      yellow: 'Oil price approaching concerning levels',
      orange: 'Oil price significantly low, diversification critical',
      red: 'Oil price crisis level - immediate action required',
    },
    nonOilGDPShare: {
      green: 'Diversification on track',
      yellow: 'Diversification progress slowing',
      orange: 'High oil dependency - diversification urgent',
      red: 'Critical oil dependency - economy at risk',
    },
    gdpGrowth: {
      green: 'Healthy economic growth',
      yellow: 'Economic growth slowing',
      orange: 'Economic stagnation detected',
      red: 'Economic contraction - recession risk',
    },
    geopoliticalRiskIndex: {
      green: 'Regional stability maintained',
      yellow: 'Rising geopolitical tensions',
      orange: 'Significant regional instability',
      red: 'Critical security situation',
    },
    waterStress: {
      green: 'Water resources adequate',
      yellow: 'Water stress increasing',
      orange: 'Severe water shortage concerns',
      red: 'Critical water crisis',
    },
  };

  return messages[indicator]?.[level] || `${indicator}: ${value.toFixed(2)} at ${level} level`;
}

function generateRecommendation(indicator: string, level: EarlyWarningLevel): string {
  const recommendations: Record<string, Record<EarlyWarningLevel, string>> = {
    oilPrice: {
      green: 'Continue monitoring oil markets',
      yellow: 'Accelerate economic diversification plans',
      orange: 'Implement diversification initiatives immediately',
      red: 'Emergency economic stabilization measures required',
    },
    nonOilGDPShare: {
      green: 'Maintain diversification momentum',
      yellow: 'Increase investment in non-oil sectors',
      orange: 'Launch major diversification programs',
      red: 'Transform economy away from oil dependency',
    },
    gdpGrowth: {
      green: 'Sustain current policies',
      yellow: 'Stimulate economic activity',
      orange: 'Implement growth acceleration measures',
      red: 'Deploy comprehensive economic stimulus',
    },
    geopoliticalRiskIndex: {
      green: 'Maintain diplomatic engagement',
      yellow: 'Strengthen regional partnerships',
      orange: 'Enhance security preparedness',
      red: 'Activate crisis management protocols',
    },
    waterStress: {
      green: 'Continue water conservation efforts',
      yellow: 'Expand desalination capacity',
      orange: 'Implement water emergency measures',
      red: 'Deploy all water security resources',
    },
  };

  return recommendations[indicator]?.[level] || 'Monitor situation closely';
}

function generateSummary(
  scenarios: ScenarioProbability[],
  warnings: EarlyWarning[],
  riskScore: number,
  opportunityScore: number
): string {
  const topScenario = scenarios[0];
  if (!topScenario) {
    return 'Insufficient data for analysis.';
  }
  
  const criticalWarnings = warnings.filter(w => w.level === 'red' || w.level === 'orange').length;
  
  let summary = `Primary scenario: ${SCENARIO_PROFILES[topScenario.scenario].name} (${(topScenario.probability * 100).toFixed(0)}% probability, ${topScenario.trend}). `;
  
  if (criticalWarnings > 0) {
    summary += `${criticalWarnings} critical warning(s) detected. `;
  } else {
    summary += 'No critical warnings. ';
  }
  
  summary += `Risk score: ${(riskScore * 100).toFixed(0)}%, Opportunity score: ${(opportunityScore * 100).toFixed(0)}%.`;
  
  return summary;
}

// Demo function for testing
export function demoUAEAnalysis(): UAEAnalysisResult {
  const mockIndicators: UAEEconomicIndicators = {
    oilPrice: 75,
    oilProduction: 3.2,
    gasRevenue: 45,
    renewableCapacity: 5,
    nonOilGDPShare: 55,
    tourismRevenue: 25,
    techSectorGDP: 18,
    manufacturingGDP: 35,
    fdiInflows: 12,
    exportDiversification: 0.35,
    tradeBalance: 15,
    techStartups: 1200,
    aiInvestment: 850,
    datacentersCount: 15,
    digitalGDPShare: 12,
    geopoliticalRiskIndex: 45,
    regionalConflicts: 2,
    sanctionsImpact: 25,
    avgTemperature: 38,
    waterStress: 65,
    greenInvestment: 8,
    carbonEmissions: 200,
    gdpGrowth: 3.5,
    inflation: 2.8,
    unemployment: 2.5,
    foreignReserves: 140,
    debtToGDP: 35,
  };

  return analyzeUAEEconomy(mockIndicators);
}
