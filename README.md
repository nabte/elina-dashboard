# 🤖 ELINA IA - Sistema CRM con WhatsApp e Inteligencia Artificial

**Versión:** 1.0.0  
**Última Actualización:** 6 de Enero de 2026  
**Estado:** ✅ Funcional y Optimizado

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
├── dist/                    # Archivos compilados (generados)
├── public/                  # Assets públicos
├── utils/                   # Utilidades compartidas
│   ├── csv-utils.js        # Funciones para manejo de CSV
│   └── phone-utils.js      # Funciones para teléfonos
├── supabase/               # Configuración de Supabase
│   ├── functions/          # Edge Functions
│   └── schema/             # Migraciones SQL
├── n8n/                    # Workflows de n8n
├── docs/                   # Documentación adicional
├── app.js                  # Aplicación principal
├── auth.js                 # Autenticación
├── settings.js             # Panel de configuración
├── chats.js                # Panel de chats
├── contacts.js             # Panel de contactos
├── products.js             # Panel de productos
├── quotes.js               # Panel de cotizaciones
├── index.html              # Página de login
├── dashboard.html          # Dashboard principal
├── vite.config.js          # Configuración de Vite
└── package.json            # Dependencias
```

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

### 6 de Enero de 2026

✅ **Correcciones Críticas Aplicadas:**
1. Corregida configuración de Vite (`outDir`)
2. Refactorizados listeners con MutationObserver
3. Creadas utilidades centralizadas (CSV, teléfonos)
4. Documentadas migraciones pendientes
5. Eliminados listeners duplicados

Ver detalles completos en [CAMBIOS_APLICADOS.md](./CAMBIOS_APLICADOS.md)

---

## ⚠️ Acciones Pendientes

### Prioridad Alta
- [ ] Ejecutar migraciones SQL en Supabase (ver `MIGRACIONES_PENDIENTES.md`)
- [ ] Actualizar imports en `app.js`, `contacts.js`, `products.js`
- [ ] Probar funcionalidad de invitaciones
- [ ] Verificar build de producción

### Prioridad Media
- [ ] Mejorar UI de críticos personalizados
- [ ] Implementar logging centralizado
- [ ] Refactorizar `app.js` (3294 líneas)
- [ ] Agregar tests unitarios

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

**Build:** ✅ Exitoso (2.05s)  
**Tests:** ⚠️ Pendiente de implementar  
**Documentación:** ✅ Completa  
**Deployment:** ✅ Listo  
**Migraciones:** ⚠️ Pendientes de ejecutar

---

**Última actualización:** 6 de Enero de 2026, 04:07 AM  
**Mantenido por:** Equipo DESAL
