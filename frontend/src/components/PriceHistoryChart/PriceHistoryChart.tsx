import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../../utils/api';
import styles from './PriceHistoryChart.module.scss';

interface PricePoint {
  id: string;
  productId: string;
  retailer: string;
  price: number;
  currency: string;
  recordedAt: string;
}

interface PriceHistoryChartProps {
  productId: string;
  productName?: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function PriceHistoryChart({ productId, productName }: PriceHistoryChartProps) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<PricePoint[]>(`/price-history/${productId}?currency=${currency}&months=6`)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [productId, currency]);

  const chartData = data.map((point) => ({
    date: new Date(point.recordedAt).getTime(),
    price: point.price,
    retailer: point.retailer,
  }));

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  const minPrice = chartData.length > 0 ? Math.min(...chartData.map((d) => d.price)) : 0;
  const maxPrice = chartData.length > 0 ? Math.max(...chartData.map((d) => d.price)) : 0;
  const pricePadding = (maxPrice - minPrice) * 0.1 || 10;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>Price History</h3>
          {productName && <span className={styles.productLabel}>{productName}</span>}
        </div>
        <div className={styles.currencySwitch}>
          {CURRENCIES.map((c) => (
            <button
              key={c}
              className={`${styles.currencyBtn} ${currency === c ? styles.active : ''}`}
              onClick={() => setCurrency(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chartWrapper}>
        {loading ? (
          <div className={styles.loadingState}>Loading price data…</div>
        ) : chartData.length === 0 ? (
          <div className={styles.emptyState}>No price history available</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FFA3" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#00FFA3" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1E1E2A"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts: number) => {
                  const d = new Date(ts);
                  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
                }}
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11, fill: '#7878A0' }}
                axisLine={{ stroke: '#1E1E2A' }}
                tickLine={{ stroke: '#1E1E2A' }}
              />
              <YAxis
                domain={[minPrice - pricePadding, maxPrice + pricePadding]}
                tickFormatter={(val: number) => `${symbol}${val.toFixed(0)}`}
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11, fill: '#7878A0' }}
                axisLine={{ stroke: '#1E1E2A' }}
                tickLine={{ stroke: '#1E1E2A' }}
                width={65}
              />
              <Tooltip content={<PriceTooltip symbol={symbol} />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#00FFA3"
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: '#00FFA3',
                  strokeWidth: 2,
                  fill: '#0C0C14',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {chartData.length > 0 && (
        <div className={styles.stats}>
          <StatBadge label="LOW" value={`${symbol}${minPrice.toFixed(2)}`} />
          <StatBadge label="HIGH" value={`${symbol}${maxPrice.toFixed(2)}`} />
          <StatBadge
            label="CURRENT"
            value={`${symbol}${chartData[chartData.length - 1].price.toFixed(2)}`}
            accent
          />
        </div>
      )}
    </div>
  );
}

interface PriceTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { date: number; price: number; retailer: string } }>;
  symbol: string;
}

function PriceTooltip({ active, payload, symbol }: PriceTooltipProps) {
  if (!active || !payload?.length) return null;
  const { date, price, retailer } = payload[0].payload;
  const d = new Date(date);

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>
        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
      <div className={styles.tooltipPrice}>{symbol}{price.toFixed(2)}</div>
      {retailer && <div className={styles.tooltipRetailer}>{retailer}</div>}
    </div>
  );
}

function StatBadge({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`${styles.statBadge} ${accent ? styles.statAccent : ''}`}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
