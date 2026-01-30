import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Camera, Upload, Save, Loader2 } from 'lucide-react';
import { getStores, getCategories, createItem } from '../api/client';
import toast from 'react-hot-toast';

export default function AddItem() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other',
    condition: 'good',
    purchase_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    store_id: '',
    suggested_price: '',
    listed_price: '',
    estimated_value_low: '',
    estimated_value_high: '',
    ai_identification: '',
    photo: '',
    notes: '',
  });

  // Load stores and categories
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => getStores().then(r => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories().then(r => r.data),
  });

  // Pre-fill from URL params (from AI identification)
  useEffect(() => {
    const name = searchParams.get('name');
    const category = searchParams.get('category');
    const description = searchParams.get('description');
    const suggested_price = searchParams.get('suggested_price');
    const estimated_low = searchParams.get('estimated_low');
    const estimated_high = searchParams.get('estimated_high');
    const ai_data = searchParams.get('ai_data');
    const photo = searchParams.get('photo');

    if (name || category) {
      setForm(prev => ({
        ...prev,
        name: name || prev.name,
        category: category || prev.category,
        description: description || prev.description,
        suggested_price: suggested_price || prev.suggested_price,
        estimated_value_low: estimated_low || prev.estimated_value_low,
        estimated_value_high: estimated_high || prev.estimated_value_high,
        ai_identification: ai_data || prev.ai_identification,
        photo: photo || prev.photo,
      }));
    }
  }, [searchParams]);

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
      await createItem({
        name: form.name,
        description: form.description || undefined,
        category: form.category,
        condition: form.condition,
        purchase_price: parseFloat(form.purchase_price),
        purchase_date: new Date(form.purchase_date).toISOString(),
        store_id: form.store_id ? parseInt(form.store_id) : undefined,
        suggested_price: form.suggested_price ? parseFloat(form.suggested_price) : undefined,
        listed_price: form.listed_price ? parseFloat(form.listed_price) : undefined,
        estimated_value_low: form.estimated_value_low ? parseFloat(form.estimated_value_low) : undefined,
        estimated_value_high: form.estimated_value_high ? parseFloat(form.estimated_value_high) : undefined,
        ai_identification: form.ai_identification || undefined,
        photo: form.photo || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Item added!');
      navigate('/inventory');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-xl font-bold text-gray-800">➕ Add Item</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
          {form.photo ? (
            <div className="relative">
              <img
                src={form.photo}
                alt="Item"
                className="w-full h-48 object-contain bg-gray-100 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, photo: '' }))}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 bg-gray-100 py-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Camera size={20} /> Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-gray-100 py-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Upload size={20} /> Upload
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
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

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-3 border rounded-lg"
            placeholder="e.g., Vintage Brass Candlesticks"
            required
          />
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-3 border rounded-lg bg-white"
            >
              {categories?.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => setForm(prev => ({ ...prev, condition: e.target.value }))}
              className="w-full p-3 border rounded-lg bg-white"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        </div>

        {/* Purchase Price & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                value={form.purchase_price}
                onChange={(e) => setForm(prev => ({ ...prev, purchase_price: e.target.value }))}
                className="w-full p-3 pl-7 border rounded-lg"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm(prev => ({ ...prev, purchase_date: e.target.value }))}
              className="w-full p-3 border rounded-lg"
            />
          </div>
        </div>

        {/* Store */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
          <select
            value={form.store_id}
            onChange={(e) => setForm(prev => ({ ...prev, store_id: e.target.value }))}
            className="w-full p-3 border rounded-lg bg-white"
          >
            <option value="">Select store...</option>
            {stores?.map(store => (
              <option key={store.id} value={store.id}>
                {store.name} {store.city && `(${store.city})`}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing */}
        {(form.suggested_price || form.estimated_value_low) && (
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm font-medium text-green-700 mb-2">AI Suggested Pricing</p>
            <div className="flex gap-4 text-sm">
              {form.estimated_value_low && form.estimated_value_high && (
                <span>Value: ${form.estimated_value_low} - ${form.estimated_value_high}</span>
              )}
              {form.suggested_price && (
                <span className="font-semibold">Suggested: ${form.suggested_price}</span>
              )}
            </div>
          </div>
        )}

        {/* Listed Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Listed Price</label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              value={form.listed_price}
              onChange={(e) => setForm(prev => ({ ...prev, listed_price: e.target.value }))}
              className="w-full p-3 pl-7 border rounded-lg"
              placeholder="What you'll list it for"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            className="w-full p-3 border rounded-lg"
            rows={2}
            placeholder="Additional details..."
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-3 border rounded-lg"
            rows={2}
            placeholder="Private notes..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-amber-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              Save Item
            </>
          )}
        </button>
      </form>
    </div>
  );
}
