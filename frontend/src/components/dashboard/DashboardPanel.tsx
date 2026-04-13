import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
  AreaChart, Area,
  Treemap,
} from 'recharts';
import { useSessionStore } from '../../store/sessionStore';
import { api } from '../../services/api';

interface ChartCard {
  id: string;
  title: string;
  type: string;
  data?: { name: string; value: number }[];
  value?: string | number;
  subtitle?: string;
  center_stat?: string;
  sparkline?: number[];
}

// --- Chart color system ---
const COLORS = [
  '#3A5F8A', // steel slate (primary)
  '#5E7D5F', // sage green (secondary)
  '#6B93B5', // mid blue
  '#9BBAD1', // light blue
  '#C5D9E8', // pale blue
  '#B5705A', // terracotta (accent / negative)
  '#D4A574', // warm sand
  '#8B6F5C', // brown
];
const GRID_STROKE = 'rgba(212,207,200,0.5)';
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #D6D2CC', background: '#EDEAE4' };

// --- Metric Card with sparkline ---
function MetricCard({ card }: { card: ChartCard }) {
  const spark = card.sparkline;
  return (
    <div className="bg-surface rounded-xl border border-warm-border p-5 shadow-sm flex flex-col justify-between min-h-[120px]">
      <p className="text-[11px] text-muted uppercase tracking-wide mb-1 font-mono">{card.title}</p>
      <p className="text-3xl font-bold text-navy font-display leading-tight">{card.value}</p>
      {card.subtitle && <p className="text-xs text-muted mt-0.5">{card.subtitle}</p>}
      {spark && spark.length > 1 && (
        <div className="mt-2 -mx-1">
          <ResponsiveContainer width="100%" height={32}>
            <LineChart data={spark.map((v, i) => ({ i, v }))}>
              <Line type="monotone" dataKey="v" stroke="#3A5F8A" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// --- Donut chart with center stat ---
function DonutChartCard({ card }: { card: ChartCard }) {
  const data = card.data || [];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-surface rounded-xl border border-warm-border p-5 shadow-sm">
      <p className="text-[11px] text-muted uppercase tracking-wide mb-3 font-mono">{card.title}</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            paddingAngle={2}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
            style={{ fontSize: 11 }}
          >
            {data.map((_entry, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {/* Center stat */}
          <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 22, fontWeight: 700, fill: '#1B2D50', fontFamily: 'Fraunces, Georgia, serif' }}>
            {card.center_stat ?? total.toLocaleString()}
          </text>
          <text x="50%" y="60%" textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 10, fill: '#7A8696', fontFamily: 'DM Mono, monospace' }}>
            {card.subtitle ?? 'total'}
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Horizontal bar chart (sorted desc, value labels, themed colors) ---
function HorizontalBarCard({ card }: { card: ChartCard }) {
  const data = [...(card.data || [])].sort((a, b) => a.value - b.value); // ascending for horizontal
  const barHeight = Math.max(180, data.length * 32);
  return (
    <div className="bg-surface rounded-xl border border-warm-border p-5 shadow-sm">
      <p className="text-[11px] text-muted uppercase tracking-wide mb-3 font-mono">{card.title}</p>
      <ResponsiveContainer width="100%" height={barHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
          <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}
            label={{ position: 'right', fontSize: 10, fill: '#7A8696' }}
          >
            {data.map((_entry, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Treemap ---
const TreemapContent = (props: { x: number; y: number; width: number; height: number; name: string; value: number; index: number }) => {
  const { x, y, width, height, name, value, index } = props;
  if (width < 30 || height < 25) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4}
        fill={COLORS[index % COLORS.length]} fillOpacity={0.85} stroke="#EDEAE4" strokeWidth={2} />
      {width > 50 && height > 35 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle"
            style={{ fontSize: 11, fill: '#fff', fontWeight: 500 }}>
            {name.length > width / 8 ? name.slice(0, Math.floor(width / 8)) + '…' : name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle"
            style={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)', fontFamily: 'DM Mono, monospace' }}>
            {value}
          </text>
        </>
      )}
    </g>
  );
};

function TreemapCard({ card }: { card: ChartCard }) {
  const data = card.data || [];
  return (
    <div className="bg-surface rounded-xl border border-warm-border p-5 shadow-sm">
      <p className="text-[11px] text-muted uppercase tracking-wide mb-3 font-mono">{card.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <Treemap
          data={data}
          dataKey="value"
          stroke="#EDEAE4"
          content={<TreemapContent x={0} y={0} width={0} height={0} name="" value={0} index={0} />}
        />
      </ResponsiveContainer>
    </div>
  );
}

// --- Line chart ---
function LineChartCard({ card }: { card: ChartCard }) {
  const data = card.data || [];
  return (
    <div className="bg-surface rounded-xl border border-warm-border p-5 shadow-sm">
      <p className="text-[11px] text-muted uppercase tracking-wide mb-3 font-mono">{card.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="value" stroke="#3A5F8A" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Area chart ---
function AreaChartCard({ card }: { card: ChartCard }) {
  const data = card.data || [];
  return (
    <div className="bg-surface rounded-xl border border-warm-border p-5 shadow-sm">
      <p className="text-[11px] text-muted uppercase tracking-wide mb-3 font-mono">{card.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="value" fill="#3A5F8A" fillOpacity={0.12} stroke="#3A5F8A" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Card renderer ---
function ChartCardRenderer({ card }: { card: ChartCard }) {
  switch (card.type) {
    case 'metric':
      return <MetricCard card={card} />;
    case 'horizontal_bar':
      return <HorizontalBarCard card={card} />;
    case 'donut':
    case 'pie':
      return <DonutChartCard card={card} />;
    case 'treemap':
      return <TreemapCard card={card} />;
    case 'line':
      return <LineChartCard card={card} />;
    case 'area':
      return <AreaChartCard card={card} />;
    default:
      return <HorizontalBarCard card={card} />;
  }
}

export function DashboardPanel() {
  const { session } = useSessionStore();
  const [analytics, setAnalytics] = useState<{ domain: string; cards: ChartCard[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(() => {
    if (!session) return;
    setLoading(true);
    setError(null);
    api.getAnalytics(session.id)
      .then((data) => setAnalytics(data as { domain: string; cards: ChartCard[] }))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [session?.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-muted">
          <div className="w-5 h-5 border-2 border-steel border-t-transparent rounded-full animate-spin" />
          Computing analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-sm text-red-600 mb-2">Failed to load analytics</p>
          <p className="text-xs text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-pill flex items-center justify-center">
            <svg className="w-6 h-6 text-steel" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-navy mb-1">Analytics Dashboard</h2>
          <p className="text-sm text-muted">No analytics data available yet.</p>
        </div>
      </div>
    );
  }

  const metricCards = analytics.cards.filter(c => c.type === 'metric');
  const chartCards = analytics.cards.filter(c => c.type !== 'metric');

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
        {/* Domain header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider font-mono">
              {analytics.domain} Analytics
            </span>
            <span className="text-xs text-warm-border">·</span>
            <span className="text-xs text-muted font-mono">{analytics.cards.length} cards</span>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted hover:text-navy-mid bg-cream border border-warm-border rounded-lg hover:bg-surface transition-colors disabled:opacity-50 font-mono"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Metric cards row */}
        {metricCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {metricCards.map(card => (
              <ChartCardRenderer key={card.id} card={card} />
            ))}
          </div>
        )}

        {/* Chart cards grid */}
        {chartCards.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {chartCards.map(card => (
              <ChartCardRenderer key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
