import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { e as useNotification } from './index-B4F2XZYo.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const SummaryRow = ({ label, amount, isNegative = false, isTotal = false, color }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex justify-between py-1.5 ${isTotal ? "font-bold text-lg border-t-2 border-slate-600 mt-2 pt-2" : "text-sm border-b border-slate-700/50"}`, children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: isTotal ? "text-slate-100" : "text-slate-400", children: label }),
  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-mono ${color || (isTotal ? "text-sky-400" : "text-slate-200")}`, children: [
    isNegative ? "-" : amount > 0 && !isTotal ? "+" : "",
    " $",
    Math.abs(amount).toFixed(2)
  ] })
] });
const SessionDetailModal = ({ isOpen, onClose, session }) => {
  const { cashRegisterService } = useServices();
  const [details, setDetails] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [activeTab, setActiveTab] = reactExports.useState("summary");
  reactExports.useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [fullDetails, summary] = await Promise.all([
            cashRegisterService.getFullSessionDetails(session.id),
            cashRegisterService.getSessionDetails(session.id)
          ]);
          setDetails({ ...fullDetails, summary });
        } catch (e) {
          console.error("Failed to fetch session details:", e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, session.id, cashRegisterService]);
  if (!isOpen) return null;
  const difference = session.difference ?? 0;
  const differenceColor = difference < 0 ? "text-red-400" : difference > 0 ? "text-green-400" : "text-slate-300";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-4xl m-4 rounded-xl shadow-2xl border border-slate-700 flex flex-col", style: { height: "calc(100vh - 4rem)" }, onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-slate-700 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-xl font-bold text-slate-100", children: [
          "Detalles de Sesión: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-sky-400", children: session.id })
        ] }),
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-slate-400", children: [
        "Operado por: ",
        session.employeeName
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-grow p-4 overflow-y-auto", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-400", children: "Cargando detalles..." }) : !details ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-red-400", children: "No se pudieron cargar los detalles." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 h-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-1 bg-slate-900/50 p-4 rounded-lg space-y-1 h-full overflow-y-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-lg mb-2 text-slate-200", children: "Resumen Financiero" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Fondo Inicial", amount: details.summary.startAmount ?? 0 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Ventas en Efectivo", amount: details.summary.netCashSales ?? 0 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Devoluciones en Efectivo", amount: details.summary.cashReturns ?? 0, isNegative: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Ingresos de Caja", amount: details.summary.ingresos ?? 0 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Egresos de Caja", amount: details.summary.egresos ?? 0, isNegative: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Esperado en Caja", amount: details.summary.expectedInDrawer ?? 0, isTotal: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Monto Contado", amount: session.countedAmount ?? 0, isTotal: true, color: "text-slate-100" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Diferencia", amount: session.difference ?? 0, isTotal: true, color: differenceColor })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2 flex flex-col h-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex border-b border-slate-700 mb-2 flex-shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setActiveTab("sales"), className: `px-4 py-2 text-sm font-semibold ${activeTab === "sales" ? "border-b-2 border-sky-400 text-sky-300" : "text-slate-400"}`, children: [
            "Ventas (",
            details.sales.filter((s) => s.type === "sale").length,
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setActiveTab("movements"), className: `px-4 py-2 text-sm font-semibold ${activeTab === "movements" ? "border-b-2 border-sky-400 text-sky-300" : "text-slate-400"}`, children: [
            "Movimientos (",
            details.movements.length,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-grow overflow-y-auto", children: [
          activeTab === "sales" && /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-1", children: "Ticket" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-1", children: "Hora" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-1", children: "Cliente" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-1", children: "Total" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: details.sales.map((sale) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: `border-b border-slate-700/50 ${sale.type === "return" ? "text-red-400" : "text-slate-300"}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-2 font-mono", children: [
                "#",
                sale.ticketNumber,
                sale.type === "return" && " (DEV)"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: new Date(sale.date).toLocaleTimeString() }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: sale.clientName || "N/A" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-2 text-right font-mono", children: [
                "$",
                sale.total.toFixed(2)
              ] })
            ] }, sale.id)) })
          ] }),
          activeTab === "movements" && /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-1", children: "Hora" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-1", children: "Tipo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-1", children: "Razón" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-1", children: "Monto" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: details.movements.map((mov) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: `border-b border-slate-700/50 ${mov.type === "egreso" ? "text-amber-400" : "text-green-400"}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: new Date(mov.date).toLocaleTimeString() }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 capitalize font-semibold", children: mov.type }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: mov.reason }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-2 text-right font-mono", children: [
                "$",
                mov.amount.toFixed(2)
              ] })
            ] }, mov.id)) })
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 bg-slate-900/50 rounded-b-xl flex justify-end flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "px-4 py-2 bg-slate-600 font-semibold rounded-md hover:bg-slate-500", children: "Cerrar" }) })
  ] }) });
};

const CashRegisterReportsPage = () => {
  const { cashRegisterService } = useServices();
  const { addNotification } = useNotification();
  const [sessions, setSessions] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [selectedSession, setSelectedSession] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const sessionsData = await cashRegisterService.getAllSessions();
        setSessions(sessionsData);
      } catch (err) {
        setError("No se pudieron cargar las sesiones de caja.");
        addNotification("Error al cargar las sesiones de caja.", "error");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [cashRegisterService, addNotification]);
  const renderDifference = (difference) => {
    if (difference == null) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-500", children: "—" });
    const isNegative = difference < 0;
    const isPositive = difference > 0;
    const colorClass = isNegative ? "text-red-400" : isPositive ? "text-green-400" : "text-slate-300";
    const sign = isPositive ? "+" : "";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-semibold ${colorClass}`, children: [
      sign,
      "$",
      difference.toFixed(2)
    ] });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100 mb-4", children: "Reporte de Sesiones de Caja" }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando sesiones..." }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-red-400", children: error }),
    !isLoading && !error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Operador" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Inicio" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Fin" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Monto Inicial" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Monto Esperado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Monto Contado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Diferencia" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Estado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Acciones" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: sessions.map((session) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-100", children: session.employeeName || "Sin asignar" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: new Date(session.startTime).toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: session.endTime ? new Date(session.endTime).toLocaleString() : "N/A" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4 text-right font-mono", children: [
          "$",
          (session.startAmount ?? 0).toFixed(2)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-mono", children: session.expectedInDrawer != null ? `$${session.expectedInDrawer.toFixed(2)}` : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-500", children: "—" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-mono", children: session.countedAmount != null ? `$${session.countedAmount.toFixed(2)}` : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-500", children: "—" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-mono", children: renderDifference(session.difference) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 py-1 text-xs font-semibold rounded-full capitalize ${session.status === "open" ? "bg-green-800 text-green-200" : "bg-slate-600 text-slate-200"}`, children: session.status }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setSelectedSession(session),
            className: "text-sky-400 hover:text-sky-300 font-medium",
            children: "Ver Detalles"
          }
        ) })
      ] }, session.id)) })
    ] }) }),
    sessions.length === 0 && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No se encontraron sesiones de caja." }),
    selectedSession && /* @__PURE__ */ jsxRuntimeExports.jsx(
      SessionDetailModal,
      {
        isOpen: !!selectedSession,
        onClose: () => setSelectedSession(null),
        session: selectedSession
      }
    )
  ] });
};

export { CashRegisterReportsPage as default };
