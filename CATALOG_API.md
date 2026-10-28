# API del catálogo

El catálogo usa un contrato REST independiente del proveedor. Cuando se elija la base de datos, conecta una API HTTPS que exponga estos recursos y configure CORS para el dominio de GitHub Pages:

- `GET /restaurants`
- `GET /dishes`

En `restaurants.html`, configura la URL base pública de la API en `meta[name="saborcito-api-base-url"]`. Por ejemplo, si los recursos están en `https://api.ejemplo.com/v1/restaurants` y `https://api.ejemplo.com/v1/dishes`, establece el contenido de la meta a `https://api.ejemplo.com/v1`. La URL debe ser HTTPS; HTTP solo se permite para `localhost` durante el desarrollo.

Cada recurso puede responder directamente con una lista o con un objeto `{ "data": [...] }`.

## Restaurantes

```json
{
  "data": [
    {
      "id": "restaurante-123",
      "name": "La Burgería",
      "category": "Hamburguesas",
      "icon": "🍔",
      "rating": 4.8,
      "time": "20–30 min",
      "description": "Hamburguesas hechas al momento."
    }
  ]
}
```

Campos requeridos: `id`, `name`. `category`, `icon`, `rating`, `time` (o `deliveryTime`) y `description` son opcionales.

## Platos

```json
{
  "data": [
    {
      "id": "plato-456",
      "restaurantId": "restaurante-123",
      "name": "La clásica smash",
      "category": "Hamburguesas",
      "description": "Doble carne, cheddar y salsa de la casa.",
      "price": 189,
      "image": "https://cdn.ejemplo.com/platos/smash.jpg",
      "alt": "Hamburguesa con queso",
      "isPromotion": true
    }
  ]
}
```

Campos requeridos: `id`, `restaurantId`, `name` y `price` numérico no negativo. `restaurantId` debe coincidir con el `id` de un restaurante. `category`, `description`, `image` y `alt` son opcionales. `isPromotion` es opcional y debe ser booleano; `true` incluye el plato en la sección de promociones exclusivas de su restaurante.

La página independiente `restaurants.html?restaurant=restaurante-123` solicita ambos recursos, valida los campos y muestra únicamente el restaurante indicado y sus platos. La sección de promociones se genera con platos que tengan `isPromotion: true`; las demás secciones del menú se crean dinámicamente a partir de las categorías recibidas. Si falta el identificador, no está configurada la URL base o la API falla, la página muestra un error en vez de presentar restaurantes o platos de ejemplo.

No coloques contraseñas, claves privadas ni credenciales de administrador en el HTML o JavaScript público. La API debe exponer únicamente datos públicos del catálogo y aplicar sus propias reglas de acceso. La configuración de autenticación de usuarios es independiente de este catálogo.
