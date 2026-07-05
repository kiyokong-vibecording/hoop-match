const out = document.createElement("pre");
out.id = "test-output";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };

window.addEventListener("load", () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  const form = document.getElementById("listingForm");
  const youthBox = document.getElementById("listingYouthConfirm");
  const adultCheck = document.getElementById("listingAdultConfirmed");

  // 0) 初期表示: デフォルトカテゴリU12男子で確認ボックスが最初から見えているか
  t("initial_default_youth_visible", youthBox.hidden === false && adultCheck.required === true);

  // 1) 初期状態: 成人確認は非表示(デフォルトカテゴリはU12男子なので…要確認)
  // デフォルト選択がU12男子のため、初期描画後にchangeを発火させて状態確認
  form.elements.category.value = "草バスケ";
  form.elements.category.dispatchEvent(new Event("change"));
  t("adult_hidden_for_kusabasu", youthBox.hidden === true && adultCheck.required === false);

  // 2) U15女子選択 → 表示+必須化
  form.elements.category.value = "U15女子";
  form.elements.category.dispatchEvent(new Event("change"));
  t("adult_shown_for_U15", youthBox.hidden === false && adultCheck.required === true);

  // 3) ユース+未チェックで送信 → ブロック(JSガード直叩き)
  form.elements.type.value = "opponent";
  form.elements.title.value = "U15テスト募集";
  form.elements.prefecture.value = "東京都";
  form.elements.prefecture.dispatchEvent(new Event("input"));
  form.elements.municipality.value = "";
  document.getElementById("listingMunicipality").append(new Option("世田谷区", "世田谷区"));
  form.elements.municipality.value = "世田谷区";
  form.elements.date.value = "2026-08-01";
  const before = state.listings.length;
  handleListingSubmit({ preventDefault: () => {} });
  t("youth_unchecked_blocked", state.listings.length === before);

  // 4) チェック済みで送信 → 保存され adultConfirmed=true
  form.elements.category.value = "U15女子";
  form.elements.category.dispatchEvent(new Event("change"));
  form.elements.type.value = "opponent";
  form.elements.title.value = "U15テスト募集";
  form.elements.prefecture.value = "東京都";
  form.elements.prefecture.dispatchEvent(new Event("input"));
  document.getElementById("listingMunicipality").append(new Option("世田谷区", "世田谷区"));
  form.elements.municipality.value = "世田谷区";
  form.elements.date.value = "2026-08-01";
  form.elements.level.value = "中級";
  adultCheck.checked = true;
  handleListingSubmit({ preventDefault: () => {} });
  const saved = state.listings.find((l) => l.title === "U15テスト募集");
  t("youth_checked_saved", !!saved && saved.adultConfirmed === true);
  // reset後はデフォルトカテゴリがU12男子(ユース)なので確認ボックスは表示・未チェックが正
  t("form_reset_shows_confirm_for_default_youth", youthBox.hidden === false && adultCheck.checked === false && adultCheck.required === true);

  // 5) 応募フォーム: ユース募集 → 成人確認表示、一般募集 → 非表示
  startApplication(saved);
  const appYouthBox = document.getElementById("applicationYouthConfirm");
  const appAdult = document.getElementById("applicationAdultConfirmed");
  // 対戦相手募集はチーム登録が必要 → チーム未登録だと弾かれるので確認
  t("opponent_requires_team", document.getElementById("applicationForm").hidden === true);
  state.team = { name: "テスト", adultConfirmed: true, category: "U15女子", prefecture: "東京都", municipality: "世田谷区" };
  startApplication(saved);
  t("app_adult_shown_for_youth", appYouthBox.hidden === false && appAdult.required === true);

  // 6) ユース応募: 未チェック送信 → ブロック
  document.querySelector("#applicationForm [name=message]").value = "テストメッセージ";
  const beforeApps = state.applications.length;
  handleApplicationSubmit({ preventDefault: () => {} });
  t("youth_apply_unchecked_blocked",
    state.applications.length === beforeApps &&
    document.getElementById("privateNotice").textContent.includes("18歳以上の代表者としての確認"));

  // 7) チェックして送信 → 保存
  startApplication(saved);
  appAdult.checked = true;
  document.querySelector("#applicationForm [name=message]").value = "テストメッセージ";
  handleApplicationSubmit({ preventDefault: () => {} });
  t("youth_apply_checked_saved", state.applications.length === beforeApps + 1 && state.applications[0].adultConfirmed === true);

  // 8) 一般募集への応募では成人確認非表示
  const general = { id: "G1", type: "member", category: "草バスケ", title: "一般募集",
    prefecture: "東京都", municipality: "世田谷区", area: "東京都世田谷区", date: "2026-08-01" };
  state.listings.unshift(general);
  startApplication(general);
  t("app_adult_hidden_for_general", appYouthBox.hidden === true && appAdult.required === false);

  // 9) 個人情報注意書きが応募フォームに常時表示されているか
  const pii = document.querySelector("#applicationForm .pii-note");
  t("pii_note_present", !!pii && pii.textContent.includes("個人情報を書かないでください"));
  r.push("DONE");
  flush();
});
