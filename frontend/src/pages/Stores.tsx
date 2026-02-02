import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Plus, Pencil, Trash2, X, MapPin, Star, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { searchStores, createStore, updateStore, deleteStore, seedStores, type StoreWithUsage } from '../api/client';
import toast from 'react-hot-toast';

export default function Stores() {
  const [editingStore, setEditingStore] = useState<StoreWithUsage | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '' });
  const queryClient = useQueryClient();

  const { data: stores, isLoading } = useQuery({
    queryKey: ['stores-all'],
    queryFn: async () => {
      const res = await searchStores('', 200);
      if (res.data.length === 0) {
        await seedStores();
        const refreshed = await searchStores('', 200);
        return refreshed.data;
      }
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; address?: string; city?: string }) => createStore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores-all'] });
      queryClient.invalidateQueries({ queryKey: ['stores-search'] });
      setShowAdd(false);
      setForm({ name: '', address: '', city: '' });
      toast.success('Store added!');
    },
    onError: () => toast.error('Failed to add store'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; address?: string; city?: string } }) => 
      updateStore(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores-all'] });
      queryClient.invalidateQueries({ queryKey: ['stores-search'] });
      setEditingStore(null);
      setForm({ name: '', address: '', city: '' });
      toast.success('Store updated!');
    },
    onError: () => toast.error('Failed to update store'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores-all'] });
      queryClient.invalidateQueries({ queryKey: ['stores-search'] });
      toast.success('Store deleted');
    },
    onError: () => toast.error('Failed to delete store'),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Please enter a store name');
      return;
    }

    const data = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
    };

    if (editingStore) {
      updateMutation.mutate({ id: editingStore.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (store: StoreWithUsage) => {
    setEditingStore(store);
    setForm({
      name: store.name,
      address: store.address || '',
      city: store.city || '',
    });
  };

  const closeModal = () => {
    setEditingStore(null);
    setShowAdd(false);
    setForm({ name: '', address: '', city: '' });
  };

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <Link 
          to="/" 
          className="w-10 h-10 bg-cream-dark rounded-xl flex items-center justify-center text-bronze hover:text-mahogany transition"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-display font-semibold text-mahogany flex items-center gap-2">
            <Store className="text-wine" size={24} />
            Manage Stores
          </h2>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 bg-sage text-white rounded-xl flex items-center justify-center shadow active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-bronze">Loading...</div>
      ) : stores?.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cream-dark flex items-center justify-center">
            <Store size={32} className="text-bronze" />
          </div>
          <p className="text-bronze">No stores yet. Add your first store!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stores?.map(store => (
            <div key={store.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-cream-dark rounded-xl flex items-center justify-center shrink-0">
                  <Store size={18} className="text-bronze" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-mahogany">{store.name}</h3>
                  {store.address && (
                    <p className="text-sm text-bronze truncate">{store.address}</p>
                  )}
                  {store.city && (
                    <p className="text-sm text-bronze flex items-center gap-1">
                      <MapPin size={12} />
                      {store.city}
                    </p>
                  )}
                  {store.usage_count > 0 && (
                    <p className="text-xs text-sage flex items-center gap-1 mt-1">
                      <Star size={12} className="fill-current" />
                      {store.usage_count} item{store.usage_count !== 1 ? 's' : ''} purchased here
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(store)}
                    className="w-9 h-9 bg-gold/20 text-gold-dark rounded-lg flex items-center justify-center active:scale-95"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (store.usage_count > 0) {
                        if (!confirm(`This store has ${store.usage_count} item(s). Delete anyway?`)) return;
                      }
                      if (confirm('Delete this store?')) {
                        deleteMutation.mutate(store.id);
                      }
                    }}
                    className="w-9 h-9 bg-wine/10 text-wine rounded-lg flex items-center justify-center active:scale-95"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAdd || editingStore) && (
        <div className="fixed inset-0 bg-mahogany/50 backdrop-blur-sm flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 safe-area-bottom shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-semibold text-mahogany flex items-center gap-2">
                <Store size={20} className="text-wine" />
                {editingStore ? 'Edit Store' : 'Add Store'}
              </h3>
              <button 
                onClick={closeModal}
                className="w-10 h-10 bg-cream-dark rounded-full flex items-center justify-center"
              >
                <X size={20} className="text-bronze" />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-mahogany mb-2">Store Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border rounded-xl"
                placeholder="e.g., Goodwill"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-mahogany mb-2">Address (optional)</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                className="w-full p-3 border rounded-xl"
                placeholder="e.g., 123 Main St"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-mahogany mb-2">City (optional)</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                className="w-full p-3 border rounded-xl"
                placeholder="e.g., Melbourne"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={closeModal}
                className="flex-1 py-4 border-2 border-cream-dark rounded-xl font-semibold text-bronze"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending || !form.name.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? 'Saving...' 
                  : editingStore ? 'Update' : 'Add Store'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
