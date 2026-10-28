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
const LOCAL_USERS_CACHE_KEY = "saborcito_users_cache_v2";
let mode = "login";

const DIRECTORY_PROFILES = [
  { id: 21, name: "Carlos Mendoza", email: "carlos.mendoza@correo.com", digest: "8ba4d3c492c5ed42a55a68ef0bf8da6ab3765202e9a06f25f6545ecc747e961a", rol: "CLIENTE" },
  { id: 22, name: "Valeria Torres", email: "valeria.torres@correo.com", digest: "d1b08e79caaa68cd1c40d099107b6c4e40e766ccb810e42c4af13ddae41fa6f7", rol: "CLIENTE" },
  { id: 23, name: "Andrés Salazar", email: "andres.salazar@correo.com", digest: "d42a063c5cb3d739c89ad4a23b89426999167ff16089c483c6bc0f59c459cbb7", rol: "CLIENTE" },
  { id: 24, name: "Lucía Fernández", email: "lucia.fernandez@correo.com", digest: "dcb25355c310095d1397dec04ad7d8fd003fc43c1a2860c9aca9214565cb1e4c", rol: "CLIENTE" },
  { id: 25, name: "Mateo Ramírez", email: "mateo.ramirez@correo.com", digest: "57c40cd46acbbdd6614c4980138905f4cd0015883f193e3800a7dd6d925125b4", rol: "CLIENTE" },
  { id: 1, name: "Admin Pizzería Roma", email: "roma@test.com", digest: "3107f4c1cfba53b084ab59058fb81a573d18e2691de833f0c928b033279043a0", rol: "RESTAURANTE" },
  { id: 2, name: "Admin Burger King", email: "bk@test.com", digest: "8cc4f0a7ec079a2989bd67eb7351f47f576fd5ee82c8259f9ba4ef8aabe22ff5", rol: "RESTAURANTE" },
  { id: 3, name: "Admin Sushi Zen", email: "zen@test.com", digest: "433e6e8cf5d146e3d40a710bc53af417569d83f64ab71b8402f6bc14b040ad9c", rol: "RESTAURANTE" },
  { id: 4, name: "Admin Taco Loco", email: "taco@test.com", digest: "cbd2f0d75d0f33b2bdec633efa91dd380f613938fdafcde78d90829a607378ca", rol: "RESTAURANTE" },
  { id: 5, name: "Admin KFC", email: "kfc@test.com", digest: "1f51b41c51d6c4496cb62afb4c2f37903897c413315f8f3bd7e8b395e13b13b5", rol: "RESTAURANTE" },
  { id: 6, name: "Admin Wok Express", email: "wok@test.com", digest: "420a5a9590ec94fee69b3b0d85100954315f0c1b7259acc3be1b7fea42cf5748", rol: "RESTAURANTE" },
  { id: 7, name: "Admin Veggie Life", email: "veggie@test.com", digest: "94335556ec422365b27628831d7bdf5a88a2825b8cb86b7bf686fca76907d154", rol: "RESTAURANTE" },
  { id: 8, name: "Admin Sweet Bakery", email: "bakery@test.com", digest: "e23e3ea266f70bd7ffc97407d8e5367f564815ef606e660c1e35619e09b43e1c", rol: "RESTAURANTE" },
  { id: 9, name: "Admin Steakhouse", email: "steak@test.com", digest: "61d98294b1558bc525af45ce1b8e3d5b5c212ac732ad16cdb9b34fea3af1e1d1", rol: "RESTAURANTE" },
  { id: 10, name: "Admin Gelato Mio", email: "gelato@test.com", digest: "59ba3953d067be98cfdd9f711c542817ecec8329f0e629bfb22bb88635315068", rol: "RESTAURANTE" }
];

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function getCachedProfiles() {
  try {
    const custom = JSON.parse(localStorage.getItem(LOCAL_USERS_CACHE_KEY) || "[]");
    const byEmail = new Map();
    DIRECTORY_PROFILES.forEach(u => byEmail.set(u.email.toLowerCase(), u));
    if (Array.isArray(custom)) {
      custom.forEach(u => {
        if (u && u.email && u.digest) byEmail.set(String(u.email).toLowerCase(), u);
      });
    }
    return [...byEmail.values()];
  } catch {
    return [...DIRECTORY_PROFILES];
  }
}

function saveProfileToCache(profileWithDigest) {
  try {
    const current = getCachedProfiles();
    const filtered = current.filter(u => u.email.toLowerCase() !== profileWithDigest.email.toLowerCase());
    filtered.push(profileWithDigest);
    localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore storage errors
  }
}

async function verifyOfflineProfile(authMode, nameValue, emailValue, passwordValue) {
  const digest = await sha256Hex(passwordValue);
  const profiles = getCachedProfiles();
  const normalizedEmail = emailValue.toLowerCase();

  if (authMode === "register") {
    if (profiles.some(u => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error("Ya existe una cuenta con ese correo electrónico.");
    }
    const newProfile = {
      id: Date.now(),
      name: nameValue,
      email: normalizedEmail,
      digest,
      rol: "CLIENTE"
    };
    saveProfileToCache(newProfile);
    return { id: newProfile.id, name: newProfile.name, email: newProfile.email, rol: newProfile.rol };
  }

  const found = profiles.find(u => u.email.toLowerCase() === normalizedEmail && u.digest === digest);
  if (!found) {
    throw new Error("Correo o contraseña incorrectos.");
  }
  return { id: found.id, name: found.name, email: found.email, rol: found.rol };
}

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

    let authenticatedUser = null;

    try {
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

      if (response.status >= 500) {
        authenticatedUser = await verifyOfflineProfile(mode, nameValue, emailValue, passwordValue);
      } else {
        const result = await response.json();
        if (!response.ok || result.ok === false) {
          throw new Error(result.error || "Correo o contraseña incorrectos.");
        }
        authenticatedUser = result.user;
        if (authenticatedUser) {
          const digest = await sha256Hex(passwordValue);
          saveProfileToCache({ ...authenticatedUser, digest });
        }
      }
    } catch (networkOrParseError) {
      if (networkOrParseError.message === "Correo o contraseña incorrectos." ||
          networkOrParseError.message === "Ya existe una cuenta con ese correo electrónico.") {
        throw networkOrParseError;
      }
      authenticatedUser = await verifyOfflineProfile(mode, nameValue, emailValue, passwordValue);
    }

    if (authenticatedUser) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authenticatedUser));
    }
    window.location.replace("index.html");
  } catch (error) {
    feedback.textContent = error.message || "No se pudo completar el acceso.";
  } finally {
    submitButton.disabled = false;
  }
});

const initialMode = new URLSearchParams(window.location.search).get("modo");
if (initialMode === "registro") setMode("register");

if (apiBase) {
  fetch(`${apiBase}/restaurants`, { method: "GET", headers: { Accept: "application/json" } }).catch(() => {});
}
