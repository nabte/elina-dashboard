import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices, o as getInventoryOptimizationSuggestion } from './MainLayout-C0Ev0ilC.js';
import './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const suggestedQueries = [
  "Sugiéreme 3 productos para una oferta de fin de semana.",
  "¿Qué productos debería agrupar para vender más?",
  "Identifica mis productos con stock más antiguo o de baja rotación."
];
const AIInventoryOptimizer = ({ isOpen, onClose }) => {
  const { inventoryService } = useServices();
  const [query, setQuery] = reactExports.useState("");
  const [response, setResponse] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState("");
  const handleSubmit = async (currentQuery) => {
    if (!currentQuery.trim()) return;
    setIsLoading(true);
    setError("");
    setResponse("");
    try {
      const products = await inventoryService.searchInventory("");
      const result = await getInventoryOptimizationSuggestion(currentQuery, products);
      setResponse(result);
    } catch (err) {
      setError("No se pudo obtener la sugerencia. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit(query);
  };
  const renderResponse = (text) => {
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-300">$1</strong>').replace(/\n/g, "<br />");
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-slate-200 whitespace-pre-wrap", dangerouslySetInnerHTML: { __html: formattedText } });
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-2xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Optimizador de Inventario IA" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onClose,
          className: "text-slate-400 hover:text-slate-200 transition-colors",
          "aria-label": "Cerrar",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "h-6 w-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleFormSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ai-inventory-query", className: "block text-sm font-medium text-slate-300 mb-2", children: "Haz una pregunta estratégica sobre tu inventario:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            id: "ai-inventory-query",
            rows: 3,
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: "Ej: ¿Qué productos debería poner en oferta para liquidar stock antiguo?",
            className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 flex-wrap mt-2", children: suggestedQueries.map((q) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => {
          setQuery(q);
          handleSubmit(q);
        }, className: "px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full hover:bg-slate-600", children: q }, q)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "w-full px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-500", children: isLoading ? "Analizando..." : "Obtener Sugerencia" })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm mt-4", children: error }),
    response && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 bg-slate-900/50 p-4 rounded-lg border border-slate-700 max-h-60 overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-100 mb-2", children: "Sugerencia de la IA:" }),
      renderResponse(response)
    ] }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 text-center text-slate-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400 mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: "Analizando datos y generando estrategia..." })
    ] })
  ] }) });
};

export { AIInventoryOptimizer as default };
