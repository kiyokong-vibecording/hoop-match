#!/usr/bin/env node
/**
 * data/facilities.json からランタイム用の data/facilities.js を生成します。
 *
 * 使い方:
 *   node scripts/build-facilities.js
 *
 * なぜ生成ファイルが必要か:
 * このアプリは index.html をブラウザで直接開く使い方 (file://) を
 * サポートしています。file:// では fetch() でJSONを読み込めないため、
 * JSONを `window.FACILITY_CATALOG = [...]` 形式のJSに変換して
 * <script> タグで読み込みます。
 *
 * 施設データを編集する手順:
 *   1. data/facilities.json を編集する (こちらが正)
 *   2. node scripts/build-facilities.js を実行する
 *      (検証 → data/facilities.js を再生成)
 *   3. data/facilities.js は手で編集しない
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "data", "facilities.json");
const JS_PATH = path.join(ROOT, "data", "facilities.js");

// 先に検証を実行し、エラーがあれば生成しない
try {
  execFileSync(process.execPath, [path.join(__dirname, "check-facilities.js")], {
    stdio: "inherit",
  });
} catch {
  console.error("\n検証エラーのため data/facilities.js は生成しませんでした。");
  process.exit(1);
}

const facilities = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const banner = [
  "// このファイルは自動生成です。直接編集しないでください。",
  "// 編集は data/facilities.json に対して行い、",
  "// node scripts/build-facilities.js で再生成してください。",
].join("\n");

fs.writeFileSync(
  JS_PATH,
  `${banner}\nwindow.FACILITY_CATALOG = ${JSON.stringify(facilities, null, 2)};\n`,
);
console.log(`\n生成完了: data/facilities.js (${facilities.length}件)`);
