let restaurants = [];
let allDishes = [];
let dishes = [];
let currentRestaurant = null;
const search = document.querySelector("#restaurant-search");
const sourceNote = document.querySelector("#catalog-source-note");
const directorySection = document.querySelector("#restaurant-directory-section");
const directoryGrid = document.querySelector("#restaurant-directory-grid");
const detailSection = document.querySelector("#restaurant-detail-section");
const promotionsSection = document.querySelector("#restaurant-promotions-section");
const catalogError = document.querySelector("#catalog-error");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function normalizeCollection(payload, name) {
  const records = Array.isArray(payload) ? payload : (payload?.data ?? payload?.items);
  if (!Array.isArray(records)) throw new Error(`La respuesta de ${name} debe ser una lista de registros.`);
  return records;
}

function normalizeRestaurant(record) {
  const id = record?.id ?? record?.id_restaurante;
  const name = record?.name ?? record?.nombre_comercial;
  if (!record || (typeof id !== "string" && typeof id !== "number") || !name) {
    throw new Error("Un restaurante recibido no contiene un id y un nombre válidos.");
  }
  return {
    id: String(id),
    name: String(name),
    category: String(record.category || "Restaurante"),
    icon: String(record.icon || "🍽️"),
    rating: String(record.rating ?? "4.8"),
    time: String(record.time || record.deliveryTime || record.time_est || "20–30 min"),
    description: String(record.description || record.direccion || "")
  };
}

function normalizeDish(record, apiBase) {
  const id = record?.id ?? record?.id_producto;
  const restaurantId = record?.restaurantId ?? record?.restaurantid ?? record?.id_restaurante;
  const name = record?.name ?? record?.nombre;
  const price = Number(record?.price ?? record?.precio);
  const rawPromo = record?.isPromotion ?? record?.ispromotion ?? record?.is_promotion;
  const isPromotion = rawPromo === true || rawPromo === 1 || rawPromo === "true" || rawPromo === "1";

  if (!record || (typeof id !== "string" && typeof id !== "number") ||
      (typeof restaurantId !== "string" && typeof restaurantId !== "number") ||
      !name || !Number.isFinite(price) || price < 0) {
    throw new Error("Un plato recibido no contiene id, restaurantId, nombre y precio válidos.");
  }

  let image = String(record.image || "").trim();
  if (image && !/^https?:\/\//i.test(image) && apiBase) {
    image = `${apiBase.replace(/\/+$/, "")}/${image.replace(/^\/+/, "")}`;
  }

  return {
    id: String(id),
    restaurantId: String(restaurantId),
    name: String(name),
    category: String(record.category || "Menú Principal"),
    description: String(record.description ?? record.descripcion ?? ""),
    price,
    image,
    alt: String(record.alt || name),
    isPromotion
  };
}

function renderDish(dish, isPromotion = false) {
  return `
    <article class="food-card${isPromotion ? " food-card-promotion" : ""}">
      <div class="food-image">${dish.image
        ? `<img src="${escapeHTML(dish.image)}" alt="${escapeHTML(dish.alt)}" loading="lazy">`
        : '<span class="food-image-placeholder" aria-hidden="true">🍽️</span>'}</div>
      <div class="food-info">
        ${isPromotion ? '<span class="offer-tag">PROMOCIÓN EXCLUSIVA</span>' : ""}
        <h4 class="food-name">${escapeHTML(dish.name)}</h4>
        <p class="food-description">${escapeHTML(dish.description)}</p>
        <span class="price">$${escapeHTML(dish.price.toFixed(2))}</span>
      </div>
    </article>`;
}

function renderDirectory() {
  const query = search.value.trim().toLocaleLowerCase("es");
  const visible = restaurants.filter(r =>
    !query || `${r.name} ${r.category} ${r.description}`.toLocaleLowerCase("es").includes(query)
  );
  if (!directoryGrid) return;
  directoryGrid.innerHTML = visible.length
    ? visible.map(r => `
      <article class="restaurant-card">
        <span class="restaurant-icon" aria-hidden="true">${escapeHTML(r.icon)}</span>
        <div class="restaurant-copy">
          <span class="offer-tag">${escapeHTML(r.category)}</span>
          <h3>${escapeHTML(r.name)}</h3>
          <p>${escapeHTML(r.description)}</p>
          <p class="rating">★ ${escapeHTML(r.rating)} · ${escapeHTML(r.time)}</p>
          <a class="restaurant-menu-link" href="restaurants.html?restaurant=${encodeURIComponent(r.id)}">Ver menú →</a>
        </div>
      </article>`).join("")
    : '<p class="empty-state">No encontramos restaurantes con esa búsqueda.</p>';
}

