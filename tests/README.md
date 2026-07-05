# tests/ — ブラウザ回帰テスト

アプリの主要機能を headless Chrome で自動検証するテスト一式です。
**コードを変更したら、コミット前に必ず全テストを実行してください。**
複数のセッション・人で並行開発しても、既存機能を壊したことにすぐ気づけます。

## 実行方法

```bash
bash tests/run.sh              # 全テスト
bash tests/run.sh test-step2   # 1本だけ
```

headless Chrome が必要です。パスが自動検出されない場合:

```bash
CHROME_BIN=/path/to/chrome bash tests/run.sh
```

すべて成功すると最後に「★ 全テスト成功」と表示されます。
FAILがあれば該当行が表示され、終了コード1になります。

## テスト一覧

| ファイル | 検証内容 |
|---|---|
| test-step2 | JSONバックアップの書き出し/読み込み(新旧形式・壊れたJSON) |
| test-step3 | U12/U15/U18の成人代表者確認(募集作成・応募) |
| test-step4 | 期限切れ募集のグレーアウト・残り日数バッジ |
| test-step5 | 施設→募集作成の導線(会場プリセット・共有文の会場行) |
| test-47 | 全47都道府県で施設検索が1件以上ヒット |
| test-gyms | 合宿向け体育館・コートの登録内容 |
| test-hide | 施設の非表示/再表示/完全削除(confirm) |
| test-sync | 応募スレッド・返信・マッチング成立、説明文の左詰め |
| test-whitespace | pre-wrapのスコープ(説明文は左詰め、募集詳細は改行保持) |
| test-marketing | OGPタグ・空一覧CTA・GA4未設定時の非読込 |
| test-newbadge | 「前回から増えた募集」バッジ |
| test-public-off | サーバー未設定時にローカル専用で動く(fetch不発) |
| test-public-on | 公開マッチング全フロー(pre-public.jsのfetchスタブ使用) |
| test-error | サーバーエラー時に入力保持・安全に失敗(pre-error.js使用) |
| test-layout | 施設カードの重なり/ボタン寸法の計測(run.sh対象外。画面幅を変えて手動実行) |

## 書き方のルール

- テストは `window.addEventListener("load", ...)` 内で実行し、
  結果を `<pre id="test-output">` に `PASS xxx` / `FAIL xxx` 形式で書き出す
- 進行のたびに flush() を呼ぶ(途中で落ちても原因行まで見える)
- `window.onerror` で例外を捕捉して出力する
- 非同期処理は await でよい(ランナーが virtual-time-budget で待つ)
- fetch のスタブや設定上書きは `pre-*.js` に書き、run.sh の TESTS 定義で
  `テスト名:事前スクリプト名` の形式で紐付ける(app.jsより先に実行される)
