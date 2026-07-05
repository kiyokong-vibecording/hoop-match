// app.jsより先に実行: 設定とfetchスタブを仕込む
window.HOOP_CONFIG = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "x".repeat(40) };
window.__calls = [];
window.fetch = async (url, options = {}) => {
  window.__calls.push({ url: String(url), body: options.body ? JSON.parse(options.body) : null });
  const ok = (data) => ({ ok: true, status: 200, json: async () => data });
  const u = String(url);
  if (u.includes("/rest/v1/public_listings_view")) {
    return ok([
      { id: "pub-1", created_at: "2026-07-01T00:00:00Z", type: "opponent", category: "一般",
        title: "公開: 名古屋で5on5", prefecture: "愛知県", municipality: "名古屋市", area: "愛知県名古屋市",
        date: "2026-08-10", weekday: "", level: "エンジョイ", fee: "コート代割り勘",
        court_reserved: true, notes: "よろしくお願いします", facility_name: "", adult_confirmed: false, status: "approved" },
      { id: "pub-2", created_at: "2026-07-02T00:00:00Z", type: "member", category: "U15男子",
        title: "公開: U15メンバー募集", prefecture: "大阪府", municipality: "堺市", area: "大阪府堺市",
        date: "2026-08-20", weekday: "", level: "ガチ", fee: "",
        court_reserved: false, notes: "", facility_name: "", adult_confirmed: true, status: "approved" },
    ]);
  }
  if (u.includes("/rpc/submit_listing")) {
    // タイトルに「即時」を含む投稿は自動承認された想定、それ以外は承認待ち想定
    const approved = options.body && String(options.body).includes("即時");
    return ok({ id: "new-123", manage_key: "key-abc", status: approved ? "approved" : "pending" });
  }
  if (u.includes("/rpc/submit_application")) return ok({ ok: true });
  if (u.includes("/rpc/report_listing")) return ok({ ok: true });
  if (u.includes("/rpc/get_my_listing_detail")) return ok({ id: "new-123", title: "t", status: "approved",
    applications: [{ created_at: "2026-07-03T00:00:00Z", message: "対戦希望です", contact: "rep@example.com", applicant_name: "Test Reps", adult_confirmed: true }] });
  if (u.includes("/rpc/close_listing")) return ok({ ok: true });
  return { ok: false, status: 404, json: async () => ({ message: "not found" }) };
};
