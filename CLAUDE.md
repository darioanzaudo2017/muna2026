# CLAUDE.md — muna2026

## Identidad del proyecto

- **Nombre:** muna2026
- **Cliente:** Defensoría de Niñas, Niños y Adolescentes de Córdoba — en convenio con UNICEF
- **Programa:** Autodiagnóstico Municipal de Protección de NNyA (consultores MUNA + técnicos municipales)
- **Tipo:** PWA municipal
- **Supabase project-ref:** `nqxitcfkezegxdlbvxmd`
- **Deploy:** Vercel (.vercel.app) — rama `main`
- **Estado:** En desarrollo activo — formulario funcional, plan de acción parcial

---

## Stack técnico

| Tecnología | Versión |
|---|---|
| React | 19.2.6 |
| Vite | 8.0.12 |
| TailwindCSS | 4.3.0 |
| react-router-dom | 7.17.0 |
| @supabase/supabase-js | 2.107.0 |
| @sentry/react | 10.56.0 |
| lucide-react | 1.17.0 |

Sin TypeScript — todo JSX puro.

---

## Estructura de carpetas

```
src/
  pages/          # Vistas principales (una por ruta)
  components/     # Componentes reutilizables
  context/        # AuthContext (sesión de usuario)
  hooks/          # useSecciones, useAutodiagnostico
  lib/            # supabase.js, sentry.js, mockData.js
```

---

## Base de datos (Supabase)

### Tablas principales
| Tabla | Descripción |
|---|---|
| `municipios` | Los 6 municipios del programa (IDs 27–31, 33) |
| `autodiagnosticos` | Un registro por municipio/año. Columna `idmunicipio` (sin guión bajo) |
| `respuestas` | Respuestas del formulario. FK: `id_autodiagnostico` (con guión bajo) |
| `secciones` | 12 secciones del cuestionario |
| `preguntas` | Preguntas activas con `tipo`, `requerida`, `config` jsonb |
| `opciones_pregunta` | Opciones para preguntas tipo opcion/array/tabla |
| `profiles` | Perfil de usuario vinculado a `auth.users` |
| `user_municipios` | Asignación usuario ↔ municipio |

### Tipos de pregunta
`texto` | `numero` | `boolean` | `opcion` | `array` | `tabla`

El tipo `tabla` usa `config jsonb` con `modo` ("fijo" | "dinamico" | null=grupos) y `columnas[]`. Los datos se guardan en `valor_array` (jsonb).

### Columna quirk importante
- `autodiagnosticos.idmunicipio` — **sin** guión bajo
- `respuestas.id_autodiagnostico` — **con** guión bajo

### Funciones SECURITY DEFINER (no modificar sin justificación)
`is_admin()` | `can_access_municipio(id)` | `my_municipios()` | `handle_new_user()`

### RLS
Todas las tablas tienen RLS activo. Patrón dominante:
- SELECT/UPDATE/INSERT → `can_access_municipio(idmunicipio)`
- DELETE → `is_admin()`
- Datos de referencia (preguntas, secciones, opciones) → `auth.uid() IS NOT NULL`

---

## Roles de usuario

| Rol | Descripción |
|---|---|
| `admin` | Consultores MUNA de la Defensoría — gestión global |
| `tecnico_municipal` | Técnico de cada municipio — completa el diagnóstico |
| `visor` | Solo lectura — puede ver resultados |

---

## Variables de entorno

```env
VITE_SUPABASE_URL=       # URL del proyecto Supabase
VITE_SUPABASE_ANON_KEY=  # Anon key (pública, va al bundle)
VITE_SENTRY_DSN=         # DSN de Sentry (público por diseño)
```

Variables de entorno en Vercel — nunca en código.

---

## Módulos y estado

| Módulo | Estado |
|---|---|
| Login / Register | ✅ Funcional |
| Lista de municipios | ✅ Funcional |
| Dashboard municipio | ✅ Funcional |
| Formulario autodiagnóstico | ✅ Funcional (12 secciones, todos los tipos) |
| Plan de acción | ⚠️ Muy parcial — usa datos mock |
| Admin usuarios | ✅ Funcional |
| Config preguntas | ✅ Funcional |

---

## Convenciones de código

- Componentes en `pages/` — una página por archivo, `export default`
- Llamadas a Supabase: actualmente mezcladas entre `lib/supabase.js` y directo en componentes — migrar progresivamente a `services/`
- `getOrCreateAutodiagnostico(idMunicipio, anio)` — patrón con `.maybeSingle()` + retry en conflicto
- Guardado de respuestas: upsert manual (UPDATE si tiene `id`, INSERT si no) — NO usar `.upsert()` de Supabase
- Toast de notificación: `showToast(mensaje, 'success'|'error')` en `AutodiagnosticoLayout`
- Design system: Material Design 3 con tokens Tailwind custom (`text-on-surface`, `bg-surface-container`, etc.)

---

## Lo que NO hacer

- Nunca escribir keys o tokens en archivos de código
- Nunca deshabilitar RLS
- Nunca usar `service_role` key en el cliente
- Variables `VITE_*` solo para valores públicos — nunca secrets
- Nunca hacer `git push` a main sin verificar Sentry primero
- Nunca modificar funciones SECURITY DEFINER sin justificación explícita
- No usar `.single()` para SELECT que puede no encontrar fila — usar `.maybeSingle()`

---

## Pendientes conocidos

- [ ] Migración RLS `respuestas`: reemplazar `auth.uid() IS NOT NULL` por `can_access_municipio()` — SQL listo, aplicar después de confirmar deploy estable
- [ ] Plan de acción: reemplazar datos mock por datos reales de Supabase
- [ ] `servicios_municipales`: tabla vacía, pendiente migración de datos
- [ ] Sentry user context: agregar municipio/usuario a los eventos para mejor trazabilidad
