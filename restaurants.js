const sampleRestaurants = [
  { id: "la-burgeria", name: "La Burgería", category: "Hamburguesas", icon: "🍔", rating: "4.8", time: "20–30 min", description: "Hamburguesas hechas al momento." },
  { id: "forno-amore", name: "Forno & Amore", category: "Pizza", icon: "🍕", rating: "4.7", time: "25–35 min", description: "Sabores italianos y recetas de la casa." },
  { id: "verde-limon", name: "Verde Limón", category: "Saludable", icon: "🥗", rating: "4.9", time: "15–25 min", description: "Opciones frescas para todos los días." }
];

const sampleDishes = [
  { id: "burger", restaurantId: "la-burgeria", name: "La clásica smash", category: "Hamburguesas", description: "Doble carne, queso cheddar y salsa de la casa.", price: 189, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80", alt: "Hamburguesa con queso, lechuga y tomate" },
  { id: "pizza", restaurantId: "forno-amore", name: "Pizza margarita", category: "Pizza", description: "Tomate, mozzarella fresca y albahaca.", price: 220, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=700&q=80", alt: "Pizza margarita recién horneada" },
  { id: "ramen", restaurantId: "forno-amore", name: "Ramen de la casa", category: "Asiática", description: "Caldo lento, fideos y toppings frescos.", price: 198, image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=700&q=80", alt: "Tazón de ramen con fideos y huevo" },
  { id: "salad", restaurantId: "verde-limon", name: "Bowl arcoíris", category: "Saludable", description: "Quinoa, aguacate y vegetales de temporada.", price: 165, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80", alt: "Bowl de ensalada colorida con vegetales" }
];

let restaurants = sampleRestaurants;
let dishes = sampleDishes;
const search = document.querySelector("#restaurant-search");
const restaurantGrid = document.querySelector("#restaurant-grid");
const listSection = document.querySelector("#restaurant-list-section");
const detailSection = document.querySelector("#restaurant-detail-section");
const sourceNote = document.querySelector("#catalog-source-note");
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
  const records = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(records)) throw new Error(`La respuesta de ${name} debe ser una lista de registros.`);
  return records;
}

function normalizeRestaurant(record) {
  if (!record || (typeof record.id !== "string" && typeof record.id !== "number") || !record.name) {
    throw new Error("Un restaurante recibido no contiene un id y un nombre válidos.");
  }
  return {
    id: String(record.id),
    name: String(record.name),
    category: String(record.category || "Restaurante"),
    icon: String(record.icon || "🍽️"),
    rating: String(record.rating ?? "Nuevo"),
    time: String(record.time || record.deliveryTime || "Consultar tiempo"),
    description: String(record.description || "")
  };
}

function normalizeDish(record) {
  const price = Number(record?.price);
  if (!record || (typeof record.id !== "string" && typeof record.id !== "number") ||
      (typeof record.restaurantId !== "string" && typeof record.restaurantId !== "number") ||
      !record.name || !Number.isFinite(price) || price < 0) {
    throw new Error("Un plato recibido no contiene id, restaurantId, nombre y precio válidos.");
  }
  return {
    id: String(record.id),
    restaurantId: String(record.restaurantId),
    name: String(record.name),
    category: String(record.category || "Otros"),
    description: String(record.description || ""),
    price,
    image: String(record.image || ""),
    alt: String(record.alt || record.name)
  };
}

function renderRestaurants() {
  const query = search.value.trim().toLocaleLowerCase("es");
  const matchingDishRestaurantIds = new Set(dishes
    .filter(dish => `${dish.name} ${dish.category} ${dish.description}`.toLocaleLowerCase("es").includes(query))
    .map(dish => dish.restaurantId));
  const visible = restaurants.filter(restaurant =>
    !query ||
    `${restaurant.name} ${restaurant.category} ${restaurant.description}`.toLocaleLowerCase("es").includes(query) ||
    matchingDishRestaurantIds.has(restaurant.id)
  );
  document.querySelector("#restaurant-results-description").textContent = query
    ? `${visible.length} ${visible.length === 1 ? "restaurante encontrado" : "restaurantes encontrados"}.`
    : "Elige un restaurante para ver su menú.";
  restaurantGrid.innerHTML = visible.length ? visible.map(restaurant => `
    <article class="restaurant-card">
      <span class="restaurant-icon" aria-hidden="true">${escapeHTML(restaurant.icon)}</span>
      <div class="restaurant-copy">
        <h3>${escapeHTML(restaurant.name)}</h3>
        <p><span class="rating">★ ${escapeHTML(restaurant.rating)}</span> · ${escapeHTML(restaurant.category)} · ${escapeHTML(restaurant.time)}</p>
        <p>${escapeHTML(restaurant.description)}</p>
        <a class="restaurant-menu-link" href="restaurants.html?restaurant=${encodeURIComponent(restaurant.id)}">Ver menú <span aria-hidden="true">→</span></a>
      </div>
    </article>`).join("")
    : '<p class="empty-state">No encontramos restaurantes ni platillos con esa búsqueda.</p>';
}

function renderDish(dish) {
  return `
    <article class="food-card">
      <div class="food-image">${dish.image
        ? `<img src="${escapeHTML(dish.image)}" alt="${escapeHTML(dish.alt)}" loading="lazy">`
        : '<span class="food-image-placeholder" aria-hidden="true">🍽️</span>'}</div>
      <div class="food-info">
        <span class="offer-tag">${escapeHTML(dish.category)}</span>
        <h3 class="food-name">${escapeHTML(dish.name)}</h3>
        <p class="food-description">${escapeHTML(dish.description)}</p>
        <span class="price">$${escapeHTML(dish.price)}</span>
      </div>
    </article>`;
}

function renderRestaurantDetail() {
  const restaurantId = new URLSearchParams(window.location.search).get("restaurant");
  if (!restaurantId) return;
  const restaurant = restaurants.find(item => item.id === restaurantId);
  if (!restaurant) {
    listSection.hidden = true;
    catalogError.hidden = false;
    document.querySelector("#catalog-error-message").textContent = "No encontramos ese restaurante. Regresa al listado para elegir otro.";
    return;
  }

  const menu = dishes.filter(dish => dish.restaurantId === restaurant.id);
  listSection.hidden = true;
  detailSection.hidden = false;
  document.querySelector("#restaurant-detail-icon").textContent = restaurant.icon;
  document.querySelector("#restaurant-detail-category").textContent = restaurant.category;
  document.querySelector("#restaurant-detail-title").textContent = restaurant.name;
  document.querySelector("#restaurant-detail-description").textContent = restaurant.description;
  document.querySelector("#restaurant-detail-meta").textContent = `★ ${restaurant.rating} · ${restaurant.time}`;
  document.querySelector("#menu-description").textContent = `${menu.length} ${menu.length === 1 ? "platillo disponible" : "platillos disponibles"}.`;
  document.querySelector("#restaurant-dish-grid").innerHTML = menu.length
    ? menu.map(renderDish).join("")
    : '<p class="empty-state">Este restaurante aún no tiene platillos disponibles.</p>';
  document.title = `${restaurant.name} — Menú | Saborcito`;
}

async function loadCloudCatalog() {
  const apiBase = document.querySelector('meta[name="saborcito-api-base-url"]')?.content.trim();
  if (!apiBase) {
    renderRestaurants();
    renderRestaurantDetail();
    return;
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

  sourceNote.textContent = "Cargando restaurantes y platillos...";
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
  const nextDishes = normalizeCollection(dishPayload, "platillos").map(normalizeDish);
  const restaurantIds = new Set(nextRestaurants.map(restaurant => restaurant.id));
  if (nextDishes.some(dish => !restaurantIds.has(dish.restaurantId))) {
    throw new Error("La API devolvió platillos vinculados a restaurantes que no existen.");
  }

  restaurants = nextRestaurants;
  dishes = nextDishes;
  sourceNote.hidden = true;
  renderRestaurants();
  renderRestaurantDetail();
}

search.addEventListener("input", renderRestaurants);
loadCloudCatalog().catch(error => {
  listSection.hidden = true;
  detailSection.hidden = true;
  sourceNote.hidden = true;
  catalogError.hidden = false;
  document.querySelector("#catalog-error-message").textContent = error.message;
});
