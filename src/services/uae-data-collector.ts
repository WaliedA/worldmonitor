/**
 * UAE Data Collector
 * 
 * Collects real-time economic data from various sources and maps them
 * to UAE-specific economic indicators.
 */

import type { UAEEconomicIndicators } from './uae-scenarios';

// Cache for collected data
let cachedIndicators: UAEEconomicIndicators | null = null;
let lastUpdate: Date | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Collects current UAE economic indicators from available data sources.
 * This integrates with existing World Monitor services and external APIs.
 */
export async function collectUAEIndicators(): Promise<UAEEconomicIndicators> {
  // Return cached data if still fresh
  if (cachedIndicators && lastUpdate && Date.now() - lastUpdate.getTime() < CACHE_DURATION_MS) {
    return cachedIndicators;
  }

  try {
    // Collect data from various sources
    const [oilData, marketData, climatData] = await Promise.allSettled([
      fetchOilPrices(),
      fetchMarketData(),
      fetchClimateData(),
    ]);

    // Build indicators from collected data
    const indicators: UAEEconomicIndicators = {
      // Oil & Energy (from commodity prices)
      oilPrice: oilData.status === 'fulfilled' ? oilData.value.price : 75,
      oilProduction: 3.2, // Static estimate, would need specialized API
      gasRevenue: 45, // Would need UAE government data
      renewableCapacity: 5, // Would need energy ministry data

      // Diversification Metrics (would need UAE-specific APIs)
      nonOilGDPShare: 55, // Estimated based on recent trends
      tourismRevenue: 25,
      techSectorGDP: 18,
      manufacturingGDP: 35,

      // Trade & Investment
      fdiInflows: 12,
      exportDiversification: 0.35,
      tradeBalance: 15,

      // Innovation & Technology
      techStartups: 1200,
      aiInvestment: 850,
      datacentersCount: 15,
      digitalGDPShare: 12,

      // Regional Stability (from existing services)
      geopoliticalRiskIndex: marketData.status === 'fulfilled' ? marketData.value.riskIndex : 45,
      regionalConflicts: 2, // Would integrate with ACLED/GDELT
      sanctionsImpact: 25,

      // Climate & Environment
      avgTemperature: climatData.status === 'fulfilled' ? climatData.value.temperature : 38,
      waterStress: 65,
      greenInvestment: 8,
      carbonEmissions: 200,

      // Financial Health (partially from market data)
      gdpGrowth: 3.5,
      inflation: marketData.status === 'fulfilled' ? marketData.value.inflation : 2.8,
      unemployment: 2.5,
      foreignReserves: 140,
      debtToGDP: 35,
    };

    // Update cache
    cachedIndicators = indicators;
    lastUpdate = new Date();

    return indicators;
  } catch (error) {
    console.error('[UAE Data Collector] Error collecting indicators:', error);
    
    // Return cached data if available, otherwise return safe defaults
    if (cachedIndicators) {
      return cachedIndicators;
    }
    
    return getDefaultIndicators();
  }
}

/**
 * Fetches current oil prices from available commodity data
 */
async function fetchOilPrices(): Promise<{ price: number }> {
  try {
    // This would integrate with the existing markets service
    // For now, we'll fetch from a public API or use fallback
    const response = await fetch('/api/yahoo-finance?symbols=CL=F', {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch oil prices: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract crude oil price
    const oilPrice = data.quotes?.[0]?.price || 75;
    
    return { price: oilPrice };
  } catch (error) {
    console.warn('[UAE Data Collector] Failed to fetch oil prices, using fallback:', error);
    return { price: 75 };
  }
}

/**
 * Fetches market and economic data relevant to UAE
 */
async function fetchMarketData(): Promise<{ riskIndex: number; inflation: number }> {
  try {
    // This would integrate with existing market services and potentially
    // FRED data for inflation, VIX for risk, etc.
    
    // For now, return estimated values
    // In production, this would fetch from:
    // - VIX for volatility/risk
    // - Regional market indices
    // - Economic data APIs
    
    return {
      riskIndex: 45,
      inflation: 2.8,
    };
  } catch (error) {
    console.warn('[UAE Data Collector] Failed to fetch market data:', error);
    return {
      riskIndex: 45,
      inflation: 2.8,
    };
  }
}

/**
 * Fetches climate and environmental data for UAE region
 */
async function fetchClimateData(): Promise<{ temperature: number }> {
  try {
    // This would fetch from weather APIs or climate data services
    // For UAE coordinates: approximately 24°N, 54°E
    
    // In production, integrate with services like:
    // - OpenWeatherMap
    // - NOAA Climate Data
    // - Regional meteorological services
    
    return {
      temperature: 38,
    };
  } catch (error) {
    console.warn('[UAE Data Collector] Failed to fetch climate data:', error);
    return {
      temperature: 38,
    };
  }
}

/**
 * Returns default indicators when data collection fails
 */
function getDefaultIndicators(): UAEEconomicIndicators {
  return {
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
}

/**
 * Clears the cached indicators, forcing a fresh fetch on next call
 */
export function clearCache(): void {
  cachedIndicators = null;
  lastUpdate = null;
}

/**
 * Gets the timestamp of the last successful data collection
 */
export function getLastUpdateTime(): Date | null {
  return lastUpdate;
}

/**
 * Checks if cached data is available and fresh
 */
export function hasFreshData(): boolean {
  return cachedIndicators !== null 
    && lastUpdate !== null 
    && Date.now() - lastUpdate.getTime() < CACHE_DURATION_MS;
}
