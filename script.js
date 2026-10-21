    const dishes = [
      { id: "burger", name: "La clásica smash", category: "Hamburguesas", description: "Doble carne, queso cheddar y salsa de la casa.", price: 189, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80", alt: "Hamburguesa con queso, lechuga y tomate" },
      { id: "pizza", name: "Pizza margarita", category: "Pizza", description: "Tomate, mozzarella fresca y albahaca.", price: 220, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=700&q=80", alt: "Pizza margarita recién horneada" },
      { id: "salad", name: "Bowl arcoíris", category: "Saludable", description: "Quinoa, aguacate y vegetales de temporada.", price: 165, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80", alt: "Bowl de ensalada colorida con vegetales" },
      { id: "ramen", name: "Ramen de la casa", category: "Asiática", description: "Caldo lento, fideos y toppings frescos.", price: 198, image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=700&q=80", alt: "Tazón de ramen con fideos y huevo" }
    ];
    const promos = [
      { eyebrow: "✨ Lo bueno se comparte", title: "Tu antojo favorito, a un clic", description: "Disfruta tus platos favoritos. Hoy tienes envío gratis en tu primer pedido.", tag: "ENVÍO GRATIS", food: "🍔" },
      { eyebrow: "🎉 Novedad de la semana", title: "Un festín para tus sentidos", description: "Descubre nuevos sabores y encuentra tu próximo plato favorito.", tag: "2X1 EN PIZZAS", food: "🍕" },
      { eyebrow: "🌱 Fresco y delicioso", title: "Dale color a tu día", description: "Opciones frescas y deliciosas, preparadas especialmente para ti.", tag: "DESDE $99", food: "🥗" }
    ];
    const restaurants = [
      { name: "La Burgería", category: "Hamburguesas", icon: "🍔", rating: "4.8", time: "20–30 min" },
      { name: "Forno & Amore", category: "Pizza", icon: "🍕", rating: "4.7", time: "25–35 min" },
      { name: "Verde Limón", category: "Saludable", icon: "🥗", rating: "4.9", time: "15–25 min" }
    ];
    const favoriteIds = new Set(["burger", "pizza", "salad", "ramen"]);
    const cart = new Map();
    let isAuthenticated = false;
    let filter = "Todos";
    let promoIndex = 0;
    let noticeTimer;
    const foodGrid = document.querySelector("#food-grid");
    const search = document.querySelector("#search");
    const searchResults = document.querySelector("#search-results");
    const drawer = document.querySelector("#cart-drawer");
    const backdrop = document.querySelector("#drawer-backdrop");

    function renderDishes() {
      const query = search.value.trim().toLocaleLowerCase("es");
      const visible = dishes.filter(dish =>
        (filter === "Todos" || dish.category === filter) &&
        (!query || `${dish.name} ${dish.category} ${dish.description}`.toLocaleLowerCase("es").includes(query))
      );
      foodGrid.innerHTML = visible.length ? visible.map(dish => `
        <article class="food-card">
          <div class="food-image"><img src="${dish.image}" alt="${dish.alt}" loading="lazy"><button class="heart-button" type="button" data-favorite="${dish.id}" aria-pressed="${favoriteIds.has(dish.id)}" aria-label="${favoriteIds.has(dish.id) ? "Quitar" : "Añadir"} ${dish.name} ${favoriteIds.has(dish.id) ? "de" : "a"} favoritos" ${isAuthenticated ? "" : "disabled"}>${favoriteIds.has(dish.id) ? "♥" : "♡"}</button></div>
          <div class="food-info"><h3 class="food-name">${dish.name}</h3><p class="food-description">${dish.description}</p><div class="food-bottom"><span class="price">$${dish.price}</span><button class="add-button" type="button" data-add="${dish.id}" aria-label="Inicia sesión para añadir ${dish.name} al carrito" title="Inicia sesión para añadir al carrito" ${isAuthenticated ? "" : "disabled"}>+</button></div></div>
        </article>`).join("") : '<p class="empty-state">No encontramos platos con esa búsqueda. Prueba con otra palabra o categoría.</p>';
    }

    function renderRestaurants() {
      const query = search.value.trim().toLocaleLowerCase("es");
      const visible = restaurants.filter(restaurant => !query || `${restaurant.name} ${restaurant.category}`.toLocaleLowerCase("es").includes(query));
      document.querySelector("#restaurant-grid").innerHTML = visible.length ? visible.map(restaurant => `
        <article class="restaurant-card"><span class="restaurant-icon" aria-hidden="true">${restaurant.icon}</span><div><h3>${restaurant.name}</h3><p><span class="rating">★ ${restaurant.rating}</span> · ${restaurant.category} · ${restaurant.time}</p></div></article>`).join("")
        : '<p class="empty-state">No encontramos restaurantes con esa búsqueda.</p>';
    }

    function showNotice(message) {
      const notice = document.querySelector("#notice");
      notice.textContent = message;
      notice.hidden = false;
      window.clearTimeout(noticeTimer);
      noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 3000);
    }

    function renderSearchResults() {
      const query = search.value.trim().toLocaleLowerCase("es");
      if (!query) { searchResults.hidden = true; return; }
      const results = dishes.filter(dish => `${dish.name} ${dish.category} ${dish.description}`.toLocaleLowerCase("es").includes(query));
      const restaurantMatches = restaurants.filter(restaurant => `${restaurant.name} ${restaurant.category}`.toLocaleLowerCase("es").includes(query));
      const suggestions = [
        ...restaurantMatches.map(restaurant => `<button class="search-result" type="button" role="option" data-select-restaurant="${restaurant.name}"><strong>${restaurant.name}</strong><span> · Restaurante</span></button>`),
        ...results.map(dish => `<button class="search-result" type="button" role="option" data-select-dish="${dish.id}"><strong>${dish.name}</strong><span> · Platillo</span></button>`)
      ];
      searchResults.innerHTML = suggestions.length ? suggestions.join("") : '<div class="search-result" role="option">Sin coincidencias. Prueba otro término.</div>';
      searchResults.hidden = false;
    }

    function updateCart() {
      const items = [...cart.entries()];
      const count = items.reduce((sum, [, quantity]) => sum + quantity, 0);
      document.querySelector("#cart-count").textContent = count;
      document.querySelector("#cart-button").setAttribute("aria-label", isAuthenticated ? `Abrir carrito, ${count} ${count === 1 ? "producto" : "productos"}` : "Inicia sesión para acceder al carrito");
      const total = items.reduce((sum, [id, quantity]) => sum + dishes.find(dish => dish.id === id).price * quantity, 0);
      document.querySelector("#cart-total").textContent = `$${total}`;
      document.querySelector("#cart-items").innerHTML = items.length ? items.map(([id, quantity]) => {
        const dish = dishes.find(item => item.id === id);
        return `<div class="cart-item"><div><strong>${dish.name}</strong><p>$${dish.price} · Subtotal $${dish.price * quantity}</p></div><div class="quantity-controls"><button type="button" data-quantity="${id}" data-delta="-1" aria-label="Quitar una unidad de ${dish.name}">−</button><span aria-label="Cantidad">${quantity}</span><button type="button" data-quantity="${id}" data-delta="1" aria-label="Añadir una unidad de ${dish.name}">+</button></div></div>`;
      }).join("") : '<p class="empty-state">Tu carrito está vacío. ¡Elige algo delicioso!</p>';
    }

    function updateAuthentication(user) {
      isAuthenticated = Boolean(user);
      const accountLink = document.querySelector("#account-link");
      const cartButton = document.querySelector("#cart-button");
      document.querySelector("#favoritos").hidden = !isAuthenticated;
      document.querySelector(".signup-prompt").hidden = isAuthenticated;
      cartButton.disabled = !isAuthenticated;
      cartButton.title = isAuthenticated ? "Abrir carrito" : "Inicia sesión para acceder al carrito";
      document.querySelector("#checkout-button").disabled = !isAuthenticated;
      document.querySelectorAll("[data-add]").forEach(button => {
        button.disabled = !isAuthenticated;
        const dish = dishes.find(item => item.id === button.dataset.add);
        const productName = button.closest(".offer-card")?.querySelector("h3")?.textContent || dish?.name || "producto";
        button.setAttribute("aria-label", isAuthenticated ? `Añadir ${productName} al carrito` : `Inicia sesión para pedir ${productName}`);
        button.title = isAuthenticated ? "Añadir al carrito" : "Inicia sesión para pedir";
      });
      accountLink.textContent = isAuthenticated ? `👤 ${user.name} · Salir` : "👤 Entrar";
      accountLink.href = isAuthenticated ? "#" : "auth.html";
      accountLink.setAttribute("aria-label", isAuthenticated ? `Cerrar sesión de ${user.name}` : "Iniciar sesión");
      renderDishes();
      updateCart();
    }

    function openCart() {
      if (!isAuthenticated) return;
      drawer.hidden = false;
      backdrop.hidden = false;
      document.querySelector("#close-cart").focus();
    }
    function closeCart() {
      drawer.hidden = true;
      backdrop.hidden = true;
      document.querySelector("#cart-button").focus();
    }

    function changePromo(step) {
      promoIndex = (promoIndex + step + promos.length) % promos.length;
      const promo = promos[promoIndex];
      document.querySelector("#promo-eyebrow").textContent = promo.eyebrow;
      document.querySelector("#promo-title").textContent = promo.title;
      document.querySelector("#promo-description").textContent = promo.description;
      document.querySelector("#promo-tag").textContent = promo.tag;
      document.querySelector("#promo-food").textContent = promo.food;
      document.querySelector("#carousel-status").textContent = `Oferta ${promoIndex + 1} de ${promos.length}: ${promo.title}`;
    }

    document.addEventListener("click", event => {
      const target = event.target.closest("button");
      if (!target) return;
      if (target.dataset.add) {
        if (!isAuthenticated) {
          showNotice("Inicia sesión para añadir platos al carrito.");
          return;
        }
        cart.set(target.dataset.add, (cart.get(target.dataset.add) || 0) + 1);
        updateCart();
        showNotice(`${dishes.find(dish => dish.id === target.dataset.add).name} se añadió al carrito.`);
      }
      if (target.dataset.favorite) {
        const dish = dishes.find(item => item.id === target.dataset.favorite);
        if (favoriteIds.has(dish.id)) {
          favoriteIds.delete(dish.id);
          showNotice(`${dish.name} se quitó de tus favoritos.`);
        } else {
          favoriteIds.add(dish.id);
          showNotice(`${dish.name} se añadió a tus favoritos.`);
        }
        renderDishes();
      }
      if (target.dataset.quantity) {
        if (!isAuthenticated) return;
        const next = (cart.get(target.dataset.quantity) || 0) + Number(target.dataset.delta);
        if (next <= 0) cart.delete(target.dataset.quantity);
        else cart.set(target.dataset.quantity, next);
        updateCart();
      }
      if (target.dataset.filter) {
        filter = target.dataset.filter;
        document.querySelectorAll(".filter-button").forEach(button => button.setAttribute("aria-pressed", String(button === target)));
        renderDishes();
      }
      if (target.dataset.selectDish) {
        search.value = dishes.find(dish => dish.id === target.dataset.selectDish).name;
        searchResults.hidden = true;
        filter = "Todos";
        document.querySelectorAll(".filter-button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === "Todos")));
        renderDishes();
        document.querySelector("#favoritos").scrollIntoView({ behavior: "smooth" });
      }
      if (target.dataset.selectRestaurant) {
        search.value = target.dataset.selectRestaurant;
        searchResults.hidden = true;
        renderDishes();
        renderRestaurants();
        document.querySelector("#restaurantes").scrollIntoView({ behavior: "smooth" });
      }
    });
    search.addEventListener("input", () => { renderSearchResults(); renderDishes(); renderRestaurants(); });
    search.addEventListener("keydown", event => {
      if (event.key === "Escape") searchResults.hidden = true;
      if (event.key === "ArrowDown" && !searchResults.hidden) {
        event.preventDefault();
        searchResults.querySelector("button")?.focus();
      }
    });
    searchResults.addEventListener("keydown", event => {
      if (event.key === "Escape") { searchResults.hidden = true; search.focus(); }
    });
    document.querySelector("#cart-button").addEventListener("click", openCart);
    document.querySelector("#account-link").addEventListener("click", async event => {
      if (!isAuthenticated) return;
      event.preventDefault();
      try {
        const response = await fetch("/api/logout", { method: "POST" });
        if (!response.ok) throw new Error("No se pudo cerrar la sesión.");
        window.location.reload();
      } catch {
        showNotice("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      }
    });
    document.querySelector("#close-cart").addEventListener("click", closeCart);
    backdrop.addEventListener("click", closeCart);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !drawer.hidden) closeCart();
      if (event.key === "Tab" && !drawer.hidden) {
        const focusable = [...drawer.querySelectorAll("button:not([disabled])")];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    document.querySelector("#previous-promo").addEventListener("click", () => changePromo(-1));
    document.querySelector("#next-promo").addEventListener("click", () => changePromo(1));
    document.querySelector("#address-button").addEventListener("click", () => {
      const address = window.prompt("¿A qué dirección llevamos tu pedido?", document.querySelector("#address").textContent);
      if (address && address.trim()) {
        document.querySelector("#address").textContent = address.trim();
        showNotice("Actualizamos tu dirección de entrega.");
      }
    });
    document.querySelector("#checkout-button").addEventListener("click", () => {
      if (!isAuthenticated) {
        showNotice("Inicia sesión para realizar un pedido.");
        return;
      }
      showNotice(cart.size ? "¡Gracias! El proceso de pago estará disponible muy pronto." : "Añade algo delicioso a tu carrito para continuar.");
    });
    renderDishes();
    renderRestaurants();
    updateCart();
    fetch("/api/session")
      .then(response => {
        if (!response.ok) throw new Error("No se pudo verificar la sesión.");
        return response.json();
      })
      .then(({ user }) => updateAuthentication(user))
      .catch(() => showNotice("No se pudo verificar la sesión. La conexión de autenticación cloud aún debe configurarse."));
