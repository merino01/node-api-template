# 🚀 Node API Template

Template moderno de API REST con Node.js y Express que utiliza **carga automática de rutas basada en el sistema de archivos** similar a como lo hacen frameworks de frontend como Next o Nuxt.

## 🌟 Características

- ✅ **Rutas automáticas** basadas en el sistema de archivos
- ✅ **Sistema de middlewares** robusto y flexible
- ✅ **Logging automático** de requests con tiempo de respuesta
- ✅ **Manejo de errores** centralizado con try/catch automático
- ✅ **Múltiples patrones** de archivos soportados
- ✅ **Parámetros dinámicos** y catch-all routes
- ✅ **Zero configuration** - funciona out-of-the-box

## 📁 Patrones de Archivos Soportados

El sistema de rutas utiliza **expresiones regulares** para detectar automáticamente los patrones de archivos, lo que permite una detección más robusta y extensible de los nombres de archivo.

### 1. **Patrón Básico** - `recurso.js`

Crea endpoints para un recurso con múltiples métodos HTTP.

```javascript
// src/api/users.js → /users
export const GET = defineEventHandler(async ({ query }) => {
  const { page = 1, limit = 10 } = query
  return { users: [], page: Number(page), limit: Number(limit) }
})

export const POST = defineEventHandler(async ({ body }) => {
  const { name, email } = body
  return { message: "User created", user: { name, email } }
})
```

**Rutas generadas:**

- `GET /users`
- `POST /users`

---

### 2. **Patrón Método Específico** - `recurso.método.js`

Crea un endpoint para un solo método HTTP.

```javascript
// src/api/users.get.js → GET /users (solo GET)
export default defineEventHandler(async ({ query }) => {
  const { search, status } = query
  return {
    users: [],
    filters: { search, status }
  }
})
```

**Rutas generadas:**

- `GET /users` (únicamente)

---

### 3. **Patrón Index** - `carpeta/index.js`

Equivale al patrón básico pero organizado en carpetas.

```javascript
// src/api/users/index.js → /users
export const GET = defineEventHandler(async ({ query }) => {
  return { users: [] }
})

export const POST = defineEventHandler(async ({ body }) => {
  return { message: "User created" }
})
```

**Rutas generadas:**

- `GET /users`
- `POST /users`

---

### 4. **Patrón Index con Método** - `carpeta/index.método.js`

Combina organización en carpetas con método específico.

```javascript
// src/api/users/index.get.js → GET /users (solo GET)
export default defineEventHandler(async ({ query }) => {
  const { sortBy = "name", order = "asc" } = query
  return { 
    users: [],
    sort: { sortBy, order }
  }
})
```

**Rutas generadas:**

- `GET /users` (únicamente)

---

### 5. **Patrón Parámetro Dinámico** - `carpeta/[param].js`

Crea rutas con parámetros dinámicos.

```javascript
// src/api/users/[id].js → /users/:id
export const GET = defineEventHandler(async ({ params }) => {
  const { id } = params

  if (!id || Number.isNaN(Number(id))) {
    const error = new Error("Invalid user ID")
    error.status = 400
    throw error
  }

  return { user: { id: Number(id), name: "Juan" } }
})

export const PUT = defineEventHandler(async ({ params, body }) => {
  const { id } = params
  const { name, email } = body

  return {
    message: `User ${id} updated`,
    user: { id: Number(id), name, email }
  }
})

export const DELETE = defineEventHandler(async ({ params }) => {
  const { id } = params
  return { message: `User ${id} deleted` }
})
```

**Rutas generadas:**

- `GET /users/:id`
- `PUT /users/:id`
- `DELETE /users/:id`

---

### 6. **Patrón Parámetro con Método** - `carpeta/[param].método.js`

Parámetros dinámicos con método específico.

```javascript
// src/api/users/[id].get.js → GET /users/:id (solo GET)
export default defineEventHandler(async ({ params, query }) => {
  const { id } = params
  const { include } = query

  const user = { id: Number(id), name: "Juan" }

  if (include === "profile") {
    user.profile = { age: 25, city: "Bilbao" }
  }

  return { user }
})
```

