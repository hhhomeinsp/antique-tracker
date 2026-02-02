import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Trash2, Package, X, Tag, Calendar, Pencil } from 'lucide-react';
import { getItems, markSold, deleteItem } from '../api/client';
import type { Item } from '../api/client';
import toast from 'react-hot-toast';

export default function Inventory() {
  const navigate = useNavigate();
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold text-mahogany flex items-center gap-2">
          <Package className="text-wine" size={24} />
          Inventory
        </h2>
        <span className="text-sm text-bronze bg-cream-dark px-3 py-1 rounded-full">
          {items?.length || 0} items
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex bg-cream-dark rounded-xl p-1">
        {(['unsold', 'sold', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              filter === f 
                ? 'bg-white shadow text-wine' 
                : 'text-bronze hover:text-mahogany'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Items list */}
      {isLoading ? (
        <div className="text-center py-12 text-bronze">Loading...</div>
      ) : items?.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cream-dark flex items-center justify-center">
            <Package size={32} className="text-bronze" />
          </div>
          <p className="text-bronze">No items found. Start by adding some!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items?.map(item => (
            <div key={item.id} className="card overflow-hidden">
              <div className="flex">
                {/* Photo */}
                {item.photo ? (
                  <img
                    src={item.photo}
                    alt={item.name}
                    className="w-28 h-28 object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-28 h-28 bg-cream-dark flex items-center justify-center flex-shrink-0">
                    <Package size={32} className="text-bronze/50" />
                  </div>
                )}
                
                {/* Details */}
                <div className="flex-1 p-3 min-w-0">
                  <h3 className="font-semibold text-mahogany line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-bronze capitalize flex items-center gap-1 mt-0.5">
                    <Tag size={12} />
                    {item.category.replace('_', ' ')}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm">
                    <span className="text-bronze">
                      Paid: <strong className="text-mahogany">${item.purchase_price}</strong>
                    </span>
                    {item.is_sold ? (
                      <span className="text-sage font-medium">
                        Sold: ${item.sale_price}
                        {item.profit !== undefined && (
                          <span className="ml-1 text-xs">
                            (+${item.profit.toFixed(0)})
                          </span>
                        )}
                      </span>
                    ) : item.listed_price ? (
                      <span className="text-gold-dark">
                        Listed: ${item.listed_price}
                      </span>
                    ) : null}
                  </div>
                  
                  {item.purchase_date && (
                    <p className="text-xs text-bronze/70 mt-1 flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(item.purchase_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col justify-center p-2 gap-2">
                  <button
                    onClick={() => navigate(`/edit/${item.id}`)}
                    className="w-10 h-10 bg-gold/20 text-gold-dark rounded-xl flex items-center justify-center active:scale-95"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  {!item.is_sold && (
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setSalePrice(item.listed_price?.toString() || item.suggested_price?.toString() || '');
                      }}
                      className="w-10 h-10 bg-sage/10 text-sage rounded-xl flex items-center justify-center active:scale-95"
                      title="Mark Sold"
                    >
                      <DollarSign size={20} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this item?')) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                    className="w-10 h-10 bg-wine/10 text-wine rounded-xl flex items-center justify-center active:scale-95"
                    title="Delete"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sell modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-mahogany/50 backdrop-blur-sm flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 safe-area-bottom shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-semibold text-mahogany">Mark as Sold</h3>
              <button 
                onClick={() => { setSelectedItem(null); setSalePrice(''); }}
                className="w-10 h-10 bg-cream-dark rounded-full flex items-center justify-center"
              >
                <X size={20} className="text-bronze" />
              </button>
            </div>
            
            <p className="text-bronze">{selectedItem.name}</p>
            <p className="text-sm text-bronze/70">Purchased for ${selectedItem.purchase_price}</p>
            
            <div>
              <label className="block text-sm font-medium text-mahogany mb-2">
                Sale Price
              </label>
              <div className="relative">
                <span className="absolute left-4 top-4 text-bronze text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full p-4 pl-9 border-2 border-cream-dark rounded-xl text-xl font-semibold focus:border-sage"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {salePrice && selectedItem.purchase_price && (
                <div className="mt-3 p-3 bg-cream-dark rounded-xl">
                  <p className="text-sm">
                    Profit:{' '}
                    <span className={`font-semibold ${parseFloat(salePrice) > selectedItem.purchase_price ? 'text-sage' : 'text-wine'}`}>
                      ${(parseFloat(salePrice) - selectedItem.purchase_price).toFixed(2)}
                    </span>
                    <span className="text-bronze ml-2">
                      ({((parseFloat(salePrice) - selectedItem.purchase_price) / selectedItem.purchase_price * 100).toFixed(0)}% margin)
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setSelectedItem(null); setSalePrice(''); }}
                className="flex-1 py-4 border-2 border-cream-dark rounded-xl font-semibold text-bronze"
              >
                Cancel
              </button>
              <button
                onClick={handleSell}
                disabled={!salePrice || sellMutation.isPending}
                className="flex-1 btn-primary disabled:opacity-50"
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
