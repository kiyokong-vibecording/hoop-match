const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
window.addEventListener("load", () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  try {
    switchAppView("facilities");
    document.getElementById("facilitySearchPrefecture").value = "山梨県";
    document.getElementById("facilitySearchPrefecture").dispatchEvent(new Event("change"));
    let items = [...document.querySelectorAll("#facilityList .facility-item")];
    t("yamanashi_1_item", items.length === 1);
    // 全施設(カタログ含む)に非表示ボタンがある
    const hideBtn = [...items[0].querySelectorAll("button")].find((b) => b.textContent === "非表示");
    t("catalog_has_hide_button", Boolean(hideBtn));
    t("no_delete_on_card", ![...items[0].querySelectorAll("button")].some((b) => b.textContent === "削除"));

    // 非表示にする → リストから消え、管理欄に現れる
    hideBtn.click();
    items = [...document.querySelectorAll("#facilityList .facility-item")];
    t("hidden_from_list", items.length === 0);
    const manager = document.getElementById("hiddenFacilityManager");
    t("manager_visible", manager.hidden === false);
    t("manager_count_1", document.getElementById("hiddenFacilityCount").textContent === "1");
    t("persisted", JSON.parse(localStorage.getItem("hoop-match-v1")).hiddenFacilityIds.length === 1);
    t("card_in_manager", document.getElementById("hiddenFacilityList").textContent.includes("東照館"));
    // カタログ施設には「完全に削除」が出ない
    t("no_permadelete_for_catalog", ![...document.querySelectorAll("#hiddenFacilityList button")].some((b) => b.textContent === "完全に削除"));

    // 再表示 → リストに戻る
    [...document.querySelectorAll("#hiddenFacilityList button")].find((b) => b.textContent === "再表示").click();
    items = [...document.querySelectorAll("#facilityList .facility-item")];
    t("restored_to_list", items.length === 1);
    t("manager_hidden_again", document.getElementById("hiddenFacilityManager").hidden === true);
    t("storage_cleared", JSON.parse(localStorage.getItem("hoop-match-v1")).hiddenFacilityIds.length === 0);

    // ユーザー追加施設: 非表示→管理欄に「完全に削除」が出る→confirm付きで削除
    state.facilities.push(normalizeLocation({ id: "user-test-1", source: "user", name: "テスト自作体育館", prefecture: "山梨県", municipality: "甲府市", reservationMethod: "窓口予約", facilityType: "体育館" }));
    saveState();
    renderFacilities();
    document.getElementById("facilitySearchPrefecture").value = "山梨県";
    document.getElementById("facilitySearchPrefecture").dispatchEvent(new Event("change"));
    items = [...document.querySelectorAll("#facilityList .facility-item")];
    t("user_facility_shown", items.length === 2);
    const userItem = items.find((it) => it.textContent.includes("テスト自作体育館"));
    [...userItem.querySelectorAll("button")].find((b) => b.textContent === "非表示").click();
    const permBtn = [...document.querySelectorAll("#hiddenFacilityList button")].find((b) => b.textContent === "完全に削除");
    t("permadelete_for_user", Boolean(permBtn));
    // confirmでキャンセル→残る
    window.confirm = () => false;
    permBtn.click();
    t("cancel_keeps_data", state.facilities.some((f) => f.id === "user-test-1"));
    // confirmでOK→完全削除
    window.confirm = () => true;
    [...document.querySelectorAll("#hiddenFacilityList button")].find((b) => b.textContent === "完全に削除").click();
    t("confirmed_delete", !state.facilities.some((f) => f.id === "user-test-1"));
    t("hidden_list_cleaned", state.hiddenFacilityIds.length === 0);

    // すべて再表示ボタン
    document.getElementById("facilitySearchPrefecture").value = "栃木県";
    document.getElementById("facilitySearchPrefecture").dispatchEvent(new Event("change"));
    [...document.querySelectorAll("#facilityList .facility-item button")].filter((b) => b.textContent === "非表示").forEach((b) => b.click());
    t("multiple_hidden", state.hiddenFacilityIds.length >= 1);
    document.getElementById("restoreAllFacilities").click();
    t("restore_all_works", state.hiddenFacilityIds.length === 0);

    // インポート互換(旧形式にhiddenFacilityIdsがなくても壊れない)
    const legacy = normalizeState({ listings: [], facilities: [], team: null, applications: [] });
    t("legacy_safe", Array.isArray(legacy.hiddenFacilityIds));
  } catch (e) {
    r.push("EXCEPTION " + e.message);
  }
  r.push("DONE"); flush();
});