**Rutas generadas:**

- `GET /users/:id` (únicamente)

---

### 7. **Patrón Catch-All** - `carpeta/[...path].js`

Captura todas las rutas bajo un prefijo que no coincidan con otros archivos.

```javascript
// src/api/users/[...path].js → /users/*
export default defineEventHandler(async () => {
  return {
    message: "Unhandled user route"
  }
})
```

---

## 📥 Acceso a Datos de la Request

### **Query Parameters** (`?page=1&search=juan`)

```javascript
export const GET = defineEventHandler(async ({ query }) => {
  const {
    page = 1,
    limit = 10,
    search,
    filters = []
  } = query

  return { page: Number(page), limit: Number(limit), search, filters }
})
```

### **URL Parameters** (`/users/:id`)

```javascript
export const GET = defineEventHandler(async ({ params }) => {
  const { id, slug } = params
  return { id, slug }
})
```

### **Request Body** (POST, PUT, PATCH)

```javascript
export const POST = defineEventHandler(async ({ body }) => {
  const {
    name,
    email,
    age,
    profile = {}
  } = body

  return { name, email, age, profile }
})
```

### **Headers y Request Completo**

```javascript
export const GET = defineEventHandler(async ({ req, res, query, params, body }) => {
  // Request original de Express
  const userAgent = req.headers["user-agent"]
  const authorization = req.headers.authorization

  // Response original de Express (para casos especiales)
  res.setHeader("X-Custom-Header", "value")

  return {
    method: req.method,
    path: req.path,
    userAgent,
    hasAuth: !!authorization
  }
})
```

---

## ❌ Manejo de Errores

### **Errores con Status Code**

```javascript
export const GET = defineEventHandler(async ({ params }) => {
  const { id } = params

  // Error 400 - Bad Request
  if (!id || Number.isNaN(Number(id))) {
    const error = new Error("ID must be a valid number")
    error.status = 400
    throw error
  }

  // Error 404 - Not Found
  const user = await findUser(id)
  if (!user) {
    const error = new Error("User not found")
    error.status = 404
    throw error
  }

  // Error 403 - Forbidden
  if (!user.active) {
    const error = new Error("User account is deactivated")
    error.status = 403
    throw error
  }

  return { user }
})
```

### **Validaciones Complejas**

```javascript
export const POST = defineEventHandler(async ({ body }) => {
  const { name, email, age } = body

  // Múltiples validaciones
  const errors = []

  if (!name?.trim()) {
    errors.push("Name is required")
  }

  if (!email?.includes("@")) {
    errors.push("Valid email is required")
  }

  if (age && (age < 18 || age > 120)) {
    errors.push("Age must be between 18 and 120")
  }

  if (errors.length > 0) {
    const error = new Error("Validation failed")
    error.status = 400
    error.details = errors
    throw error
  }

  return { message: "User created", user: { name, email, age } }
})
```

### **Respuesta de Error Automática**

Los errores se formatean automáticamente:

```json
{
  "error": "User not found",
  "details": ["Name is required", "Valid email is required"]
}
```

---

## � Sistema de Middlewares

El template incluye un **sistema robusto de middlewares** que permite ejecutar lógica personalizada en diferentes momentos del ciclo de vida de una request. Los middlewares se pueden aplicar a nivel de ruta específica o globalmente.

### **Tipos de Middlewares**

#### 1. **onRequest** - Antes de procesar la request

Se ejecuta **antes** de que se ejecute el handler principal de la ruta.

```javascript
// src/api/users/[id].get.js
export const onRequest = async ({ req, params }) => {
  // Validar parámetros antes de procesar
  if (!params.id || isNaN(Number(params.id))) {
    const error = new Error("ID inválido")
    error.status = 400
    throw error
  }
}
```

#### 2. **onBeforeResponse** - Antes de enviar la respuesta

Se ejecuta **después** del handler pero **antes** de enviar la respuesta al cliente.

```javascript
// src/api/users.get.js
export const onBeforeResponse = async (context, result) => {
  // Añadir metadata a la respuesta
  return {
    ...result,
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  }
}
```

