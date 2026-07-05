const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
window.addEventListener("load", () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  t("catalog_149", window.FACILITY_CATALOG.length === 149);

  // 全47都道府県で検索1件以上ヒットするか一括チェック
  const prefs = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
  switchAppView("facilities");
  const sel = document.getElementById("facilitySearchPrefecture");
  const empty = [];
  prefs.forEach(p => {
    sel.value = p;
    sel.dispatchEvent(new Event("change"));
    const n = document.querySelectorAll("#facilityList .facility-item").length;
    if (n === 0) empty.push(p);
  });
  t("all_47_prefs_hit", empty.length === 0);
  if (empty.length) r.push("0件の県: " + empty.join(","));

  // 新規追加のURLサンプル確認
  const morioka = getAllFacilities().find(f=>f.id==="morioka-arena-gym");
  t("morioka_gym_type", morioka && morioka.facilityType === "体育館");
  const ehime = getAllFacilities().find(f=>f.id==="ehime-pref-yoyaku");
  t("ehime_url_ok", ehime && ehime.reservationUrl.startsWith("https://"));
  r.push("DONE"); flush();
});
