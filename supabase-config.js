// Supabase Configuration
// Uses environment variables when available, falls back to hardcoded values

const SUPABASE_CONFIG = {
    // Prefer runtime-configured values from window.APP_CONFIG when present (frontend)
    url: (typeof window !== 'undefined' && window.APP_CONFIG?.SUPABASE_URL)
        || (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL)
        || '',
    anonKey: (typeof window !== 'undefined' && window.APP_CONFIG?.SUPABASE_ANON_KEY)
        || (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        || ''
};

// Minimal, non-sensitive log
console.log('🔧 Supabase Config loaded');

export default SUPABASE_CONFIG;