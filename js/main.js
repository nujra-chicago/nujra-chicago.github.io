const PAGE_PREFIX = window.location.pathname.includes("/resources/") ? "../" : "";
const sitePath = path => `${PAGE_PREFIX}${path}`;

const DATA_PATHS = {
  resources: sitePath("data/resources.json"),
  members: sitePath("data/members.json"),
  alumni: sitePath("data/alumni.json")
};

const ARTICLE_STATS_ENDPOINT = "https://script.google.com/macros/s/AKfycbz8W95g1hfzVeiQLreRGMDq_VbqiSSVnfqMAI2CbG3riKrksE3B_-bwYyziyUqwn1ki/exec";

async function loadJson(path, fallback = []) {
  try {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`${path}: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("JSON load failed:", error);
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


const HERO_IMAGES = [
  sitePath("images/hero/chicago-skyline-hero.webp"),
  sitePath("images/hero/chicago-river-hero.avif"),
  sitePath("images/hero/chicago-bean-hero.webp"),
  sitePath("images/hero/chicago-lakefront-hero.webp"),
  sitePath("images/hero/chicago-navy-pier-night-hero.webp")
];


function setupHeroRotation() {
  const hero = document.querySelector(".hero-home[data-hero-rotation]");
  if (!hero) return;

  const layers = Array.from(hero.querySelectorAll(".hero-bg-layer"));
  if (layers.length < 2 || HERO_IMAGES.length === 0) return;

  let currentIndex = Math.floor(Math.random() * HERO_IMAGES.length);
  let visibleLayerIndex = 0;

  const setLayerImage = (layer, src) => {
    layer.style.backgroundImage = `url("${src}")`;
  };

  const pickNextIndex = () => {
    if (HERO_IMAGES.length < 2) return currentIndex;
    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * HERO_IMAGES.length);
    }
    return nextIndex;
  };

  layers.forEach(layer => layer.classList.remove("is-active"));
  setLayerImage(layers[visibleLayerIndex], HERO_IMAGES[currentIndex]);
  layers[visibleLayerIndex].classList.add("is-active");

  if (HERO_IMAGES.length < 2) return;

  window.setInterval(() => {
    const nextIndex = pickNextIndex();
    const hiddenLayerIndex = visibleLayerIndex === 0 ? 1 : 0;

    setLayerImage(layers[hiddenLayerIndex], HERO_IMAGES[nextIndex]);
    layers[hiddenLayerIndex].classList.add("is-active");
    layers[visibleLayerIndex].classList.remove("is-active");

    visibleLayerIndex = hiddenLayerIndex;
    currentIndex = nextIndex;
  }, 10000);
}


function setupMobileMenu() {
  const button = document.querySelector(".menu-button");
  const nav = document.querySelector(".site-nav");
  if (!button || !nav) return;

  const setOpen = isOpen => {
    nav.classList.toggle("open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-label", isOpen ? "メニューを閉じる" : "メニューを開く");
  };

  button.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  document.addEventListener("click", event => {
    if (!nav.contains(event.target) && !button.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && nav.classList.contains("open")) {
      setOpen(false);
      button.focus();
    }
  });
  nav.addEventListener("click", event => {
    if (event.target.closest("a")) setOpen(false);
  });
  window.matchMedia("(max-width: 920px)").addEventListener("change", event => {
    if (!event.matches) setOpen(false);
  });
}

function initHomeUpdates() {
  const list = document.querySelector(".home-update-list");
  if (!list) return;
  const olderItems = Array.from(list.children).slice(3);
  if (!olderItems.length) return;

  const archive = document.createElement("details");
  archive.className = "home-update-archive";
  const summary = document.createElement("summary");
  summary.textContent = "過去の更新を表示";
  const olderList = document.createElement("div");
  olderList.className = "home-update-list";
  olderList.append(...olderItems);
  archive.append(summary, olderList);
  list.after(archive);
  archive.addEventListener("toggle", () => {
    summary.textContent = archive.open ? "過去の更新を閉じる" : "過去の更新を表示";
  });
}

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function parseResourceUpdated(value) {
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(value || "");
  if (!match) return 0;

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

function initNewBadges() {
  const visibleDays = 14;
  const now = new Date();

  document.querySelectorAll(".home-update-item .new-badge").forEach(badge => {
    const item = badge.closest(".home-update-item");
    const time = item?.querySelector("time[datetime]");
    const updateDate = parseDateOnly(time?.getAttribute("datetime"));
    if (!updateDate) return;

    const expiresAt = new Date(updateDate);
    expiresAt.setDate(expiresAt.getDate() + visibleDays);

    if (now >= expiresAt) {
      badge.hidden = true;
      badge.setAttribute("aria-hidden", "true");
    }
  });
}

function makeResourceCard(item) {
  const accessMeta = Number.isFinite(item.views)
    ? `<div class="meta">アクセス: ${Number(item.views).toLocaleString("ja-JP")}</div>`
    : "";
  const inner = `
    <span class="badge">${escapeHtml(item.category)}</span>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div class="meta">最終更新: ${escapeHtml(item.updated)}</div>
    ${accessMeta}
    <span class="card-action">${item.url ? "詳細を見る" : "準備中"}</span>
  `;

  if (item.url) {
    const isExternal = new URL(item.url, window.location.href).origin !== window.location.origin;
    return `
      <a class="resource-card resource-card-link" href="${escapeHtml(item.url)}"${isExternal ? ' target="_blank" rel="noopener"' : ""}>
        ${inner}
      </a>
    `;
  }

  return `
    <article class="resource-card resource-card-disabled">
      ${inner}
    </article>
  `;
}

function makeMemberCard(item) {
  const description = item.description ? `<p>${escapeHtml(item.description)}</p>` : `<p class="muted-text">紹介文は準備中です。</p>`;
  const photo = item.image
    ? `<img class="member-card-photo" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.nameJa)}" loading="lazy" />`
    : "";
  const photoClass = item.image ? " member-card-with-photo" : "";

  return `
    <article class="member-card${photoClass}">
      ${photo}
      <div class="member-body">
        <div class="member-name">
          <h3>${escapeHtml(item.nameJa)}</h3>
          <span>${escapeHtml(item.nameEn)}</span>
        </div>
        <div class="member-affiliation">${escapeHtml(item.affiliation)}</div>
        ${description}
      </div>
    </article>
  `;
}

