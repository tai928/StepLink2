// index.js

const supabaseClient = window.supabaseClient;

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  let currentUser = null;
  let currentProfile = null;

  const currentUserAvatarEl = document.getElementById("currentUserAvatar");
  const currentUserNameEl = document.getElementById("currentUserName");
  const currentUserHandleEl = document.getElementById("currentUserHandle");
  const logoutButton = document.getElementById("logoutButton");

  const tweetInput = document.getElementById("tweetInput");
  const charCounter = document.getElementById("charCounter");
  const postTweetBtn = document.getElementById("postTweetBtn");
  const tweetsContainer = document.getElementById("tweetsContainer");

  const scrollToNewBtn = document.getElementById("scrollToNewBtn");
  const newPostSection = document.getElementById("newPostSection");

  // 認証モーダル関連
  const authModal = document.getElementById("authModal");
  const openAuthModalBtn = document.getElementById("openAuthModalBtn");
  const closeAuthModalBtn = document.getElementById("closeAuthModalBtn");
  const authBackdrop = authModal?.querySelector(".modal-backdrop");
  const accountTabs = document.querySelectorAll(".account-tab");
  const accountLoginView = document.getElementById("accountLoginView");
  const accountRegisterView = document.getElementById("accountRegisterView");

  const loginEmailInput = document.getElementById("loginEmailInput");
  const loginPasswordInput = document.getElementById("loginPasswordInput");
  const loginSubmitBtn = document.getElementById("loginSubmitBtn");
  const loginError = document.getElementById("loginError");

  const regNameInput = document.getElementById("regNameInput");
  const regHandleInput = document.getElementById("regHandleInput");
  const regEmailInput = document.getElementById("regEmailInput");
  const regAvatarInput = document.getElementById("regAvatarInput");
  const regPasswordInput = document.getElementById("regPasswordInput");
  const registerSubmitBtn = document.getElementById("registerSubmitBtn");
  const registerError = document.getElementById("registerError");

  // ========================
  // 認証状態ロード
  // ========================
  async function loadAuthState() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data.user) {
      currentUser = null;
      currentProfile = null;
      applyUserUI();
      return;
    }

    currentUser = data.user;

    const { data: prof, error: profErr } = await supabaseClient
      .from("profiles")
      .select("name,handle,avatar,bio")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (!profErr && prof) {
      currentProfile = prof;
    } else {
      currentProfile = null;
    }

    applyUserUI();
  }

  function applyUserUI() {
    if (!currentUser) {
      if (currentUserAvatarEl) currentUserAvatarEl.textContent = "🧑‍💻";
      if (currentUserNameEl) currentUserNameEl.textContent = "未ログイン";
      if (currentUserHandleEl) currentUserHandleEl.textContent = "";
      if (logoutButton) logoutButton.disabled = true;
      return;
    }

    const name =
      currentProfile?.name ||
      currentUser.user_metadata?.name ||
      "ユーザー";
    const handle =
      currentProfile?.handle ||
      currentUser.user_metadata?.handle ||
      "user";
    const avatar =
      currentProfile?.avatar ||
      currentUser.user_metadata?.avatar ||
      "🧑‍💻";

    if (currentUserAvatarEl) currentUserAvatarEl.textContent = avatar;
    if (currentUserNameEl) currentUserNameEl.textContent = name;
    if (currentUserHandleEl) currentUserHandleEl.textContent = "@" + handle;
    if (logoutButton) logoutButton.disabled = false;

    const newPostAvatar = document.getElementById("newPostAvatar");
    if (newPostAvatar) newPostAvatar.textContent = avatar;
  }

  await loadAuthState();

  // ========================
  // ログアウト
  // ========================
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      location.reload();
    });
  }

  // ========================
  // 文字数カウンター
  // ========================
  function updateCounter() {
    if (!tweetInput || !charCounter) return;
    charCounter.textContent = `${tweetInput.value.length} / 140`;
  }
  if (tweetInput && charCounter) {
    updateCounter();
    tweetInput.addEventListener("input", updateCounter);
  }

// ========================
// ツイート表示
// ========================
function renderTweet(row) {
  if (!tweetsContainer) return;

  const article = document.createElement("article");
  article.className = "post";

  // いったん名前・アイコンは仮（あとで profiles から持ってくるようにできる）
  const name = row.name || "ユーザー";
  const handle = row.handle || "user";
  const avatar = row.avatar || "🧑‍💻";

  article.innerHTML = `
    <div class="post-avatar">${avatar}</div>
    <div class="post-body">
      <div class="post-header">
        <span class="post-name">${escapeHtml(name)}</span>
        <span class="post-handle">@${escapeHtml(handle)}</span>
        <span class="post-time">${formatTime(row.created_at)}</span>
      </div>
      <div class="post-text">${escapeHtml(row.content)}</div>
    </div>
  `;
  tweetsContainer.appendChild(article);
}

