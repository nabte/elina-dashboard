import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        superadmin: resolve(__dirname, 'superadmin.html'),
        booking: resolve(__dirname, 'booking.html'),
        auth: resolve(__dirname, 'auth.html'),
        settings: resolve(__dirname, 'settings.html'),
        blog: resolve(__dirname, 'blog.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        'forgot-password': resolve(__dirname, 'forgot-password.html'),
        'reset-password': resolve(__dirname, 'reset-password.html'),
        'accept-invitation': resolve(__dirname, 'accept-invitation.html'),
        'data-usage': resolve(__dirname, 'data-usage.html'),
        '404': resolve(__dirname, '404.html'),
      },
    },
  },
  server: {
    port: 5185,
    strictPort: false,
    // Forzar recarga de HTML sin caché
    middlewareMode: false,
    hmr: {
      overlay: true
    }
  },
  plugins: [
    {
      name: 'no-cache-html',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Deshabilitar caché para archivos HTML y JavaScript
          if (req.url.endsWith('.html') || req.url.endsWith('.js') || req.url === '/' || req.url.includes('/dashboard')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
          }
          next();
        });
      }
    },
    {
      name: 'slug-router',
      configureServer(server) {
        // Ejecutamos este middleware ANTES que cualquier otro de Vite
        server.middlewares.use((req, res, next) => {
          const fullUrl = req.url || '';
          const urlPath = fullUrl.split('?')[0];
          const query = fullUrl.split('?')[1] || '';

          // Debugging para ver qué rutas está procesando Vite
          // console.log(`[Vite Debug] Request: ${urlPath}`);

          // Definimos qué rutas NO son slugs de empresa
          const isKnownPath = [
            '/', '/index.html', '/dashboard.html', '/auth.html', '/settings.html',
            '/booking.html', '/blog.html', '/superadmin.html', '/privacy.html',
            '/terms.html', '/forgot-password.html', '/reset-password.html',
            '/accept-invitation.html', '/data-usage.html'
          ].includes(urlPath);

          const isInternal = urlPath.startsWith('/public/') ||
            urlPath.startsWith('/src/') ||
            urlPath.startsWith('/@vite/') ||
            urlPath.startsWith('/node_modules/') ||
            urlPath.startsWith('/assets/') ||
            urlPath.includes('.'); // Tiene extensión (js, css, png, etc)

          // Si es un slug (ruta no conocida, sin extensión, no interna)
          if (!isKnownPath && !isInternal && urlPath.length > 1) {
            const slug = urlPath.substring(1);
            console.log(`[Vite Router] Slug detectado: ${slug}. Redirigiendo a booking.html`);

            // Forzamos la URL interna a booking.html con el parámetro s=slug
            req.url = `/booking.html?s=${slug}${query ? '&' + query : ''}`;
          }

          next();
        });
      }
    }
  ]
});
