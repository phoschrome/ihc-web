const SESSION_STORAGE_KEY = "saborcito_user";
const CATALOG_CACHE_KEY = "saborcito_catalog_cache_v1";
const ADDRESS_STORAGE_KEY = "saborcito_delivery_address";

const SEED_RESTAURANTS = [
  { id: "1", name: "Pizzería Roma", category: "Pizza", icon: "🍕" },
  { id: "2", name: "Burger King", category: "Hamburguesas", icon: "🍔" },
  { id: "3", name: "Sushi Zen", category: "Asiática", icon: "🍣" },
  { id: "4", name: "Tacos El Loco", category: "Mexicana", icon: "🌮" },
  { id: "5", name: "KFC", category: "Pollo", icon: "🍗" },
  { id: "6", name: "Wok Express", category: "Asiática", icon: "🥡" },
  { id: "7", name: "Veggie Life", category: "Saludable", icon: "🥗" },
  { id: "8", name: "Sweet Bakery", category: "Postres", icon: "🥐" },
  { id: "9", name: "Texas Steakhouse", category: "Carnes", icon: "🥩" },
  { id: "10", name: "Gelato Mio", category: "Postres", icon: "🍨" }
];

const PROMO_DISHES = [
  { id: "burger", restaurantId: "2", name: "La clásica smash", price: 189 },
  { id: "pizza", restaurantId: "1", name: "Pizza margarita", price: 220 },
  { id: "salad", restaurantId: "7", name: "Bowl arcoíris", price: 165 },
  { id: "ramen", restaurantId: "6", name: "Ramen de la casa", price: 198 }
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
  price
}));

let currentUser = null;
const cart = new Map();
let deliverySpeed = "standard";
let paymentMethod = "card";
let cardSource = "saved";
let cashPreset = "exact";
let selectedTip = 1;
let noticeTimer;

const checkoutForm = document.querySelector("#checkout-form");
const emptyState = document.querySelector("#checkout-empty-state");
const itemsListEl = document.querySelector("#checkout-items-list");
const feedbackEl = document.querySelector("#checkout-feedback");
const confirmBtn = document.querySelector("#confirm-payment-btn");
const topSearch = document.querySelector("#search");
const searchResults = document.querySelector("#search-results");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function showNotice(message) {
  const notice = document.querySelector("#notice");
  if (!notice) return;
  notice.textContent = message;
  notice.hidden = false;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 3200);
}

function getUserKey() {
  return String(currentUser?.email || currentUser?.id || "anon").trim().toLowerCase();
}

function getCartStorageKey() {
  return `saborcito_cart_${getUserKey()}`;
}

function getOrderHistoryKey(restaurantId) {
  return `saborcito_recent_orders_${getUserKey()}_rest_${restaurantId}`;
}

function saveLocalRecentDishIds(restaurantId, newDishIds) {
  try {
    const stored = JSON.parse(localStorage.getItem(getOrderHistoryKey(restaurantId)) || "[]");
    const existing = Array.isArray(stored) ? stored.map(String) : [];
    const combined = [...newDishIds.map(String), ...existing];
    const uniqueLastThree = [...new Set(combined)].slice(0, 3);
    localStorage.setItem(getOrderHistoryKey(restaurantId), JSON.stringify(uniqueLastThree));
  } catch {
    // ignore quota errors
  }
}

function getCatalogData() {
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || "null");
    if (cached && Array.isArray(cached.restaurants) && Array.isArray(cached.dishes)) {
      return {
        restaurants: cached.restaurants,
        dishes: [...cached.dishes, ...PROMO_DISHES]
      };
    }
  } catch {
    // fallback to seed
  }
  return {
    restaurants: SEED_RESTAURANTS,
    dishes: [...SEED_DISHES, ...PROMO_DISHES]
  };
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
    // ignore storage errors
  }
}

function calculateTotals() {
  const { dishes } = getCatalogData();
  let subtotal = 0;
  for (const [id, qty] of cart.entries()) {
    const dish = dishes.find(d => String(d.id) === String(id));
    if (dish) subtotal += Number(dish.price) * qty;
  }
  const deliveryFee = deliverySpeed === "priority" ? 1.5 : 0;
  const serviceFee = subtotal > 0 ? 0.99 : 0;
  const tip = subtotal > 0 ? selectedTip : 0;
  const total = subtotal + deliveryFee + serviceFee + tip;
  return { subtotal, deliveryFee, serviceFee, tip, total };
}

