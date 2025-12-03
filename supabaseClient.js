// supabaseClient.js

// 🔽 たいの Supabase プロジェクトの値に置き換えて
const SUPABASE_URL = "https://cvkfugivsdlpvpfjhdin.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UREy-_WMmfHKEo8gLsFAAw_jTXy-hPR"; // 自分の anon key

// グローバルに 1回だけ作る
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
