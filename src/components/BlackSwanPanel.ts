import { Panel } from './Panel';
import { analyze, type BlackSwanSnapshot } from '@/services/black-swan';
import { runBacktest, sweepThresholds, tuneWeights, type BacktestResult } from '@/services/black-swan-backtest';
import { SAMPLES } from '../../data/black-swan-samples';

const DEFAULT_WEIGHTS = {
  marketReturn: 2.0,
  marketVolatility: 1.0,
  newsSurge: 1.5,
  outages: 1.2,
  earthquake: 1.3,
  flightAnomalies: 0.8,
  aisAnomalies: 0.8,
};

export class BlackSwanPanel extends Panel {
  private currentWeights: Record<string, number> = { ...DEFAULT_WEIGHTS };
  private backtestResults: BacktestResult[] = [];
  private liveScore: number | null = null;
  private liveSeverity: string | null = null;

  constructor() {
    super({
      id: 'black-swan',
      title: 'Black Swan Detector',
      showCount: false,
      className: 'black-swan-panel',
    });

    this.render();
  }

  private render(): void {
    const html = `
      <div class="black-swan-container">
        <!-- Live Score Display -->
        <div class="black-swan-live">
          <div class="black-swan-live-label">Current Score</div>
          <div class="black-swan-live-score" id="blackSwanLiveScore">--</div>
          <div class="black-swan-live-severity" id="blackSwanLiveSeverity">No data</div>
        </div>

        <!-- Controls -->
        <div class="black-swan-controls">
          <button id="blackSwanRunBacktest" class="btn btn-sm">Run Backtest</button>
          <button id="blackSwanSweepThresholds" class="btn btn-sm">Sweep Thresholds</button>
          <button id="blackSwanTuneWeights" class="btn btn-sm">Tune Weights</button>
          <button id="blackSwanResetWeights" class="btn btn-sm btn-secondary">Reset Weights</button>
        </div>

        <!-- Current Weights -->
        <div class="black-swan-section">
          <div class="black-swan-section-title">Current Weights</div>
          <div class="black-swan-weights" id="blackSwanWeights"></div>
        </div>

        <!-- Backtest Results -->
        <div class="black-swan-section">
          <div class="black-swan-section-title">Backtest Results</div>
          <div class="black-swan-results" id="blackSwanResults">
            <div class="black-swan-placeholder">Run a backtest to see results</div>
          </div>
        </div>

        <!-- Logs -->
        <div class="black-swan-section">
          <div class="black-swan-section-title">Activity Log</div>
          <div class="black-swan-logs" id="blackSwanLogs"></div>
        </div>
      </div>
    `;

    this.setContent(html);
    this.attachEventListeners();
    this.renderWeights();
  }

  private attachEventListeners(): void {
    const runBacktestBtn = document.getElementById('blackSwanRunBacktest');
    const sweepBtn = document.getElementById('blackSwanSweepThresholds');
    const tuneBtn = document.getElementById('blackSwanTuneWeights');
    const resetBtn = document.getElementById('blackSwanResetWeights');

    runBacktestBtn?.addEventListener('click', () => this.handleRunBacktest());
    sweepBtn?.addEventListener('click', () => this.handleSweepThresholds());
    tuneBtn?.addEventListener('click', () => this.handleTuneWeights());
    resetBtn?.addEventListener('click', () => this.handleResetWeights());
  }

