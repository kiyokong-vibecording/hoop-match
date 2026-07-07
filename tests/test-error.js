const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
window.addEventListener("load", async () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  try {
    await new Promise((res) => setTimeout(res, 60));
    // 読込失敗: エラーメッセージ表示・クラッシュしない
    t("load_error_shown", document.getElementById("publicStatus").textContent.includes("読み込めませんでした"));
    t("error_class", document.getElementById("publicStatus").classList.contains("error-text"));
    t("no_public_listings", publicListings.length === 0);
    // ローカル一覧は正常に描画されている
    t("local_grid_ok", document.getElementById("listingGrid") !== null);

    // 公開投稿失敗: alertで通知され、ローカルは汚れない
    let alerts = [];
    window.alert = (m) => alerts.push(m);
    const form = document.getElementById("listingForm");
    form.elements.type.value = "opponent";
    form.elements.category.value = "社会人同好会";
    form.elements.title.value = "エラーテスト";
    form.elements.prefecture.value = "東京都";
    form.elements.prefecture.dispatchEvent(new Event("input"));
    form.elements.municipality.value = "新宿区";
    form.elements.date.value = "2026-09-01";
    form.elements.level.value = "エンジョイ";
    document.getElementById("listingVisibility").value = "public";
    document.getElementById("listingVisibility").dispatchEvent(new Event("change"));
    document.getElementById("publicTermsAgree").checked = true;
    const before = state.listings.length;
    await handleListingSubmit(new Event("submit", { cancelable: true }));
    t("submit_error_alerted", alerts.some((m) => m.includes("送信できませんでした")));
    t("no_manage_key_on_error", state.myPublicListings.length === 0);
    t("no_local_pollution", state.listings.length === before);
    t("form_values_kept", form.elements.title.value === "エラーテスト");
  } catch (e) {
    r.push("EXCEPTION " + e.message);
  }
  r.push("DONE"); flush();
});
