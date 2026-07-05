const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
const calls = window.__calls;

window.addEventListener("load", async () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  try {
    t("api_enabled", publicApiEnabled() === true);
    t("toolbar_visible", document.getElementById("publicToolbar").hidden === false);
    t("public_option_enabled", document.getElementById("publicVisibilityOption").disabled === false);

    await new Promise((res) => setTimeout(res, 60));
    t("public_listings_loaded", publicListings.length === 2);
    const pubCards = [...document.querySelectorAll("#listingGrid .listing-card.public-listing")];
    t("public_cards_rendered", pubCards.length === 2);
    t("public_badge_shown", pubCards.every((c) => c.querySelector(".public-badge")?.textContent === "公開"));
    t("report_button_on_public", pubCards.every((c) => c.querySelector(".delete")?.textContent === "通報"));
    t("status_text_set", document.getElementById("publicStatus").textContent.includes("公開募集 2件"));

    document.getElementById("filterPrefecture").value = "愛知県";
    document.getElementById("filterPrefecture").dispatchEvent(new Event("input"));
    document.getElementById("applyListingFilters").click();
    const aichiCards = [...document.querySelectorAll("#listingGrid .listing-card.public-listing")];
    t("filter_applies_to_public", aichiCards.length === 1 && aichiCards[0].textContent.includes("名古屋で5on5"));
    document.getElementById("filterPrefecture").value = "all";
    document.getElementById("filterPrefecture").dispatchEvent(new Event("input"));
    document.getElementById("applyListingFilters").click();

    let alerts = [];
    window.alert = (msg) => alerts.push(msg);
    const form = document.getElementById("listingForm");
    form.elements.type.value = "opponent";
    form.elements.category.value = "一般";
    form.elements.title.value = "公開投稿テスト";
    form.elements.prefecture.value = "東京都";
    form.elements.municipality.value = "新宿区";
    form.elements.date.value = "2026-09-01";
    form.elements.level.value = "エンジョイ";
    document.getElementById("listingVisibility").value = "public";
    document.getElementById("listingVisibility").dispatchEvent(new Event("change"));
    t("consent_box_shown", document.getElementById("publicConsentBox").hidden === false);
    await handleListingSubmit(new Event("submit", { cancelable: true }));
    t("blocked_without_terms", alerts.some((m) => m.includes("同意")) && state.myPublicListings.length === 0);

    document.getElementById("publicTermsAgree").checked = true;
    // reset()後もvalueが必要なので再設定は不要(この時点の値で送信される)
    await handleListingSubmit(new Event("submit", { cancelable: true }));
    t("submit_listing_called", calls.some((c) => c.url.includes("/rpc/submit_listing") && c.body.p_title === "公開投稿テスト"));
    t("manage_key_saved", state.myPublicListings.length === 1 && state.myPublicListings[0].manageKey === "key-abc");
    t("pending_message_shown", alerts.some((m) => m.includes("承認後に全国へ公開")));
    t("status_saved_as_pending", state.myPublicListings[0].status === "pending");

    // 自動承認(即時公開)されるケース: サーバーがstatus=approvedを返す
    form.elements.type.value = "opponent";
    form.elements.category.value = "一般";
    form.elements.level.value = "エンジョイ";
    form.elements.title.value = "即時公開テスト";
    form.elements.prefecture.value = "東京都";
    form.elements.municipality.value = "新宿区";
    form.elements.date.value = "2026-09-02";
    document.getElementById("listingVisibility").value = "public";
    document.getElementById("listingVisibility").dispatchEvent(new Event("change"));
    document.getElementById("publicTermsAgree").checked = true;
    await handleListingSubmit(new Event("submit", { cancelable: true }));
    t("approved_message_shown", alerts.some((m) => m.includes("すでに全国へ公開")));
    t("status_saved_as_approved", state.myPublicListings[0].status === "approved");
    t("saved_to_localstorage", JSON.parse(localStorage.getItem("hoop-match-v1")).myPublicListings.length === 2);
    t("my_public_section_visible", document.getElementById("myPublicSection").hidden === false);
    t("form_back_to_local", document.getElementById("listingVisibility").value === "local" && document.getElementById("publicConsentBox").hidden === true);

    state.team = { name: "Test Reps", prefecture: "東京都", municipality: "新宿区", area: "東京都新宿区", category: "一般", level: "エンジョイ", adultConfirmed: true };
    saveState();
    const target = publicListings.find((l) => l.id === "pub-1");
    startApplication(target);
    t("public_apply_fields_shown", document.getElementById("publicApplyFields").hidden === false);
    const appForm = document.getElementById("applicationForm");
    appForm.elements.message.value = "対戦お願いします";
    appForm.elements.contact.value = "";
    await handleApplicationSubmit(new Event("submit", { cancelable: true }));
    t("blocked_without_contact", document.getElementById("privateNotice").textContent.includes("連絡先"));
    startApplication(target);
    appForm.elements.message.value = "対戦お願いします";
    appForm.elements.contact.value = "rep@example.com";
    const appsBefore = state.applications.length;
    await handleApplicationSubmit(new Event("submit", { cancelable: true }));
    t("submit_application_called", calls.some((c) => c.url.includes("/rpc/submit_application") && c.body.p_contact === "rep@example.com"));
    t("copy_saved_locally", state.applications.length === appsBefore + 1 && state.applications[0].sentToPublic === true);
    t("success_message", document.getElementById("privateNotice").textContent.includes("送信しました"));

    const youth = publicListings.find((l) => l.id === "pub-2");
    startApplication(youth);
    appForm.elements.message.value = "参加希望";
    appForm.elements.contact.value = "coach@example.com";
    document.getElementById("applicationAdultConfirmed").checked = false;
    await handleApplicationSubmit(new Event("submit", { cancelable: true }));
    t("youth_blocked_without_adult", document.getElementById("privateNotice").textContent.includes("18歳以上"));

    window.prompt = () => "個人情報が書かれています";
    const reportBtn = [...document.querySelectorAll("#listingGrid .listing-card.public-listing .delete")][0];
    reportBtn.click();
    await new Promise((res) => setTimeout(res, 20));
    t("report_called", calls.some((c) => c.url.includes("/rpc/report_listing")));
    t("report_button_marked", reportBtn.textContent === "通報済み");

    const checkBtn = [...document.querySelectorAll("#myPublicList button")].find((b) => b.textContent === "応募を確認");
    checkBtn.click();
    await new Promise((res) => setTimeout(res, 30));
    t("detail_fetched", calls.some((c) => c.url.includes("/rpc/get_my_listing_detail")));
    t("application_shown", document.getElementById("myPublicList").textContent.includes("rep@example.com"));
    window.confirm = () => true;
    const closeBtn = [...document.querySelectorAll("#myPublicList button")].find((b) => b.textContent === "募集を終了");
    closeBtn.click();
    await new Promise((res) => setTimeout(res, 30));
    t("close_called", calls.some((c) => c.url.includes("/rpc/close_listing")));
    t("status_closed", state.myPublicListings[0].status === "closed");
  } catch (e) {
    r.push("EXCEPTION " + e.message);
  }
  r.push("DONE"); flush();
});
