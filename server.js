const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { promisify } = require("node:util");
const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require("node:crypto");

const scrypt = promisify(scryptCallback);
const host = "127.0.0.1";
const port = Number(process.env.PORT) || 3000;
const root = __dirname;
const dataDirectory = path.join(root, "data");
const usersFile = path.join(dataDirectory, "users.json");
const sessionCookie = "saborcito_session";
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();
const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/restaurants.html", ["restaurants.html", "text/html; charset=utf-8"]],
  ["/auth.html", ["auth.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
  ["/restaurants.js", ["restaurants.js", "text/javascript; charset=utf-8"]],
  ["/auth.js", ["auth.js", "text/javascript; charset=utf-8"]]
]);

let users = [];
let userWriteQueue = Promise.resolve();

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });
  response.end(JSON.stringify(payload));
}

function setSessionCookie(response, token) {
  response.setHeader("Set-Cookie", `${sessionCookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionLifetimeMs / 1000}`);
}

function clearSessionCookie(response) {
  response.setHeader("Set-Cookie", `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

function getSessionUser(request) {
  const cookies = request.headers.cookie || "";
  const cookie = cookies.split(";").map(value => value.trim()).find(value => value.startsWith(`${sessionCookie}=`));
  const token = cookie?.slice(sessionCookie.length + 1);
  if (!token) return null;

  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  const user = users.find(item => item.email === session.email);
  return user ? { name: user.name, email: user.email } : null;
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 10_240) {
      const error = new Error("La solicitud es demasiado grande.");
      error.status = 413;
      throw error;
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("El formato de la solicitud no es válido.");
    error.status = 400;
    throw error;
  }
}

function persistUsers() {
  const contents = `${JSON.stringify(users, null, 2)}\n`;
  const write = userWriteQueue.then(async () => {
    await fs.mkdir(dataDirectory, { recursive: true });
    const temporaryFile = `${usersFile}.${randomBytes(6).toString("hex")}.tmp`;
    await fs.writeFile(temporaryFile, contents, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporaryFile, usersFile);
  });
  userWriteQueue = write.catch(() => {});
  return write;
}

async function createUserSession(response, user) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { email: user.email, expiresAt: Date.now() + sessionLifetimeMs });
  setSessionCookie(response, token);
}

async function handleApi(request, response, pathname) {
  if (pathname === "/api/session" && request.method === "GET") {
    return sendJson(response, 200, { user: getSessionUser(request) });
  }

  if (pathname === "/api/logout" && request.method === "POST") {
    const cookies = request.headers.cookie || "";
    const cookie = cookies.split(";").map(value => value.trim()).find(value => value.startsWith(`${sessionCookie}=`));
    if (cookie) sessions.delete(cookie.slice(sessionCookie.length + 1));
    clearSessionCookie(response);
    return sendJson(response, 200, { ok: true });
  }

  if ((pathname !== "/api/register" && pathname !== "/api/login") || request.method !== "POST") {
    return sendJson(response, 404, { error: "No se encontró esta ruta." });
  }

  const body = await readJsonBody(request);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return sendJson(response, 400, { error: "Escribe un correo electrónico válido." });
  }
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 128) {
    return sendJson(response, 400, { error: "La contraseña debe tener al menos 8 caracteres y no superar 128 bytes." });
  }

  if (pathname === "/api/register") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80) {
      return sendJson(response, 400, { error: "El nombre debe tener entre 2 y 80 caracteres." });
    }
    if (users.some(user => user.email === email)) {
      return sendJson(response, 409, { error: "Ya existe una cuenta con ese correo electrónico." });
    }

    const salt = randomBytes(16).toString("hex");
    const hash = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    if (users.some(user => user.email === email)) {
      return sendJson(response, 409, { error: "Ya existe una cuenta con ese correo electrónico." });
    }
    const user = { name, email, salt, passwordHash: hash.toString("hex"), createdAt: new Date().toISOString() };
    users.push(user);
    try {
      await persistUsers();
    } catch (error) {
      users = users.filter(item => item.email !== email);
      throw error;
    }
    await createUserSession(response, user);
    return sendJson(response, 201, { user: { name: user.name, email: user.email } });
  }

  const user = users.find(item => item.email === email);
  if (!user) return sendJson(response, 401, { error: "Correo o contraseña incorrectos." });
  const suppliedHash = await scrypt(password, user.salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const savedHash = Buffer.from(user.passwordHash, "hex");
  if (savedHash.length !== suppliedHash.length || !timingSafeEqual(savedHash, suppliedHash)) {
    return sendJson(response, 401, { error: "Correo o contraseña incorrectos." });
  }

  await createUserSession(response, user);
  return sendJson(response, 200, { user: { name: user.name, email: user.email } });
}

async function handleRequest(request, response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "same-origin");
  const requestUrl = new URL(request.url, `http://${host}:${port}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname.startsWith("/api/")) {
    return handleApi(request, response, pathname);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    return response.end("Método no permitido.");
  }

  const file = staticFiles.get(pathname);
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return response.end("No se encontró la página.");
  }
  const contents = await fs.readFile(path.join(root, file[0]));
  response.writeHead(200, {
    "Content-Type": file[1],
    "Cache-Control": "no-store",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self' https://images.unsplash.com; img-src 'self' https: data:; style-src 'self'; script-src 'self'; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; base-uri 'self'; frame-ancestors 'none'"
  });
  return response.end(request.method === "HEAD" ? undefined : contents);
}

async function start() {
  await fs.mkdir(dataDirectory, { recursive: true });
  try {
    const contents = await fs.readFile(usersFile, "utf8");
    users = JSON.parse(contents);
    if (!Array.isArray(users)) throw new Error("El archivo local de usuarios no contiene una lista válida.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    users = [];
  }

  const server = http.createServer((request, response) => {
    handleRequest(request, response).catch(error => {
      console.error("Error al procesar la solicitud:", error);
      if (!response.headersSent) {
        sendJson(response, error.status || 500, {
          error: error.status ? error.message : "Ocurrió un error interno. Revisa la consola del servidor."
        });
      } else {
        response.destroy(error);
      }
    });
  });
  server.listen(port, host, () => {
    console.log(`Saborcito disponible en http://${host}:${port}`);
    console.log(`Usuarios locales guardados en ${usersFile}`);
  });
}

start().catch(error => {
  console.error("No se pudo iniciar el servidor local:", error);
  process.exitCode = 1;
});
