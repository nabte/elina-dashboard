import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const ClientLoyaltyLogModal = ({ isOpen, onClose, client }) => {
  const { clientService } = useServices();
  const [logs, setLogs] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (isOpen) {
      const fetchLogs = async () => {
        setIsLoading(true);
        try {
          const data = await clientService.getLoyaltyLogs(client.id);
          setLogs(data);
        } catch (error) {
          console.error("Failed to fetch loyalty logs", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchLogs();
    }
  }, [isOpen, client.id, clientService]);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-2xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: "Historial de Lealtad" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-400 mb-4", children: [
      "Cliente: ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-sky-300", children: client.name })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-96 overflow-y-auto pr-2", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-400", children: "Cargando historial..." }) : logs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-400 py-8", children: "Este cliente no tiene movimientos de puntos." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-2", children: "Fecha" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-2", children: "Tipo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-2", children: "Notas" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-2", children: "Puntos" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: logs.map((log) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: new Date(log.date).toLocaleDateString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `py-2 capitalize font-semibold ${log.type === "earned" ? "text-green-400" : "text-red-400"}`, children: log.type === "earned" ? "Ganados" : "Canjeados" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 text-slate-300", children: log.notes }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `py-2 text-right font-mono ${log.points > 0 ? "text-green-400" : "text-red-400"}`, children: log.points > 0 ? `+${log.points}` : log.points })
      ] }, log.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end pt-4 mt-4 border-t border-slate-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "px-4 py-2 bg-slate-600 rounded", children: "Cerrar" }) })
  ] }) });
};

export { ClientLoyaltyLogModal as default };
