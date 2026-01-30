import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Loader2, Sparkles, DollarSign, Tag, Info, Lightbulb, X } from 'lucide-react';
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
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-display font-semibold text-mahogany flex items-center justify-center gap-2">
          <Sparkles className="text-gold" size={24} />
          AI Identifier
        </h2>
        <p className="text-bronze text-sm mt-1">
          Snap a photo for instant identification & valuation
        </p>
      </div>

      {/* Image capture */}
      {!image ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="card p-8 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-wine to-wine-light flex items-center justify-center shadow-lg">
              <Camera size={32} className="text-white" />
            </div>
            <span className="font-semibold text-mahogany">Take Photo</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="card p-8 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-bronze to-mahogany flex items-center justify-center shadow-lg">
              <Upload size={32} className="text-white" />
            </div>
            <span className="font-semibold text-mahogany">Upload</span>
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
              className="w-full h-64 object-contain bg-cream-dark rounded-2xl"
            />
            <button
              onClick={() => { setImage(null); setResult(null); }}
              className="absolute top-3 right-3 w-10 h-10 bg-wine text-white rounded-full flex items-center justify-center shadow-lg active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          {/* Additional context */}
          <div>
            <label className="block text-sm font-medium text-mahogany mb-2">
              Additional context (optional)
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Found at estate sale, has makers mark on bottom"
              className="w-full p-4 border rounded-xl bg-white"
            />
          </div>

          {/* Identify button */}
          {!result && (
            <button
              onClick={handleIdentify}
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-3 py-4 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={22} />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Sparkles size={22} />
                  Identify & Value Item
                </>
              )}
            </button>
          )}

          {/* Results */}
          {result && (
            <div className="card overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-wine to-wine-light text-white p-5">
                <h3 className="text-xl font-display font-semibold">{result.item_name}</h3>
                <p className="text-white/80 text-sm mt-1">{result.era_period}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                  result.confidence === 'high' ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  {result.confidence} confidence
                </span>
              </div>
              
              <div className="p-5 space-y-5">
                {/* Value estimate */}
                <div className="bg-sage/10 rounded-xl p-4 border border-sage/20">
                  <div className="flex items-center gap-2 text-sage font-semibold mb-2">
                    <DollarSign size={20} />
                    Value Estimate
                  </div>
                  <p className="text-3xl font-display font-bold text-sage">
                    ${result.estimated_value_low} - ${result.estimated_value_high}
                  </p>
                  <div className="mt-3 pt-3 border-t border-sage/20">
                    <p className="text-sm text-mahogany">
                      <strong className="text-wine">Suggested price: ${result.suggested_price}</strong>
                    </p>
                  </div>
                </div>

                {/* Category */}
                <div className="flex items-center gap-3 text-sm">
                  <Tag size={18} className="text-bronze" />
                  <span className="capitalize text-mahogany font-medium">{result.category.replace('_', ' ')}</span>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-mahogany font-semibold">
                    <Info size={18} className="text-wine" />
                    Description
                  </div>
                  <p className="text-sm text-bronze leading-relaxed">{result.description}</p>
                </div>

                {/* Condition */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-mahogany font-semibold">
                    <Info size={18} className="text-gold" />
                    Condition Notes
                  </div>
                  <p className="text-sm text-bronze leading-relaxed">{result.condition_notes}</p>
                </div>

                {/* Selling tips */}
                <div className="bg-gold/10 rounded-xl p-4 border border-gold/20">
                  <div className="flex items-center gap-2 text-gold-dark font-semibold mb-2">
                    <Lightbulb size={18} />
                    Selling Tips
                  </div>
                  <p className="text-sm text-mahogany leading-relaxed">{result.selling_tips}</p>
                </div>

                {/* Keywords */}
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1 bg-cream-dark rounded-full text-xs text-bronze font-medium">
                      {kw}
                    </span>
                  ))}
                </div>

                {/* Add to inventory button */}
                <button
                  onClick={handleAddToInventory}
                  className="w-full btn-secondary flex items-center justify-center gap-2"
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
