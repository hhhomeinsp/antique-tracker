import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Trash2 } from 'lucide-react';
import { getItems, markSold, deleteItem } from '../api/client';
import type { Item } from '../api/client';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [filter, setFilter] = useState<'all' | 'unsold' | 'sold'>('unsold');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['items', filter],
    queryFn: () => getItems({ 
      sold: filter === 'all' ? undefined : filter === 'sold' 
    }).then(r => r.data),
  });

  const sellMutation = useMutation({
    mutationFn: ({ id, price }: { id: number; price: number }) => markSold(id, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      setSelectedItem(null);
      setSalePrice('');
      toast.success('Item marked as sold!');
    },
    onError: () => toast.error('Failed to mark as sold'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Item deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handleSell = () => {
    if (!selectedItem || !salePrice) return;
    sellMutation.mutate({ id: selectedItem.id, price: parseFloat(salePrice) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">📦 Inventory</h2>
        <span className="text-sm text-gray-500">{items?.length || 0} items</span>
      </div>

      {/* Filter tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        {(['unsold', 'sold', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              filter === f ? 'bg-white shadow text-amber-700' : 'text-gray-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Items list */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : items?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No items found. Start by adding some!
        </div>
      ) : (
        <div className="space-y-3">
          {items?.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow overflow-hidden"
            >
              <div className="flex">
                {/* Photo */}
                {item.photo && (
                  <img
                    src={item.photo}
                    alt={item.name}
                    className="w-24 h-24 object-cover flex-shrink-0"
                  />
                )}
                
                {/* Details */}
                <div className="flex-1 p-3">
                  <h3 className="font-medium text-gray-800 line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-400 capitalize">
                    {item.category.replace('_', ' ')}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="text-gray-600">
                      Paid: <strong>${item.purchase_price}</strong>
                    </span>
                    {item.is_sold ? (
                      <span className="text-green-600">
                        Sold: <strong>${item.sale_price}</strong>
                        {item.profit !== undefined && (
                          <span className="ml-1">
                            (+${item.profit.toFixed(0)})
                          </span>
                        )}
                      </span>
                    ) : item.listed_price ? (
                      <span className="text-amber-600">
                        Listed: ${item.listed_price}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col justify-center p-2 gap-1">
                  {!item.is_sold && (
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setSalePrice(item.listed_price?.toString() || item.suggested_price?.toString() || '');
                      }}
                      className="p-2 bg-green-100 text-green-700 rounded-lg"
                    >
                      <DollarSign size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this item?')) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                    className="p-2 bg-red-100 text-red-700 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sell modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-4 space-y-4 safe-area-bottom">
            <h3 className="text-lg font-bold">Mark as Sold</h3>
            <p className="text-gray-600">{selectedItem.name}</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sale Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full p-3 pl-7 border rounded-lg text-lg"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {salePrice && selectedItem.purchase_price && (
                <p className="text-sm mt-2">
                  Profit: <span className={parseFloat(salePrice) > selectedItem.purchase_price ? 'text-green-600' : 'text-red-600'}>
                    ${(parseFloat(salePrice) - selectedItem.purchase_price).toFixed(2)}
                  </span>
                  {' '}
                  ({((parseFloat(salePrice) - selectedItem.purchase_price) / selectedItem.purchase_price * 100).toFixed(0)}% margin)
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedItem(null); setSalePrice(''); }}
                className="flex-1 py-3 border rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSell}
                disabled={!salePrice || sellMutation.isPending}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {sellMutation.isPending ? 'Saving...' : 'Confirm Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
