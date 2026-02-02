import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, X, Store, Loader2, ChevronDown, Star } from 'lucide-react';
import { searchStores, createStore, seedStores, type StoreWithUsage } from '../api/client';
import toast from 'react-hot-toast';

interface StoreSearchInputProps {
  value: string; // store_id as string
  onChange: (storeId: string, storeName?: string) => void;
  placeholder?: string;
}

export default function StoreSearchInput({ value, onChange, placeholder = "Search stores..." }: StoreSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCity, setNewStoreCity] = useState('');
  const [addingStore, setAddingStore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch stores with search
  const { data: stores, isLoading } = useQuery({
    queryKey: ['stores-search', debouncedQuery],
    queryFn: async () => {
      const res = await searchStores(debouncedQuery, 20);
      // Auto-seed if no stores exist and no search query
      if (res.data.length === 0 && !debouncedQuery) {
        await seedStores();
        const refreshed = await searchStores('', 20);
        return refreshed.data;
      }
      return res.data;
    },
    staleTime: 30000,
  });

  // Get selected store name for display
  const selectedStore = stores?.find(s => s.id.toString() === value);
  const displayValue = selectedStore ? `${selectedStore.name}${selectedStore.city ? ` (${selectedStore.city})` : ''}` : '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((store: StoreWithUsage) => {
    onChange(store.id.toString(), store.name);
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('', '');
    setSearchQuery('');
  }, [onChange]);

  const handleAddStore = async () => {
    if (!newStoreName.trim()) {
      toast.error('Please enter a store name');
      return;
    }
    setAddingStore(true);
    try {
      const res = await createStore({ name: newStoreName.trim(), city: newStoreCity.trim() || undefined });
      queryClient.invalidateQueries({ queryKey: ['stores-search'] });
      onChange(res.data.id.toString(), res.data.name);
      setShowAddStore(false);
      setNewStoreName('');
      setNewStoreCity('');
      setIsOpen(false);
      toast.success('Store added!');
    } catch {
      toast.error('Failed to add store');
    } finally {
      setAddingStore(false);
    }
  };

  // Filter for "Add new" option
  const showAddNew = searchQuery.trim() && 
    !stores?.some(s => s.name.toLowerCase() === searchQuery.trim().toLowerCase());

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-bronze">
          <Search size={18} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full p-3 pl-10 pr-16 border bg-white rounded-xl"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-cream-dark rounded-full transition"
            >
              <X size={16} className="text-bronze" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-cream-dark rounded-full transition"
          >
            <ChevronDown size={18} className={`text-bronze transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-cream-dark max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-bronze">
              <Loader2 className="animate-spin inline mr-2" size={18} />
              Loading...
            </div>
          ) : (
            <>
              {/* Store list */}
              {stores && stores.length > 0 ? (
                <div className="py-1">
                  {stores.map((store) => (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => handleSelect(store)}
                      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-cream transition ${
                        store.id.toString() === value ? 'bg-gold/20' : ''
                      }`}
                    >
                      <Store size={16} className="text-bronze shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-mahogany truncate">
                          {store.name}
                        </div>
                        {store.city && (
                          <div className="text-xs text-bronze truncate">{store.city}</div>
                        )}
                      </div>
                      {store.usage_count > 0 && (
                        <div className="flex items-center gap-1 text-xs text-sage shrink-0">
                          <Star size={12} className="fill-current" />
                          {store.usage_count}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-bronze text-sm">
                  No stores found
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-cream-dark" />

              {/* Add new store option */}
              {showAddNew ? (
                <button
                  type="button"
                  onClick={() => {
                    setNewStoreName(searchQuery.trim());
                    setShowAddStore(true);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-sage/10 transition text-sage font-medium"
                >
                  <Plus size={18} />
                  Add "{searchQuery.trim()}" as new store
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddStore(true)}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-cream transition text-bronze"
                >
                  <Plus size={18} />
                  Add new store
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Add Store Modal */}
      {showAddStore && (
        <div className="fixed inset-0 bg-mahogany/50 backdrop-blur-sm flex items-end z-[60]">
          <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 safe-area-bottom shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-semibold text-mahogany flex items-center gap-2">
                <Store size={20} className="text-wine" />
                Add New Store
              </h3>
              <button 
                type="button"
                onClick={() => { setShowAddStore(false); setNewStoreName(''); setNewStoreCity(''); }}
                className="w-10 h-10 bg-cream-dark rounded-full flex items-center justify-center"
              >
                <X size={20} className="text-bronze" />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-mahogany mb-2">Store Name *</label>
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                className="w-full p-3 border rounded-xl"
                placeholder="e.g., My Favorite Thrift Store"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-mahogany mb-2">City (optional)</label>
              <input
                type="text"
                value={newStoreCity}
                onChange={(e) => setNewStoreCity(e.target.value)}
                className="w-full p-3 border rounded-xl"
                placeholder="e.g., Melbourne"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowAddStore(false); setNewStoreName(''); setNewStoreCity(''); }}
                className="flex-1 py-4 border-2 border-cream-dark rounded-xl font-semibold text-bronze"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddStore}
                disabled={addingStore || !newStoreName.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {addingStore ? 'Adding...' : 'Add Store'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