#### 3. **onError** - Cuando ocurre un error

Se ejecuta cuando cualquier parte del código (middleware o handler) lanza un error.

```javascript
// src/api/users.post.js
export const onError = async (context, error) => {
  // Personalizar respuesta de error
  if (error.status === 400) {
    return {
      error: "Datos inválidos",
      message: error.message,
      code: "VALIDATION_ERROR"
    }
  }

  return null // Dejar que otros manejadores procesen el error
}
```

---

### **Middlewares Incluidos**

#### 🔐 **Autenticación** (`auth.js`)

```javascript
import { requireAuth, requireAdmin } from "../middlewares/auth.js"

// Requiere token Bearer
export const onRequest = requireAuth

export const GET = defineEventHandler(async ({ query }) => {
  return { message: "Usuario autenticado" }
})
```

```javascript
// Requiere permisos de admin
import { requireAdmin } from "../middlewares/auth.js"

export const onRequest = requireAdmin

export const DELETE = defineEventHandler(async ({ params }) => {
  return { message: `Admin eliminó usuario ${params.id}` }
})
```

#### ⏱️ **Rate Limiting** (`ratelimit.js`)

```javascript
import { rateLimit } from "../middlewares/ratelimit.js"

// Límite de 10 requests por minuto por IP
export const onRequest = rateLimit

export const POST = defineEventHandler(async ({ body }) => {
  return { message: "Request procesada" }
})
```

#### 📅 **Timestamp** (`add-timestamp.js`)

```javascript
import { addTimestamp } from "../middlewares/add-timestamp.js"

export const onBeforeResponse = addTimestamp

export const GET = defineEventHandler(async () => {
  return { users: [] }
  // Respuesta final: { users: [], timestamp: "2024-01-15T10:30:00.000Z" }
})
```

#### 📊 **Metadata de Respuesta** (`add-metadata.js`)

```javascript
import { addResponseMetadata } from "../middlewares/add-metadata.js"

export const onBeforeResponse = addResponseMetadata

export const GET = defineEventHandler(async () => {
  return { users: [] }
  // Respuesta final incluye:
  // {
  //   users: [],
  //   meta: {
  //     requestId: "abc123",
  //     path: "/users",
  //     method: "GET"
  //   }
  // }
})
```

#### ❌ **Manejo de Errores Personalizado** (`custom-error-handler.js`)

```javascript
import { customErrorHandler } from "../middlewares/custom-error-handler.js"

export const onError = customErrorHandler

export const GET = defineEventHandler(async ({ params }) => {
  // Si lanza error 401, 403 o 429, el customErrorHandler
  // devolverá respuestas estructuradas con códigos personalizados
})
```

---

### **Múltiples Middlewares**

Puedes usar **varios middlewares** en la misma ruta:

```javascript
import { rateLimit } from "../middlewares/ratelimit.js"
import { requireAuth } from "../middlewares/auth.js"
import { addTimestamp } from "../middlewares/add-timestamp.js"
import { addResponseMetadata } from "../middlewares/add-metadata.js"
import { customErrorHandler } from "../middlewares/custom-error-handler.js"

// Múltiples middlewares onRequest se ejecutan en orden
export const onRequest = [
  rateLimit,        // 1. Verificar rate limit
  requireAuth       // 2. Verificar autenticación
]

// Múltiples middlewares onBeforeResponse
export const onBeforeResponse = [
  addTimestamp,        // 1. Añadir timestamp
  addResponseMetadata  // 2. Añadir metadata
]

// Manejo de errores
export const onError = customErrorHandler

export const GET = defineEventHandler(async ({ query }) => {
  return { message: "Ruta protegida con múltiples middlewares" }
})
```

---

### **Crear Middlewares Personalizados**

#### **Usando `createMiddleware()`**

