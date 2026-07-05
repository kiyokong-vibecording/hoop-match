// サーバーエラーを返すスタブ
window.HOOP_CONFIG = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "x".repeat(40) };
window.fetch = async () => ({ ok: false, status: 500, json: async () => ({ message: "internal error" }) });
