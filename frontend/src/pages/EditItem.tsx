import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Save, Loader2, X, Pencil, ArrowLeft, Trash2 } from 'lucide-react';
import { getItem, getCategories, updateItem, deleteItem } from '../api/client';
import StoreSearchInput from '../components/StoreSearchInput';
import toast from 'react-hot-toast';

export default function EditItem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other',
    condition: 'good',
    purchase_price: '',
    purchase_date: '',
    store_id: '',
    suggested_price: '',
    listed_price: '',
    estimated_value_low: '',
    estimated_value_high: '',
    photo: '',
    notes: '',
    is_sold: false,
    sale_price: '',
    sale_date: '',
  });

  const { data: item, isLoading: loadingItem } = useQuery({
    queryKey: ['item', id],
    queryFn: () => getItem(parseInt(id!)).then(r => r.data),
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories().then(r => r.data),
  });

  // Populate form when item loads
  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        description: item.description || '',
        category: item.category || 'other',
        condition: item.condition || 'good',
        purchase_price: item.purchase_price?.toString() || '',
        purchase_date: item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : '',
        store_id: item.store_id?.toString() || '',
        suggested_price: item.suggested_price?.toString() || '',
        listed_price: item.listed_price?.toString() || '',
        estimated_value_low: item.estimated_value_low?.toString() || '',
        estimated_value_high: item.estimated_value_high?.toString() || '',
        photo: item.photo || '',
        notes: item.notes || '',
        is_sold: item.is_sold || false,
        sale_price: item.sale_price?.toString() || '',
        sale_date: item.sale_date ? new Date(item.sale_date).toISOString().split('T')[0] : '',
      });
    }
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateItem(parseInt(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      toast.success('Item updated!');
      navigate('/inventory');
    },
    onError: () => toast.error('Failed to update item'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteItem(parseInt(id!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Item deleted');
      navigate('/inventory');
    },
    onError: () => toast.error('Failed to delete item'),
  });

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setForm(prev => ({ ...prev, photo: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.purchase_price) {
      toast.error('Please fill in name and purchase price');
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        condition: form.condition,
        purchase_price: parseFloat(form.purchase_price),
        purchase_date: new Date(form.purchase_date).toISOString(),
        store_id: form.store_id ? parseInt(form.store_id) : null,
        suggested_price: form.suggested_price ? parseFloat(form.suggested_price) : null,
        listed_price: form.listed_price ? parseFloat(form.listed_price) : null,
        estimated_value_low: form.estimated_value_low ? parseFloat(form.estimated_value_low) : null,
        estimated_value_high: form.estimated_value_high ? parseFloat(form.estimated_value_high) : null,
        photo: form.photo || null,
        notes: form.notes || null,
        is_sold: form.is_sold,
      };

      if (form.is_sold) {
        data.sale_price = form.sale_price ? parseFloat(form.sale_price) : null;
        data.sale_date = form.sale_date ? new Date(form.sale_date).toISOString() : new Date().toISOString();
      }

      updateMutation.mutate(data);
    } finally {
      setSaving(false);
    }
  };

  if (loadingItem) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-wine" size={32} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-bronze">Item not found</p>
        <button onClick={() => navigate('/inventory')} className="mt-4 btn-primary">
          Back to Inventory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('/inventory')}
          className="w-10 h-10 bg-cream-dark rounded-xl flex items-center justify-center text-bronze hover:text-mahogany transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-display font-semibold text-mahogany flex items-center gap-2 flex-1">
          <Pencil className="text-wine" size={24} />
          Edit Item
        </h2>
        <button
          onClick={() => {
            if (confirm('Delete this item?')) {
              deleteMutation.mutate();
            }
          }}
          className="w-10 h-10 bg-wine/10 text-wine rounded-xl flex items-center justify-center active:scale-95"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo */}
        <div className="card p-4">
          <label className="block text-sm font-semibold text-mahogany mb-3">Photo</label>
          {form.photo ? (
            <div className="relative">
              <img
                src={form.photo}
                alt="Item"
                className="w-full h-48 object-contain bg-cream-dark rounded-xl"
              />
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, photo: '' }))}
                className="absolute top-2 right-2 w-8 h-8 bg-wine text-white rounded-full flex items-center justify-center shadow"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-cream-dark py-4 rounded-xl flex items-center justify-center gap-2 text-mahogany font-medium active:scale-95 transition"
              >
                <Upload size={20} /> Upload Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-mahogany">Basic Info</h3>
          
          <div>
            <label className="block text-sm font-medium text-bronze mb-1">Item Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-bronze mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-3 border bg-white"
              >
                {categories?.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-bronze mb-1">Condition</label>
              <select
                value={form.condition}
                onChange={(e) => setForm(prev => ({ ...prev, condition: e.target.value }))}
                className="w-full p-3 border bg-white"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-bronze mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border bg-white"
              rows={2}
            />
          </div>
        </div>

        {/* Purchase Info */}
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-mahogany">Purchase Info</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-bronze mb-1">Purchase Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-bronze">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.purchase_price}
                  onChange={(e) => setForm(prev => ({ ...prev, purchase_price: e.target.value }))}
                  className="w-full p-3 pl-7 border bg-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-bronze mb-1">Purchase Date</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm(prev => ({ ...prev, purchase_date: e.target.value }))}
                className="w-full p-3 border bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-bronze mb-1">Store</label>
            <StoreSearchInput
              value={form.store_id}
              onChange={(storeId) => setForm(prev => ({ ...prev, store_id: storeId }))}
              placeholder="Search stores..."
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-mahogany">Pricing</h3>

          <div>
            <label className="block text-sm font-medium text-bronze mb-1">Listed Price</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-bronze">$</span>
              <input
                type="number"
                step="0.01"
                value={form.listed_price}
                onChange={(e) => setForm(prev => ({ ...prev, listed_price: e.target.value }))}
                className="w-full p-3 pl-7 border bg-white"
              />
            </div>
          </div>
        </div>

        {/* Sale Info */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-mahogany">Sale Status</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_sold}
                onChange={(e) => setForm(prev => ({ ...prev, is_sold: e.target.checked }))}
                className="w-5 h-5 rounded text-sage focus:ring-sage"
              />
              <span className="text-sm font-medium text-mahogany">Sold</span>
            </label>
          </div>

          {form.is_sold && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-bronze mb-1">Sale Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-bronze">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.sale_price}
                    onChange={(e) => setForm(prev => ({ ...prev, sale_price: e.target.value }))}
                    className="w-full p-3 pl-7 border bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-bronze mb-1">Sale Date</label>
                <input
                  type="date"
                  value={form.sale_date}
                  onChange={(e) => setForm(prev => ({ ...prev, sale_date: e.target.value }))}
                  className="w-full p-3 border bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card p-4">
          <label className="block text-sm font-semibold text-mahogany mb-2">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-3 border bg-white"
            rows={3}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || updateMutation.isPending}
          className="w-full btn-primary flex items-center justify-center gap-2 py-4 disabled:opacity-50"
        >
          {saving || updateMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  );
}
