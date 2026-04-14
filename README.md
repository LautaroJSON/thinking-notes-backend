# Thinking Notes Backend

Un backend API para gestionar notas personales, construido con NestJS, Prisma y autenticación de Supabase.

## Descripción

Esta aplicación permite a los usuarios autenticados crear, leer y actualizar notas. Cada nota pertenece a un usuario específico, y la autenticación se maneja a través de tokens JWT de Supabase.

## Tecnologías

- **NestJS**: Framework para Node.js
- **Prisma**: ORM para la base de datos
- **PostgreSQL**: Base de datos
- **Supabase**: Autenticación y base de datos

## Instalación

1. Clona el repositorio:

   ```bash
   git clone <url-del-repo>
   cd thinking-notes-backend
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Configura las variables de entorno. Crea un archivo `.env` en la raíz del proyecto con:

   ```
   DATABASE_URL="postgresql://usuario:password@localhost:5432/thinking_notes"
   SUPABASE_URL="https://tu-proyecto.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
   PORT=3000
   ```

4. Ejecuta las migraciones de Prisma:

   ```bash
   npx prisma migrate dev
   ```

5. Genera el cliente de Prisma:
   ```bash
   npx prisma generate
   ```

## Uso

### Iniciar el servidor

- Desarrollo: `npm run start:dev`
- Producción: `npm run start:prod`

El servidor correrá en `http://localhost:3000` por defecto.

### Endpoints

Todos los endpoints requieren autenticación con un header `Authorization: Bearer <access_token>` (excepto el root).

- **GET /**: Retorna "hello world"
- **GET /notes**: Obtiene todas las notas del usuario autenticado
- **POST /notes**: Crea una nueva nota
  - Body: `{ "title": "Título", "contentList": ["punto 1", "punto 2"] }`
- **PUT /notes/:id**: Actualiza una nota existente (solo si pertenece al usuario)
  - Body: `{ "title": "Nuevo título" }` (campos opcionales)

### Ejemplo con Postman

1. Obtén un `access_token` de Supabase.
2. Para GET /notes:
   - Método: GET
   - URL: `http://localhost:3000/notes`
   - Header: `Authorization: Bearer <token>`

## Scripts disponibles

- `npm run build`: Compila el proyecto
- `npm run start`: Inicia en producción
- `npm run start:dev`: Inicia en desarrollo con watch
- `npm run lint`: Ejecuta ESLint
- `npm run test`: Ejecuta tests

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push y crea un Pull Request

## Licencia

UNLICENSED