function filterItems(items, query, category = "すべて") {
  const q = query.trim().toLowerCase();

  return items.filter(item => {
    const matchesCategory = category === "すべて" || item.category === category;
    const text = Object.values(item).join(" ").toLowerCase();
    const matchesQuery = !q || text.includes(q);
    return matchesCategory && matchesQuery;
  });
}

function renderFilterButtons(container, labels, onChange) {
  if (!container) return;

  container.innerHTML = labels.map((label, index) => `
    <button class="filter-button ${index === 0 ? "active" : ""}" type="button" data-filter="${escapeHtml(label)}">
      ${escapeHtml(label)}
    </button>
  `).join("");

  container.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    container.querySelectorAll(".filter-button").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    onChange(button.dataset.filter);
  });
}

function sortResources(items, mode) {
  const byUpdated = (a, b) => {
    const updatedDiff = parseResourceUpdated(b.updated) - parseResourceUpdated(a.updated);
    return updatedDiff || a.index - b.index;
  };

  return [...items].sort((a, b) => {
    if (mode === "access") {
      const aViews = Number.isFinite(a.views) ? a.views : -1;
      const bViews = Number.isFinite(b.views) ? b.views : -1;
      return bViews - aViews || byUpdated(a, b);
    }

    if (mode === "category") {
      return String(a.category).localeCompare(String(b.category), "ja") || byUpdated(a, b);
    }

    return byUpdated(a, b);
  });
}

async function hydrateResourceAccessCounts(resources) {
  if (!ARTICLE_STATS_ENDPOINT) return;

  await Promise.allSettled(resources
    .filter(item => item.url)
    .map(async item => {
      const data = await loadJsonp(ARTICLE_STATS_ENDPOINT, {
        action: "get",
        key: item.url,
        title: item.title
      });

      if (!data || data.ok === false) return;
      item.views = Number(data.views || 0);
    }));
}

async function initHome() {
  const homeResourceList = document.getElementById("homeResourceList");

  if (homeResourceList) {
    const resources = await loadJson(DATA_PATHS.resources);
    const limit = Number(homeResourceList.dataset.limit || 6);
    homeResourceList.innerHTML = resources.slice(0, limit).map(makeResourceCard).join("") || emptyState("情報はまだ登録されていません。");
  }
}

