import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  RefreshCw,
  Server,
  Shield,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { api } from '../services/api';
import type { AdminStatsResponse, CircuitBreakerStats } from '../types/api';

const formatNumber = (value: number): string => new Intl.NumberFormat().format(value);

const formatTimestamp = (value: string): string => {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleTimeString();
};

const getCircuitStateClass = (state: CircuitBreakerStats['state']): string => {
  switch (state) {
    case 'CLOSED':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'HALF_OPEN':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'OPEN':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
  }
};

const getCircuitStateIcon = (state: CircuitBreakerStats['state']) => {
  switch (state) {
    case 'CLOSED':
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    case 'HALF_OPEN':
      return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    case 'OPEN':
      return <XCircle className="h-4 w-4 text-red-400" />;
  }
};

export default function Dashboard() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    setRefreshing(true);
    try {
      const nextStats = await api.fetchStats();
      setStats(nextStats);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  const clearSecurityHistory = useCallback(async () => {
    setRefreshing(true);
    try {
      await api.clearSecurityEvents();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear security events');
    } finally {
      setRefreshing(false);
    }
  }, [loadStats]);

  useEffect(() => {
    loadStats();
    const interval = window.setInterval(loadStats, 5000);
    return () => window.clearInterval(interval);
  }, [loadStats]);

  if (initialLoading && !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-400" />
          <p className="text-sm text-gray-400">Loading Toolwall stats...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
        <Card className="w-full max-w-md border-red-900/60 bg-red-950/20">
          <CardContent className="p-6 text-center">
            <XCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
            <h1 className="mb-2 text-xl font-semibold text-red-300">Stats unavailable</h1>
            <p className="text-sm text-gray-400">{error ?? 'Unable to connect to Admin API'}</p>
            <button
              className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              disabled={refreshing}
              onClick={loadStats}
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cache = stats.cache;
  const webhook = stats.webhook;
  const webhookActive = webhook.configured;
  const webhookStatusClass = webhookActive
    ? 'border-green-500/20 bg-green-500/10 text-green-300'
    : 'border-gray-700 bg-gray-800/80 text-gray-400';
  const webhookStatusLabel = webhookActive ? 'ACTIVE' : 'INACTIVE';
  const circuitSummary = stats.circuitBreakers.reduce<Record<CircuitBreakerStats['state'], number>>(
    (summary, breaker) => {
      summary[breaker.state] += 1;
      return summary;
    },
    { CLOSED: 0, HALF_OPEN: 0, OPEN: 0 },
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <header className="flex flex-col gap-4 border-b border-gray-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold">Toolwall Dashboard</h1>
              <p className="text-sm text-gray-400">Live Admin API statistics from the proxy core</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-green-400">
              Connected
            </span>
            <span>Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'never'}</span>
            <button
              className="rounded-lg border border-gray-800 p-2 text-gray-300 transition hover:bg-gray-900 disabled:opacity-60"
              disabled={refreshing}
              onClick={loadStats}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-300">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <main className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <Card className="border-gray-800 bg-gray-900/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-blue-400" />
                Throughput
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">HTTP</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {formatNumber(stats.throughput.httpRequestsTotal)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">/mcp requests</p>
                </div>
                <div className="rounded-lg bg-gray-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Stdio</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {formatNumber(stats.throughput.stdioRequestsTotal)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">JSON-RPC requests</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-950/50 p-3 text-sm">
                <span className="flex items-center gap-2 text-gray-400">
                  <Server className="h-4 w-4" />
                  Registered HTTP routes
                </span>
                <span className="font-semibold text-white">{formatNumber(stats.routes)}</span>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-gray-800 bg-gray-900/70 ${
              webhookActive ? 'shadow-[0_0_28px_rgba(34,197,94,0.08)]' : ''
            }`}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <Activity className={`h-5 w-5 ${webhookActive ? 'text-green-400' : 'text-gray-500'}`} />
                  Webhook Alerts
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${webhookStatusClass}`}>
                  {webhookStatusLabel}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-gray-950/70 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Security incidents alerted</p>
                <p className={`mt-2 text-3xl font-bold ${webhookActive ? 'text-green-300' : 'text-gray-300'}`}>
                  {formatNumber(webhook.alertsTriggeredTotal)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {webhookActive ? 'Dispatched to MCP_WEBHOOK_URL' : 'Set MCP_WEBHOOK_URL to enable dispatch'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-500">Failures</p>
                  <p className="mt-1 text-xl font-semibold text-red-200">
                    {formatNumber(webhook.dispatchFailuresTotal)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-950/60 p-3">
                  <p className="text-xs text-gray-500">Last dispatch</p>
                  <p className="mt-1 truncate text-sm font-medium text-gray-200">
                    {webhook.lastDispatchAt ? formatTimestamp(webhook.lastDispatchAt) : 'Never'}
                  </p>
                </div>
              </div>
              {webhook.lastFailureAt && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                  Last delivery failure: {formatTimestamp(webhook.lastFailureAt)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-gray-900/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-purple-400" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-lg bg-gray-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">AST Egress</p>
                  <p className="mt-2 text-2xl font-bold text-purple-300">
                    {formatNumber(stats.security.astEgressFilterTriggersTotal)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">ShadowLeak</p>
                  <p className="mt-2 text-2xl font-bold text-red-300">
                    {formatNumber(stats.security.shadowLeakDetectionsTotal)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Blocked</p>
                  <p className="mt-2 text-2xl font-bold text-amber-300">
                    {formatNumber(stats.security.blockedRequestsTotal)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-300">Blocked codes</p>
                {stats.blockedRequests.byCode.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.blockedRequests.byCode.map((item) => (
                      <span
                        className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-200"
                        key={item.code}
                      >
                        {item.code}: {formatNumber(item.count)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No blocked requests recorded</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-gray-900/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-5 w-5 text-green-400" />
                Infrastructure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-300">Cache</p>
                  <span className="text-xs text-gray-500">
                    Hit ratio: {cache ? `${(cache.hitRatio * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-950/70 p-3">
                    <p className="text-xs text-gray-500">L1 hits</p>
                    <p className="text-xl font-semibold">{formatNumber(cache?.hits.l1 ?? 0)}</p>
                    <p className="text-xs text-gray-600">{formatNumber(cache?.l1.size ?? 0)} entries</p>
                  </div>
                  <div className="rounded-lg bg-gray-950/70 p-3">
                    <p className="text-xs text-gray-500">L2 hits</p>
                    <p className="text-xl font-semibold">{formatNumber(cache?.hits.l2 ?? 0)}</p>
                    <p className="text-xs text-gray-600">{formatNumber(cache?.l2.entries ?? 0)} entries</p>
                  </div>
                  <div className="rounded-lg bg-gray-950/70 p-3">
                    <p className="text-xs text-gray-500">Total hits</p>
                    <p className="text-xl font-semibold">{formatNumber(cache?.hits.total ?? 0)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-950/70 p-3">
                    <p className="text-xs text-gray-500">Misses</p>
                    <p className="text-xl font-semibold">{formatNumber(cache?.misses ?? 0)}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-300">Circuit Breakers</p>
                  <span className="text-xs text-gray-500">{formatNumber(stats.circuitBreakers.length)} total</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-2 text-green-300">
                    CLOSED {formatNumber(circuitSummary.CLOSED)}
                  </div>
                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2 text-yellow-300">
                    HALF {formatNumber(circuitSummary.HALF_OPEN)}
                  </div>
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300">
                    OPEN {formatNumber(circuitSummary.OPEN)}
                  </div>
                </div>
                {stats.circuitBreakers.length > 0 ? (
                  <div className="max-h-40 space-y-2 overflow-auto pr-1">
                    {stats.circuitBreakers.map((breaker) => (
                      <div className="flex items-center justify-between rounded-lg bg-gray-950/60 p-3" key={breaker.name}>
                        <div className="flex min-w-0 items-center gap-2">
                          {getCircuitStateIcon(breaker.state)}
                          <span className="truncate text-sm text-gray-200">{breaker.name}</span>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${getCircuitStateClass(breaker.state)}`}>
                          {breaker.state} · {formatNumber(breaker.failures)} failures
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No circuit breakers reported</p>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-300">Gateway Targets</p>
                  <span className="text-xs text-gray-500">{formatNumber(stats.targetStatuses.length)} configured</span>
                </div>
                {stats.targetStatuses.length > 0 ? (
                  <div className="max-h-40 space-y-2 overflow-auto pr-1">
                    {stats.targetStatuses.map((target) => (
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-950/60 p-3" key={target.name}>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-200">{target.name}</p>
                          <p className="text-xs text-gray-500">:{target.port}</p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${
                            target.status === 'online'
                              ? 'border-green-500/20 bg-green-500/10 text-green-300'
                              : 'border-red-500/20 bg-red-500/10 text-red-300'
                          }`}
                          title={target.reason}
                        >
                          {target.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No gateway targets configured</p>
                )}
              </section>
            </CardContent>
          </Card>
        </main>

        <Card className="border-gray-800 bg-gray-900/70">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Recent Security Events
              </CardTitle>
              <button
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                disabled={refreshing || stats.securityEvents.length === 0}
                onClick={clearSecurityHistory}
              >
                Clear History
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.securityEvents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Time</th>
                      <th className="pb-3 pr-4 font-medium">Tool</th>
                      <th className="pb-3 pr-4 font-medium">Reason</th>
                      <th className="pb-3 font-medium">Snippet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {stats.securityEvents.map((event, index) => (
                      <tr key={`${event.timestamp}-${event.tool}-${index}`}>
                        <td className="whitespace-nowrap py-3 pr-4 text-gray-400">{formatTimestamp(event.timestamp)}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200">
                            {event.tool}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-red-200">{event.reason}</td>
                        <td className="max-w-xl truncate py-3 text-gray-400">{event.snippet}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No recent security events recorded</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