function updateCashPreview() {
  const preview = document.querySelector("#cash-change-preview");
  const customInput = document.querySelector("#cash-amount");
  if (!preview) return;
  const { total } = calculateTotals();

  const customVal = Number(customInput?.value || 0);
  if (customVal > 0) {
    if (customVal < total) {
      preview.textContent = `⚠️ El monto en efectivo ($${customVal.toFixed(2)}) es menor al total del pedido ($${total.toFixed(2)}).`;
      preview.classList.add("is-warning");
    } else {
      const change = customVal - total;
      preview.textContent = `💵 Pagarás con $${customVal.toFixed(2)} · El repartidor llevará $${change.toFixed(2)} de cambio.`;
      preview.classList.remove("is-warning");
    }
    return;
  }

  preview.classList.remove("is-warning");
  if (cashPreset === "exact") {
    preview.textContent = `💵 Pagarás el monto exacto ($${total.toFixed(2)}) al recibir tu pedido.`;
  } else {
    const bill = Number(cashPreset);
    if (bill < total) {
      preview.textContent = `💵 Pagarás en efectivo ($${total.toFixed(2)}) al recibir tu pedido.`;
    } else {
      const change = bill - total;
      preview.textContent = `💵 Pagarás con billete de $${bill.toFixed(2)} · El repartidor llevará $${change.toFixed(2)} de cambio.`;
    }
  }
}

function renderCheckout() {
  const { restaurants, dishes } = getCatalogData();
  const entries = [...cart.entries()];

  if (entries.length === 0) {
    checkoutForm.hidden = true;
    emptyState.hidden = false;
    return;
  }

  checkoutForm.hidden = false;
  emptyState.hidden = true;

  itemsListEl.innerHTML = entries.map(([id, qty]) => {
    const dish = dishes.find(d => String(d.id) === String(id));
    if (!dish) return "";
    const rest = restaurants.find(r => String(r.id) === String(dish.restaurantId));
    const restLabel = rest ? `${rest.icon || "🍽️"} ${rest.name}` : "Saborcito";
    const lineTotal = Number(dish.price) * qty;
    return `
      <div class="checkout-item-row">
        <div class="checkout-item-info">
          <span class="checkout-item-rest">${escapeHTML(restLabel)}</span>
          <strong>${escapeHTML(dish.name)}</strong>
          <span class="checkout-item-unit">$${Number(dish.price).toFixed(2)} c/u · Subtotal $${lineTotal.toFixed(2)}</span>
        </div>
        <div class="quantity-controls">
          <button type="button" data-qty-id="${escapeHTML(dish.id)}" data-delta="-1" aria-label="Quitar una unidad de ${escapeHTML(dish.name)}">−</button>
          <span aria-label="Cantidad">${qty}</span>
          <button type="button" data-qty-id="${escapeHTML(dish.id)}" data-delta="1" aria-label="Añadir una unidad de ${escapeHTML(dish.name)}">+</button>
        </div>
      </div>
    `;
  }).join("");

  const { subtotal, deliveryFee, serviceFee, tip, total } = calculateTotals();
  document.querySelector("#summary-subtotal").textContent = `$${subtotal.toFixed(2)}`;
  document.querySelector("#summary-delivery").textContent = deliveryFee === 0 ? "Gratis" : `$${deliveryFee.toFixed(2)}`;
  document.querySelector("#summary-service").textContent = `$${serviceFee.toFixed(2)}`;
  document.querySelector("#summary-tip").textContent = `$${tip.toFixed(2)}`;
  document.querySelector("#summary-total").textContent = `$${total.toFixed(2)}`;
  confirmBtn.textContent = `Confirmar y pagar $${total.toFixed(2)}`;

  updateCashPreview();
}

// Formateo amigable de tarjeta y vencimiento
document.querySelector("#card-number")?.addEventListener("input", event => {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 16);
  event.target.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
});

document.querySelector("#card-expiry")?.addEventListener("input", event => {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) {
    event.target.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  } else {
    event.target.value = digits;
  }
});

// Cambios en velocidad de entrega
document.querySelectorAll('input[name="deliverySpeed"]').forEach(radio => {
  radio.addEventListener("change", () => {
    deliverySpeed = radio.value;
    document.querySelectorAll("[data-speed-card]").forEach(card => {
      card.classList.toggle("is-selected", card.dataset.speedCard === deliverySpeed);
    });
    renderCheckout();
  });
});

