import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Cpu, Database, Activity, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { api } from '../services/api';
import type { ProxyStats, ProxyConfigData } from '../types/api';
import { formatNumber, formatBytes, calculateHitRate } from '../utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<ProxyStats | null>(null);
  const [config, setConfig] = useState<ProxyConfigData | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [s, c] = await Promise.all([api.getStats(), api.getConfig()]);
      setStats(s);
      setConfig(c);
      
      setHistory(prev => {
        const now = new Date().toLocaleTimeString('en-US', { hour12: false });
        const newPoint = {
          time: now,
          l1Hits: s.cache.l1.hits,
          l2Hits: s.cache.l2.hits,
          requests: s.totalRequests
        };
        const next = [...prev, newPoint];
        return next.length > 20 ? next.slice(-20) : next;
      });
    } catch (e) {
      console.error("Failed to load metrics", e);
    }
  };

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 3000);
    return () => clearInterval(t);
  }, []);

  if (!stats || !config) return <div className="p-10 text-center text-gray-500">Connecting to Proxy...</div>;

  const totalSavings = stats.cache.l1.tokenSavings + stats.cache.l2.tokenSavings;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <Cpu className="w-8 h-8 text-blue-600" />
            MCP Context Optimizer
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <span className="flex w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live Metrics &bull; Uptime: {Math.floor(stats.uptime / 60)}m {stats.uptime % 60}s
          </p>
        </div>
        <div className="flex gap-4">
          <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
            <CardContent className="p-4 flex flex-col items-center">
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Token Savings</span>
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                <Zap className="inline w-5 h-5 mr-1 pb-1" />
                {formatNumber(totalSavings)}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">L1 Cache (Memory)</CardTitle>
            <Activity className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{calculateHitRate(stats.cache.l1.hits, stats.cache.l1.misses)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {formatNumber(stats.cache.l1.hits)} hits &bull; {stats.cache.l1.items} items &bull; {formatBytes(stats.cache.l1.size)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">L2 Cache (SQLite)</CardTitle>
            <Database className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{calculateHitRate(stats.cache.l2.hits, stats.cache.l2.misses)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {formatNumber(stats.cache.l2.hits)} hits &bull; {stats.cache.l2.items} items &bull; {formatBytes(stats.cache.l2.size)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Network IO</CardTitle>
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totalRequests)}</div>
            <p className="text-xs text-gray-500 mt-1">
               {stats.activeRequests} active &bull; Total processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Circuit Breaker</CardTitle>
            {config.circuitBreakerEnabled ? <Shield className="w-4 h-4 text-green-500" /> : <ShieldAlert className="w-4 h-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {config.circuitBreakerEnabled ? "Protected" : "Disabled"}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Active defense mechanisms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>RPC Traffic & Cache Hits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorL1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.5rem' }} 
                  itemStyle={{ color: '#f3f4f6' }}
                />
                <Area type="monotone" dataKey="requests" stroke="#9ca3af" fillOpacity={1} fill="url(#colorReq)" name="Total RPC" />
                <Area type="monotone" dataKey="l1Hits" stroke="#3b82f6" fillOpacity={1} fill="url(#colorL1)" name="L1 Hits" />
                <Area type="monotone" dataKey="l2Hits" stroke="#10b981" fillOpacity={0.1} name="L2 Hits" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