function renderMenu() {
  if (!currentRestaurant) {
    renderDirectory();
    return;
  }
  const query = search.value.trim().toLocaleLowerCase("es");
  const matchesSearch = dish => `${dish.name} ${dish.category} ${dish.description}`.toLocaleLowerCase("es").includes(query);
  const visibleDishes = dishes.filter(matchesSearch);
  const promotions = visibleDishes.filter(dish => dish.isPromotion);
  const sections = document.querySelector("#restaurant-menu-sections");

  promotionsSection.hidden = promotions.length === 0;
  document.querySelector("#restaurant-promotions-grid").innerHTML = promotions.map(dish => renderDish(dish, true)).join("");
  document.querySelector("#menu-description").textContent =
    `${visibleDishes.length} ${visibleDishes.length === 1 ? "platillo disponible" : "platillos disponibles"}.`;

  const categories = [...new Set(visibleDishes.map(dish => dish.category))];
  sections.innerHTML = categories.length
    ? categories.map(category => {
      const categoryDishes = visibleDishes.filter(dish => dish.category === category);
      return `
        <section class="restaurant-menu-category" aria-label="Platillos: ${escapeHTML(category)}">
          <h3>${escapeHTML(category)}</h3>
          <div class="food-grid">${categoryDishes.map(dish => renderDish(dish)).join("")}</div>
        </section>`;
    }).join("")
    : '<p class="empty-state">No encontramos platillos con esa búsqueda.</p>';
}

function renderRestaurant() {
  const restaurantId = new URLSearchParams(window.location.search).get("restaurant");
  if (!restaurantId) {
    currentRestaurant = null;
    detailSection.hidden = true;
    if (directorySection) directorySection.hidden = false;
    document.querySelector("#restaurant-page-title").textContent = "Restaurantes disponibles";
    search.placeholder = "Busca un restaurante o categoría";
    search.disabled = false;
    renderDirectory();
    return;
  }

  currentRestaurant = restaurants.find(item => item.id === restaurantId);
  if (!currentRestaurant) {
    throw new Error("No encontramos ese restaurante en el catálogo.");
  }

  if (directorySection) directorySection.hidden = true;
  dishes = allDishes.filter(dish => dish.restaurantId === currentRestaurant.id);
  detailSection.hidden = false;
  document.querySelector("#restaurant-detail-icon").textContent = currentRestaurant.icon;
  document.querySelector("#restaurant-detail-category").textContent = currentRestaurant.category;
  document.querySelector("#restaurant-detail-title").textContent = currentRestaurant.name;
  document.querySelector("#restaurant-detail-description").textContent = currentRestaurant.description;
  document.querySelector("#restaurant-detail-meta").textContent = `★ ${currentRestaurant.rating} · ${currentRestaurant.time}`;
  document.title = `${currentRestaurant.name} — Menú | Saborcito`;
  search.disabled = false;
  renderMenu();
}

async function loadCloudCatalog() {
  const apiBase = document.querySelector('meta[name="saborcito-api-base-url"]')?.content.trim();
  if (!apiBase) {
    throw new Error("La conexión con la base de datos aún no está configurada.");
  }

  let baseUrl;
  try {
    baseUrl = new URL(apiBase);
  } catch {
    throw new Error("La URL base de la API debe ser absoluta.");
  }
  if (baseUrl.protocol !== "https:" &&
      !(baseUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(baseUrl.hostname))) {
    throw new Error("La API debe usar HTTPS (HTTP solo está permitido en localhost).");
  }

  sourceNote.textContent = "Cargando el menú desde Oracle Cloud...";
  const base = apiBase.replace(/\/+$/, "");
  const [restaurantResponse, dishResponse] = await Promise.all([
    fetch(`${base}/restaurants`, { headers: { Accept: "application/json" } }),
    fetch(`${base}/dishes`, { headers: { Accept: "application/json" } })
  ]);
  if (!restaurantResponse.ok || !dishResponse.ok) {
    throw new Error(`La API respondió con HTTP ${restaurantResponse.status} (restaurantes) y HTTP ${dishResponse.status} (platillos).`);
  }
  const [restaurantPayload, dishPayload] = await Promise.all([
    restaurantResponse.json(),
    dishResponse.json()
  ]);
  const nextRestaurants = normalizeCollection(restaurantPayload, "restaurantes").map(normalizeRestaurant);
  const nextDishes = normalizeCollection(dishPayload, "platillos").map(record => normalizeDish(record, base));
  const restaurantIds = new Set(nextRestaurants.map(restaurant => restaurant.id));
  if (nextDishes.some(dish => !restaurantIds.has(dish.restaurantId))) {
    throw new Error("La API devolvió platillos vinculados a restaurantes que no existen.");
  }

  restaurants = nextRestaurants;
  allDishes = nextDishes;
  sourceNote.hidden = true;
  renderRestaurant();
}

search.addEventListener("input", renderMenu);

try {
  const savedUser = JSON.parse(localStorage.getItem("saborcito_user") || "null");
  if (!savedUser || !savedUser.email) {
    window.location.replace("auth.html");
  } else {
    const accountLink = document.querySelector("#restaurant-account-link");
    if (accountLink && savedUser.name) {
      accountLink.textContent = `👤 ${savedUser.name} · Salir`;
      accountLink.href = "#";
      accountLink.addEventListener("click", event => {
        event.preventDefault();
        localStorage.removeItem("saborcito_user");
        window.location.replace("auth.html");
      });
    }
    loadCloudCatalog().catch(error => {
      detailSection.hidden = true;
      if (directorySection) directorySection.hidden = true;
      sourceNote.hidden = true;
      catalogError.hidden = false;
      document.querySelector("#catalog-error-message").textContent = error.message;
    });
  }
} catch {
  localStorage.removeItem("saborcito_user");
  window.location.replace("auth.html");
}
