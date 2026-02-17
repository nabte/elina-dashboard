import { j as jsxRuntimeExports, L as Logo, e as ThemeToggle } from './landing-DMNKFuas.js';

const PublicPageLayout = ({ children, onNavigate }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center h-16", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onNavigate("landing"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, { className: "h-8 w-auto" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onNavigate("landing"), className: "text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline", children: "← Volver a la página principal" })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-grow", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24", children }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto py-6 px-4 text-center text-sm text-slate-500 dark:text-slate-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " Ryze. Todos los derechos reservados."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 space-x-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onNavigate("terms"), className: "hover:underline", children: "Términos y Condiciones" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onNavigate("privacy"), className: "hover:underline", children: "Política de Privacidad" })
      ] })
    ] }) })
  ] });
};

export { PublicPageLayout as default };
