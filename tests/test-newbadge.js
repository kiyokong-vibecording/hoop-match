// 「前回から増えた募集」バッジのテスト
const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
window.addEventListener("load", () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  try {
    const badge = document.getElementById("newSinceLastVisit");

    // 1) 初回訪問: バッジは出ず、seenが保存される
    t("first_visit_no_badge", badge.hidden === true);
    const stored = JSON.parse(localStorage.getItem("hoop-match-seen-v1"));
    t("seen_recorded", stored && Array.isArray(stored.ids));

    // 2) 「前回の訪問」を再現: seenを空にして募集を2件追加→再計算
    localStorage.setItem("hoop-match-seen-v1", JSON.stringify({ ids: [], updatedAt: "2026-07-01T00:00:00Z" }));
    state.listings.unshift(
      normalizeLocation({ id: "nb-1", type: "opponent", category: "一般", title: "新着1", prefecture: "東京都", municipality: "新宿区", date: "2026-09-01", level: "E", createdAt: new Date().toISOString() }),
      normalizeLocation({ id: "nb-2", type: "member", category: "一般", title: "新着2", prefecture: "大阪府", municipality: "堺市", date: "2026-09-02", level: "E", createdAt: new Date().toISOString() }),
    );
    updateNewSinceBadge();
    t("badge_shows_plus2", badge.hidden === false && badge.textContent === "前回から +2件");

    // 3) 「見た」を保存→バッジ再計算で消える(次回訪問の再現)
    markListingsSeen();
    updateNewSinceBadge();
    t("badge_hidden_after_seen", badge.hidden === true);

    // 4) seenが壊れたJSONでも初回扱いで落ちない
    localStorage.setItem("hoop-match-seen-v1", "{{{broken");
    updateNewSinceBadge();
    t("broken_seen_safe", badge.hidden === true);
    t("broken_seen_repaired", Array.isArray(JSON.parse(localStorage.getItem("hoop-match-seen-v1")).ids));

    // 後片付け
    state.listings = state.listings.filter((l) => !l.id.startsWith("nb-"));
    saveState();
  } catch (e) {
    r.push("EXCEPTION " + e.message);
  }
  r.push("DONE"); flush();
});
