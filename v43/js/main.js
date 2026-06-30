const DATA_PATHS = {
  resources: "data/resources.json",
  members: "data/members.json"
};

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
  "../images/hero/chicago-skyline-hero.png",
  "../images/hero/chicago-river-hero.avif",
  "../images/hero/chicago-bean-hero.png",
  "../images/hero/chicago-lakefront-hero.png",
  "../images/hero/chicago-navy-pier-night-hero.png"
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

  button.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
}

function makeResourceCard(item) {
  const inner = `
    <span class="badge">${escapeHtml(item.category)}</span>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div class="meta">最終更新: ${escapeHtml(item.updated)}</div>
    <span class="card-action">${item.url ? "詳細を見る" : "準備中"}</span>
  `;

  if (item.url) {
    return `
      <a class="resource-card resource-card-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
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

  const resources = await loadJson(DATA_PATHS.resources);
  list.innerHTML = resources.map(makeResourceCard).join("") || emptyState("情報はまだ登録されていません。");
}

async function initMembersIfPresent() {
  const allMembers = await loadJson("data/members.json");

  const targets = [
    { id: "organizerList", category: "幹事" },
    { id: "formerOrganizerList", category: "元幹事・創設メンバー" },
    { id: "currentMemberList", category: "2024年度メンバー" },
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

  const alumni = await loadJson("data/alumni.json");
  list.innerHTML = alumni.map(makeMemberCard).join("") || emptyState("過去メンバー情報はまだ登録されていません。");
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
initHome();
initResourcesPage();
initMembersIfPresent();
initAlumniIfPresent();
