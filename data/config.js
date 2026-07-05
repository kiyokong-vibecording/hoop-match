// 公開マッチング(サーバー連携)の設定ファイル
//
// 未設定(空文字)の場合、アプリは従来どおり「この端末のみ」のローカル専用
// モードで動作します。公開募集機能を有効にする手順は
// docs/backend-setup.md を参照してください。
//
// 注意: supabaseAnonKey は「公開してよい」匿名キーです(行レベルセキュリティ
// で保護されています)。service_role キーは絶対にここへ書かないでください。
window.HOOP_CONFIG = {
  supabaseUrl: "https://xkjpwebhkiovzdlbtwwu.supabase.co",
  supabaseAnonKey: "sb_publishable_sVd-WB2j2dq5KRSgOqvb4w_f2NgteNR",
  // 任意: Google Analytics 4 の測定ID(例 "G-XXXXXXXXXX")。
  // 空のままなら解析は一切読み込まれません。
  gaMeasurementId: "",
};