// Cambios en método de pago (Tarjeta vs Efectivo)
document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
  radio.addEventListener("change", () => {
    paymentMethod = radio.value;
    document.querySelectorAll("[data-method-card]").forEach(card => {
      card.classList.toggle("is-selected", card.dataset.methodCard === paymentMethod);
    });
    document.querySelector("#payment-panel-card").hidden = paymentMethod !== "card";
    document.querySelector("#payment-panel-cash").hidden = paymentMethod !== "cash";
    feedbackEl.hidden = true;
    updateCashPreview();
  });
});

// Cambios en tarjeta guardada vs nueva tarjeta
document.querySelectorAll('input[name="cardSource"]').forEach(radio => {
  radio.addEventListener("change", () => {
    cardSource = radio.value;
    document.querySelectorAll("[data-card-choice]").forEach(card => {
      card.classList.toggle("is-selected", card.dataset.cardChoice === cardSource);
    });
    document.querySelector("#new-card-fields").hidden = cardSource !== "new";
    feedbackEl.hidden = true;
  });
});

// Botones de efectivo y propina + controles de cantidad
document.addEventListener("click", event => {
  const btn = event.target.closest("button");
  if (!btn) {
    if (searchResults && !event.target.closest(".search-wrap")) {
      searchResults.hidden = true;
    }
    return;
  }

  if (btn.dataset.qtyId) {
    const id = btn.dataset.qtyId;
    const delta = Number(btn.dataset.delta || 0);
    const next = (cart.get(id) || 0) + delta;
    if (next <= 0) cart.delete(id);
    else cart.set(id, next);
    saveCartToCache();
    renderCheckout();
    return;
  }

  if (btn.dataset.cashPreset) {
    cashPreset = btn.dataset.cashPreset;
    const customInput = document.querySelector("#cash-amount");
    if (customInput) customInput.value = "";
    document.querySelectorAll("[data-cash-preset]").forEach(b => {
      b.classList.toggle("is-selected", b.dataset.cashPreset === cashPreset);
    });
    updateCashPreview();
    return;
  }

  if (btn.dataset.tip !== undefined) {
    selectedTip = Number(btn.dataset.tip);
    document.querySelectorAll("[data-tip]").forEach(b => {
      b.classList.toggle("is-selected", Number(b.dataset.tip) === selectedTip);
    });
    renderCheckout();
    return;
  }

  if (btn.dataset.quickAddDish) {
    const dishId = btn.dataset.quickAddDish;
    cart.set(dishId, (cart.get(dishId) || 0) + 1);
    saveCartToCache();
    if (searchResults) searchResults.hidden = true;
    if (topSearch) topSearch.value = "";
    renderCheckout();
    showNotice("Producto agregado a tu pedido.");
  }
});

document.querySelector("#cash-amount")?.addEventListener("input", () => {
  document.querySelectorAll("[data-cash-preset]").forEach(b => b.classList.remove("is-selected"));
  updateCashPreview();
});

// Buscador superior para añadir platillos extra sin salir del checkout
if (topSearch) {
  topSearch.addEventListener("input", () => {
    const query = topSearch.value.trim().toLocaleLowerCase("es");
    if (!query) {
      searchResults.hidden = true;
      return;
    }
    const { restaurants, dishes } = getCatalogData();
    const matched = dishes.filter(d => d.name.toLocaleLowerCase("es").includes(query)).slice(0, 6);
    searchResults.innerHTML = matched.length
      ? matched.map(d => {
        const rest = restaurants.find(r => String(r.id) === String(d.restaurantId));
        return `<button class="search-result" type="button" data-quick-add-dish="${escapeHTML(d.id)}">
          <strong>+ ${escapeHTML(d.name)} ($${Number(d.price).toFixed(2)})</strong>
          <span> · ${escapeHTML(rest?.name || "Saborcito")}</span>
        </button>`;
      }).join("")
      : '<div class="search-result">Sin coincidencias.</div>';
    searchResults.hidden = false;
  });
}

