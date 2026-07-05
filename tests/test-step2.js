const out = document.createElement("pre");
out.id = "test-output";
out.textContent = "INIT";
const r = [];
const flush = () => { out.textContent = "RESULTS:\n" + r.join("\n"); };
window.onerror = (m) => { r.push("ONERROR " + m); flush(); };

window.addEventListener("load", async () => {
  document.body.append(out);
  const t = (name, cond) => { r.push((cond ? "PASS" : "FAIL") + " " + name); flush(); };
  const status = () => document.getElementById("dataStatus").textContent;

  try {
    // 1) エクスポート(headlessでのclickダウンロードは避け、内部処理のみ確認)
    const origClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function () {};
    exportData();
    HTMLElement.prototype.click = origClick;
    t("export_runs", true);
    t("export_feedback", status().includes("バックアップを書き出しました"));

    const makeEvent = (content, name) => ({
      target: { files: [{ name, text: async () => content }], value: "" },
    });

    await importData(makeEvent("{not json", "bad.json"));
    t("import_broken_json_error", status().includes("解析できない"));

    await importData(makeEvent('{"foo": 1}', "wrong.json"));
    t("import_wrong_format_error", status().includes("バックアップ形式ではありません"));

    const payload = { app: "hoop-match", formatVersion: 1, exportedAt: "2026-07-02T00:00:00Z",
      data: { listings: [{ id: "L1", type: "opponent", category: "草バスケ", title: "テスト募集",
        prefecture: "東京都", municipality: "世田谷区", area: "東京都世田谷区",
        date: "2026-08-01", createdAt: "2026-07-01T00:00:00Z", level: "中級" }],
        facilities: [], team: null, applications: [] } };
    window.confirm = () => true;
    await importData(makeEvent(JSON.stringify(payload), "good.json"));
    t("import_new_format", state.listings.length === 1 && state.listings[0].title === "テスト募集");
    t("import_feedback", status().includes("読み込み完了"));
    t("import_persisted", JSON.parse(localStorage.getItem("hoop-match-v1")).listings.length === 1);

    const legacy = { listings: [payload.data.listings[0], { ...payload.data.listings[0], id: "L2" }],
      facilities: [], team: null, applications: [] };
    await importData(makeEvent(JSON.stringify(legacy), "legacy.json"));
    t("import_legacy_format", state.listings.length === 2);

    window.confirm = () => false;
    await importData(makeEvent(JSON.stringify(payload), "again.json"));
    t("import_cancel_keeps_data", state.listings.length === 2 && status().includes("キャンセル"));
    r.push("DONE");
  } catch (e) {
    r.push("EXCEPTION " + e.message);
  }
  flush();
});
