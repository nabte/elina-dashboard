# 🤖 ELINA IA - Sistema CRM con WhatsApp e Inteligencia Artificial

**Versión:** 2.0.0
**Última Actualización:** 20 de Febrero de 2026
**Estado:** ✅ Reorganizado, Optimizado y Funcional

---

## 📋 Descripción

ELINA IA es un sistema CRM completo con integración de WhatsApp, inteligencia artificial y automatización de ventas. Permite gestionar contactos, conversaciones, productos, cotizaciones y más, todo desde una interfaz web moderna.

---

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase
- Cuenta de n8n (para automatizaciones)

### Instalación

```bash
# Clonar el repositorio
cd "h:\DESAL\archivos reales a compilar ultimo establ 3 dic 25"

# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Build de producción
npm run build

# Preview de producción
npm run preview
```

---

## 📁 Estructura del Proyecto

```
├── src/                    # ✨ Código JavaScript organizado (NUEVO)
│   ├── core/              # Módulos principales (app, auth, main)
│   ├── features/          # Features del dashboard (contacts, chats, products, etc.)
│   ├── ai/                # Módulos de IA (designer-ai, prompt-training, flow-builder-v3)
│   ├── settings/          # Configuración y admin
│   ├── modals/            # Modales y componentes UI
│   ├── affiliate/         # Sistema de afiliados
│   ├── tasks/             # Tareas y seguimiento
│   └── booking/           # Sistema de reservas público
├── utils/                 # Utilidades compartidas
│   ├── csv-utils.js       # Funciones para manejo de CSV
│   └── phone-utils.js     # Funciones para teléfonos
├── supabase/              # Configuración de Supabase
│   └── functions/         # 83 Edge Functions activas
├── docs/                  # Documentación técnica activa
├── legacy/                # Archivos obsoletos organizados
│   ├── backups/           # Backups antiguos
│   ├── old-versions/      # Versiones antiguas de código
│   ├── dev-scripts/       # Scripts de testing
│   ├── old-docs/          # Documentación antigua
│   └── public-duplicates/ # HTML duplicados de public/
├── public/                # Assets públicos (imágenes, iconos, etc.)
├── dist/                  # Build de producción (generado)
├── n8n/                   # Workflows de automatización
├── *.html                 # Páginas HTML (30 archivos)
├── vite.config.js         # Configuración de Vite
├── package.json           # Dependencias
└── README.md              # Este archivo
```

### Código JavaScript Organizado (src/)

Toda la lógica JavaScript está ahora organizada en carpetas temáticas:

