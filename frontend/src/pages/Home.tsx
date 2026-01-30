import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PlusCircle, Camera, TrendingUp, Package } from 'lucide-react';
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
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/add"
          className="bg-amber-600 text-white rounded-xl p-4 flex flex-col items-center justify-center shadow-lg active:scale-95 transition"
        >
          <PlusCircle size={32} />
          <span className="mt-2 font-medium">Add Item</span>
        </Link>
        <Link
          to="/identify"
          className="bg-purple-600 text-white rounded-xl p-4 flex flex-col items-center justify-center shadow-lg active:scale-95 transition"
        >
          <Camera size={32} />
          <span className="mt-2 font-medium">AI Identify</span>
        </Link>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : summary ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Last 30 Days</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Package className="text-blue-500" />}
              label="In Inventory"
              value={summary.unsold_items}
              subtext={`$${summary.current_inventory_value.toLocaleString()} invested`}
            />
            <StatCard
              icon={<TrendingUp className="text-green-500" />}
              label="Items Sold"
              value={summary.recent_sales.count}
              subtext={`$${summary.recent_sales.profit.toLocaleString()} profit`}
            />
          </div>

          {summary.recent_sales.count > 0 && (
            <div className="bg-white rounded-xl p-4 shadow">
              <h3 className="font-medium text-gray-700 mb-2">Sales Performance</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Revenue</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${summary.recent_sales.revenue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Avg Margin</p>
                  <p className="text-lg font-semibold text-amber-600">
                    {summary.recent_sales.avg_profit_margin.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Avg Days to Sell</p>
                  <p className="text-lg font-semibold">
                    {summary.recent_sales.avg_days_to_sell.toFixed(0)} days
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No data yet. Start by adding items!</p>
          <button
            onClick={handleSeedStores}
            className="text-amber-600 underline"
          >
            Load Brevard County Thrift Stores
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subtext }: { 
  icon: React.ReactNode; 
  label: string; 
  value: number | string;
  subtext?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
    </div>
  );
}
