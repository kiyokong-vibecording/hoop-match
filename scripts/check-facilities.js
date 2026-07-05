#!/usr/bin/env node
/**
 * data/facilities.json の検証スクリプト
 *
 * 使い方:
 *   node scripts/check-facilities.js
 *
 * チェック内容:
 * - JSONとして読めるか / 配列か
 * - 必須フィールド: id, source, name, prefecture, municipality,
 *   reservationMethod, facilityType, url または reservationUrl のいずれか
 * - id の重複
 * - lastChecked の形式 (YYYY-MM-DD)。未設定は警告のみ
 * - address / notes の未設定は警告のみ
 * - URLが http(s) で始まるか
 *
 * エラーが1件でもあれば終了コード1(CI等で失敗にできる)。警告のみなら0。
 */
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "facilities.json");

const REQUIRED_FIELDS = [
  "id",
  "source",
  "name",
  "prefecture",
  "municipality",
  "reservationMethod",
  "facilityType",
];

const KNOWN_RESERVATION_METHODS = [
  "自治体予約システム",
  "民間予約サイト",
  "公式サイト確認",
  "Web予約",
  "会員予約",
  "電話予約",
  "窓口予約",
  "抽選制",
  "チーム代表者確認が必要",
];

const KNOWN_FACILITY_TYPES = [
  "体育館",
  "民間コート",
  "商業施設",
  "屋外コート",
  "多目的施設",
  "学校開放",
];

function isValidUrl(value) {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function main() {
  let raw;
  try {
    raw = fs.readFileSync(DATA_PATH, "utf8");
  } catch (error) {
    console.error(`エラー: ${DATA_PATH} を読み込めません: ${error.message}`);
    process.exit(1);
  }

  let facilities;
  try {
    facilities = JSON.parse(raw);
  } catch (error) {
    console.error(`エラー: JSONとして解析できません: ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(facilities)) {
    console.error("エラー: ルートは施設オブジェクトの配列である必要があります。");
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  const seenIds = new Map();

  facilities.forEach((facility, index) => {
    const label = `[${index}] ${facility?.id || facility?.name || "(不明)"}`;

    if (typeof facility !== "object" || facility === null) {
      errors.push(`${label}: オブジェクトではありません。`);
      return;
    }

    REQUIRED_FIELDS.forEach((field) => {
      const value = facility[field];
      if (typeof value !== "string" || value.trim() === "") {
        errors.push(`${label}: 必須フィールド "${field}" が未設定です。`);
      }
    });

    if (facility.id) {
      if (seenIds.has(facility.id)) {
        errors.push(`${label}: id "${facility.id}" が重複しています (先出: [${seenIds.get(facility.id)}])。`);
      } else {
        seenIds.set(facility.id, index);
      }
      if (/[\s/\\'"]/.test(facility.id)) {
        errors.push(`${label}: id に空白・スラッシュ・引用符は使えません。`);
      }
    }

    if (!isValidUrl(facility.url) && !isValidUrl(facility.reservationUrl)) {
      errors.push(`${label}: url または reservationUrl のどちらかに有効なURL (http/https) が必要です。`);
    }
    ["url", "reservationUrl", "officialUrl"].forEach((field) => {
      if (facility[field] && !isValidUrl(facility[field])) {
        errors.push(`${label}: "${field}" が有効なURLではありません: ${facility[field]}`);
      }
    });

    if (facility.lastChecked) {
      if (!isValidDate(facility.lastChecked)) {
        errors.push(`${label}: lastChecked は YYYY-MM-DD 形式にしてください: ${facility.lastChecked}`);
      }
    } else {
      warnings.push(`${label}: lastChecked (情報確認日) が未設定です。`);
    }

    if (!facility.notes) {
      warnings.push(`${label}: notes (利用条件メモ) が未設定です。`);
    }
    if (!facility.address) {
      warnings.push(`${label}: address (住所) が未設定です。`);
    }

    if (facility.reservationMethod && !KNOWN_RESERVATION_METHODS.includes(facility.reservationMethod)) {
      warnings.push(`${label}: 予約方法 "${facility.reservationMethod}" は既知の一覧にありません。`);
    }
    if (facility.facilityType && !KNOWN_FACILITY_TYPES.includes(facility.facilityType)) {
      warnings.push(`${label}: 施設タイプ "${facility.facilityType}" は既知の一覧にありません。`);
    }
  });

  console.log(`施設数: ${facilities.length}件 / エラー: ${errors.length}件 / 警告: ${warnings.length}件`);

  if (warnings.length > 0) {
    console.log("\n--- 警告 (登録は可能ですが、埋めることを推奨) ---");
    warnings.slice(0, 30).forEach((message) => console.log(`  警告: ${message}`));
    if (warnings.length > 30) console.log(`  ... 他 ${warnings.length - 30}件`);
  }

  if (errors.length > 0) {
    console.log("\n--- エラー (修正が必要) ---");
    errors.forEach((message) => console.log(`  エラー: ${message}`));
    process.exit(1);
  }

  console.log("\n検証OK: 必須フィールドはすべて揃っています。");
}

main();
