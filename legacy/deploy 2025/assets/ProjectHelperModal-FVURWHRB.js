import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices, m as getProjectRecommendations } from './MainLayout-C0Ev0ilC.js';
import './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const ProjectHelperModal = ({ isOpen, onClose, onAddToCart }) => {
  const { inventoryService } = useServices();
  const [problem, setProblem] = reactExports.useState("");
  const [recommendations, setRecommendations] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!problem.trim()) return;
    setIsLoading(true);
    setError("");
    setRecommendations([]);
    try {
      const result = await getProjectRecommendations(problem);
      const parsedResult = JSON.parse(result);
      setRecommendations(parsedResult);
    } catch (err) {
      setError("No se pudieron obtener recomendaciones. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleAddRecommended = async (recommendation) => {
    const searchResults = await inventoryService.searchInventory(recommendation);
    if (searchResults.length > 0) {
      onAddToCart(searchResults[0]);
    } else {
      alert(`No se encontró un producto exacto para "${recommendation}". Búscalo manualmente.`);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Asistente de Proyectos IA" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "problem-description", className: "block text-sm font-medium text-slate-300 mb-2", children: "Describe el problema o proyecto del cliente:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            id: "problem-description",
            rows: 3,
            value: problem,
            onChange: (e) => setProblem(e.target.value),
            placeholder: "Ej: 'Mi llave del lavabo gotea y quiero cambiarla', 'Necesito colgar un cuadro pesado en una pared de concreto'...",
            className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "w-full px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-500", children: isLoading ? "Pensando..." : "Obtener Recomendaciones" })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm mt-4", children: error }),
    recommendations.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-200 mb-2", children: "Productos Recomendados:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2 max-h-60 overflow-y-auto pr-2", children: recommendations.map((item, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex justify-between items-center bg-slate-700/50 p-3 rounded-md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-100", children: item }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleAddRecommended(item), className: "text-sm font-semibold text-green-400 hover:text-green-300", children: "+ Agregar" })
      ] }, index)) })
    ] })
  ] }) });
};

export { ProjectHelperModal as default };
