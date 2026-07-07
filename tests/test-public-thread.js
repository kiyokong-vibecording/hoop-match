// 公開募集のアプリ内やり取り(返信スレッド)と新着自動チェックのテスト
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
    await new Promise((res) => setTimeout(res, 60));
    state.team = { name: "Test Reps", prefecture: "東京都", municipality: "新宿区", area: "東京都新宿区", category: "一般", level: "エンジョイ", adultConfirmed: true };
    saveState();

    // 1) 応募すると応募キーが控えに保存される
    const target = publicListings.find((l) => l.id === "pub-1");
    startApplication(target);
    const appForm = document.getElementById("applicationForm");
    appForm.elements.message.value = "対戦お願いします";
    appForm.elements.contact.value = "rep@example.com";
    await handleApplicationSubmit(new Event("submit", { cancelable: true }));
    const myApp = state.applications[0];
    t("application_key_saved", myApp.applicationId === "app-1" && myApp.applicationKey === "akey-1");
    t("success_mentions_thread", document.getElementById("privateNotice").textContent.includes("やり取りを確認"));

    // 2) 管理キーを持つ公開募集を用意して自動チェック→新着バッジ
    state.myPublicListings.unshift({ id: "new-123", manageKey: "key-abc", title: "自分の公開募集", status: "approved", createdAt: new Date().toISOString(), seenApplicationCount: 0 });
    saveState();
    await checkPublicInbox();
    t("summary_rpcs_called", calls.some((c) => c.url.includes("get_my_listings_summary")) && calls.some((c) => c.url.includes("get_my_applications_summary")));
    t("owner_counts_updated", state.myPublicListings[0].applicationCount === 2);
    t("applicant_counts_updated", state.applications[0].ownerReplyCount === 1);
    const ownerBadge = document.querySelector("#myPublicList .inbox-badge");
    t("owner_badge_shown", Boolean(ownerBadge) && ownerBadge.textContent.includes("新着応募 +2"));
    const applicantBadge = document.querySelector("#applicationList .inbox-badge");
    t("applicant_badge_shown", Boolean(applicantBadge) && applicantBadge.textContent.includes("新着返信 +1"));

    // 3) 応募者: やり取りを確認→募集者の返信が表示され、バッジが消える
    const openBtn = [...document.querySelectorAll("#applicationList button")].find((b) => b.textContent.includes("やり取りを確認"));
    t("open_button_exists", Boolean(openBtn));
    openBtn.click();
    await new Promise((res) => setTimeout(res, 30));
    t("owner_reply_visible", document.getElementById("applicationList").textContent.includes("ぜひやりましょう"));
    t("applicant_badge_cleared", !document.querySelector("#applicationList .inbox-badge"));
    t("seen_count_updated", state.applications[0].seenOwnerReplyCount === 1);

    // 4) 応募者として返信を送る
    const replyArea = [...document.querySelectorAll("#applicationList .reply-box")].find((b) => !b.hidden);
    t("reply_box_visible", Boolean(replyArea));
    replyArea.querySelector("textarea").value = "日程は8/10でお願いします";
    replyArea.querySelector("button").click();
    await new Promise((res) => setTimeout(res, 30));
    t("applicant_reply_rpc", calls.some((c) => c.url.includes("reply_as_applicant") && c.body.p_message.includes("8/10")));
    t("applicant_reply_appended", document.getElementById("applicationList").textContent.includes("8/10"));

    // 5) 募集者: 応募を確認→スレッド+返信ボックス→返信送信
    const checkBtn = [...document.querySelectorAll("#myPublicList button")].find((b) => b.textContent === "応募を確認");
    checkBtn.click();
    await new Promise((res) => setTimeout(res, 30));
    t("owner_thread_visible", document.getElementById("myPublicList").textContent.includes("よろしくお願いします"));
    t("owner_badge_cleared", !document.querySelector("#myPublicList .inbox-badge"));
    const ownerReplyBox = document.querySelector("#myPublicList .reply-box");
    t("owner_reply_box", Boolean(ownerReplyBox));
    ownerReplyBox.querySelector("textarea").value = "体育館は確保済みです";
    ownerReplyBox.querySelector("button").click();
    await new Promise((res) => setTimeout(res, 30));
    t("owner_reply_rpc", calls.some((c) => c.url.includes("reply_to_application") && c.body.p_application_id === "app-1" && c.body.p_message.includes("体育館")));
    t("owner_reply_appended", document.getElementById("myPublicList").textContent.includes("体育館は確保済み"));
  } catch (e) {
    r.push("EXCEPTION " + e.message);
  }
  r.push("DONE"); flush();
});
