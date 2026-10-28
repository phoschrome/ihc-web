let restaurants = [];
let allDishes = [];
let dishes = [];
let recentDishIds = [];
let currentRestaurant = null;
let currentUser = null;
let apiBaseUrl = "";
const cart = new Map();
let noticeTimer;
const CATALOG_CACHE_KEY = "saborcito_catalog_cache_v1";
const topSearch = document.querySelector("#search");
const searchResults = document.querySelector("#search-results");
const pageIntro = document.querySelector("#restaurant-page-intro");
const sourceNote = document.querySelector("#catalog-source-note");
const directorySection = document.querySelector("#restaurant-directory-section");
const directoryGrid = document.querySelector("#restaurant-directory-grid");
const detailSection = document.querySelector("#restaurant-detail-section");
const recentSection = document.querySelector("#restaurant-recent-section");
const recentGrid = document.querySelector("#restaurant-recent-grid");
const bookmarkButton = document.querySelector("#restaurant-bookmark");
const catalogError = document.querySelector("#catalog-error");
const drawer = document.querySelector("#cart-drawer");
const backdrop = document.querySelector("#drawer-backdrop");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showNotice(message) {
  const notice = document.querySelector("#notice");
  if (!notice) return;
  notice.textContent = message;
  notice.hidden = false;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 3000);
}

function getUserKey() {
  return String(currentUser?.email || currentUser?.id || "anon").trim().toLowerCase();
}

function getOrderHistoryKey(restaurantId) {
  return `saborcito_recent_orders_${getUserKey()}_rest_${restaurantId}`;
}

function getSavedBookmarksKey() {
  return `saborcito_bookmarks_${getUserKey()}`;
}

function getCartStorageKey() {
  return `saborcito_cart_${getUserKey()}`;
}

function loadCartFromCache() {
  cart.clear();
  try {
    const entries = JSON.parse(localStorage.getItem(getCartStorageKey()) || "[]");
    if (Array.isArray(entries)) {
      entries.forEach(([id, qty]) => {
        const num = Number(qty);
        if (id && Number.isFinite(num) && num > 0) {
          cart.set(String(id), num);
        }
      });
    }
  } catch {
    // ignore corrupt cache
  }
}

function saveCartToCache() {
  try {
    localStorage.setItem(getCartStorageKey(), JSON.stringify([...cart.entries()]));
  } catch {
    // ignore quota errors
  }
}

function getLocalRecentDishIds(restaurantId) {
  try {
    const stored = JSON.parse(localStorage.getItem(getOrderHistoryKey(restaurantId)) || "[]");
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return [];
  }
}

function saveLocalRecentDishIds(restaurantId, newDishIds) {
  const existing = getLocalRecentDishIds(restaurantId);
  const combined = [...newDishIds.map(String), ...existing];
  const uniqueLastThree = [...new Set(combined)].slice(0, 3);
  try {
    localStorage.setItem(getOrderHistoryKey(restaurantId), JSON.stringify(uniqueLastThree));
  } catch {
    // ignore quota errors
  }
  return uniqueLastThree;
}

function updateBookmarkState() {
  if (!bookmarkButton || !currentRestaurant) return;
  try {
    const parsed = JSON.parse(localStorage.getItem(getSavedBookmarksKey()) || "[]");
    const saved = new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    const isBookmarked = saved.has(String(currentRestaurant.id));
    bookmarkButton.setAttribute("aria-pressed", String(isBookmarked));
  } catch {
    bookmarkButton.setAttribute("aria-pressed", "false");
  }
}

