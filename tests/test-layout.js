const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
const intersects = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
window.addEventListener("load", () => {
  document.body.append(out);
  switchAppView("facilities");
  let totalOverlap = 0, totalVary = 0, totalClip = 0, minGap = 999;
  ["広島県", "神奈川県", "愛知県", "大阪府", "山口県", "千葉県"].forEach((pref) => {
    document.getElementById("facilitySearchPrefecture").value = pref;
    document.getElementById("facilitySearchPrefecture").dispatchEvent(new Event("change"));
    const items = [...document.querySelectorAll("#facilityList .facility-item")];
    items.forEach((item) => {
      const name = (item.querySelector("a,strong")?.textContent || "").slice(0, 14);
      const titleRect = item.querySelector(".facility-title-link, strong")?.getBoundingClientRect();
      [...item.querySelectorAll(".facility-tag")].forEach((tag) => {
        const tr = tag.getBoundingClientRect();
        if (titleRect && intersects(titleRect, tr)) { totalOverlap++; r.push(`OVERLAP ${name}`); }
        if (titleRect) minGap = Math.min(minGap, Math.round(tr.top - titleRect.bottom));
      });
      const btns = [...item.querySelectorAll(".card-actions .button-link, .card-actions button")];
      const ws = new Set(btns.map((b) => Math.round(b.getBoundingClientRect().width)));
      const hs = new Set(btns.map((b) => Math.round(b.getBoundingClientRect().height)));
      if (ws.size > 1 || hs.size > 1) { totalVary++; r.push(`BTN-VARY ${name} w=[${[...ws]}] h=[${[...hs]}]`); }
      // ボタン内テキストのはみ出し(clip)チェック
      btns.forEach((b) => { if (b.scrollWidth > b.clientWidth + 1) { totalClip++; r.push(`CLIP ${name}: ${b.textContent} ${b.scrollWidth}>${b.clientWidth}`); } });
    });
  });
  r.push(`width=${window.innerWidth} 重なり:${totalOverlap} 不揃い:${totalVary} はみ出し:${totalClip} タイトル-タグ最小間隔:${minGap}px`);
  flush();
});