async function loadTweets() {
  if (!tweetsContainer) return;

  // ★ profiles(...) の JOIN をやめて、tweets 単体だけにする
  const { data, error } = await supabaseClient
    .from("tweets")
    .select("id,user_id,content,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  tweetsContainer.innerHTML = "";

  if (error) {
    console.error("tweets load error:", error);
    return;
  }

  // とりあえず全部「ユーザー / @user / 🧑‍💻」で表示
  data.forEach((row) => {
    renderTweet({
      ...row,
      name: "ユーザー",
      handle: "user",
      avatar: "🧑‍💻",
    });
  });
}

  await loadTweets();

  // ========================
  // 投稿
  // ========================
  async function createTweet(text) {
    if (!currentUser) {
      alert("ログインしてから投稿してね🥺");
      return;
    }

    // プロフィールがまだ無ければ作る（ざっくり）
    if (!currentProfile) {
      const name = currentUser.user_metadata?.name || "ユーザー";
      const handle =
        currentUser.user_metadata?.handle ||
        ("user" + currentUser.id.slice(0, 5));
      const avatar = currentUser.user_metadata?.avatar || "🧑‍💻";

      const { error: profErr } = await supabaseClient
        .from("profiles")
        .upsert({
          id: currentUser.id,
          name,
          handle,
          avatar,
        });

      if (profErr) {
        console.error("profiles upsert error:", profErr);
      } else {
        currentProfile = { id: currentUser.id, name, handle, avatar };
      }
    }

    const { error } = await supabaseClient.from("tweets").insert({
      user_id: currentUser.id,
      content: text,
    });

    if (error) {
      console.error("tweet insert error:", error);
      alert("投稿に失敗しちゃった…😭");
      return;
    }

    await loadTweets();
  }

  if (postTweetBtn && tweetInput) {
    postTweetBtn.addEventListener("click", async () => {
      const text = tweetInput.value.trim();
      if (!text) return;
      if (text.length > 140) {
        alert("140文字までだよ🥺");
        return;
      }
      await createTweet(text);
      tweetInput.value = "";
      updateCounter();
    });
  }

  // 「投稿する」ボタンで新規投稿カードまでスクロール
  if (scrollToNewBtn && newPostSection) {
    scrollToNewBtn.addEventListener("click", () => {
      newPostSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // ========================
  // 認証モーダル
  // ========================
  function openAuthModal() {
    if (authModal) authModal.classList.remove("hidden");
  }
  function closeAuthModal() {
    if (authModal) authModal.classList.add("hidden");
  }

  if (openAuthModalBtn) {
    openAuthModalBtn.addEventListener("click", openAuthModal);
  }
  if (closeAuthModalBtn) {
    closeAuthModalBtn.addEventListener("click", closeAuthModal);
  }
  if (authBackdrop) {
    authBackdrop.addEventListener("click", closeAuthModal);
  }

  function switchAccountTab(mode) {
    accountTabs.forEach((tab) =>
      tab.classList.toggle("active", tab.dataset.mode === mode)
    );
    if (mode === "login") {
      accountLoginView.classList.remove("hidden");
      accountRegisterView.classList.add("hidden");
    } else {
      accountLoginView.classList.add("hidden");
      accountRegisterView.classList.remove("hidden");
    }
  }

  accountTabs.forEach((tab) => {
    tab.addEventListener("click", () =>
      switchAccountTab(tab.dataset.mode)
    );
  });

  // ログイン
  async function handleLogin() {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    if (!email || !password) {
      loginError.textContent = "メールとパスワードを入れてね🥺";
      return;
    }
    loginError.textContent = "";
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      loginError.textContent = error.message;
      return;
    }
    location.reload();
  }

  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener("click", handleLogin);
  }

  // 新規登録
  async function handleRegister() {
    const name = regNameInput.value.trim();
    const handle = regHandleInput.value.trim();
    const email = regEmailInput.value.trim();
    const avatar = (regAvatarInput.value.trim() || "🧑‍💻").trim();
    const password = regPasswordInput.value;

    if (!name || !handle || !email || !password) {
      registerError.textContent = "必須項目が空だよ🥺";
      return;
    }
    registerError.textContent = "";

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { name, handle, avatar },
      },
    });

    if (error) {
      if (error.message.includes("User already registered")) {
        registerError.textContent = "このメールは登録済みだよ。ログインしてね。";
        switchAccountTab("login");
      } else {
        registerError.textContent = error.message;
      }
      return;
    }

    const user = data.user;
    if (user) {
      const { error: profErr } = await supabaseClient
        .from("profiles")
        .upsert({
          id: user.id,
          name,
          handle,
          avatar,
        });
      if (profErr) {
        console.error("profiles upsert error:", profErr);
      }
    }

    alert("アカウント作成できたよ💚 ログインしてね！");
    switchAccountTab("login");
  }

  if (registerSubmitBtn) {
    registerSubmitBtn.addEventListener("click", handleRegister);
  }
});
