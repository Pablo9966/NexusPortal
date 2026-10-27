import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui';
import { STATUS_META } from '@/domain/constants';
import type { Offer } from '@/domain/types';
import { monthlySeries, statusDistribution } from './stats';
import { useMemo, type ReactNode } from 'react';

const tooltipStyle = { fontSize: 13, borderRadius: 12, border: '1px solid #DADADA', boxShadow: '0 8px 24px -12px rgba(0,0,0,.2)' };
const axisTick = { fontSize: 12, fill: '#808080' };

function ChartCard({ title, subtitle, children, legend }: { title: string; subtitle: string; children: ReactNode; legend?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-xs text-ink-muted">{subtitle}</p>
        </div>
        {legend}
      </div>
      <div className="h-[13.125rem]">{children}</div>
    </Card>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-[0.6875rem] text-ink-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export function DashboardCharts({ offers }: { offers: Offer[] }) {
  const monthly = useMemo(() => monthlySeries(offers), [offers]);
  const dist = useMemo(() => statusDistribution(offers), [offers]);
  const total = dist.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title="Statusverteilung" subtitle={`${total} Offerten`}>
        <div className="flex h-full items-center gap-4">
          <div className="relative h-full flex-1">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dist} dataKey="value" nameKey="status" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                  {dist.map((d) => (
                    <Cell key={d.status} fill={STATUS_META[d.status].chart} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _n, p) => [`${v} Offerten`, STATUS_META[p.payload.status as keyof typeof STATUS_META].label]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-serif text-2xl font-semibold">{total}</div>
              <div className="text-[0.6875rem] text-ink-muted">Total</div>
            </div>
          </div>
          <ul className="space-y-1.5 text-xs">
            {dist.map((d) => (
              <li key={d.status} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[d.status].chart }} />
                <span className="w-20 text-ink-soft">{STATUS_META[d.status].label}</span>
                <span className="tabular-nums font-medium">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      <ChartCard title="Offerten pro Monat" subtitle="Letzte 12 Monate" legend={<Legend items={[['Total', '#DADADA'], ['Contracted', '#D82034'], ['Declined', '#3A3A3A']]} />}>
        <ResponsiveContainer>
          <BarChart data={monthly} barGap={2} margin={{ left: -24, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} stroke="#EFEDEA" />
            <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F6F5F3' }} />
            <Bar dataKey="total" name="Total" fill="#DADADA" radius={[4, 4, 0, 0]} />
            <Bar dataKey="contracted" name="Contracted" fill="#D82034" radius={[4, 4, 0, 0]} />
            <Bar dataKey="declined" name="Declined" fill="#3A3A3A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Abschlussrate (Win Rate)" subtitle="Anteil Contracted an übermittelten Offerten">
        <ResponsiveContainer>
          <AreaChart data={monthly} margin={{ left: -18, right: 4, top: 4 }}>
            <defs>
              <linearGradient id="winrate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D82034" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#D82034" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#EFEDEA" />
            <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} %`, 'Win Rate']} />
            <Area type="monotone" dataKey="rate" stroke="#D82034" strokeWidth={2.5} fill="url(#winrate)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
