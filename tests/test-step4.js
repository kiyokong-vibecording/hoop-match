const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };

window.addEventListener("load", () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };

  const iso = (offsetDays) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const mk = (id, offset, title) => ({ id, type: "opponent", category: "草バスケ", title,
    prefecture: "東京都", municipality: "世田谷区", area: "東京都世田谷区",
    date: iso(offset), createdAt: new Date().toISOString(), level: "中級" });

  state.listings = [mk("past", -3, "過去募集"), mk("today", 0, "本日募集"),
    mk("tomorrow", 1, "明日募集"), mk("future", 10, "10日後募集")];
  // フィルタは「募集中のみ」オフで全件表示
  activeListingFilters = { type: "all", category: "all", level: "all", keyword: "",
    prefecture: "all", municipality: "all", courtOnly: false, activeOnly: false,
    dateRange: "all", weekday: "all", sort: "dateAsc" };
  renderListings();

  const cards = [...document.querySelectorAll("#listingGrid .listing-card")];
  t("four_cards", cards.length === 4);
  const byTitle = (title) => cards.find((c) => c.querySelector("h3").textContent === title);

  const past = byTitle("過去募集");
  t("past_greyed", past.classList.contains("expired"));
  t("past_label", past.querySelector(".days-left").textContent === "開催終了");
  t("past_apply_disabled", past.querySelector(".apply").disabled === true && past.querySelector(".apply").textContent === "受付終了");
  t("past_no_fresh_badge", past.querySelector(".fresh-badge").hidden === true);

  const today = byTitle("本日募集");
  t("today_label", today.querySelector(".days-left").textContent === "本日開催");
  t("today_not_greyed", !today.classList.contains("expired"));
  t("today_soon_style", today.querySelector(".days-left").classList.contains("soon"));

  const tomorrow = byTitle("明日募集");
  t("tomorrow_label", tomorrow.querySelector(".days-left").textContent === "明日開催");

  const future = byTitle("10日後募集");
  t("future_label", future.querySelector(".days-left").textContent === "あと10日");
  t("future_not_soon", !future.querySelector(".days-left").classList.contains("soon"));
  t("future_apply_enabled", future.querySelector(".apply").disabled === false);

  // 日付なし募集はバッジ非表示・グレーアウトなし
  state.listings.push({ id: "nodate", type: "member", category: "草バスケ", title: "日付なし",
    prefecture: "東京都", municipality: "世田谷区", area: "東京都世田谷区",
    createdAt: new Date().toISOString(), level: "中級" });
  renderListings();
  const nodate = [...document.querySelectorAll("#listingGrid .listing-card")]
    .find((c) => c.querySelector("h3").textContent === "日付なし");
  t("nodate_no_badge", nodate.querySelector(".days-left").hidden === true && !nodate.classList.contains("expired"));

  r.push("DONE");
  flush();
});
