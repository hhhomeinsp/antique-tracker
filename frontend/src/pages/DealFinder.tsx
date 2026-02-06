import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Sparkles, X, ExternalLink, Search, Flame, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

interface ShelfItem {
  item_name: string;
  description: string;
  category: string;
  estimated_shelf_price: number;
  ebay_low: number;
  ebay_high: number;
  ebay_avg: number;
  profit_potential: number;
  deal_rating: string;
  search_query: string;
  confidence: string;
}

interface ScanResult {
  total_items_found: number;
  deals: ShelfItem[];
  scan_summary: string;
}

export default function DealFinder() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!image) return;
    
    setLoading(true);
    try {
      const res = await api.post('/api/ai/scan-shelf', { image, max_items: 10 });
      setResult(res.data);
      if (res.data.deals.length > 0) {
        toast.success(`Found ${res.data.deals.length} items!`);
      } else {
        toast('No valuable items found. Try a different angle.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to scan shelf');
    } finally {
      setLoading(false);
    }
  };

  const getDealIcon = (rating: string) => {
    if (rating.includes('Hot')) return <Flame className="text-orange-500" size={20} />;
    if (rating.includes('Good')) return <CheckCircle className="text-green-500" size={20} />;
    if (rating.includes('Maybe')) return <AlertCircle className="text-yellow-500" size={20} />;
    return <XCircle className="text-gray-400" size={20} />;
  };

  const getDealColor = (rating: string) => {
    if (rating.includes('Hot')) return 'border-orange-400 bg-orange-50';
    if (rating.includes('Good')) return 'border-green-400 bg-green-50';
    if (rating.includes('Maybe')) return 'border-yellow-400 bg-yellow-50';
    return 'border-gray-300 bg-gray-50';
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-display font-semibold text-mahogany flex items-center justify-center gap-2">
          <Search className="text-gold" size={24} />
          AI Deal Finder
        </h2>
        <p className="text-bronze text-sm mt-1">
          Snap a shelf photo to find hidden treasures
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
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-bronze to-gold flex items-center justify-center shadow-lg">
              <Upload size={32} className="text-white" />
            </div>
            <span className="font-semibold text-mahogany">Upload</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative">
            <img src={image} alt="Shelf" className="w-full rounded-xl shadow-lg" />
            <button
              onClick={() => { setImage(null); setResult(null); }}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scan button */}
          {!result && (
            <button
              onClick={handleScan}
              disabled={loading}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Analyzing shelf...
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  Find Deals
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Hidden inputs */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="card p-4 bg-gradient-to-r from-wine/10 to-gold/10 text-center">
            <p className="text-lg font-semibold text-mahogany">{result.scan_summary}</p>
            <p className="text-sm text-bronze mt-1">{result.total_items_found} items analyzed</p>
          </div>

          {/* Deal list */}
          <div className="space-y-3">
            {result.deals.map((item, index) => (
              <div
                key={index}
                className={`card p-4 border-2 ${getDealColor(item.deal_rating)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getDealIcon(item.deal_rating)}
                      <h3 className="font-semibold text-mahogany">{item.item_name}</h3>
                    </div>
                    <p className="text-sm text-bronze mt-1">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-cream rounded-full text-bronze">{item.category}</span>
                      <span className="text-xs text-bronze">Confidence: {item.confidence}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-wine">{item.profit_potential}x</div>
                    <div className="text-xs text-bronze">profit potential</div>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="mt-3 pt-3 border-t border-cream grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-bronze uppercase">Shelf Price</div>
                    <div className="text-lg font-semibold text-mahogany">${item.estimated_shelf_price}</div>
                  </div>
                  <div>
                    <div className="text-xs text-bronze uppercase">eBay Value</div>
                    <div className="text-lg font-semibold text-green-600">
                      ${item.ebay_low} - ${item.ebay_high}
                    </div>
                    <div className="text-xs text-bronze">avg: ${item.ebay_avg}</div>
                  </div>
                </div>

                {/* eBay search link */}
                {item.search_query && (
                  <a
                    href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(item.search_query)}&LH_Complete=1&LH_Sold=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 text-sm text-wine hover:underline"
                  >
                    <ExternalLink size={14} />
                    View on eBay
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Scan again button */}
          <button
            onClick={() => { setImage(null); setResult(null); }}
            className="w-full btn-secondary py-3"
          >
            Scan Another Shelf
          </button>
        </div>
      )}

      {/* Tips */}
      {!image && (
        <div className="card p-4 bg-cream/50">
          <h3 className="font-semibold text-mahogany mb-2">📸 Tips for best results:</h3>
          <ul className="text-sm text-bronze space-y-1">
            <li>• Get a clear, well-lit photo of the shelf</li>
            <li>• Include multiple items in frame</li>
            <li>• Focus on glassware, pottery, and vintage items</li>
            <li>• Avoid blurry or dark photos</li>
          </ul>
        </div>
      )}
    </div>
  );
}