```javascript
// src/middlewares/my-custom-middleware.js
import { createMiddleware } from "../lib/middleware-utils.js"

export const validateUserInput = createMiddleware({
  onRequest: async ({ body }) => {
    if (!body?.name || body.name.length < 2) {
      const error = new Error("Nombre debe tener al menos 2 caracteres")
      error.status = 400
      throw error
    }
  },

  onBeforeResponse: async (context, result) => {
    return {
      ...result,
      validated: true
    }
  },

  onError: async (context, error) => {
    if (error.status === 400) {
      return {
        error: "Error de validación",
        details: error.message,
        code: "VALIDATION_FAILED"
      }
    }
    return null
  }
})
```

**Uso del middleware personalizado:**

```javascript
// src/api/users.post.js
import { validateUserInput } from "../middlewares/my-custom-middleware.js"

export const onRequest = validateUserInput.onRequest
export const onBeforeResponse = validateUserInput.onBeforeResponse
export const onError = validateUserInput.onError

export const POST = defineEventHandler(async ({ body }) => {
  return { message: "Usuario creado", user: body }
})
```

#### **Combinando Middlewares con `combineMiddlewares()`**

```javascript
// src/middlewares/user-middleware-suite.js
import { combineMiddlewares } from "../lib/middleware-utils.js"
import { requireAuth } from "./auth.js"
import { rateLimit } from "./ratelimit.js"
import { addTimestamp } from "./add-timestamp.js"
import { customErrorHandler } from "./custom-error-handler.js"

export const userMiddlewareSuite = combineMiddlewares(
  {
    onRequest: [rateLimit, requireAuth]
  },
  {
    onBeforeResponse: addTimestamp
  },
  {
    onError: customErrorHandler
  }
)
```

**Uso de middleware combinado:**

```javascript
// src/api/users/[id].get.js
import { userMiddlewareSuite } from "../../middlewares/user-middleware-suite.js"

export const onRequest = userMiddlewareSuite.onRequest
export const onBeforeResponse = userMiddlewareSuite.onBeforeResponse
export const onError = userMiddlewareSuite.onError

export default defineEventHandler(({ params }) => {
  return { id: params.id, name: "Usuario" }
})
```

---

### **Mejores Prácticas**

#### ✅ **Organización**

- Agrupa middlewares relacionados en archivos separados
- Usa `combineMiddlewares()` para crear suites reutilizables
- Mantén middlewares simples y con una responsabilidad específica

#### ✅ **Rendimiento**

- Middlewares `onRequest` deben ser rápidos (validaciones básicas)
- Operaciones pesadas mejor en el handler principal
- Usa rate limiting para proteger recursos costosos

#### ✅ **Manejo de Errores**

- Siempre retorna `null` en `onError` si no manejas el error
- Usa códigos de error consistentes
- Proporciona mensajes de error útiles para el cliente

#### ✅ **Reutilización**

- Crea middlewares genéricos que puedas usar en múltiples rutas
- Usa `createMiddleware()` para middlewares complejos
- Documenta qué hace cada middleware y cómo usarlo

---

## �📊 Logging Automático

Todas las requests se loggean automáticamente:

```plain
GET /users - 45ms - 200
POST /users - 120ms - 200
GET /users/999 - 23ms - ERROR: User not found
```

### **Log Personalizado**

```javascript
export const GET = defineEventHandler(async ({ query }) => {
  console.log("Processing user search with filters:", query)

  // Tu lógica aquí

  return { users: [] }
})
```

---

## 🚀 Inicio Rápido

1. **Instalar dependencias:**

   ```bash
   npm install
   ```

2. **Iniciar servidor:**

   ```bash
   npm start
   ```

3. **Probar tu API:**

   ```bash
   curl http://localhost:3000/hello?name=Juan
   # Respuesta: {"message": "Hello, Juan!"}
   ```

---

## 📝 Notas Importantes

### **Prioridad de Rutas**

1. Archivos específicos (ej: `users.get.js`)
2. Archivos con parámetros (ej: `[id].js`)
3. Catch-all routes (ej: `[...path].js`)

### **defineEventHandler**

- Se ejecuta automáticamente para cada request
- Maneja errores con try/catch automático
- Convierte el return a JSON automáticamente
- Loggea tiempo de respuesta automáticamente
