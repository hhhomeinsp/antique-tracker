import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, Tag, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { 
  getAnalyticsSummary, 
  getAnalyticsByStore, 
  getAnalyticsByCategory,
  getBestShoppingDays 
} from '../api/client';

type Tab = 'overview' | 'stores' | 'categories' | 'days';

export default function Analytics() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-display font-semibold text-mahogany flex items-center gap-2">
        <BarChart3 className="text-wine" size={24} />
        Analytics
      </h2>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1 -mx-4 px-4 scrollbar-hide">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          <TrendingUp size={16} /> Overview
        </TabButton>
        <TabButton active={tab === 'stores'} onClick={() => setTab('stores')}>
          <Store size={16} /> Stores
        </TabButton>
        <TabButton active={tab === 'categories'} onClick={() => setTab('categories')}>
          <Tag size={16} /> Categories
        </TabButton>
        <TabButton active={tab === 'days'} onClick={() => setTab('days')}>
          <Calendar size={16} /> Best Days
        </TabButton>
      </div>

      {/* Content */}
      {tab === 'overview' && <OverviewTab />}
      {tab === 'stores' && <StoresTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'days' && <DaysTab />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
        active 
          ? 'bg-wine text-white shadow-lg' 
          : 'bg-cream-dark text-bronze hover:bg-cream-dark/80'
      }`}
    >
      {children}
    </button>
  );
}

function OverviewTab() {
  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => getAnalyticsSummary(90).then(r => r.data),
  });

  if (!summary) return <LoadingState />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-bronze">Last 90 days</p>
      
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Items" value={summary.total_items} />
        <MetricCard label="In Inventory" value={summary.unsold_items} />
        <MetricCard label="Items Sold" value={summary.recent_sales.count} color="text-sage" />
        <MetricCard 
          label="Inventory Value" 
          value={`$${summary.current_inventory_value.toLocaleString()}`} 
        />
      </div>

      <div className="card p-5">
        <h3 className="font-display font-semibold text-mahogany mb-4">Sales Performance</h3>
        <div className="space-y-3">
          <MetricRow label="Revenue" value={`$${summary.recent_sales.revenue.toLocaleString()}`} />
          <MetricRow label="Cost of Goods" value={`$${summary.recent_sales.cost.toLocaleString()}`} />
          <MetricRow 
            label="Total Profit" 
            value={`$${summary.recent_sales.profit.toLocaleString()}`}
            highlight
          />
          <MetricRow label="Avg Profit Margin" value={`${summary.recent_sales.avg_profit_margin.toFixed(0)}%`} />
          <MetricRow label="Avg Days to Sell" value={`${summary.recent_sales.avg_days_to_sell.toFixed(0)} days`} />
        </div>
      </div>
    </div>
  );
}

function StoresTab() {
  const { data: stores } = useQuery({
    queryKey: ['analytics', 'stores'],
    queryFn: () => getAnalyticsByStore().then(r => r.data),
  });

  if (!stores) return <LoadingState />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-bronze">Ranked by total profit</p>
      
      {stores.length === 0 ? (
        <EmptyState message="No store data yet" />
      ) : (
        stores.map((store: any, i: number) => (
          <div key={store.store_id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-wine/10 text-wine text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-mahogany">{store.store_name}</h3>
                </div>
                <p className="text-xs text-bronze mt-0.5 ml-8">{store.city}</p>
              </div>
              <span className={`text-lg font-display font-bold ${store.total_profit >= 0 ? 'text-sage' : 'text-wine'}`}>
                ${store.total_profit.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-cream-dark rounded-lg p-2 text-center">
                <p className="text-bronze">Items</p>
                <p className="font-semibold text-mahogany">{store.total_items}</p>
              </div>
              <div className="bg-cream-dark rounded-lg p-2 text-center">
                <p className="text-bronze">Sold</p>
                <p className="font-semibold text-mahogany">{store.sold_items}</p>
              </div>
              <div className="bg-cream-dark rounded-lg p-2 text-center">
                <p className="text-bronze">Margin</p>
                <p className="font-semibold text-mahogany">{store.avg_profit_margin.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CategoriesTab() {
  const { data: categories } = useQuery({
    queryKey: ['analytics', 'categories'],
    queryFn: () => getAnalyticsByCategory().then(r => r.data),
  });

  if (!categories) return <LoadingState />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-bronze">Ranked by total profit</p>
      
      {categories.length === 0 ? (
        <EmptyState message="No category data yet" />
      ) : (
        categories.map((cat: any, i: number) => (
          <div key={cat.category} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gold/20 text-gold-dark text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <h3 className="font-semibold text-mahogany capitalize">{cat.category.replace('_', ' ')}</h3>
              </div>
              <span className={`text-lg font-display font-bold ${cat.total_profit >= 0 ? 'text-sage' : 'text-wine'}`}>
                ${cat.total_profit.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="bg-cream-dark rounded-lg p-2 text-center">
                <p className="text-bronze">Items</p>
                <p className="font-semibold text-mahogany">{cat.total_items}</p>
              </div>
              <div className="bg-cream-dark rounded-lg p-2 text-center">
                <p className="text-bronze">Sold</p>
                <p className="font-semibold text-mahogany">{cat.sold_items}</p>
              </div>
              <div className="bg-cream-dark rounded-lg p-2 text-center">
                <p className="text-bronze">Margin</p>
                <p className="font-semibold text-mahogany">{cat.avg_profit_margin.toFixed(0)}%</p>
              </div>
              <div className="bg-cream-dark rounded-lg p-2 text-center">
                <p className="text-bronze">Days</p>
                <p className="font-semibold text-mahogany">{cat.avg_days_to_sell.toFixed(0)}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function DaysTab() {
  const { data: days } = useQuery({
    queryKey: ['analytics', 'days'],
    queryFn: () => getBestShoppingDays().then(r => r.data),
  });

  if (!days) return <LoadingState />;

  const maxProfit = Math.max(...days.map((d: any) => d.total_profit), 1);

  return (
    <div className="space-y-3">
      <p className="text-sm text-bronze">Which days yield the best finds?</p>
      
      {days.map((day: any) => (
        <div key={day.day} className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-mahogany">{day.day}</h3>
            <span className={`font-display font-bold ${day.total_profit > 0 ? 'text-sage' : 'text-bronze'}`}>
              ${day.total_profit.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-bronze mb-2">
            <span>{day.items_purchased} items</span>
            <span>Avg margin: {day.avg_profit_margin.toFixed(0)}%</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full transition-all duration-500"
              style={{ width: maxProfit > 0 ? `${(day.total_profit / maxProfit) * 100}%` : '0%' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, color = 'text-mahogany' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-bronze uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-display font-bold ${color} mt-1`}>{value}</p>
    </div>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${highlight ? 'pt-3 mt-1 border-t border-cream-dark' : ''}`}>
      <span className="text-bronze">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-sage text-lg' : 'text-mahogany'}`}>{value}</span>
    </div>
  );
}

function LoadingState() {
  return <div className="text-center py-12 text-bronze">Loading...</div>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-bronze">{message}</p>
    </div>
  );
}
