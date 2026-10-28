const form = document.querySelector("#account-form");
const tabs = [...document.querySelectorAll(".auth-tab")];
const nameField = document.querySelector("#name-field");
const fullName = document.querySelector("#full-name");
const confirmField = document.querySelector("#confirm-field");
const confirmPassword = document.querySelector("#confirm-password");
const password = document.querySelector("#password");
const feedback = document.querySelector("#auth-feedback");
const apiBase = (document.querySelector('meta[name="saborcito-api-base-url"]')?.content || "").trim().replace(/\/+$/, "");
const SESSION_STORAGE_KEY = "saborcito_user";
let mode = "login";

function setMode(nextMode) {
  mode = nextMode;
  const registering = mode === "register";
  nameField.hidden = !registering;
  fullName.disabled = !registering;
  fullName.required = registering;
  confirmField.hidden = !registering;
  confirmPassword.disabled = !registering;
  confirmPassword.required = registering;
  password.autocomplete = registering ? "new-password" : "current-password";
  document.querySelector("#form-title").textContent = registering ? "Crea tu cuenta" : "¡Hola de nuevo!";
  document.querySelector("#form-subtitle").textContent = registering
    ? "Completa tus datos para registrarte."
    : "Ingresa tus datos para continuar.";
  document.querySelector("#submit-button").textContent = registering ? "Crear cuenta" : "Iniciar sesión";
  feedback.textContent = "";
  tabs.forEach(tab => {
    const selected = tab.dataset.mode === mode;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
  tab.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[nextIndex].focus();
    setMode(tabs[nextIndex].dataset.mode);
  });
});

confirmPassword.addEventListener("input", () => {
  confirmPassword.setCustomValidity(confirmPassword.value === password.value ? "" : "Las contraseñas no coinciden.");
});
password.addEventListener("input", () => {
  confirmPassword.setCustomValidity(confirmPassword.value === password.value ? "" : "Las contraseñas no coinciden.");
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (mode === "register" && confirmPassword.value !== password.value) {
    confirmPassword.setCustomValidity("Las contraseñas no coinciden.");
    confirmPassword.reportValidity();
    return;
  }

  const submitButton = document.querySelector("#submit-button");
  const nameValue = fullName.value.trim();
  const emailValue = document.querySelector("#email").value.trim().toLowerCase();
  const passwordValue = password.value;

  submitButton.disabled = true;
  feedback.textContent = mode === "register" ? "Creando tu cuenta..." : "Verificando tus datos...";

  try {
    const endpoint = apiBase
      ? `${apiBase}/${mode === "register" ? "register" : "login"}`
      : `/api/${mode === "register" ? "register" : "login"}`;

    const payloadBody = JSON.stringify({
      name: nameValue,
      email: emailValue,
      password: passwordValue
    });
    let response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: payloadBody
    });

    if (response.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: payloadBody
      });
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("El servicio de autenticación devolvió una respuesta no válida.");
    }
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || "No se pudo completar el acceso.");
    }
    if (!result.user || !result.user.email) {
      throw new Error("El servicio de autenticación no devolvió un usuario válido.");
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result.user));
    window.location.replace("index.html");
  } catch (error) {
    feedback.textContent = error.message || "No se pudo completar el acceso.";
  } finally {
    submitButton.disabled = false;
  }
});

const initialMode = new URLSearchParams(window.location.search).get("modo");
if (initialMode === "registro") setMode("register");

try {
  const savedUser = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
  if (savedUser && savedUser.email) {
    window.location.replace("index.html");
  } else if (apiBase) {
    // Ping silencioso al abrir auth.html para despertar el pool de Oracle Cloud mientras el usuario escribe
    fetch(`${apiBase}/restaurants`, { method: "GET", headers: { Accept: "application/json" } }).catch(() => {});
  }
} catch {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
