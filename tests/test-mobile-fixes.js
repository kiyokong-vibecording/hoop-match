// スマホ実使用フィードバック対応のテスト(カウント/スクロール/バナー/日付幅/終了削除/市区町村セレクト/ユーザーバッジ)
const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
const calls = window.__calls;

// scrollIntoViewの呼び出しを記録するスパイ
const scrolled = [];
const origScroll = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function (...args) {
  scrolled.push(this.id || this.className || this.tagName);
  return origScroll ? undefined : undefined;
};

window.addEventListener("load", async () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  try {
    await new Promise((res) => setTimeout(res, 60));

    // 1) トップのカウントに公開募集(opponent 1件 + member 1件)が含まれる
    t("count_match_includes_public", Number(document.getElementById("countMatch").textContent) >= 1);
    t("count_member_includes_public", Number(document.getElementById("countMember").textContent) >= 1);

    // 2) サマリーカード押下で募集一覧へスクロールする
    scrolled.length = 0;
    document.querySelector('[data-summary-action="opponent"]').click();
    t("summary_click_scrolls", scrolled.length >= 1);
    scrolled.length = 0;
    document.querySelector('[data-summary-action="facilities"]').click();
    t("facility_click_scrolls", scrolled.length >= 1);

    // 3) 新着メッセージバナー: 未読があると表示され、クリックで非公開パネルへスクロール
    state.myPublicListings.unshift({ id: "new-123", manageKey: "key-abc", title: "バナーテスト募集", status: "approved", createdAt: new Date().toISOString(), seenApplicationCount: 0 });
    saveState();
    await checkPublicInbox();
    const banner = document.getElementById("inboxBanner");
    t("banner_visible", banner.hidden === false);
    t("banner_shows_counts", banner.textContent.includes("応募 +2"));
    scrolled.length = 0;
    banner.click();
    t("banner_click_scrolls_private", scrolled.length >= 1);

    // 4) 日付入力がフォームからはみ出さない
    const dateInput = document.querySelector('#listingForm input[type="date"]');
    const form = document.getElementById("listingForm");
    const d = dateInput.getBoundingClientRect();
    const f = form.getBoundingClientRect();
    t("date_input_fits", d.right <= f.right + 1 && d.left >= f.left - 1);
    t("date_input_box_sizing", getComputedStyle(dateInput).boxSizing === "border-box");

    // 5) 終了した公開募集を一覧から削除できる
    state.myPublicListings[0].status = "closed";
    renderMyPublicListings();
    const removeBtn = [...document.querySelectorAll("#myPublicList button")].find((b) => b.textContent === "一覧から削除");
    t("remove_button_for_closed", Boolean(removeBtn));
    window.confirm = () => false;
    removeBtn.click();
    t("remove_cancel_keeps", state.myPublicListings.some((e) => e.id === "new-123"));
    window.confirm = () => true;
    [...document.querySelectorAll("#myPublicList button")].find((b) => b.textContent === "一覧から削除").click();
    t("remove_confirmed", !state.myPublicListings.some((e) => e.id === "new-123"));

    // 6) 施設フォームの市区町村が選択式(都道府県連動+その他直接入力)
    const prefSelect = document.getElementById("facilityPrefecture");
    prefSelect.value = "東京都";
    prefSelect.dispatchEvent(new Event("input"));
    const muniSelect = document.getElementById("facilityMunicipality");
    t("municipality_is_select", muniSelect.tagName === "SELECT");
    t("municipality_options_populated", muniSelect.options.length > 2);
    t("has_other_option", [...muniSelect.options].some((o) => o.value === "__other__"));
    t("other_input_hidden_default", document.getElementById("facilityMunicipalityOtherLabel").hidden === true);
    muniSelect.value = "__other__";
    muniSelect.dispatchEvent(new Event("change"));
    t("other_input_shown", document.getElementById("facilityMunicipalityOtherLabel").hidden === false);

    // その他入力で施設を追加できる
    const facForm = document.getElementById("facilityForm");
    facForm.elements.name.value = "テスト체育館";
    facForm.elements.name.value = "テスト体育館";
    facForm.elements.reservationMethod.value = "窓口予約";
    facForm.elements.facilityType.value = "体育館";
    document.getElementById("facilityMunicipalityOther").value = "テスト市";
    const before = state.facilities.length;
    handleFacilitySubmit(new Event("submit", { cancelable: true }));
    t("facility_added_with_other", state.facilities.length === before + 1 && state.facilities[0].municipality === "テスト市");
    t("facility_source_user", state.facilities[0].source === "user");

    // 7) ユーザー追加施設にバッジが付く
    switchAppView("facilities");
    document.getElementById("facilitySearchPrefecture").value = "東京都";
    document.getElementById("facilitySearchPrefecture").dispatchEvent(new Event("change"));
    const userCard = [...document.querySelectorAll("#facilityList .facility-item")].find((it) => it.textContent.includes("テスト体育館"));
    t("user_badge_shown", Boolean(userCard) && [...userCard.querySelectorAll(".facility-tag")].some((tag) => tag.classList.contains("user-added") && tag.textContent === "ユーザー追加"));
    const catalogCard = [...document.querySelectorAll("#facilityList .facility-item")].find((it) => !it.textContent.includes("テスト体育館"));
    t("catalog_no_user_badge", Boolean(catalogCard) && ![...catalogCard.querySelectorAll(".facility-tag")].some((tag) => tag.classList.contains("user-added")));

    // 同梱データはsourceがopas/labolaのものもある。誤ってバッジが付かないこと(過去バグの回帰防止)
    document.getElementById("facilitySearchPrefecture").value = "大阪府";
    document.getElementById("facilitySearchPrefecture").dispatchEvent(new Event("change"));
    const osakaCards = [...document.querySelectorAll("#facilityList .facility-item")];
    t("opas_labola_no_user_badge", osakaCards.length >= 3 && osakaCards.every((it) => ![...it.querySelectorAll(".facility-tag")].some((tag) => tag.classList.contains("user-added"))));

    // 後片付け
    state.facilities = state.facilities.filter((f) => f.name !== "テスト体育館");
    saveState();
  } catch (e) {
    r.push("EXCEPTION " + e.message);
  }
  r.push("DONE"); flush();
});
