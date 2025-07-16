import { MetricsCollector, AuthErrorType } from './authMiddleware.improved';

/**
 * Simple in-memory metrics collector
 */
export class InMemoryMetricsCollector implements MetricsCollector {
  private authAttempts: { timestamp: Date; success: boolean; errorType?: AuthErrorType }[] = [];
  private latencies: { timestamp: Date; duration: number }[] = [];
  private maxDataPoints: number;

  constructor(maxDataPoints: number = 10000) {
    this.maxDataPoints = maxDataPoints;
  }

  recordAuthAttempt(success: boolean, errorType?: AuthErrorType): void {
    this.authAttempts.push({
      timestamp: new Date(),
      success,
      errorType
    });

    // Prevent memory leak
    if (this.authAttempts.length > this.maxDataPoints) {
      this.authAttempts.shift();
    }
  }

  recordLatency(duration: number): void {
    this.latencies.push({
      timestamp: new Date(),
      duration
    });

    // Prevent memory leak
    if (this.latencies.length > this.maxDataPoints) {
      this.latencies.shift();
    }
  }

  /**
   * Get authentication metrics for a time window
   */
  getMetrics(windowMinutes: number = 60): AuthMetrics {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const recentAttempts = this.authAttempts.filter(a => a.timestamp > cutoff);
    const recentLatencies = this.latencies.filter(l => l.timestamp > cutoff);

    const totalAttempts = recentAttempts.length;
    const successfulAttempts = recentAttempts.filter(a => a.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;

    const errorBreakdown: Record<string, number> = {};
    recentAttempts
      .filter(a => !a.success && a.errorType)
      .forEach(a => {
        errorBreakdown[a.errorType!] = (errorBreakdown[a.errorType!] || 0) + 1;
      });

    const latencyValues = recentLatencies.map(l => l.duration);
    const avgLatency = latencyValues.length > 0 
      ? latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length 
      : 0;
    
    const p95Latency = this.calculatePercentile(latencyValues, 95);
    const p99Latency = this.calculatePercentile(latencyValues, 99);

    return {
      windowMinutes,
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate: totalAttempts > 0 ? successfulAttempts / totalAttempts : 0,
      errorBreakdown,
      avgLatency,
      p95Latency,
      p99Latency
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.authAttempts = [];
    this.latencies = [];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

/**
 * Prometheus metrics collector implementation
 */
export class PrometheusMetricsCollector implements MetricsCollector {
  private authCounter: any;
  private latencyHistogram: any;

  constructor(prometheus: any) {
    this.authCounter = new prometheus.Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['success', 'error_type']
    });

    this.latencyHistogram = new prometheus.Histogram({
      name: 'auth_latency_seconds',
      help: 'Authentication latency in seconds',
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    });
  }

  recordAuthAttempt(success: boolean, errorType?: AuthErrorType): void {
    this.authCounter.inc({
      success: success.toString(),
      error_type: errorType || 'none'
    });
  }

  recordLatency(duration: number): void {
    this.latencyHistogram.observe(duration / 1000); // Convert to seconds
  }
}

/**
 * StatsD metrics collector implementation
 */
export class StatsDMetricsCollector implements MetricsCollector {
  constructor(private statsdClient: any, private prefix: string = 'auth') {}

  recordAuthAttempt(success: boolean, errorType?: AuthErrorType): void {
    if (success) {
      this.statsdClient.increment(`${this.prefix}.attempts.success`);
    } else {
      this.statsdClient.increment(`${this.prefix}.attempts.failed`);
      if (errorType) {
        this.statsdClient.increment(`${this.prefix}.attempts.failed.${errorType}`);
      }
    }
  }

  recordLatency(duration: number): void {
    this.statsdClient.timing(`${this.prefix}.latency`, duration);
  }
}

/**
 * Authentication metrics interface
 */
export interface AuthMetrics {
  windowMinutes: number;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  errorBreakdown: Record<string, number>;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
}