// Procesamiento simulado del pago
checkoutForm?.addEventListener("submit", event => {
  event.preventDefault();
  feedbackEl.hidden = true;

  const addressInput = document.querySelector("#delivery-address");
  const address = addressInput?.value.trim() || "";
  if (!address) {
    feedbackEl.textContent = "Por favor, indica una dirección de entrega.";
    feedbackEl.hidden = false;
    addressInput?.focus();
    return;
  }

  const { dishes } = getCatalogData();
  const { total } = calculateTotals();
  let paymentLabel = "Tarjeta •••• 4242";

  if (paymentMethod === "card") {
    if (cardSource === "new") {
      const holder = document.querySelector("#card-holder")?.value.trim() || "";
      const rawNumber = (document.querySelector("#card-number")?.value || "").replace(/\D/g, "");
      const expiry = document.querySelector("#card-expiry")?.value.trim() || "";
      const cvv = document.querySelector("#card-cvv")?.value.trim() || "";

      if (holder.length < 3) {
        feedbackEl.textContent = "Ingresa el nombre del titular de la tarjeta.";
        feedbackEl.hidden = false;
        document.querySelector("#card-holder")?.focus();
        return;
      }
      if (rawNumber.length < 13) {
        feedbackEl.textContent = "Ingresa un número de tarjeta válido (16 dígitos).";
        feedbackEl.hidden = false;
        document.querySelector("#card-number")?.focus();
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        feedbackEl.textContent = "Ingresa la fecha de vencimiento en formato MM/AA.";
        feedbackEl.hidden = false;
        document.querySelector("#card-expiry")?.focus();
        return;
      }
      if (cvv.length < 3) {
        feedbackEl.textContent = "Ingresa el código de seguridad CVV (3 o 4 dígitos).";
        feedbackEl.hidden = false;
        document.querySelector("#card-cvv")?.focus();
        return;
      }
      paymentLabel = `Tarjeta •••• ${rawNumber.slice(-4)}`;
    }
  } else {
    const customVal = Number(document.querySelector("#cash-amount")?.value || 0);
    if (customVal > 0 && customVal < total) {
      feedbackEl.textContent = `El monto en efectivo ($${customVal.toFixed(2)}) debe cubrir el total ($${total.toFixed(2)}).`;
      feedbackEl.hidden = false;
      document.querySelector("#cash-amount")?.focus();
      return;
    }
    paymentLabel = "Efectivo al recibir";
  }

  localStorage.setItem(ADDRESS_STORAGE_KEY, address);
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Procesando pago seguro...";

  window.setTimeout(() => {
    // 1. Registrar platillos en Últimos pedidos de cada restaurante
    const dishesByRestaurant = new Map();
    const orderItems = [];

    for (const [dishId, qty] of cart.entries()) {
      const dish = dishes.find(item => String(item.id) === String(dishId));
      if (!dish) continue;
      orderItems.push({
        id: String(dish.id),
        name: dish.name,
        quantity: qty,
        price: Number(dish.price)
      });
      const restId = dish.restaurantId;
      if (restId) {
        if (!dishesByRestaurant.has(restId)) dishesByRestaurant.set(restId, []);
        dishesByRestaurant.get(restId).push(String(dish.id));
      }
    }

    for (const [restId, dishIds] of dishesByRestaurant.entries()) {
      saveLocalRecentDishIds(restId, dishIds);
    }

    // 2. Vaciar carrito
    cart.clear();
    saveCartToCache();

    // 3. Crear pedido activo y mostrar ventana emergente NO bloqueante
    const createdOrder = window.SaborcitoOrderTracker?.createActiveOrder({
      address,
      paymentMethod,
      paymentLabel,
      total,
      items: orderItems
    });

    confirmBtn.disabled = false;

    // 4. Mostrar estado de éxito en la página con libertad para seguir explorando
    checkoutForm.hidden = true;
    emptyState.hidden = false;
    document.querySelector("#checkout-empty-title").textContent = `¡Pago confirmado! Pedido #${createdOrder?.shortCode || "1024"} en marcha`;
    document.querySelector("#checkout-empty-desc").textContent =
      "Tu pago fue procesado con éxito. En la esquina inferior derecha puedes ver la ventana emergente con el estado en vivo de tu pedido (Preparando → Listo para recoger → En camino → Ya llegó) mientras sigues explorando o realizas otro pedido.";
    showNotice("¡Pago realizado con éxito! Seguimiento en vivo activado.");
  }, 900);
});

// Inicialización de sesión y datos
try {
  const savedUser = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
  if (!savedUser || !savedUser.email) {
    window.location.replace("auth.html");
  } else {
    currentUser = savedUser;
    const savedAddress = localStorage.getItem(ADDRESS_STORAGE_KEY);
    if (savedAddress) {
      const addrInput = document.querySelector("#delivery-address");
      if (addrInput) addrInput.value = savedAddress;
    }
    const accountLink = document.querySelector("#account-link");
    if (accountLink && savedUser.name) {
      accountLink.textContent = `👤 ${savedUser.name} · Salir`;
      accountLink.href = "#";
      accountLink.addEventListener("click", event => {
        event.preventDefault();
        localStorage.removeItem(SESSION_STORAGE_KEY);
        window.location.replace("auth.html");
      });
    }
    loadCartFromCache();
    renderCheckout();
  }
} catch {
  window.location.replace("auth.html");
}