async function initResourcesPage() {
  const list = document.getElementById("resourceList");
  if (!list) return;

  const searchInput = document.getElementById("resourceSearch");
  const categorySelect = document.getElementById("resourceCategory");
  const sortSelect = document.getElementById("resourceSort");
  const resultCount = document.getElementById("resourceResultCount");
  const empty = document.getElementById("resourceEmpty");
  const resources = (await loadJson(DATA_PATHS.resources)).map((item, index) => ({
    ...item,
    index,
    views: null
  }));

  if (categorySelect) {
    const categories = ["すべて", ...Array.from(new Set(resources.map(item => item.category).filter(Boolean)))];
    categorySelect.innerHTML = categories.map(category => `
      <option value="${escapeHtml(category)}">${escapeHtml(category)}</option>
    `).join("");
  }

  const applyControls = () => {
    const query = searchInput?.value || "";
    const category = categorySelect?.value || "すべて";
    const sortMode = sortSelect?.value || "updated";
    const filtered = sortResources(filterItems(resources, query, category), sortMode);

    list.innerHTML = filtered.map(makeResourceCard).join("");
    if (empty) empty.hidden = filtered.length > 0;
    if (resultCount) resultCount.textContent = `${filtered.length}件 / ${resources.length}件`;
  };

  searchInput?.addEventListener("input", applyControls);
  categorySelect?.addEventListener("change", applyControls);
  sortSelect?.addEventListener("change", applyControls);

  applyControls();
  hydrateResourceAccessCounts(resources).then(applyControls);
}

async function initMembersIfPresent() {
  const allMembers = await loadJson(DATA_PATHS.members);

  const targets = [
    { id: "organizerList", category: "幹事" },
    { id: "formerOrganizerList", category: "元幹事・創設メンバー" },
    { id: "memberList", category: null }
  ];

  targets.forEach(target => {
    const container = document.getElementById(target.id);
    if (!container) return;

    const members = target.category
      ? allMembers.filter(member => member.category === target.category)
      : allMembers;

    container.innerHTML = members.map(makeMemberCard).join("") || emptyState("メンバー情報はまだ登録されていません。");
  });
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}


async function initAlumniIfPresent() {
  const list = document.getElementById("alumniList");
  if (!list) return;

  const alumni = await loadJson(DATA_PATHS.alumni);
  list.innerHTML = alumni.map(makeMemberCard).join("") || emptyState("過去メンバー情報はまだ登録されていません。");
}

function initPublicationsPage() {
  const searchInput = document.getElementById("publicationSearch");
  const resultCount = document.getElementById("publicationResultCount");
  const empty = document.getElementById("publicationEmpty");

  if (!searchInput || !resultCount || !empty) return;

  const publicationSections = Array.from(document.querySelectorAll(".publication-list"))
    .map(list => {
      const section = list.closest("section");
      const heading = section?.querySelector("h2");
      const year = Number((heading?.textContent || "").match(/\d{4}/)?.[0] || 0);
      const records = Array.from(list.querySelectorAll(".publication-item")).map(item => {
        const searchText = `${year} ${item.textContent}`.toLocaleLowerCase("ja");

        return { item, searchText };
      });

      return { section, year, records };
    })
    .filter(group => group.section && group.year && group.records.length);

  const totalCount = publicationSections.reduce((count, group) => count + group.records.length, 0);
  const yearNav = document.createElement("nav");
  yearNav.className = "publication-years";
  yearNav.setAttribute("aria-label", "発表年から探す");
  publicationSections.forEach(group => {
    group.section.id ||= `publications-${group.year}`;
    const link = document.createElement("a");
    link.href = `#${group.section.id}`;
    link.textContent = `${group.year}年`;
    group.yearLink = link;
    yearNav.append(link);
  });
  document.querySelector(".publication-controls").after(yearNav);
  const hashSection = publicationSections.find(group => `#${group.section.id}` === window.location.hash);
  if (hashSection) requestAnimationFrame(() => hashSection.section.scrollIntoView());

  const applyPublicationControls = () => {
    const query = searchInput.value.trim().toLocaleLowerCase("ja");
    let visibleCount = 0;

    publicationSections.forEach(group => {
      let visibleInSection = 0;

      group.records.forEach(record => {
        const isMatch = !query || record.searchText.includes(query);
        record.item.hidden = !isMatch;

        if (isMatch) {
          visibleCount += 1;
          visibleInSection += 1;
        }
      });

      group.section.hidden = visibleInSection === 0;
      group.yearLink.hidden = visibleInSection === 0;
    });

    resultCount.textContent = `${visibleCount}件 / ${totalCount}件`;
    empty.hidden = visibleCount > 0;
    yearNav.hidden = visibleCount === 0;
  };

  searchInput.addEventListener("input", applyPublicationControls);
  applyPublicationControls();
}

function initArticleNavigation() {
  const article = document.querySelector(".article-body");
  const hero = document.querySelector(".article-hero");
  if (!article || !hero) return;

  const backLink = document.createElement("a");
  backLink.className = "text-link article-back-link";
  backLink.href = sitePath("resources.html");
  backLink.textContent = "お役立ち情報一覧へ";
  hero.prepend(backLink);

  const headings = Array.from(article.querySelectorAll("h2"));
  if (headings.length < 3) return;
  const toc = document.createElement("details");
  toc.className = "article-toc";
  const summary = document.createElement("summary");
  summary.textContent = "目次";
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "この記事の目次");
  const list = document.createElement("ol");
  headings.forEach((heading, index) => {
    if (!heading.id) {
      let id = `article-section-${index + 1}`;
      while (document.getElementById(id)) id += "-heading";
      heading.id = id;
    }
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    item.append(link);
    list.append(item);
  });
  nav.append(list);
  toc.append(summary, nav);
  hero.append(toc);

  const hashTarget = headings.find(heading => `#${heading.id}` === window.location.hash);
  if (hashTarget) requestAnimationFrame(() => hashTarget.scrollIntoView());
}

