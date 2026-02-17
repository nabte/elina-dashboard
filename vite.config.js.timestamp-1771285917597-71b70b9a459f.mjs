// vite.config.js
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "file:///H:/DESAL/ELina%2026/node_modules/vite/dist/node/index.js";
var __vite_injected_original_import_meta_url = "file:///H:/DESAL/ELina%2026/vite.config.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        superadmin: resolve(__dirname, "superadmin.html"),
        booking: resolve(__dirname, "booking.html"),
        auth: resolve(__dirname, "auth.html"),
        settings: resolve(__dirname, "settings.html"),
        blog: resolve(__dirname, "blog.html"),
        privacy: resolve(__dirname, "privacy.html"),
        terms: resolve(__dirname, "terms.html"),
        "forgot-password": resolve(__dirname, "forgot-password.html"),
        "reset-password": resolve(__dirname, "reset-password.html"),
        "accept-invitation": resolve(__dirname, "accept-invitation.html"),
        "data-usage": resolve(__dirname, "data-usage.html"),
        "404": resolve(__dirname, "404.html")
      }
    }
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
      name: "no-cache-html",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.endsWith(".html") || req.url.endsWith(".js") || req.url === "/" || req.url.includes("/dashboard")) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
            res.setHeader("Surrogate-Control", "no-store");
          }
          next();
        });
      }
    },
    {
      name: "slug-router",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const fullUrl = req.url || "";
          const urlPath = fullUrl.split("?")[0];
          const query = fullUrl.split("?")[1] || "";
          const isKnownPath = [
            "/",
            "/index.html",
            "/dashboard.html",
            "/auth.html",
            "/settings.html",
            "/booking.html",
            "/blog.html",
            "/superadmin.html",
            "/privacy.html",
            "/terms.html",
            "/forgot-password.html",
            "/reset-password.html",
            "/accept-invitation.html",
            "/data-usage.html"
          ].includes(urlPath);
          const isInternal = urlPath.startsWith("/public/") || urlPath.startsWith("/src/") || urlPath.startsWith("/@vite/") || urlPath.startsWith("/node_modules/") || urlPath.startsWith("/assets/") || urlPath.includes(".");
          if (!isKnownPath && !isInternal && urlPath.length > 1) {
            const slug = urlPath.substring(1);
            console.log(`[Vite Router] Slug detectado: ${slug}. Redirigiendo a booking.html`);
            req.url = `/booking.html?s=${slug}${query ? "&" + query : ""}`;
          }
          next();
        });
      }
    }
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJIOlxcXFxERVNBTFxcXFxFTGluYSAyNlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSDpcXFxcREVTQUxcXFxcRUxpbmEgMjZcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0g6L0RFU0FML0VMaW5hJTIwMjYvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyByZXNvbHZlLCBkaXJuYW1lIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuXHJcbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XHJcbmNvbnN0IF9fZGlybmFtZSA9IGRpcm5hbWUoX19maWxlbmFtZSk7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIGJ1aWxkOiB7XHJcbiAgICBvdXREaXI6ICcuL2Rpc3QnLFxyXG4gICAgZW1wdHlPdXREaXI6IHRydWUsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIGlucHV0OiB7XHJcbiAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5odG1sJyksXHJcbiAgICAgICAgZGFzaGJvYXJkOiByZXNvbHZlKF9fZGlybmFtZSwgJ2Rhc2hib2FyZC5odG1sJyksXHJcbiAgICAgICAgc3VwZXJhZG1pbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdzdXBlcmFkbWluLmh0bWwnKSxcclxuICAgICAgICBib29raW5nOiByZXNvbHZlKF9fZGlybmFtZSwgJ2Jvb2tpbmcuaHRtbCcpLFxyXG4gICAgICAgIGF1dGg6IHJlc29sdmUoX19kaXJuYW1lLCAnYXV0aC5odG1sJyksXHJcbiAgICAgICAgc2V0dGluZ3M6IHJlc29sdmUoX19kaXJuYW1lLCAnc2V0dGluZ3MuaHRtbCcpLFxyXG4gICAgICAgIGJsb2c6IHJlc29sdmUoX19kaXJuYW1lLCAnYmxvZy5odG1sJyksXHJcbiAgICAgICAgcHJpdmFjeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdwcml2YWN5Lmh0bWwnKSxcclxuICAgICAgICB0ZXJtczogcmVzb2x2ZShfX2Rpcm5hbWUsICd0ZXJtcy5odG1sJyksXHJcbiAgICAgICAgJ2ZvcmdvdC1wYXNzd29yZCc6IHJlc29sdmUoX19kaXJuYW1lLCAnZm9yZ290LXBhc3N3b3JkLmh0bWwnKSxcclxuICAgICAgICAncmVzZXQtcGFzc3dvcmQnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3Jlc2V0LXBhc3N3b3JkLmh0bWwnKSxcclxuICAgICAgICAnYWNjZXB0LWludml0YXRpb24nOiByZXNvbHZlKF9fZGlybmFtZSwgJ2FjY2VwdC1pbnZpdGF0aW9uLmh0bWwnKSxcclxuICAgICAgICAnZGF0YS11c2FnZSc6IHJlc29sdmUoX19kaXJuYW1lLCAnZGF0YS11c2FnZS5odG1sJyksXHJcbiAgICAgICAgJzQwNCc6IHJlc29sdmUoX19kaXJuYW1lLCAnNDA0Lmh0bWwnKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDUxODUsXHJcbiAgICBzdHJpY3RQb3J0OiBmYWxzZSxcclxuICAgIC8vIEZvcnphciByZWNhcmdhIGRlIEhUTUwgc2luIGNhY2hcdTAwRTlcclxuICAgIG1pZGRsZXdhcmVNb2RlOiBmYWxzZSxcclxuICAgIGhtcjoge1xyXG4gICAgICBvdmVybGF5OiB0cnVlXHJcbiAgICB9XHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICB7XHJcbiAgICAgIG5hbWU6ICduby1jYWNoZS1odG1sJyxcclxuICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAvLyBEZXNoYWJpbGl0YXIgY2FjaFx1MDBFOSBwYXJhIGFyY2hpdm9zIEhUTUwgeSBKYXZhU2NyaXB0XHJcbiAgICAgICAgICBpZiAocmVxLnVybC5lbmRzV2l0aCgnLmh0bWwnKSB8fCByZXEudXJsLmVuZHNXaXRoKCcuanMnKSB8fCByZXEudXJsID09PSAnLycgfHwgcmVxLnVybC5pbmNsdWRlcygnL2Rhc2hib2FyZCcpKSB7XHJcbiAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCAnbm8tc3RvcmUsIG5vLWNhY2hlLCBtdXN0LXJldmFsaWRhdGUsIHByb3h5LXJldmFsaWRhdGUnKTtcclxuICAgICAgICAgICAgcmVzLnNldEhlYWRlcignUHJhZ21hJywgJ25vLWNhY2hlJyk7XHJcbiAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0V4cGlyZXMnLCAnMCcpO1xyXG4gICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdTdXJyb2dhdGUtQ29udHJvbCcsICduby1zdG9yZScpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBuYW1lOiAnc2x1Zy1yb3V0ZXInLFxyXG4gICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XHJcbiAgICAgICAgLy8gRWplY3V0YW1vcyBlc3RlIG1pZGRsZXdhcmUgQU5URVMgcXVlIGN1YWxxdWllciBvdHJvIGRlIFZpdGVcclxuICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgY29uc3QgZnVsbFVybCA9IHJlcS51cmwgfHwgJyc7XHJcbiAgICAgICAgICBjb25zdCB1cmxQYXRoID0gZnVsbFVybC5zcGxpdCgnPycpWzBdO1xyXG4gICAgICAgICAgY29uc3QgcXVlcnkgPSBmdWxsVXJsLnNwbGl0KCc/JylbMV0gfHwgJyc7XHJcblxyXG4gICAgICAgICAgLy8gRGVidWdnaW5nIHBhcmEgdmVyIHF1XHUwMEU5IHJ1dGFzIGVzdFx1MDBFMSBwcm9jZXNhbmRvIFZpdGVcclxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBbVml0ZSBEZWJ1Z10gUmVxdWVzdDogJHt1cmxQYXRofWApO1xyXG5cclxuICAgICAgICAgIC8vIERlZmluaW1vcyBxdVx1MDBFOSBydXRhcyBOTyBzb24gc2x1Z3MgZGUgZW1wcmVzYVxyXG4gICAgICAgICAgY29uc3QgaXNLbm93blBhdGggPSBbXHJcbiAgICAgICAgICAgICcvJywgJy9pbmRleC5odG1sJywgJy9kYXNoYm9hcmQuaHRtbCcsICcvYXV0aC5odG1sJywgJy9zZXR0aW5ncy5odG1sJyxcclxuICAgICAgICAgICAgJy9ib29raW5nLmh0bWwnLCAnL2Jsb2cuaHRtbCcsICcvc3VwZXJhZG1pbi5odG1sJywgJy9wcml2YWN5Lmh0bWwnLFxyXG4gICAgICAgICAgICAnL3Rlcm1zLmh0bWwnLCAnL2ZvcmdvdC1wYXNzd29yZC5odG1sJywgJy9yZXNldC1wYXNzd29yZC5odG1sJyxcclxuICAgICAgICAgICAgJy9hY2NlcHQtaW52aXRhdGlvbi5odG1sJywgJy9kYXRhLXVzYWdlLmh0bWwnXHJcbiAgICAgICAgICBdLmluY2x1ZGVzKHVybFBhdGgpO1xyXG5cclxuICAgICAgICAgIGNvbnN0IGlzSW50ZXJuYWwgPSB1cmxQYXRoLnN0YXJ0c1dpdGgoJy9wdWJsaWMvJykgfHxcclxuICAgICAgICAgICAgdXJsUGF0aC5zdGFydHNXaXRoKCcvc3JjLycpIHx8XHJcbiAgICAgICAgICAgIHVybFBhdGguc3RhcnRzV2l0aCgnL0B2aXRlLycpIHx8XHJcbiAgICAgICAgICAgIHVybFBhdGguc3RhcnRzV2l0aCgnL25vZGVfbW9kdWxlcy8nKSB8fFxyXG4gICAgICAgICAgICB1cmxQYXRoLnN0YXJ0c1dpdGgoJy9hc3NldHMvJykgfHxcclxuICAgICAgICAgICAgdXJsUGF0aC5pbmNsdWRlcygnLicpOyAvLyBUaWVuZSBleHRlbnNpXHUwMEYzbiAoanMsIGNzcywgcG5nLCBldGMpXHJcblxyXG4gICAgICAgICAgLy8gU2kgZXMgdW4gc2x1ZyAocnV0YSBubyBjb25vY2lkYSwgc2luIGV4dGVuc2lcdTAwRjNuLCBubyBpbnRlcm5hKVxyXG4gICAgICAgICAgaWYgKCFpc0tub3duUGF0aCAmJiAhaXNJbnRlcm5hbCAmJiB1cmxQYXRoLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgY29uc3Qgc2x1ZyA9IHVybFBhdGguc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW1ZpdGUgUm91dGVyXSBTbHVnIGRldGVjdGFkbzogJHtzbHVnfS4gUmVkaXJpZ2llbmRvIGEgYm9va2luZy5odG1sYCk7XHJcblxyXG4gICAgICAgICAgICAvLyBGb3J6YW1vcyBsYSBVUkwgaW50ZXJuYSBhIGJvb2tpbmcuaHRtbCBjb24gZWwgcGFyXHUwMEUxbWV0cm8gcz1zbHVnXHJcbiAgICAgICAgICAgIHJlcS51cmwgPSBgL2Jvb2tpbmcuaHRtbD9zPSR7c2x1Z30ke3F1ZXJ5ID8gJyYnICsgcXVlcnkgOiAnJ31gO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIF1cclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNk8sU0FBUyxTQUFTLGVBQWU7QUFDOVEsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxvQkFBb0I7QUFGa0gsSUFBTSwyQ0FBMkM7QUFJaE0sSUFBTSxhQUFhLGNBQWMsd0NBQWU7QUFDaEQsSUFBTSxZQUFZLFFBQVEsVUFBVTtBQUVwQyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFD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
