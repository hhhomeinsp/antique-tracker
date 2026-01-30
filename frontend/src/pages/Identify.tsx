import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Loader2, Sparkles, DollarSign, Tag } from 'lucide-react';
import { identifyItem } from '../api/client';
import type { AIIdentification } from '../api/client';
import toast from 'react-hot-toast';

export default function Identify() {
  const [image, setImage] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIIdentification | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleIdentify = async () => {
    if (!image) return;
    
    setLoading(true);
    try {
      const res = await identifyItem(image, context || undefined);
      setResult(res.data);
      toast.success('Item identified!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to identify item');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToInventory = () => {
    // Navigate to add page with pre-filled data
    const params = new URLSearchParams({
      name: result?.item_name || '',
      category: result?.category || '',
      description: result?.description || '',
      suggested_price: result?.suggested_price?.toString() || '',
      estimated_low: result?.estimated_value_low?.toString() || '',
      estimated_high: result?.estimated_value_high?.toString() || '',
      ai_data: JSON.stringify(result),
      photo: image || '',
    });
    navigate(`/add?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">🔍 AI Item Identifier</h2>
      <p className="text-sm text-gray-500">
        Take a photo and get instant identification, value estimate, and pricing suggestions.
      </p>

      {/* Image capture */}
      {!image ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="bg-purple-600 text-white rounded-xl p-6 flex flex-col items-center justify-center gap-2 active:scale-95 transition"
          >
            <Camera size={32} />
            <span>Take Photo</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-600 text-white rounded-xl p-6 flex flex-col items-center justify-center gap-2 active:scale-95 transition"
          >
            <Upload size={32} />
            <span>Upload</span>
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
      ) : (
        <div className="space-y-4">
          {/* Image preview */}
          <div className="relative">
            <img
              src={image}
              alt="Item"
              className="w-full h-64 object-contain bg-gray-100 rounded-xl"
            />
            <button
              onClick={() => { setImage(null); setResult(null); }}
              className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm"
            >
              Clear
            </button>
          </div>

          {/* Additional context */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional context (optional)
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Found at estate sale, has makers mark on bottom"
              className="w-full p-3 border rounded-lg"
            />
          </div>

          {/* Identify button */}
          {!result && (
            <button
              onClick={handleIdentify}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Identify Item
                </>
              )}
            </button>
          )}

          {/* Results */}
          {result && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-amber-600 text-white p-4">
                <h3 className="text-lg font-bold">{result.item_name}</h3>
                <p className="text-sm opacity-90">{result.era_period}</p>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Value estimate */}
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                    <DollarSign size={18} />
                    Value Estimate
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    ${result.estimated_value_low} - ${result.estimated_value_high}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    <strong>Suggested price: ${result.suggested_price}</strong>
                  </p>
                </div>

                {/* Category */}
                <div className="flex items-center gap-2 text-sm">
                  <Tag size={16} className="text-gray-400" />
                  <span className="capitalize">{result.category.replace('_', ' ')}</span>
                  <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                    {result.confidence} confidence
                  </span>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-sm text-gray-600">{result.description}</p>
                </div>

                {/* Condition */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Condition Notes</h4>
                  <p className="text-sm text-gray-600">{result.condition_notes}</p>
                </div>

                {/* Selling tips */}
                <div className="bg-amber-50 rounded-lg p-3">
                  <h4 className="font-medium text-amber-700 mb-1">💡 Selling Tips</h4>
                  <p className="text-sm text-amber-800">{result.selling_tips}</p>
                </div>

                {/* Keywords */}
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                      {kw}
                    </span>
                  ))}
                </div>

                {/* Add to inventory button */}
                <button
                  onClick={handleAddToInventory}
                  className="w-full bg-amber-600 text-white py-3 rounded-lg font-semibold"
                >
                  Add to Inventory
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