function loadJsonp(url, params) {
  return new Promise((resolve, reject) => {
    const callbackName = `__nujraArticleStats${Date.now()}${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const query = new URLSearchParams({ ...params, callback: callbackName });
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Article stats request timed out."));
    }, 8000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = data => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Article stats request failed."));
    };

    script.src = `${url}${url.includes("?") ? "&" : "?"}${query.toString()}`;
    document.head.appendChild(script);
  });
}

function initArticleStats() {
  const article = document.querySelector(".article-body");
  const hero = document.querySelector(".article-hero");
  if (!article || !hero || !window.location.pathname.includes("/resources/")) return;

  const key = window.location.pathname
    .replace(/^\/+/, "")
    .replace(/\/index\.html$/, "/")
    .replace(/\/$/, "");
  const title = hero.querySelector("h1")?.textContent.trim() || document.title;
  const likedKey = `nujra.articleLiked.${key}`;
  const viewedKey = `nujra.articleViewed.${key}`;
  const isConfigured = Boolean(ARTICLE_STATS_ENDPOINT);

  const stats = document.createElement("div");
  stats.className = "article-stats";
  stats.innerHTML = `
    <button class="article-like-button" type="button" ${isConfigured ? "" : "disabled"}>
      <span aria-hidden="true">♡</span>
      <span class="article-like-label">いいね</span>
      <strong class="article-like-count">--</strong>
    </button>
    <span class="article-stat">
      <span>アクセス</span>
      <strong class="article-view-count">--</strong>
    </span>
  `;

  article.insertBefore(stats, article.firstElementChild);

  const likeButton = stats.querySelector(".article-like-button");
  const likeIcon = likeButton.querySelector("[aria-hidden='true']");
  const likeLabel = stats.querySelector(".article-like-label");
  const likeCount = stats.querySelector(".article-like-count");
  const viewCount = stats.querySelector(".article-view-count");
  let isLiked = window.localStorage.getItem(likedKey) === "1";

  const setLikedState = liked => {
    isLiked = liked;
    likeButton.classList.toggle("is-liked", liked);
    likeIcon.textContent = liked ? "♥" : "♡";
    likeLabel.textContent = liked ? "いいね済み" : "いいね";
    likeButton.setAttribute("aria-pressed", String(liked));
  };

  const updateCounts = data => {
    if (!data || data.ok === false) return;
    likeCount.textContent = Number(data.likes || 0).toLocaleString("ja-JP");
    viewCount.textContent = Number(data.views || 0).toLocaleString("ja-JP");
  };

  setLikedState(isLiked);

  if (!isConfigured) {
    stats.hidden = true;
    return;
  }

  const viewedThisSession = window.sessionStorage.getItem(viewedKey) === "1";
  const initialAction = viewedThisSession ? "get" : "view";

  loadJsonp(ARTICLE_STATS_ENDPOINT, { action: initialAction, key, title })
    .then(data => {
      window.sessionStorage.setItem(viewedKey, "1");
      updateCounts(data);
    })
    .catch(() => {
      stats.classList.add("is-error");
      viewCount.textContent = "--";
      likeCount.textContent = "--";
    });

  likeButton.addEventListener("click", () => {
    const nextLiked = !isLiked;
    likeButton.disabled = true;

    loadJsonp(ARTICLE_STATS_ENDPOINT, {
      action: nextLiked ? "like" : "unlike",
      key,
      title
    })
      .then(data => {
        window.localStorage.setItem(likedKey, nextLiked ? "1" : "0");
        setLikedState(nextLiked);
        updateCounts(data);
      })
      .catch(() => {
        stats.classList.add("is-error");
      })
      .finally(() => {
        likeButton.disabled = false;
      });
  });
}


function setupHeaderScrollState() {
  if (!document.body.classList.contains("home-page")) return;
  const update = () => {
    document.body.classList.toggle("header-scrolled", window.scrollY > 24);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
}

setupHeroRotation();
setupMobileMenu();
setupHeaderScrollState();
initNewBadges();
initHomeUpdates();
initHome();
initResourcesPage();
initMembersIfPresent();
initAlumniIfPresent();
initPublicationsPage();
initArticleNavigation();
initArticleStats();
