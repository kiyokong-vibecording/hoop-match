const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };
window.addEventListener("load", () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  try {
    // 1) 説明文の左詰め(ユーザー版は2文構成になっている)
    const panel = document.querySelector('section[aria-label="非公開の応募メッセージ"]');
    const note = panel.querySelector("p.notes");
    t("intro_has_reply_text", note.textContent.includes("マッチング成立"));
    t("static_notes_normal_ws", getComputedStyle(note).whiteSpace === "normal");
    const range = document.createRange();
    range.selectNodeContents(note);
    const indent = Math.round(range.getBoundingClientRect().left - note.getBoundingClientRect().left);
    t("no_leading_indent", indent <= 1);
    r.push(`  実測インデント: ${indent}px`);

    // 2) チーム登録(応募に必要)
    state.team = { name: "ランス", prefecture: "東京都", municipality: "江戸川区", area: "東京都江戸川区", category: "U15男子", level: "初心者", adultConfirmed: true };
    saveState();

    // 3) ローカル募集を作成→応募→スレッド表示
    state.listings.unshift(normalizeLocation({
      id: "sync-test", type: "opponent", category: "一般", title: "同期テスト募集",
      prefecture: "東京都", municipality: "新宿区", date: "2026-09-01",
      level: "エンジョイ", notes: "詳細1行目\n詳細2行目", createdAt: new Date().toISOString(),
    }));
    renderListings();
    // 募集詳細の改行が保持されている(.listing-card .notes = pre-wrap)
    const card = [...document.querySelectorAll(".listing-card")].find((c) => c.textContent.includes("同期テスト募集"));
    t("listing_notes_prewrap", getComputedStyle(card.querySelector(".notes")).whiteSpace === "pre-wrap");

    startApplication(state.listings[0]);
    const appForm = document.getElementById("applicationForm");
    appForm.elements.message.value = "1行目\n2行目\n3行目";
    handleApplicationSubmit(new Event("submit", { cancelable: true }));
    t("application_saved", state.applications.length >= 1);

    // 4) スレッド描画と返信メッセージの改行保持
    const msgP = document.querySelector(".application-message p");
    t("thread_rendered", Boolean(msgP));
    t("message_prewrap_kept", getComputedStyle(msgP).whiteSpace === "pre-wrap");
    const lh = parseFloat(getComputedStyle(msgP).lineHeight) || 20;
    t("message_linebreaks_visible", msgP.getBoundingClientRect().height >= lh * 2.5);

    // 5) 返信(募集者として)→スレッドに追加される
    const replyInput = document.querySelector(".reply-box textarea");
    replyInput.value = "場所は江戸川区スポーツセンターです";
    const ownerReplyBtn = [...document.querySelectorAll(".reply-actions button")].find((b) => b.textContent.includes("募集者"));
    t("owner_reply_button_exists", Boolean(ownerReplyBtn));
    ownerReplyBtn.click();
    t("reply_appended", state.applications[0].replies.length === 1 && document.querySelectorAll(".application-message").length >= 2);

    // 6) マッチング成立→ステータス反映
    const acceptBtn = [...document.querySelectorAll("#applicationList button")].find((b) => b.textContent === "マッチング成立にする");
    t("accept_button_exists", Boolean(acceptBtn));
    acceptBtn.click();
    t("status_accepted", state.applications[0].status === "accepted");
    t("badge_shown", document.getElementById("applicationList").textContent.includes("マッチング成立"));

    // 後片付け
    state.listings = state.listings.filter((l) => l.id !== "sync-test");
    state.applications = state.applications.filter((a) => a.listingId !== "sync-test");
    saveState();
  } catch (e) {
    r.push("EXCEPTION " + e.message);
  }
  r.push("DONE"); flush();
});
