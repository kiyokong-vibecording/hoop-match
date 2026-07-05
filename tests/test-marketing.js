const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
window.addEventListener("load", () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  try {
    // 1) OGP・SEOメタタグ
    const og = (p) => document.querySelector(`meta[property="${p}"]`)?.content || "";
    t("og_title", og("og:title").includes("Hoop Match"));
    t("og_image_absolute", og("og:image").startsWith("https://"));
    t("og_locale_ja", og("og:locale") === "ja_JP");
    t("twitter_card", document.querySelector('meta[name="twitter:card"]')?.content === "summary_large_image");
    t("jsonld_present", Boolean(document.querySelector('script[type="application/ld+json"]')));
    t("title_ja", document.title.includes("バスケ"));
    t("description_ja", document.querySelector('meta[name="description"]').content.includes("47都道府県"));

    // 2) 共有文: file://ではURL行なし(公開時のみ付く設計)
    const sample = { type: "opponent", category: "一般", title: "T", prefecture: "東京都", municipality: "新宿区", date: "2026-09-01", level: "E", courtReserved: false };
    const text = makeShareText(normalizeLocation(sample));
    t("no_url_on_file", !text.includes("▼募集を見る"));
    // http想定のロジック確認(appUrlLineの分岐)
    t("appurlline_defined", typeof appUrlLine === "function");

    // 3) GA4: 未設定なら何も読み込まれない
    t("no_gtag_by_default", !document.querySelector('script[src*="googletagmanager"]') && typeof window.gtag === "undefined");

    // 4) 空一覧CTA: 県フィルタで0件→県名入りCTAが出る
    state.listings = [];
    saveState();
    document.getElementById("filterPrefecture").value = "沖縄県";
    document.getElementById("filterPrefecture").dispatchEvent(new Event("input"));
    document.getElementById("applyListingFilters").click();
    const cta = document.querySelector("#listingGrid .empty-cta");
    t("cta_rendered", Boolean(cta));
    t("cta_mentions_prefecture", cta.textContent.includes("沖縄県の募集はまだありません"));
    const createBtn = [...cta.querySelectorAll("button")].find((b) => b.textContent.includes("募集を作成"));
    t("cta_create_button", createBtn.textContent === "沖縄県で募集を作成する");
    // クリックで募集フォームの県がプリセットされる
    createBtn.click();
    t("prefecture_prefilled", document.getElementById("listingForm").elements.prefecture.value === "沖縄県");
    // 施設検索ボタン
    const facBtn = [...cta.querySelectorAll("button")].find((b) => b.textContent.includes("体育館"));
    facBtn.click();
    t("facility_view_switched", document.getElementById("facilitySearchPrefecture").value === "沖縄県");
    const facItems = document.querySelectorAll("#facilityList .facility-item").length;
    t("facility_results_shown", facItems >= 1);
  } catch (e) {
    r.push("EXCEPTION " + e.message);
  }
  r.push("DONE"); flush();
});
