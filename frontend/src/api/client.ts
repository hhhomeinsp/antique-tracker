import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Store {
  id: number;
  name: string;
  address?: string;
  city?: string;
  notes?: string;
}

export interface Item {
  id: number;
  name: string;
  description?: string;
  category: string;
  condition: string;
  purchase_price: number;
  purchase_date: string;
  store_id?: number;
  is_sold: boolean;
  sale_price?: number;
  sale_date?: string;
  suggested_price?: number;
  listed_price?: number;
  ai_identification?: string;
  estimated_value_low?: number;
  estimated_value_high?: number;
  photo?: string;
  notes?: string;
  profit?: number;
  profit_margin?: number;
  days_to_sell?: number;
}

export interface AIIdentification {
  item_name: string;
  description: string;
  category: string;
  era_period: string;
  estimated_value_low: number;
  estimated_value_high: number;
  suggested_price: number;
  condition_notes: string;
  selling_tips: string;
  keywords: string[];
  confidence: string;
}

export interface Category {
  value: string;
  label: string;
}

// API functions
export const getStores = () => api.get<Store[]>('/stores/');
export const createStore = (store: { name: string; city?: string }) => api.post<Store>('/stores/', store);
export const seedStores = () => api.post('/stores/seed-brevard');
export const getCategories = () => api.get<Category[]>('/items/categories');

export const getItems = (params?: { sold?: boolean; category?: string; store_id?: number }) => 
  api.get<Item[]>('/items/', { params });
export const createItem = (item: Partial<Item>) => api.post<Item>('/items/', item);
export const updateItem = (id: number, item: Partial<Item>) => api.patch<Item>(`/items/${id}`, item);
export const markSold = (id: number, sale_price: number) => 
  api.post<Item>(`/items/${id}/sell`, { sale_price });
export const deleteItem = (id: number) => api.delete(`/items/${id}`);

export const identifyItem = (image: string, context?: string) => 
  api.post<AIIdentification>('/ai/identify', { image, additional_context: context });

export const getAnalyticsSummary = (days?: number) => 
  api.get('/analytics/summary', { params: { days } });
export const getAnalyticsByStore = () => api.get('/analytics/by-store');
export const getAnalyticsByCategory = () => api.get('/analytics/by-category');
export const getBestShoppingDays = () => api.get('/analytics/best-shopping-days');
