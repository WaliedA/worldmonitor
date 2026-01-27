import { Panel } from './Panel';
import { 
  analyzeUAEEconomy, 
  type UAEAnalysisResult, 
  type UAEEconomicIndicators 
} from '@/services/uae-scenarios';
import { collectUAEIndicators } from '@/services/uae-data-collector';

export class UAEEconomicPanel extends Panel {
  private currentAnalysis: UAEAnalysisResult | null = null;
  private previousIndicators: UAEEconomicIndicators | null = null;
  private isLoading = false;

  constructor() {
    super({
      id: 'uae-economic',
      title: 'UAE Economic Analysis',
      showCount: false,
      className: 'uae-economic-panel',
    });

    this.render();
  }

  private render(): void {
    const html = `
      <div class="uae-economic-container">
        <!-- Summary Section -->
        <div class="uae-summary">
          <div class="uae-summary-text" id="uaeSummary">
            Analyzing UAE economic indicators...
          </div>
          <div class="uae-scores">
            <div class="uae-score-item">
              <div class="uae-score-label">Risk Score</div>
              <div class="uae-score-value" id="uaeRiskScore">--</div>
            </div>
            <div class="uae-score-item">
              <div class="uae-score-label">Opportunity Score</div>
              <div class="uae-score-value" id="uaeOpportunityScore">--</div>
            </div>
          </div>
        </div>

        <!-- Scenarios Section -->
        <div class="uae-section">
          <div class="uae-section-title">Economic Scenarios</div>
          <div class="uae-scenarios" id="uaeScenarios">
            <div class="uae-placeholder">Loading scenarios...</div>
          </div>
        </div>

        <!-- Early Warnings Section -->
        <div class="uae-section">
          <div class="uae-section-title">Early Warning Alerts</div>
          <div class="uae-warnings" id="uaeWarnings">
            <div class="uae-placeholder">No warnings yet</div>
          </div>
        </div>

        <!-- Controls -->
        <div class="uae-controls">
          <button id="uaeRefresh" class="btn btn-sm">
            <span class="btn-icon">🔄</span> Refresh Analysis
          </button>
          <button id="uaeExport" class="btn btn-sm btn-secondary">
            <span class="btn-icon">📊</span> Export Data
          </button>
        </div>

        <!-- Last Updated -->
        <div class="uae-footer">
          <span id="uaeLastUpdate">Last updated: Never</span>
        </div>
      </div>
    `;

    this.setContent(html);
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const refreshBtn = document.getElementById('uaeRefresh');
    const exportBtn = document.getElementById('uaeExport');

    refreshBtn?.addEventListener('click', () => this.handleRefresh());
    exportBtn?.addEventListener('click', () => this.handleExport());
  }

  private async handleRefresh(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    const refreshBtn = document.getElementById('uaeRefresh');
    if (refreshBtn) {
      refreshBtn.textContent = '⟳ Refreshing...';
      (refreshBtn as HTMLButtonElement).disabled = true;
    }

    try {
      await this.updateAnalysis();
    } finally {
      this.isLoading = false;
      if (refreshBtn) {
        refreshBtn.innerHTML = '<span class="btn-icon">🔄</span> Refresh Analysis';
        (refreshBtn as HTMLButtonElement).disabled = false;
      }
    }
  }

