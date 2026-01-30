import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PlusCircle, Sparkles, TrendingUp, Package, DollarSign, Clock } from 'lucide-react';
import { getAnalyticsSummary, seedStores } from '../api/client';
import toast from 'react-hot-toast';

export default function Home() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary'],
    queryFn: () => getAnalyticsSummary(30).then(r => r.data),
  });

  const handleSeedStores = async () => {
    try {
      const res = await seedStores();
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to seed stores');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="text-center py-2">
        <h2 className="text-2xl font-display font-semibold text-mahogany">Welcome Back</h2>
        <p className="text-bronze text-sm mt-1">Track your treasures, maximize your profits</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/add"
          className="card p-5 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all group"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-wine to-wine-light flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
            <PlusCircle size={28} className="text-white" />
          </div>
          <span className="font-semibold text-mahogany">Add Item</span>
        </Link>
        <Link
          to="/identify"
          className="card p-5 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all group"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
            <Sparkles size={28} className="text-white" />
          </div>
          <span className="font-semibold text-mahogany">AI Identify</span>
        </Link>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="text-center py-8 text-bronze">Loading...</div>
      ) : summary ? (
        <div className="space-y-4">
          <h3 className="text-lg font-display font-semibold text-mahogany flex items-center gap-2">
            <Clock size={18} className="text-wine" />
            Last 30 Days
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Package className="text-wine" size={20} />}
              label="In Inventory"
              value={summary.unsold_items}
              subtext={`$${summary.current_inventory_value.toLocaleString()} invested`}
            />
            <StatCard
              icon={<TrendingUp className="text-sage" size={20} />}
              label="Items Sold"
              value={summary.recent_sales.count}
              subtext={`$${summary.recent_sales.profit.toLocaleString()} profit`}
              highlight
            />
          </div>

          {summary.recent_sales.count > 0 && (
            <div className="card p-5">
              <h4 className="font-display font-semibold text-mahogany mb-4 flex items-center gap-2">
                <DollarSign size={18} className="text-gold" />
                Sales Performance
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <MetricItem label="Revenue" value={`$${summary.recent_sales.revenue.toLocaleString()}`} color="text-sage" />
                <MetricItem label="Avg Margin" value={`${summary.recent_sales.avg_profit_margin.toFixed(0)}%`} color="text-gold-dark" />
                <MetricItem label="Avg Days to Sell" value={`${summary.recent_sales.avg_days_to_sell.toFixed(0)} days`} />
                <MetricItem label="Total Profit" value={`$${summary.recent_sales.profit.toLocaleString()}`} color="text-wine" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cream-dark flex items-center justify-center">
            <Package size={32} className="text-bronze" />
          </div>
          <p className="text-bronze mb-4">No data yet. Start by adding items!</p>
          <button
            onClick={handleSeedStores}
            className="text-wine underline font-medium hover:text-wine-light"
          >
            Load Brevard County Thrift Stores
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subtext, highlight }: { 
  icon: React.ReactNode; 
  label: string; 
  value: number | string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-4 ${highlight ? 'ring-2 ring-sage/30' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-bronze font-medium">{label}</span>
      </div>
      <p className="text-3xl font-display font-bold text-mahogany">{value}</p>
      {subtext && <p className="text-xs text-bronze mt-1">{subtext}</p>}
    </div>
  );
}

function MetricItem({ label, value, color = 'text-mahogany' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-xs text-bronze uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
