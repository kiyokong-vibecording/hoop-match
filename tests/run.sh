#!/bin/bash
# Hoop Match ブラウザテストランナー
#
# 使い方:
#   bash tests/run.sh                # 全テストを実行
#   bash tests/run.sh test-step2     # 1本だけ実行
#
# 必要なもの: headless Chrome (chrome-headless-shell または Chrome本体)
#   パスを変える場合: CHROME_BIN=/path/to/chrome bash tests/run.sh
#
# 仕組み: index.htmlのキャッシュ用クエリ(?v=NN)を除去したコピーに
# テストJSを注入してheadless Chromeで開き、<pre id="test-output">の
# 中身(PASS/FAIL行)を取り出して判定する。
# pre-*.js はアプリ本体(app.js)より先に注入される事前スクリプト
# (fetchスタブや設定上書き用)。test-*.js は末尾に注入される。
set -u
cd "$(dirname "$0")/.."
ROOT="$PWD"

CHROME_BIN="${CHROME_BIN:-}"
if [ -z "$CHROME_BIN" ]; then
  # puppeteerキャッシュ(バージョン・ホームの違いをglobで吸収)と一般的なコマンドを探す
  for c in \
    "$HOME"/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-linux64/chrome-headless-shell \
    /home/*/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-linux64/chrome-headless-shell \
    "$(command -v chrome-headless-shell 2>/dev/null)" \
    "$(command -v google-chrome 2>/dev/null)" \
    "$(command -v chromium 2>/dev/null)"; do
    if [ -n "$c" ] && [ -x "$c" ]; then CHROME_BIN="$c"; break; fi
  done
fi
if [ -z "$CHROME_BIN" ]; then
  echo "ERROR: headless Chromeが見つかりません。CHROME_BIN=/path/to/chrome を指定してください。"
  exit 1
fi

# テストと対応する事前スクリプトの定義(PRE:なしは通常実行)
# 形式: テスト名[:事前スクリプト名]
TESTS=(
  "test-step2"
  "test-step3"
  "test-step4"
  "test-step5"
  "test-47"
  "test-gyms"
  "test-hide"
  "test-sync"
  "test-whitespace"
  "test-marketing"
  "test-newbadge"
  "test-public-off"
  "test-public-on:pre-public"
  "test-error:pre-error"
)

run_one() {
  local name="$1" pre="${2:-}"
  local html="$ROOT/__test__.html"
  sed -E 's#(src|href)="\./([^"?]+)\?v=[0-9]+"#\1="./\2"#g' "$ROOT/index.html" > "$html.tmp"
  if [ -n "$pre" ]; then
    cp "$ROOT/tests/$pre.js" "$ROOT/__pre__.js"
    sed 's#<script src="./app.js"></script>#<script src="./__pre__.js"></script><script src="./app.js"></script>#' "$html.tmp" > "$html.tmp2"
    mv "$html.tmp2" "$html.tmp"
  fi
  sed "s#</body>#<script src=\"./__test__.js\"></script></body>#" "$html.tmp" > "$html"
  rm -f "$html.tmp"
  cp "$ROOT/tests/$name.js" "$ROOT/__test__.js"

  "$CHROME_BIN" --headless --disable-gpu --no-sandbox --allow-file-access-from-files \
    --virtual-time-budget=6000 --timeout=15000 --dump-dom "file://$html" \
    2>/dev/null > "$ROOT/__dom__.html"

  python3 - "$ROOT/__dom__.html" << 'PYEOF'
import re, sys, html as h
dom = open(sys.argv[1], encoding="utf-8", errors="replace").read()
m = re.search(r'<pre id="test-output">(.*?)</pre>', dom, re.S)
if not m:
    print("  RESULT: OUTPUT-NOT-FOUND")
    sys.exit(2)
text = h.unescape(m.group(1))
fails = [l for l in text.splitlines() if l.startswith("FAIL") or "ONERROR" in l or "EXCEPTION" in l]
passes = len([l for l in text.splitlines() if l.startswith("PASS")])
if fails:
    for l in fails:
        print("  " + l)
    print(f"  RESULT: NG (PASS {passes} / FAIL {len(fails)})")
    sys.exit(1)
print(f"  RESULT: OK (PASS {passes})")
PYEOF
  local code=$?
  rm -f "$ROOT/__test__.html" "$ROOT/__test__.js" "$ROOT/__pre__.js" "$ROOT/__dom__.html"
  return $code
}

FAILED=0
if [ $# -ge 1 ]; then
  # 1本指定実行
  target="$1"
  pre=""
  for entry in "${TESTS[@]}"; do
    if [ "${entry%%:*}" = "$target" ]; then
      [[ "$entry" == *:* ]] && pre="${entry#*:}"
    fi
  done
  echo "== $target =="
  run_one "$target" "$pre" || FAILED=1
else
  for entry in "${TESTS[@]}"; do
    name="${entry%%:*}"
    pre=""
    [[ "$entry" == *:* ]] && pre="${entry#*:}"
    echo "== $name =="
    run_one "$name" "$pre" || FAILED=1
  done
fi

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "★ 失敗したテストがあります"
  exit 1
fi
echo ""
echo "★ 全テスト成功"
