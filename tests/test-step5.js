const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };

window.addEventListener("load", () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  const form = document.getElementById("listingForm");
  const banner = document.getElementById("listingFacilityBanner");

  // 1) 施設検索を実行してカードのボタン文言を確認
  document.getElementById("facilitySearchPrefecture").value = "東京都";
  document.getElementById("facilitySearchPrefecture").dispatchEvent(new Event("change"));
  const btn = [...document.querySelectorAll("#facilityList button")]
    .find((b) => b.textContent === "この施設で募集を作成");
  t("button_label_updated", !!btn);

  // 2) ボタンクリック → フォームにプリフィル+バナー表示
  btn.click();
  t("banner_visible", banner.hidden === false);
  t("banner_text", document.getElementById("listingFacilityBannerText").textContent.includes("利用予定施設:"));
  t("facilityId_set", form.elements.facilityId.value.length > 0);
  t("prefecture_prefilled", form.elements.prefecture.value === "東京都");
  t("courtReserved_checked", form.elements.courtReserved.checked === true);
  t("notes_include_facility", form.elements.notes.value.includes("利用予定施設:"));
  t("view_switched", document.body.classList.contains("view-listings"));
  const facilityName = form.elements.facilityName.value;

  // 3) 同じ施設をもう一度クリックしてもnotesが重複しない
  document.getElementById("homeButton") && null;
  switchAppView("facilities");
  document.getElementById("facilitySearchPrefecture").dispatchEvent(new Event("change"));
  const btn2 = [...document.querySelectorAll("#facilityList button")]
    .find((b) => b.textContent === "この施設で募集を作成");
  btn2.click();
  const occurrences = form.elements.notes.value.split("利用予定施設:").length - 1;
  t("notes_no_duplicate", occurrences === 1);

  // 4) 募集を保存 → facilityId/facilityName保存、カードに会場タグ、共有文に会場
  form.elements.type.value = "opponent";
  form.elements.category.value = "草バスケ";
  form.elements.category.dispatchEvent(new Event("change"));
  form.elements.title.value = "施設連携テスト募集";
  form.elements.date.value = "2099-01-01";
  form.elements.level.value = "中級";
  handleListingSubmit({ preventDefault: () => {} });
  const saved = state.listings.find((l) => l.title === "施設連携テスト募集");
  t("listing_saved_with_facility", !!saved && saved.facilityName === facilityName && !!saved.facilityId);
  t("banner_cleared_after_submit", banner.hidden === true && form.elements.facilityId.value === "");

  const card = [...document.querySelectorAll("#listingGrid .listing-card")]
    .find((c) => c.querySelector("h3").textContent === "施設連携テスト募集");
  const tags = [...card.querySelectorAll(".tag-row span")].map((s) => s.textContent);
  t("card_has_venue_tag", tags.some((x) => x === "会場: " + facilityName));
  t("share_text_has_venue", makeShareText(saved).includes("会場: " + facilityName));

  // 5) 解除ボタン
  prefillListingFromFacility(getAllFacilities()[0]);
  document.getElementById("clearListingFacility").click();
  t("clear_button_works", banner.hidden === true && form.elements.facilityId.value === "");

  // 6) 施設なしで作成した募集には会場タグが付かない
  form.elements.title.value = "施設なし募集";
  form.elements.category.value = "草バスケ";
  form.elements.prefecture.value = "東京都";
  form.elements.prefecture.dispatchEvent(new Event("input"));
  document.getElementById("listingMunicipality").append(new Option("世田谷区", "世田谷区"));
  form.elements.municipality.value = "世田谷区";
  form.elements.date.value = "2099-01-02";
  handleListingSubmit({ preventDefault: () => {} });
  const noFac = state.listings.find((l) => l.title === "施設なし募集");
  t("no_facility_fields_when_unset", !!noFac && !("facilityId" in noFac) && !("facilityName" in noFac));

  r.push("DONE");
  flush();
});
