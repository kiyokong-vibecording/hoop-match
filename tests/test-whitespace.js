const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
window.addEventListener("load", () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  try {
    // 1) 非公開の応募メッセージの説明文: 行頭が左端に揃う(先頭空白なし)
    const panel = document.querySelector('section[aria-label="非公開の応募メッセージ"]');
    const note = panel.querySelector("p.notes");
    const ws = getComputedStyle(note).whiteSpace;
    t("static_notes_normal_ws", ws === "normal");
    // 描画上の先頭文字位置が段落ボックスの左端と一致するか(Rangeで実測)
    const range = document.createRange();
    range.setStart(note.firstChild, 0);
    range.setEnd(note.firstChild, note.textContent.length);
    const textRect = range.getBoundingClientRect();
    const boxRect = note.getBoundingClientRect();
    const indent = Math.round(textRect.left - boxRect.left);
    t("no_leading_indent", indent <= 1);
    r.push(`  実測インデント: ${indent}px`);

    // 2) 他の静的notes(自分の公開募集の説明等)も同様に左詰め
    const myPubNote = document.querySelector("#myPublicSection p.notes");
    t("mypublic_notes_normal", getComputedStyle(myPubNote).whiteSpace === "normal");

    // 3) 募集カードの詳細欄: pre-wrap維持(ユーザー入力の改行が保持される)
    state.listings.unshift(normalizeLocation({
      id: "ws-test", type: "opponent", category: "一般", title: "改行テスト",
      prefecture: "東京都", municipality: "新宿区", date: "2026-09-01",
      level: "エンジョイ", notes: "1行目\n2行目\n3行目", createdAt: new Date().toISOString(),
    }));
    renderListings();
    const card = [...document.querySelectorAll(".listing-card")].find((c) => c.textContent.includes("改行テスト"));
    const cardNotes = card.querySelector(".notes");
    t("listing_notes_prewrap", getComputedStyle(cardNotes).whiteSpace === "pre-wrap");
    // 3行として描画されているか(高さで判定)
    const lineHeight = parseFloat(getComputedStyle(cardNotes).lineHeight) || 20;
    t("linebreaks_preserved", cardNotes.getBoundingClientRect().height >= lineHeight * 2.5);
    state.listings = state.listings.filter((l) => l.id !== "ws-test");
    saveState();
  } catch (e) {
    r.push("EXCEPTION " + e.message);
  }
  r.push("DONE"); flush();
});
