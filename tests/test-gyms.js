const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
window.addEventListener("load", () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  t("catalog_149", window.FACILITY_CATALOG.length === 149);
  // 宿泊カテゴリが存在しないこと
  const typeOpts = [...document.getElementById("facilitySearchType").options].map(o=>o.textContent);
  t("no_lodging_type", !typeOpts.includes("宿泊・合宿施設"));
  // 新規体育館が「体育館」タイプで検索できること
  const search = (pref, type) => {
    switchAppView("facilities");
    const p = document.getElementById("facilitySearchPrefecture");
    const ty = document.getElementById("facilitySearchType");
    p.value = pref; ty.value = type;
    p.dispatchEvent(new Event("change"));
    return [...document.querySelectorAll("#facilityList .facility-item")]
      .map(it => it.querySelector("a,strong")?.textContent || "");
  };
  t("yamanashi_toshokan_gym", search("山梨県","体育館").some(n=>n.includes("東照館 体育館")));
  t("tochigi_famitic_gym", search("栃木県","体育館").some(n=>n.includes("ファミテック明神 体育館")));
  t("saitama_sunpia_gym", search("埼玉県","体育館").some(n=>n.includes("多目的体育館")));
  const chibaGyms = search("千葉県","体育館");
  t("chiba_aerbin_gym", chibaGyms.some(n=>n.includes("アルビンスポーツパーク体育館")));
  t("chiba_yokoshiba_bg", chibaGyms.some(n=>n.includes("横芝B&amp;G") || n.includes("横芝B&G")));
  t("shizuoka_outdoor_court", search("静岡県","屋外コート").some(n=>n.includes("ballaholic")));
  r.push("DONE"); flush();
});