function updateCart() {
  saveCartToCache();
  const items = [...cart.entries()];
  const count = items.reduce((sum, [, quantity]) => sum + quantity, 0);
  const cartCount = document.querySelector("#cart-count");
  const cartButton = document.querySelector("#cart-button");
  if (cartCount) cartCount.textContent = count;
  if (cartButton) {
    cartButton.setAttribute("aria-label", `Abrir carrito, ${count} ${count === 1 ? "producto" : "productos"}`);
  }
  const total = items.reduce((sum, [id, quantity]) => {
    const dish = allDishes.find(item => item.id === id);
    return sum + (dish ? dish.price * quantity : 0);
  }, 0);
  const cartTotal = document.querySelector("#cart-total");
  if (cartTotal) cartTotal.textContent = `$${total.toFixed(2)}`;
  const cartItems = document.querySelector("#cart-items");
  if (cartItems) {
    cartItems.innerHTML = items.length
      ? items.map(([id, quantity]) => {
        const dish = allDishes.find(item => item.id === id);
        if (!dish) return "";
        return `<div class="cart-item"><div><strong>${escapeHTML(dish.name)}</strong><p>$${escapeHTML(dish.price.toFixed(2))} · Subtotal $${escapeHTML((dish.price * quantity).toFixed(2))}</p></div><div class="quantity-controls"><button type="button" data-quantity="${escapeHTML(id)}" data-delta="-1" aria-label="Quitar una unidad de ${escapeHTML(dish.name)}">−</button><span aria-label="Cantidad">${quantity}</span><button type="button" data-quantity="${escapeHTML(id)}" data-delta="1" aria-label="Añadir una unidad de ${escapeHTML(dish.name)}">+</button></div></div>`;
      }).join("")
      : '<p class="empty-state">Tu carrito está vacío. ¡Elige algo delicioso!</p>';
  }
}

function openCart() {
  if (!drawer || !backdrop) return;
  drawer.hidden = false;
  backdrop.hidden = false;
  document.querySelector("#close-cart")?.focus();
}

function closeCart() {
  if (!drawer || !backdrop) return;
  drawer.hidden = true;
  backdrop.hidden = true;
  document.querySelector("#cart-button")?.focus();
}

function normalizeCollection(payload, name) {
  const records = Array.isArray(payload) ? payload : (payload?.data ?? payload?.items);
  if (!Array.isArray(records)) throw new Error(`La respuesta de ${name} debe ser una lista de registros.`);
  return records;
}

function normalizeRestaurant(record, apiBase) {
  const id = record?.id ?? record?.id_restaurante;
  const name = record?.name ?? record?.nombre_comercial;
  if (!record || (typeof id !== "string" && typeof id !== "number") || !name) {
    throw new Error("Un restaurante recibido no contiene un id y un nombre válidos.");
  }
  let logo = String(record.logo || "").trim();
  if (logo && !/^https?:\/\//i.test(logo) && apiBase) {
    logo = `${apiBase.replace(/\/+$/, "")}/${logo.replace(/^\/+/, "")}`;
  }
  let banner = String(record.banner || "").trim();
  if (banner && !/^https?:\/\//i.test(banner) && apiBase) {
    banner = `${apiBase.replace(/\/+$/, "")}/${banner.replace(/^\/+/, "")}`;
  }
  return {
    id: String(id),
    name: String(name),
    category: String(record.category || "Restaurante"),
    icon: String(record.icon || "🍽️"),
    rating: Number(record.rating ?? 4.8),
    time: String(record.time || record.deliveryTime || record.time_est || "20–30 min"),
    description: String(record.description || record.direccion || ""),
    logo,
    banner
  };
}

function normalizeDish(record, apiBase) {
  const id = record?.id ?? record?.id_producto;
  const restaurantId = record?.restaurantId ?? record?.restaurantid ?? record?.id_restaurante;
  const name = record?.name ?? record?.nombre;
  const price = Number(record?.price ?? record?.precio);

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
    alt: String(record.alt || name)
  };
}

function renderRecentOrderCard(dish) {
  return `
    <article class="recent-order-card">
      <div class="recent-order-thumb">
        ${dish.image
          ? `<img src="${escapeHTML(dish.image)}" alt="${escapeHTML(dish.alt)}" loading="lazy">`
          : `<span class="recent-order-placeholder" aria-hidden="true">${escapeHTML(currentRestaurant?.icon || "🍽️")}</span>`}
        <button class="recent-add-button" type="button" data-add="${escapeHTML(dish.id)}" aria-label="Volver a pedir ${escapeHTML(dish.name)}" title="Añadir al carrito">+</button>
      </div>
      <div class="recent-order-meta">
        <strong>${escapeHTML(dish.name)}</strong>
        <span class="price">$${escapeHTML(dish.price.toFixed(2))}</span>
      </div>
    </article>`;
}