  private handleExport(): void {
    if (!this.currentAnalysis) {
      alert('No analysis data to export');
      return;
    }

    const data = {
      timestamp: this.currentAnalysis.timestamp,
      scenarios: this.currentAnalysis.scenarioProbabilities,
      warnings: this.currentAnalysis.earlyWarnings,
      riskScore: this.currentAnalysis.riskScore,
      opportunityScore: this.currentAnalysis.opportunityScore,
      summary: this.currentAnalysis.summary,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uae-economic-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public async updateAnalysis(): Promise<void> {
    try {
      // Collect current indicators
      const indicators = await collectUAEIndicators();

      // Analyze with previous indicators for trend detection
      this.currentAnalysis = analyzeUAEEconomy(indicators, this.previousIndicators || undefined);

      // Store for next comparison
      this.previousIndicators = indicators;

      // Update UI
      this.renderAnalysis();
      this.updateLastUpdateTime();
    } catch (error) {
      console.error('[UAE Economic Panel] Failed to update analysis:', error);
      this.renderError('Failed to update analysis. Please try again.');
    }
  }

  private renderAnalysis(): void {
    if (!this.currentAnalysis) return;

    this.renderSummary();
    this.renderScenarios();
    this.renderWarnings();
  }

  private renderSummary(): void {
    if (!this.currentAnalysis) return;

    const summaryEl = document.getElementById('uaeSummary');
    const riskScoreEl = document.getElementById('uaeRiskScore');
    const opportunityScoreEl = document.getElementById('uaeOpportunityScore');

    if (summaryEl) {
      summaryEl.textContent = this.currentAnalysis.summary;
    }

    if (riskScoreEl) {
      const riskPct = (this.currentAnalysis.riskScore * 100).toFixed(0);
      riskScoreEl.textContent = `${riskPct}%`;
      riskScoreEl.className = `uae-score-value ${this.getRiskClass(this.currentAnalysis.riskScore)}`;
    }

    if (opportunityScoreEl) {
      const oppPct = (this.currentAnalysis.opportunityScore * 100).toFixed(0);
      opportunityScoreEl.textContent = `${oppPct}%`;
      opportunityScoreEl.className = `uae-score-value ${this.getOpportunityClass(this.currentAnalysis.opportunityScore)}`;
    }
  }

  private renderScenarios(): void {
    if (!this.currentAnalysis) return;

    const scenariosEl = document.getElementById('uaeScenarios');
    if (!scenariosEl) return;

    const scenarios = this.currentAnalysis.scenarioProbabilities;
    
    const html = scenarios.map(scenario => {
      const probPct = (scenario.probability * 100).toFixed(1);
      const confPct = (scenario.confidence * 100).toFixed(0);
      const trendIcon = this.getTrendIcon(scenario.trend);
      
      return `
        <div class="uae-scenario-item ${scenario.scenario === this.currentAnalysis?.topScenario ? 'uae-scenario-top' : ''}">
          <div class="uae-scenario-header">
            <div class="uae-scenario-name">${this.formatScenarioName(scenario.scenario)}</div>
            <div class="uae-scenario-trend">${trendIcon}</div>
          </div>
          <div class="uae-scenario-probability">
            <div class="uae-scenario-bar">
              <div class="uae-scenario-bar-fill" style="width: ${probPct}%"></div>
            </div>
            <div class="uae-scenario-pct">${probPct}%</div>
          </div>
          <div class="uae-scenario-meta">
            <span class="uae-scenario-confidence">Confidence: ${confPct}%</span>
            ${scenario.keyDrivers.length > 0 ? `
              <span class="uae-scenario-drivers">
                Key: ${scenario.keyDrivers.slice(0, 2).join(', ')}
              </span>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    scenariosEl.innerHTML = html;
  }

  private renderWarnings(): void {
    if (!this.currentAnalysis) return;

    const warningsEl = document.getElementById('uaeWarnings');
    if (!warningsEl) return;

    const warnings = this.currentAnalysis.earlyWarnings;

    if (warnings.length === 0) {
      warningsEl.innerHTML = '<div class="uae-placeholder uae-placeholder-success">✓ No critical warnings</div>';
      return;
    }

    // Sort by severity
    const sortedWarnings = [...warnings].sort((a, b) => {
      const severityOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
      return severityOrder[a.level] - severityOrder[b.level];
    });

    const html = sortedWarnings.map(warning => `
      <div class="uae-warning-item uae-warning-${warning.level}">
        <div class="uae-warning-header">
          <div class="uae-warning-level">${this.getLevelIcon(warning.level)} ${warning.level.toUpperCase()}</div>
          <div class="uae-warning-indicator">${this.formatIndicatorName(warning.indicator)}</div>
        </div>
        <div class="uae-warning-message">${warning.message}</div>
        <div class="uae-warning-value">
          Current: <strong>${warning.currentValue.toFixed(2)}</strong> 
          | Threshold: ${warning.threshold.toFixed(2)}
        </div>
        <div class="uae-warning-recommendation">
          <span class="uae-warning-rec-label">→</span> ${warning.recommendation}
        </div>
      </div>
    `).join('');

    warningsEl.innerHTML = html;
  }

  private renderError(message: string): void {
    const summaryEl = document.getElementById('uaeSummary');
    if (summaryEl) {
      summaryEl.textContent = message;
      summaryEl.className = 'uae-summary-text uae-error';
    }
  }

  private updateLastUpdateTime(): void {
    const lastUpdateEl = document.getElementById('uaeLastUpdate');
    if (lastUpdateEl && this.currentAnalysis) {
      const time = new Date(this.currentAnalysis.timestamp).toLocaleTimeString();
      lastUpdateEl.textContent = `Last updated: ${time}`;
    }
  }

  private formatScenarioName(scenario: string): string {
    return scenario
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatIndicatorName(indicator: string): string {
    return indicator
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private getTrendIcon(trend: 'rising' | 'stable' | 'falling'): string {
    switch (trend) {
      case 'rising': return '↗';
      case 'falling': return '↘';
      case 'stable': return '→';
    }
  }

  private getLevelIcon(level: string): string {
    switch (level) {
      case 'red': return '🔴';
      case 'orange': return '🟠';
      case 'yellow': return '🟡';
      case 'green': return '🟢';
      default: return '⚪';
    }
  }

  private getRiskClass(score: number): string {
    if (score >= 0.7) return 'risk-critical';
    if (score >= 0.5) return 'risk-high';
    if (score >= 0.3) return 'risk-medium';
    return 'risk-low';
  }

  private getOpportunityClass(score: number): string {
    if (score >= 0.7) return 'opp-high';
    if (score >= 0.5) return 'opp-medium';
    return 'opp-low';
  }

  public getCurrentAnalysis(): UAEAnalysisResult | null {
    return this.currentAnalysis;
  }
}
