import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices, s as segmentClients } from './MainLayout-C0Ev0ilC.js';
import './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const AIClientSegmentation = ({ isOpen, onClose, onCreateCampaign }) => {
  const { clientService } = useServices();
  const [segments, setSegments] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState("");
  const [hasAnalyzed, setHasAnalyzed] = reactExports.useState(false);
  const handleAnalyze = async () => {
    setIsLoading(true);
    setError("");
    setSegments([]);
    try {
      const clients = await clientService.getAllClients();
      if (clients.length < 5) {
        setError("Necesitas al menos 5 clientes para un análisis significativo.");
        setIsLoading(false);
        return;
      }
      const result = await segmentClients(clients);
      const parsedResult = JSON.parse(result);
      setSegments(parsedResult);
      setHasAnalyzed(true);
    } catch (err) {
      setError("No se pudo completar el análisis. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };
  reactExports.useEffect(() => {
    if (!isOpen) {
      setSegments([]);
      setHasAnalyzed(false);
      setError("");
    }
  }, [isOpen]);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-2xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Segmentación de Clientes con IA" }),
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
    !hasAnalyzed ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-300 mb-6", children: "Usa la IA para analizar tu base de clientes y encontrar grupos clave para tus campañas de marketing." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleAnalyze, disabled: isLoading, className: "px-6 py-3 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-500 disabled:bg-slate-500", children: isLoading ? "Analizando..." : "Analizar Clientes" })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-200 mb-3", children: "Segmentos Identificados:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: segments.map((segment, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-700/50 p-4 rounded-md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-bold text-sky-300", children: segment.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-300 my-1", children: segment.description }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onCreateCampaign(segment.name), className: "text-xs font-semibold text-green-400 hover:text-green-300", children: "+ Crear Campaña para este Segmento" })
      ] }, index)) })
    ] }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 text-center text-slate-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400 mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: "Procesando datos de clientes..." })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm mt-4 text-center", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end pt-4 mt-4 border-t border-slate-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500", children: "Cerrar" }) })
  ] }) });
};

export { AIClientSegmentation as default };