- **core/** (5 archivos) - Funcionalidad principal (app.js, auth.js, main.js)
- **features/** (7 archivos) - Features del dashboard (contacts, chats, products, appointments, etc.)
- **ai/** (6 archivos) - Módulos de IA (designer-ai, prompt-training, flow-builder-v3, auto-responses)
- **settings/** (4 archivos) - Panel de configuración y administración
- **modals/** (4 archivos) - Modales y componentes UI (plans-modal, csv-mapping-modal)
- **affiliate/** (2 archivos) - Sistema de afiliados y soporte
- **tasks/** (3 archivos) - Tareas personales y seguimientos
- **booking/** (5 archivos) - Sistema de reservas público

Ver [docs/REORGANIZACION_COMPLETA.md](docs/REORGANIZACION_COMPLETA.md) para detalles completos.

---

## 📚 Documentación

### Documentos Principales

#### 🔴 Críticos y Urgentes
- **[CAMBIOS_APLICADOS.md](./CAMBIOS_APLICADOS.md)** - Últimos cambios aplicados (6 Ene 2026)
- **[MIGRACIONES_PENDIENTES.md](./MIGRACIONES_PENDIENTES.md)** - ⚠️ Migraciones SQL pendientes
- **[CRITICOS12.md](./CRITICOS12.md)** - Sistema de mensajes críticos

#### 📖 Guías de Uso
- **[Manual-del-vendedor.md](./Manual-del-vendedor.md)** - Guía para vendedores
- **[GUIA_MENSAJES_CRITICOS.md](./GUIA_MENSAJES_CRITICOS.md)** - Configurar mensajes críticos
- **[GUIA_USO_CRITICOS.md](./GUIA_USO_CRITICOS.md)** - Uso del sistema de críticos
- **[COMO_VER_Y_USAR_GRUPOS.md](./COMO_VER_Y_USAR_GRUPOS.md)** - Gestión de grupos
- **[GUIA_BORRADORES_Y_SIMULACION.md](./GUIA_BORRADORES_Y_SIMULACION.md)** - Modo simulación

#### 🔧 Configuración y Setup
- **[PASOS_MANUALES_SUPABASE.md](./PASOS_MANUALES_SUPABASE.md)** - Configurar Supabase
- **[CONFIGURACION_REDIRECT_URLS.md](./CONFIGURACION_REDIRECT_URLS.md)** - URLs de redirección
- **[CORS_FIX_INSTRUCTIONS.md](./CORS_FIX_INSTRUCTIONS.md)** - Solucionar CORS

#### 🛠️ Implementación y Desarrollo
- **[INSTRUCCIONES_COMPLETAS_SISTEMA_VENTAS.md](./INSTRUCCIONES_COMPLETAS_SISTEMA_VENTAS.md)** - Sistema de ventas
- **[PLAN_SISTEMA_CIERRE_VENTAS_AUTOMATICO.md](./PLAN_SISTEMA_CIERRE_VENTAS_AUTOMATICO.md)** - Cierre automático
- **[SISTEMA_BUSINESS_COMPLETO.md](./SISTEMA_BUSINESS_COMPLETO.md)** - Plan Business
- **[IMPLEMENTACION_SISTEMA_PAGOS_Y_CONTADORES.md](./IMPLEMENTACION_SISTEMA_PAGOS_Y_CONTADORES.md)** - Pagos

#### 🐛 Troubleshooting
- **[SOLUCION_ERRORES_REGISTRO.md](./SOLUCION_ERRORES_REGISTRO.md)** - Errores de registro
- **[SOLUCION_ERROR_429_EMBEDDINGS.md](./SOLUCION_ERROR_429_EMBEDDINGS.md)** - Error 429
- **[GUIA_AJUSTES_MANUALES_N8N_ERROR_429.md](./GUIA_AJUSTES_MANUALES_N8N_ERROR_429.md)** - Ajustes n8n

#### 🤖 Inteligencia Artificial
- **[SOLUCION_ALUCINACIONES_IA.md](./SOLUCION_ALUCINACIONES_IA.md)** - Prevenir alucinaciones
- **[GUIA_PROMPT_IA_CITAS.md](./GUIA_PROMPT_IA_CITAS.md)** - Prompts para citas
- **[DOCUMENTACION_SISTEMA_PROMPTS.md](./DOCUMENTACION_SISTEMA_PROMPTS.md)** - Sistema de prompts

---

## 🔑 Características Principales

### 💬 Gestión de Conversaciones
- Integración completa con WhatsApp vía Evolution API
- Chat en tiempo real
- Etiquetas personalizadas
- Sistema de ignorar/pausar conversaciones
- Detección automática de intenciones críticas

### 👥 Gestión de Contactos
- Importación masiva vía CSV
- Campos personalizados
- Historial de interacciones
- Segmentación por etiquetas
- Notas y seguimientos

### 📦 Gestión de Productos
- Catálogo completo
- Imágenes y descripciones
- Precios y stock
- Categorías
- Importación CSV

### 💰 Cotizaciones
- Generación automática
- Descuentos e impuestos
- Envío por WhatsApp
- Historial completo
- Conversión a ventas

### 🤖 Inteligencia Artificial
- Respuestas automáticas contextuales
- Detección de objeciones
- Generación de contenido
- Análisis de sentimiento
- Prevención de alucinaciones

### 👨‍💼 Gestión de Equipos (Plan Business)
- Múltiples usuarios
- Roles y permisos
- Filtros de visibilidad
- Invitaciones por email
- Gestión de accesos

### 📊 Sistema de Citas
- Calendario integrado
- Tipos de citas personalizables
- Recordatorios automáticos
- Gestión de horarios
- Confirmaciones

---

## ⚙️ Configuración

### Variables de Entorno

Crear archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### Supabase

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar migraciones SQL (ver `MIGRACIONES_PENDIENTES.md`)
3. Configurar Edge Functions
4. Configurar autenticación

### n8n

1. Importar workflows desde carpeta `n8n/`
2. Configurar credenciales
3. Activar workflows
4. Configurar webhooks

---

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
npm test

# Linting
npm run lint

# Format
npm run format
```

---

## 📦 Build y Deployment

### Build de Producción

```bash
npm run build
```

Los archivos compilados se generan en `./dist/`

### Deployment

#### Opción 1: Hosting Estático (Netlify, Vercel)
```bash
npm run build
# Subir carpeta dist/
```

#### Opción 2: Servidor Propio
```bash
npm run build
# Copiar dist/ a servidor
# Configurar servidor web (nginx, apache)
```

---

## 🔄 Actualizaciones Recientes

### 20 de Febrero de 2026 - v2.0.0 🎉

✅ **Reorganización Completa del Proyecto:**
1. ✨ **Nueva estructura `src/`** - 39 archivos JS organizados en carpetas temáticas
2. 🧹 **Limpieza de legacy** - Código obsoleto movido a `legacy/`
3. 📚 **Documentación reorganizada** - Docs activas separadas de antiguas
4. 🗑️ **Duplicados eliminados** - 14 HTML duplicados removidos de `public/`
5. ⚡ **Code splitting** - Flow-builder-v3 con lazy loading
6. ✅ **Build optimizado** - 68 módulos, compilado en 3.81s

Ver detalles completos en [docs/REORGANIZACION_COMPLETA.md](docs/REORGANIZACION_COMPLETA.md)

### 6 de Enero de 2026

✅ **Correcciones Críticas Aplicadas:**
1. Corregida configuración de Vite (`outDir`)
2. Refactorizados listeners con MutationObserver
3. Creadas utilidades centralizadas (CSV, teléfonos)
4. Documentadas migraciones pendientes
5. Eliminados listeners duplicados

---

## ⚠️ Acciones Pendientes

### Prioridad Alta
- [ ] Ejecutar migraciones SQL en Supabase (ver `MIGRACIONES_PENDIENTES.md`)
- [ ] Probar funcionalidad de invitaciones
- [x] ✅ Reorganizar estructura del proyecto (COMPLETADO - 20 Feb 2026)
- [x] ✅ Actualizar imports en archivos (COMPLETADO - 20 Feb 2026)
- [x] ✅ Verificar build de producción (COMPLETADO - 20 Feb 2026)

### Prioridad Media
- [ ] Mejorar UI de críticos personalizados
- [ ] Implementar logging centralizado
- [ ] Agregar tests unitarios
- [ ] Optimizar chunk size del dashboard (894 kB → considerar code splitting adicional)

---

## 🤝 Contribución

### Flujo de Trabajo

1. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
2. Hacer cambios y commits
3. Ejecutar build: `npm run build`
4. Verificar que no hay errores
5. Crear Pull Request

### Estándares de Código

- Usar ES6+ 
- Comentarios en español
- Nombres descriptivos de variables
- Funciones pequeñas y enfocadas
- Documentar funciones complejas

---

## 📞 Soporte

### Documentación
- Ver carpeta `docs/` para guías detalladas
- Revisar archivos `.md` en raíz para temas específicos

### Issues Comunes
- **Error 429 en embeddings:** Ver `SOLUCION_ERROR_429_EMBEDDINGS.md`
- **Errores de registro:** Ver `SOLUCION_ERRORES_REGISTRO.md`
- **Problemas con n8n:** Ver `GUIA_AJUSTES_MANUALES_N8N_ERROR_429.md`
- **CORS:** Ver `CORS_FIX_INSTRUCTIONS.md`

---

## 📄 Licencia

Propietario: DESAL  
Uso interno exclusivo

---

## 🔗 Enlaces Útiles

- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev)
- [n8n Docs](https://docs.n8n.io)
- [Evolution API](https://evolution-api.com)

---

## 📊 Estado del Proyecto

**Build:** ✅ Exitoso (3.81s - 68 módulos)
**Estructura:** ✅ Reorganizada y Optimizada
**Code Splitting:** ✅ Implementado (lazy loading)
**Documentación:** ✅ Completa y Actualizada
**Tests:** ⚠️ Pendiente de implementar
**Deployment:** ✅ Listo
**Migraciones:** ⚠️ Pendientes de ejecutar

### Estadísticas del Build
- **Bundle JS:** ~1.35 MB (~285 kB gzipped)
- **Archivos generados:** 14 HTML, 9 JS, 1 CSS
- **Módulos transformados:** 68
- **Tiempo de build:** 3.81s

---

**Última actualización:** 20 de Febrero de 2026
**Versión:** 2.0.0
**Mantenido por:** Equipo DESAL