  private log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const logsEl = document.getElementById('blackSwanLogs');
    if (!logsEl) return;

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `black-swan-log-entry black-swan-log-${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;

    logsEl.insertBefore(logEntry, logsEl.firstChild);

    // Keep only last 20 entries
    while (logsEl.children.length > 20) {
      logsEl.removeChild(logsEl.lastChild!);
    }
  }

  private renderWeights(): void {
    const weightsEl = document.getElementById('blackSwanWeights');
    if (!weightsEl) return;

    const html = Object.entries(this.currentWeights)
      .map(([key, value]) => `
        <div class="black-swan-weight-item">
          <span class="weight-name">${key}</span>
          <span class="weight-value">${value.toFixed(2)}</span>
        </div>
      `)
      .join('');

    weightsEl.innerHTML = html;
  }

  private handleRunBacktest(): void {
    this.log('Running backtest...', 'info');
    
    try {
      this.backtestResults = runBacktest(SAMPLES);
      this.renderBacktestResults();
      this.log(`Backtest completed: ${this.backtestResults.length} samples`, 'success');
    } catch (e) {
      this.log(`Backtest failed: ${e}`, 'error');
    }
  }

  private handleSweepThresholds(): void {
    this.log('Sweeping thresholds...', 'info');
    
    try {
      const results = sweepThresholds(SAMPLES);
      this.log(`Threshold sweep completed: ${results.length} thresholds tested`, 'success');
      console.table(results);
    } catch (e) {
      this.log(`Threshold sweep failed: ${e}`, 'error');
    }
  }

  private handleTuneWeights(): void {
    this.log('Tuning weights (500 iterations)...', 'info');
    
    try {
      const result = tuneWeights(SAMPLES, { iterations: 500, scale: 0.4 });
      this.currentWeights = result.weights;
      this.renderWeights();
      this.log(`Weights tuned successfully. Loss: ${result.loss.toFixed(6)}`, 'success');
      
      // Rerun backtest with new weights
      this.handleRunBacktest();
    } catch (e) {
      this.log(`Weight tuning failed: ${e}`, 'error');
    }
  }

  private handleResetWeights(): void {
    this.currentWeights = { ...DEFAULT_WEIGHTS };
    this.renderWeights();
    this.log('Weights reset to defaults', 'info');
    
    // Rerun backtest with default weights
    if (this.backtestResults.length > 0) {
      this.handleRunBacktest();
    }
  }

  private renderBacktestResults(): void {
    const resultsEl = document.getElementById('blackSwanResults');
    if (!resultsEl) return;

    if (this.backtestResults.length === 0) {
      resultsEl.innerHTML = '<div class="black-swan-placeholder">No results yet</div>';
      return;
    }

    const html = `
      <table class="black-swan-results-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Expected</th>
            <th>Score</th>
            <th>Severity</th>
            <th>Match</th>
          </tr>
        </thead>
        <tbody>
          ${this.backtestResults.map(r => {
            const match = r.expectedSeverity === r.severity;
            return `
              <tr class="${match ? 'result-match' : 'result-mismatch'}">
                <td>${r.label}</td>
                <td class="severity-${r.expectedSeverity}">${r.expectedSeverity}</td>
                <td>${r.score.toFixed(3)}</td>
                <td class="severity-${r.severity}">${r.severity}</td>
                <td>${match ? '✓' : '✗'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    resultsEl.innerHTML = html;
  }

  public updateLiveScore(snapshot: BlackSwanSnapshot): void {
    const result = analyze(snapshot, this.currentWeights);
    this.liveScore = result.score;
    this.liveSeverity = result.severity;

    const scoreEl = document.getElementById('blackSwanLiveScore');
    const severityEl = document.getElementById('blackSwanLiveSeverity');

    if (scoreEl) {
      scoreEl.textContent = result.score.toFixed(3);
      scoreEl.className = `black-swan-live-score severity-${result.severity}`;
    }

    if (severityEl) {
      severityEl.textContent = `${result.severity.toUpperCase()} - ${result.reasons.join(', ')}`;
      severityEl.className = `black-swan-live-severity severity-${result.severity}`;
    }

    // Log alerts
    if (result.score >= 0.6) {
      this.log(`ALERT: ${result.severity} (${result.score.toFixed(3)}) - ${result.reasons.join(', ')}`, 'warning');
    }
  }

  public getCurrentWeights(): Record<string, number> {
    return { ...this.currentWeights };
  }
}
