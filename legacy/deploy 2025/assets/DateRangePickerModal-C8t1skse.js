import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';

const DateRangePickerModal = ({ isOpen, onClose, onApply }) => {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [startDate, setStartDate] = reactExports.useState(today);
  const [endDate, setEndDate] = reactExports.useState(today);
  const handleApply = () => {
    const start = /* @__PURE__ */ new Date(startDate + "T00:00:00");
    const end = /* @__PURE__ */ new Date(endDate + "T23:59:59");
    if (start > end) {
      alert("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }
    onApply(start, end);
    onClose();
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-md m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: "Seleccionar Rango de Fechas" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "start-date", className: "block text-sm font-medium text-slate-300 mb-1", children: "Fecha de Inicio" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "date",
            id: "start-date",
            value: startDate,
            onChange: (e) => setStartDate(e.target.value),
            className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "end-date", className: "block text-sm font-medium text-slate-300 mb-1", children: "Fecha de Fin" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "date",
            id: "end-date",
            value: endDate,
            onChange: (e) => setEndDate(e.target.value),
            className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-6 mt-4 border-t border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500", children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleApply, className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500", children: "Aplicar" })
    ] })
  ] }) });
};

export { DateRangePickerModal as D };
