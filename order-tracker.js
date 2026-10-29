(() => {
  const SESSION_STORAGE_KEY = "saborcito_user";
  const STAGE_DURATION_MS = 10000; // Avanza automáticamente cada 10 segundos

  const ORDER_STAGES = [
    {
      key: "preparing",
      shortLabel: "Siendo preparado",
      title: "Tu pedido está siendo preparado",
      subtitle: "El restaurante recibió tu orden y está cocinando tus platillos.",
      icon: "🍳",
      eta: "Llegada estimada: 20–25 min",
      progress: 25
    },
    {
      key: "ready",
      shortLabel: "Listo para recoger",
      title: "Listo para ser recogido",
      subtitle: "El restaurante empacó tu pedido y espera al repartidor.",
      icon: "🛍️",
      eta: "Llegada estimada: 12–15 min",
      progress: 50
    },
    {
      key: "on_the_way",
      shortLabel: "En camino",
      title: "Tu pedido está en camino",
      subtitle: "El repartidor va en ruta hacia tu dirección de entrega.",
      icon: "🛵",
      eta: "Llegada estimada: 5–8 min",
      progress: 78
    },
    {
      key: "arrived",
      shortLabel: "¡Ya llegó!",
      title: "¡Tu pedido ya llegó!",
      subtitle: "El repartidor está en tu puerta. ¡Que disfrutes tu comida!",
      icon: "🎉",
      eta: "Entregado ahora",
      progress: 100
    }
  ];

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
  }

  function getCurrentUser() {
    try {
      const user = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
      return user && user.email ? user : null;
    } catch {
      return null;
    }
  }

  function getUserKey() {
    const user = getCurrentUser();
    return String(user?.email || user?.id || "anon").trim().toLowerCase();
  }

  function getActiveOrdersKey() {
    return `saborcito_active_orders_${getUserKey()}`;
  }

  function getMinimizedKey() {
    return `saborcito_tracker_minimized_${getUserKey()}`;
  }

  function loadActiveOrders() {
    try {
      const raw = JSON.parse(localStorage.getItem(getActiveOrdersKey()) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveActiveOrders(orders) {
    try {
      localStorage.setItem(getActiveOrdersKey(), JSON.stringify(orders));
    } catch {
      // ignore storage errors
    }
  }

  function computeStageIndex(order) {
    const manualStage = Number(order.manualStage ?? 0);
    const elapsedStages = Math.floor(Math.max(0, Date.now() - Number(order.createdAt || Date.now())) / STAGE_DURATION_MS);
    return Math.min(ORDER_STAGES.length - 1, Math.max(manualStage, elapsedStages));
  }

  let selectedOrderId = null;
  let trackerRoot = null;
  let headerBadgeBtn = null;
  let tickTimer = null;

  function isMinimized() {
    return sessionStorage.getItem(getMinimizedKey()) === "true";
  }

  function setMinimized(val) {
    sessionStorage.setItem(getMinimizedKey(), val ? "true" : "false");
  }

  function ensureHeaderBadge() {
    const headerActions = document.querySelector(".header-actions");
    if (!headerActions) return null;
    if (!headerBadgeBtn) {
      headerBadgeBtn = document.querySelector("#live-order-header-btn");
    }
    if (!headerBadgeBtn) {
      headerBadgeBtn = document.createElement("button");
      headerBadgeBtn.type = "button";
      headerBadgeBtn.id = "live-order-header-btn";
      headerBadgeBtn.className = "icon-button live-order-pill";
      headerBadgeBtn.hidden = true;
      headerBadgeBtn.addEventListener("click", () => {
        setMinimized(false);
        if (trackerRoot) trackerRoot.hidden = false;
        renderTracker();
      });
      headerActions.insertBefore(headerBadgeBtn, headerActions.firstChild);
    }
    return headerBadgeBtn;
  }

  function ensureTrackerDOM() {
    if (trackerRoot) return trackerRoot;
    trackerRoot = document.createElement("aside");
    trackerRoot.id = "order-tracker-popup";
    trackerRoot.className = "order-tracker-popup";
    trackerRoot.setAttribute("role", "region");
    trackerRoot.setAttribute("aria-label", "Estado de tu pedido en tiempo real");
    trackerRoot.setAttribute("aria-live", "polite");
    trackerRoot.hidden = true;
    document.body.appendChild(trackerRoot);

    trackerRoot.addEventListener("click", event => {
      const btn = event.target.closest("button");
      if (!btn) return;

      if (btn.dataset.trackerMinimize !== undefined) {
        setMinimized(!isMinimized());
        renderTracker();
        return;
      }

      if (btn.dataset.trackerSelectOrder) {
        selectedOrderId = btn.dataset.trackerSelectOrder;
        renderTracker();
        return;
      }

      if (btn.dataset.trackerNextStage) {
        const orderId = btn.dataset.trackerNextStage;
        const orders = loadActiveOrders();
        const target = orders.find(o => o.id === orderId);
        if (target) {
          const currentIdx = computeStageIndex(target);
          if (currentIdx < ORDER_STAGES.length - 1) {
            target.manualStage = currentIdx + 1;
            target.createdAt = Date.now() - (currentIdx + 1) * STAGE_DURATION_MS;
          } else {
            target.manualStage = 0;
            target.createdAt = Date.now();
          }
          saveActiveOrders(orders);
          renderTracker();
        }
        return;
      }

      if (btn.dataset.trackerSetStage !== undefined) {
        const orderId = btn.dataset.orderId;
        const nextStage = Number(btn.dataset.trackerSetStage);
        const orders = loadActiveOrders();
        const target = orders.find(o => o.id === orderId);
        if (target && Number.isFinite(nextStage)) {
          target.manualStage = Math.max(0, Math.min(ORDER_STAGES.length - 1, nextStage));
          target.createdAt = Date.now() - target.manualStage * STAGE_DURATION_MS;
          saveActiveOrders(orders);
          renderTracker();
        }
        return;
      }

      if (btn.dataset.trackerDismiss) {
        const orderId = btn.dataset.trackerDismiss;
        const orders = loadActiveOrders().filter(o => o.id !== orderId);
        saveActiveOrders(orders);
        if (selectedOrderId === orderId) {
          selectedOrderId = orders[0]?.id || null;
        }
        renderTracker();
      }
    });

    return trackerRoot;
  }

  function renderTracker() {
    const user = getCurrentUser();
    const badge = ensureHeaderBadge();
    const root = ensureTrackerDOM();

    if (!user) {
      root.hidden = true;
      if (badge) badge.hidden = true;
      return;
    }

    const orders = loadActiveOrders();
    if (orders.length === 0) {
      root.hidden = true;
      if (badge) badge.hidden = true;
      return;
    }

    if (!selectedOrderId || !orders.some(o => o.id === selectedOrderId)) {
      selectedOrderId = orders[0].id;
    }

    const activeOrder = orders.find(o => o.id === selectedOrderId) || orders[0];
    const stageIdx = computeStageIndex(activeOrder);
    const stage = ORDER_STAGES[stageIdx];
    const minimized = isMinimized();

    if (badge) {
      badge.hidden = false;
      badge.innerHTML = `<span class="live-pulse-dot" aria-hidden="true"></span><span>${escapeHTML(stage.icon)} ${escapeHTML(stage.shortLabel)}</span>`;
      badge.title = "Ver seguimiento del pedido en vivo";
    }

    root.hidden = false;
    root.classList.toggle("is-minimized", minimized);

    const itemsSummary = (activeOrder.items || [])
      .map(item => `${item.quantity}x ${item.name}`)
      .join(", ");

    const orderTabsHTML = orders.length > 1
      ? `<div class="tracker-order-tabs" role="tablist" aria-label="Pedidos activos">
          ${orders.map((ord, idx) => {
            const st = ORDER_STAGES[computeStageIndex(ord)];
            const isSelected = ord.id === activeOrder.id;
            return `<button type="button" class="tracker-order-tab" role="tab" aria-selected="${isSelected}" data-tracker-select-order="${escapeHTML(ord.id)}">
              ${escapeHTML(st.icon)} Pedido #${escapeHTML(ord.shortCode || (orders.length - idx))}
            </button>`;
          }).join("")}
        </div>`
      : "";

    if (minimized) {
      root.innerHTML = `
        <div class="tracker-minimized-bar">
          <button type="button" class="tracker-minimized-main" data-tracker-minimize="toggle" aria-label="Expandir ventana de estado del pedido">
            <span class="tracker-stage-badge">${escapeHTML(stage.icon)}</span>
            <span class="tracker-minimized-copy">
              <strong>Pedido #${escapeHTML(activeOrder.shortCode)} · ${escapeHTML(stage.shortLabel)}</strong>
              <small>${escapeHTML(stage.eta)}</small>
            </span>
          </button>
          <button type="button" class="tracker-icon-btn" data-tracker-minimize="toggle" aria-label="Expandir seguimiento" title="Expandir">▢</button>
        </div>
      `;
      return;
    }

    root.innerHTML = `
      <div class="tracker-header">
        <div class="tracker-header-title">
          <span class="live-pulse-dot" aria-hidden="true"></span>
          <span>Seguimiento en vivo · <strong>#${escapeHTML(activeOrder.shortCode)}</strong></span>
        </div>
        <div class="tracker-header-actions">
          <button type="button" class="tracker-icon-btn" data-tracker-minimize="toggle" aria-label="Minimizar ventana de seguimiento" title="Minimizar (seguir explorando)">−</button>
          <button type="button" class="tracker-icon-btn" data-tracker-dismiss="${escapeHTML(activeOrder.id)}" aria-label="Cerrar seguimiento de este pedido" title="Cerrar pedido">×</button>
        </div>
      </div>

      ${orderTabsHTML}

      <div class="tracker-body">
        <div class="tracker-hero">
          <div class="tracker-hero-icon" aria-hidden="true">${escapeHTML(stage.icon)}</div>
          <div class="tracker-hero-copy">
            <span class="tracker-eta-pill">${escapeHTML(stage.eta)}</span>
            <h3>${escapeHTML(stage.title)}</h3>
            <p>${escapeHTML(stage.subtitle)}</p>
          </div>
        </div>

        <div class="tracker-progress-track" aria-hidden="true">
          <div class="tracker-progress-fill" style="width: ${stage.progress}%"></div>
        </div>

        <ol class="tracker-steps" aria-label="Etapas del pedido">
          ${ORDER_STAGES.map((st, idx) => {
            const stateClass = idx < stageIdx ? "is-done" : idx === stageIdx ? "is-current" : "is-pending";
            return `
              <li class="tracker-step ${stateClass}">
                <button type="button" class="tracker-step-btn" data-tracker-set-stage="${idx}" data-order-id="${escapeHTML(activeOrder.id)}" title="Cambiar a: ${escapeHTML(st.shortLabel)}">
                  <span class="tracker-step-circle" aria-hidden="true">${idx < stageIdx ? "✓" : escapeHTML(st.icon)}</span>
                  <span class="tracker-step-label">${escapeHTML(st.shortLabel)}</span>
                </button>
              </li>
            `;
          }).join("")}
        </ol>

        <div class="tracker-details">
          <div class="tracker-detail-row">
            <span>📍 Entrega en:</span>
            <strong>${escapeHTML(activeOrder.address || "Av. Siempre Viva 742")}</strong>
          </div>
          <div class="tracker-detail-row">
            <span>💳 Pago (${escapeHTML(activeOrder.paymentLabel || "Tarjeta")}):</span>
            <strong>$${Number(activeOrder.total || 0).toFixed(2)}</strong>
          </div>
          <div class="tracker-detail-row tracker-items-line">
            <span>🍽️ Productos:</span>
            <span title="${escapeHTML(itemsSummary)}">${escapeHTML(itemsSummary)}</span>
          </div>
        </div>

        <div class="tracker-footer">
          <span class="tracker-nonblocking-hint">✨ Puedes seguir explorando o hacer otro pedido mientras tanto.</span>
          <button type="button" class="tracker-sim-btn" data-tracker-next-stage="${escapeHTML(activeOrder.id)}">
            ${stageIdx < ORDER_STAGES.length - 1 ? "Siguiente estado ⏭" : "Reiniciar estados ↻"}
          </button>
        </div>
      </div>
    `;
  }

  function createActiveOrder(orderData) {
    const orders = loadActiveOrders();
    const shortCode = String(Math.floor(1000 + Math.random() * 9000));
    const newOrder = {
      id: `ord_${Date.now()}_${shortCode}`,
      shortCode,
      createdAt: Date.now(),
      manualStage: 0,
      address: orderData.address || "Av. Siempre Viva 742",
      paymentMethod: orderData.paymentMethod || "card",
      paymentLabel: orderData.paymentLabel || "Tarjeta",
      total: Number(orderData.total || 0),
      items: Array.isArray(orderData.items) ? orderData.items : []
    };
    orders.unshift(newOrder);
    saveActiveOrders(orders.slice(0, 5));
    selectedOrderId = newOrder.id;
    setMinimized(false);
    renderTracker();
    return newOrder;
  }

  function startTicker() {
    if (tickTimer) window.clearInterval(tickTimer);
    tickTimer = window.setInterval(() => {
      const orders = loadActiveOrders();
      if (orders.length > 0) {
        renderTracker();
      }
    }, 2500);
  }

  window.SaborcitoOrderTracker = {
    createActiveOrder,
    renderTracker,
    loadActiveOrders
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      renderTracker();
      startTicker();
    });
  } else {
    renderTracker();
    startTicker();
  }

  window.addEventListener("pageshow", () => renderTracker());
  window.addEventListener("storage", () => renderTracker());
})();
