import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, Tag, Calendar, TrendingUp } from 'lucide-react';
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
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">📊 Analytics</h2>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          <TrendingUp size={16} /> Overview
        </TabButton>
        <TabButton active={tab === 'stores'} onClick={() => setTab('stores')}>
          <Store size={16} /> By Store
        </TabButton>
        <TabButton active={tab === 'categories'} onClick={() => setTab('categories')}>
          <Tag size={16} /> By Category
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
      className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
        active 
          ? 'bg-amber-600 text-white' 
          : 'bg-gray-100 text-gray-600'
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

  if (!summary) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Last 90 days</p>
      
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Items" value={summary.total_items} />
        <MetricCard label="In Inventory" value={summary.unsold_items} />
        <MetricCard label="Items Sold" value={summary.recent_sales.count} />
        <MetricCard 
          label="Inventory Value" 
          value={`$${summary.current_inventory_value.toLocaleString()}`} 
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow">
        <h3 className="font-semibold text-gray-700 mb-3">Sales Performance</h3>
        <div className="space-y-2">
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

  if (!stores) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Ranked by total profit</p>
      
      {stores.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No store data yet</p>
      ) : (
        stores.map((store: any, i: number) => (
          <div key={store.store_id} className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-amber-600 font-medium">#{i + 1}</span>
                <h3 className="font-medium">{store.store_name}</h3>
                <p className="text-xs text-gray-400">{store.city}</p>
              </div>
              <span className={`text-lg font-bold ${store.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${store.total_profit.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
              <div>
                <p className="text-gray-400">Items</p>
                <p className="font-medium">{store.total_items}</p>
              </div>
              <div>
                <p className="text-gray-400">Sold</p>
                <p className="font-medium">{store.sold_items}</p>
              </div>
              <div>
                <p className="text-gray-400">Avg Margin</p>
                <p className="font-medium">{store.avg_profit_margin.toFixed(0)}%</p>
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

  if (!categories) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Ranked by total profit</p>
      
      {categories.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No category data yet</p>
      ) : (
        categories.map((cat: any, i: number) => (
          <div key={cat.category} className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-amber-600 font-medium">#{i + 1}</span>
                <h3 className="font-medium capitalize">{cat.category.replace('_', ' ')}</h3>
              </div>
              <span className={`text-lg font-bold ${cat.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${cat.total_profit.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
              <div>
                <p className="text-gray-400">Items</p>
                <p className="font-medium">{cat.total_items}</p>
              </div>
              <div>
                <p className="text-gray-400">Sold</p>
                <p className="font-medium">{cat.sold_items}</p>
              </div>
              <div>
                <p className="text-gray-400">Margin</p>
                <p className="font-medium">{cat.avg_profit_margin.toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-gray-400">Days</p>
                <p className="font-medium">{cat.avg_days_to_sell.toFixed(0)}</p>
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

  if (!days) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  const maxProfit = Math.max(...days.map((d: any) => d.total_profit));

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Which days yield the best finds?</p>
      
      {days.map((day: any) => (
        <div key={day.day} className="bg-white rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">{day.day}</h3>
            <span className={`font-bold ${day.total_profit > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              ${day.total_profit.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{day.items_purchased} items</span>
            <span>Avg margin: {day.avg_profit_margin.toFixed(0)}%</span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: maxProfit > 0 ? `${(day.total_profit / maxProfit) * 100}%` : '0%' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between ${highlight ? 'pt-2 border-t font-semibold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className={highlight ? 'text-green-600' : ''}>{value}</span>
    </div>
  );
}
