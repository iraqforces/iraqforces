// الإعدادات العامة
export const USE_SIMULATION = import.meta.env.VITE_USE_SIMULATION === 'true';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://10.20.10.192/moi-search-engine';
export const HEALTH_URL = import.meta.env.VITE_HEALTH_URL || 'https://10.20.10.192/healthz';

// إعدادات Cache
export const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
export const MAX_CACHE_SIZE = 100;

// إعدادات Session
export const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 دقيقة

// إعدادات Rate Limiting
export const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 60000 },
  search: { maxRequests: 20, windowMs: 60000 },
  details: { maxRequests: 30, windowMs: 60000 },
  feedback: { maxRequests: 3, windowMs: 60000 },
};

// إعدادات Connectivity Check
export const CONNECTIVITY_CHECK_INTERVAL = 10000; // 10 ثوانٍ
export const CONNECTIVITY_TIMEOUT = 4000; // 4 ثوانٍ