function renderDish(dish) {
  return `
    <article class="food-card">
      <div class="food-image">${dish.image
        ? `<img src="${escapeHTML(dish.image)}" alt="${escapeHTML(dish.alt)}" loading="lazy">`
        : `<span class="food-image-placeholder" aria-hidden="true">${escapeHTML(currentRestaurant?.icon || "🍽️")}</span>`}</div>
      <div class="food-info">
        <h4 class="food-name">${escapeHTML(dish.name)}</h4>
        <p class="food-description">${escapeHTML(dish.description)}</p>
        <div class="food-bottom">
          <span class="price">$${escapeHTML(dish.price.toFixed(2))}</span>
          <button class="add-button" type="button" data-add="${escapeHTML(dish.id)}" aria-label="Añadir ${escapeHTML(dish.name)} al carrito" title="Añadir al carrito">+</button>
        </div>
      </div>
    </article>`;
}

function renderDirectory() {
  const query = (topSearch?.value || "").trim().toLocaleLowerCase("es");
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

function renderRecentOrders() {
  if (!recentSection || !recentGrid || !currentRestaurant) return;
  const recentDishes = recentDishIds
    .map(id => dishes.find(dish => dish.id === String(id)))
    .filter(Boolean)
    .slice(0, 3);

  if (recentDishes.length === 0) {
    recentSection.hidden = true;
    recentGrid.innerHTML = "";
    return;
  }

  recentSection.hidden = false;
  recentGrid.innerHTML = recentDishes.map(renderRecentOrderCard).join("");
}

function renderMenu() {
  if (!currentRestaurant) {
    renderDirectory();
    return;
  }
  const query = (topSearch?.value || "").trim().toLocaleLowerCase("es");
  const matchesSearch = dish => `${dish.name} ${dish.category} ${dish.description}`.toLocaleLowerCase("es").includes(query);
  const visibleDishes = dishes.filter(matchesSearch);
  const sections = document.querySelector("#restaurant-menu-sections");

  renderRecentOrders();

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

function renderSearchSuggestions() {
  if (!topSearch || !searchResults) return;
  const query = topSearch.value.trim().toLocaleLowerCase("es");
  if (!query) {
    searchResults.hidden = true;
    return;
  }
  const matchingRestaurants = restaurants
    .filter(r => `${r.name} ${r.category}`.toLocaleLowerCase("es").includes(query))
    .slice(0, 4)
    .map(r => `<button class="search-result" type="button" role="option" data-goto-restaurant="${escapeHTML(r.id)}"><strong>${escapeHTML(r.icon)} ${escapeHTML(r.name)}</strong><span> · Restaurante</span></button>`);

  const matchingDishes = allDishes
    .filter(d => `${d.name} ${d.description}`.toLocaleLowerCase("es").includes(query))
    .slice(0, 4)
    .map(d => {
      const rest = restaurants.find(r => r.id === d.restaurantId);
      return `<button class="search-result" type="button" role="option" data-goto-restaurant="${escapeHTML(d.restaurantId)}" data-dish-name="${escapeHTML(d.name)}"><strong>${escapeHTML(d.name)}</strong><span> · ${escapeHTML(rest ? rest.name : "Platillo")}</span></button>`;
    });

  const combined = [...matchingRestaurants, ...matchingDishes];
  searchResults.innerHTML = combined.length
    ? combined.join("")
    : '<div class="search-result" role="option">Sin coincidencias. Prueba otro término.</div>';
  searchResults.hidden = false;
}

function renderRestaurant() {
  const restaurantId = new URLSearchParams(window.location.search).get("restaurant");
  if (!restaurantId) {
    currentRestaurant = null;
    detailSection.hidden = true;
    if (pageIntro) pageIntro.hidden = false;
    if (directorySection) directorySection.hidden = false;
    renderDirectory();
    return;
  }

  currentRestaurant = restaurants.find(item => item.id === restaurantId);
  if (!currentRestaurant) {
    throw new Error("No encontramos ese restaurante en el catálogo.");
  }

  if (pageIntro) pageIntro.hidden = true;
  if (directorySection) directorySection.hidden = true;
  dishes = allDishes.filter(dish => dish.restaurantId === currentRestaurant.id);
  detailSection.hidden = false;

  const bannerEl = document.querySelector("#restaurant-banner");
  if (bannerEl) {
    bannerEl.innerHTML = currentRestaurant.banner
      ? `<img src="${escapeHTML(currentRestaurant.banner)}" alt="Banner de ${escapeHTML(currentRestaurant.name)}"><span class="restaurant-banner-label">${escapeHTML(currentRestaurant.name)}</span>`
      : `<span class="restaurant-banner-label">Banner de ${escapeHTML(currentRestaurant.name)}</span>`;
  }

  const logoEl = document.querySelector("#restaurant-detail-icon");
  if (logoEl) {
    logoEl.innerHTML = currentRestaurant.logo
      ? `<img src="${escapeHTML(currentRestaurant.logo)}" alt="Logo de ${escapeHTML(currentRestaurant.name)}">`
      : escapeHTML(currentRestaurant.icon);
  }

  const starsCount = Math.max(1, Math.min(5, Math.round(Number(currentRestaurant.rating) || 5)));
  const starsEl = document.querySelector("#restaurant-detail-stars");
  if (starsEl) {
    starsEl.textContent = Array.from({ length: 5 }, (_, idx) => (idx < starsCount ? "★" : "☆")).join(" ");
  }

  document.querySelector("#restaurant-detail-category").textContent = currentRestaurant.category;
  document.querySelector("#restaurant-detail-title").textContent = currentRestaurant.name;
  document.querySelector("#restaurant-detail-description").textContent = currentRestaurant.description;
  document.querySelector("#restaurant-detail-meta").textContent = `${currentRestaurant.rating} · ${currentRestaurant.time}`;
  document.title = `${currentRestaurant.name} — Menú | Saborcito`;

  updateBookmarkState();
  // Cargar instantáneamente los últimos 3 pedidos desde la caché del navegador (0 ms)
  recentDishIds = getLocalRecentDishIds(currentRestaurant.id);
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

  apiBaseUrl = apiBase.replace(/\/+$/, "");

  // 1. Renderizado instantáneo desde caché del navegador si existe (Stale-While-Revalidate como Uber Eats/Rappi)
  const SEED_RESTAURANTS = [
    { id: "1", name: "Pizzería Roma", category: "Pizza", icon: "🍕", rating: 4.8, time: "20–30 min", description: "Dirección: Av. Principal 101", logo: "", banner: "" },
    { id: "2", name: "Burger King", category: "Hamburguesas", icon: "🍔", rating: 4.8, time: "20–30 min", description: "Dirección: Mall Central L-20", logo: "", banner: "" },
    { id: "3", name: "Sushi Zen", category: "Asiática", icon: "🍣", rating: 4.8, time: "20–30 min", description: "Dirección: Calle del Río 45", logo: "", banner: "" },
    { id: "4", name: "Tacos El Loco", category: "Mexicana", icon: "🌮", rating: 4.8, time: "20–30 min", description: "Dirección: Plaza Sur Local 5", logo: "", banner: "" },
    { id: "5", name: "KFC", category: "Pollo", icon: "🍗", rating: 4.8, time: "20–30 min", description: "Dirección: Av. Naciones Unidas 1023", logo: "", banner: "" },
    { id: "6", name: "Wok Express", category: "Asiática", icon: "🥡", rating: 4.8, time: "20–30 min", description: "Dirección: Patio de Comidas Centro", logo: "", banner: "" },
    { id: "7", name: "Veggie Life", category: "Saludable", icon: "🥗", rating: 4.8, time: "20–30 min", description: "Dirección: Calle Verde 99", logo: "", banner: "" },
    { id: "8", name: "Sweet Bakery", category: "Postres", icon: "🥐", rating: 4.8, time: "20–30 min", description: "Dirección: Av. Las Flores 21", logo: "", banner: "" },
    { id: "9", name: "Texas Steakhouse", category: "Carnes", icon: "🥩", rating: 4.8, time: "20–30 min", description: "Dirección: Boulevard Norte 500", logo: "", banner: "" },
    { id: "10", name: "Gelato Mio", category: "Postres", icon: "🍨", rating: 4.8, time: "20–30 min", description: "Dirección: Plaza Mayor Local 12", logo: "", banner: "" }
  ];
  const SEED_DISHES = [
    [1,"1","Pizza Margherita",12.5],[2,"1","Pizza Pepperoni",14],[3,"1","Pizza Cuatro Quesos",15.5],[4,"1","Pizza Hawaiana",13],[5,"1","Calzone Clásico",11],[6,"1","Lasaña de Carne",10.5],[7,"1","Espagueti Carbonara",9.5],[8,"1","Pan de Ajo",4],[9,"1","Tiramisú",5.5],[10,"1","Gaseosa 1.5L",3],
    [11,"2","Whopper Clásica",6.5],[12,"2","Whopper Doble",8.5],[13,"2","Cheeseburger",3.5],[14,"2","Chicken Royale",5.5],[15,"2","Nuggets (10 uds)",4.5],[16,"2","Papas Fritas Medianas",2.5],[17,"2","Papas Fritas Grandes",3.5],[18,"2","Aros de Cebolla",3],[19,"2","Helado Cono Clásico",1.5],[20,"2","Gaseosa Mediana",2],
    [21,"3","California Roll",8],[22,"3","Spicy Tuna Roll",9.5],[23,"3","Dragon Roll",12],[24,"3","Nigiri de Salmón (2 pzas)",4.5],[25,"3","Sashimi Mixto",15],[26,"3","Sopa Miso",3],[27,"3","Edamame",4],[28,"3","Tempura de Camarón",10],[29,"3","Helado de Té Verde",4.5],[30,"3","Té Helado",2.5],
    [31,"4","Taco al Pastor",2.5],[32,"4","Taco de Bistec",3],[33,"4","Taco de Carnitas",2.5],[34,"4","Burrito Mixto",7.5],[35,"4","Quesadilla con Carne",5],[36,"4","Nachos Supremos",8],[37,"4","Guacamole con Totopos",6],[38,"4","Enchiladas Rojas",7],[39,"4","Churros Rellenos",4],[40,"4","Agua de Horchata",2.5],
    [41,"5","Combo 2 Piezas",6.5],[42,"5","Mega Bucket (8 pzas)",18],[43,"5","Zinger Burger",5.5],[44,"5","Popcorn Chicken",4.5],[45,"5","Hot Wings (6 pzas)",6],[46,"5","Papas Fritas Familiares",4],[47,"5","Puré de Papa con Gravy",3],[48,"5","Ensalada de Col",2.5],[49,"5","Postre Chocochip",2],[50,"5","Gaseosa Grande",2.5],
    [51,"6","Arroz Frito Especial",7.5],[52,"6","Chow Mein de Pollo",8],[53,"6","Cerdo Agridulce",9],[54,"6","Pollo Kung Pao",9.5],[55,"6","Res con Brócoli",10],[56,"6","Rollitos de Primavera",4],[57,"6","Sopa Wonton",5],[58,"6","Dumplings al Vapor",6],[59,"6","Plátano Frito",3.5],[60,"6","Té de Jazmín",2],
    [61,"7","Hamburguesa de Lentejas",7.5],[62,"7","Bowl de Quinoa y Tofu",9],[63,"7","Wrap de Falafel",8.5],[64,"7","Pizza Vegana (Queso de Almendras)",14],[65,"7","Ensalada Mediterránea",8],[66,"7","Hummus con Pan Pita",5.5],[67,"7","Chips de Camote",4],[68,"7","Brownie Sin Gluten",4.5],[69,"7","Batido Verde",5],[70,"7","Kombucha",4],
    [71,"8","Croissant de Mantequilla",2.5],[72,"8","Muffin de Arándanos",3],[73,"8","Cheesecake de Fresa",5.5],[74,"8","Torta de Chocolate (Porción)",6],[75,"8","Galleta Chocochip Gigante",2],[76,"8","Macarons (Caja x6)",8],[77,"8","Donut Glaseada",1.5],[78,"8","Café Americano",2.5],[79,"8","Latte Macchiato",3.5],[80,"8","Frappuccino Moca",4.5],
    [81,"9","Ribeye (300g)",24],[82,"9","T-Bone Steak",26],[83,"9","New York Strip",22],[84,"9","BBQ Ribs (Medio Costillar)",18],[85,"9","Hamburguesa Angus",12.5],[86,"9","Papa Horneada",4],[87,"9","Mac & Cheese",5],[88,"9","Espárragos a la Parrilla",6],[89,"9","Cheesecake Estilo NY",7],[90,"9","Cerveza Artesanal",5.5],
    [91,"10","Gelato de Vainilla (1 Bola)",2.5],[92,"10","Gelato de Chocolate Suizo (2 Bolas)",4.5],[93,"10","Gelato de Pistacho",3],[94,"10","Sorbete de Limón",2.5],[95,"10","Sorbete de Fresa",2.5],[96,"10","Copa Sundae",6],[97,"10","Banana Split",7.5],[98,"10","Waffle con Helado",8],[99,"10","Milkshake Clásico",5.5],[100,"10","Café Espresso",2]
  ].map(([id, restaurantId, name, price]) => ({
    id: String(id),
    restaurantId,
    name,
    category: "Menú Principal",
    description: "Preparado al momento.",
    price,
    image: "",
    alt: name
  }));

  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || "null");
    if (cached && Array.isArray(cached.restaurants) && Array.isArray(cached.dishes)) {
      restaurants = cached.restaurants;
      allDishes = cached.dishes;
    } else {
      restaurants = SEED_RESTAURANTS;
      allDishes = SEED_DISHES;
    }
    sourceNote.hidden = true;
    renderRestaurant();
    updateCart();
  } catch {
    restaurants = SEED_RESTAURANTS;
    allDishes = SEED_DISHES;
    sourceNote.hidden = true;
    renderRestaurant();
    updateCart();
  }

  // 2. Sincronización en segundo plano con Oracle Cloud
  try {
    const [restaurantResponse, dishResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/restaurants`, { headers: { Accept: "application/json" } }),
      fetch(`${apiBaseUrl}/dishes`, { headers: { Accept: "application/json" } })
    ]);
    if (!restaurantResponse.ok || !dishResponse.ok) return;
    const [restaurantPayload, dishPayload] = await Promise.all([
      restaurantResponse.json(),
      dishResponse.json()
    ]);
    const nextRestaurants = normalizeCollection(restaurantPayload, "restaurantes").map(r => normalizeRestaurant(r, apiBaseUrl));
    const nextDishes = normalizeCollection(dishPayload, "platillos").map(record => normalizeDish(record, apiBaseUrl));
    const restaurantIds = new Set(nextRestaurants.map(restaurant => restaurant.id));
    if (nextDishes.some(dish => !restaurantIds.has(dish.restaurantId))) return;

    restaurants = nextRestaurants;
    allDishes = nextDishes;
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ restaurants: nextRestaurants, dishes: nextDishes, updatedAt: Date.now() }));
    sourceNote.hidden = true;
    renderRestaurant();
    updateCart();

    if (currentUser?.id && localStorage.getItem(getSavedBookmarksKey()) === null) {
      fetch(`${apiBaseUrl}/favorites?userId=${encodeURIComponent(currentUser.id)}`, {
        headers: { Accept: "application/json" }
      })
        .then(res => (res.ok ? res.json() : null))
        .then(payload => {
          if (!payload || localStorage.getItem(getSavedBookmarksKey()) !== null) return;
          const items = Array.isArray(payload) ? payload : (payload?.items ?? payload?.data);
          if (!Array.isArray(items) || items.length === 0) return;
          const cloudIds = items.map(item => String(item.restaurantId ?? item.id_restaurante ?? item.id)).filter(Boolean);
          if (cloudIds.length > 0) {
            localStorage.setItem(getSavedBookmarksKey(), JSON.stringify([...new Set(cloudIds)]));
            updateBookmarkState();
          }
        })
        .catch(() => {});
    }
  } catch {
    // Si Oracle Cloud está en pausa (HTTP 571), se mantiene la copia en caché sin interrumpir al usuario
  }
}

if (topSearch) {
  topSearch.addEventListener("input", () => {
    renderSearchSuggestions();
    renderMenu();
  });
  topSearch.addEventListener("keydown", event => {
    if (event.key === "Escape" && searchResults) searchResults.hidden = true;
  });
}

bookmarkButton?.addEventListener("click", () => {
  if (!currentRestaurant) return;
  try {
    const key = getSavedBookmarksKey();
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    const saved = new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    const restId = String(currentRestaurant.id);
    let action = "add";
    if (saved.has(restId)) {
      saved.delete(restId);
      action = "remove";
      showNotice(`${currentRestaurant.name} se quitó de tus favoritos.`);
    } else {
      saved.add(restId);
      action = "add";
      showNotice(`${currentRestaurant.name} se guardó en tus restaurantes favoritos.`);
    }
    localStorage.setItem(key, JSON.stringify([...saved]));
    updateBookmarkState();

    if (apiBaseUrl && currentUser?.id) {
      fetch(`${apiBaseUrl}/favorites`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          userId: Number(currentUser.id),
          restaurantId: Number(currentRestaurant.id),
          action
        })
      }).catch(() => {});
    }
  } catch {
    // ignore storage errors
  }
});

document.addEventListener("click", event => {
  const target = event.target.closest("button");
  if (!target) {
    if (searchResults && !event.target.closest(".search-wrap")) {
      searchResults.hidden = true;
    }
    return;
  }
  if (target.dataset.gotoRestaurant) {
    const restId = target.dataset.gotoRestaurant;
    if (searchResults) searchResults.hidden = true;
    window.location.href = `restaurants.html?restaurant=${encodeURIComponent(restId)}`;
    return;
  }
  if (target.dataset.add) {
    const dish = allDishes.find(item => item.id === target.dataset.add);
    if (!dish) return;
    cart.set(dish.id, (cart.get(dish.id) || 0) + 1);
    updateCart();
    showNotice(`${dish.name} se añadió al carrito.`);
  }
  if (target.dataset.quantity) {
    const next = (cart.get(target.dataset.quantity) || 0) + Number(target.dataset.delta);
    if (next <= 0) cart.delete(target.dataset.quantity);
    else cart.set(target.dataset.quantity, next);
    updateCart();
  }
});

document.querySelector("#cart-button")?.addEventListener("click", openCart);
document.querySelector("#close-cart")?.addEventListener("click", closeCart);
backdrop?.addEventListener("click", closeCart);

document.querySelector("#checkout-button")?.addEventListener("click", () => {
  if (!cart.size) {
    showNotice("Añade algo delicioso a tu carrito para continuar.");
    return;
  }

  // Agrupar los productos pedidos por restaurante y guardar los últimos 3 en la caché del navegador
  const dishesByRestaurant = new Map();
  for (const dishId of cart.keys()) {
    const dish = allDishes.find(item => item.id === dishId);
    const restId = dish?.restaurantId || currentRestaurant?.id;
    if (!restId) continue;
    if (!dishesByRestaurant.has(restId)) dishesByRestaurant.set(restId, []);
    dishesByRestaurant.get(restId).push(dishId);
  }

  for (const [restId, dishIds] of dishesByRestaurant.entries()) {
    const updated = saveLocalRecentDishIds(restId, dishIds);
    if (currentRestaurant && currentRestaurant.id === String(restId)) {
      recentDishIds = updated;
    }
  }

  renderRecentOrders();
  cart.clear();
  updateCart();
  closeCart();
  showNotice("¡Pedido realizado! Se actualizaron tus Últimos pedidos en este restaurante.");
});

try {
  const savedUser = JSON.parse(localStorage.getItem("saborcito_user") || "null");
  if (!savedUser || !savedUser.email) {
    window.location.replace("auth.html");
  } else {
    currentUser = savedUser;
    loadCartFromCache();
    const accountLink = document.querySelector("#account-link");
    const cartButton = document.querySelector("#cart-button");
    if (cartButton) {
      cartButton.disabled = false;
      cartButton.title = "Abrir carrito";
    }
    if (accountLink && savedUser.name) {
      accountLink.textContent = `👤 ${savedUser.name} · Salir`;
      accountLink.href = "#";
      accountLink.setAttribute("aria-label", `Cerrar sesión de ${savedUser.name}`);
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

window.addEventListener("pageshow", () => {
  updateBookmarkState();
});

window.addEventListener("storage", () => {
  updateBookmarkState();
});
