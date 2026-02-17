import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';

const CashMovementModal = ({ isOpen, onClose, onConfirm }) => {
  const [type, setType] = reactExports.useState("egreso");
  const [amount, setAmount] = reactExports.useState("");
  const [reason, setReason] = reactExports.useState("");
  const [error, setError] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (!isOpen) {
      setType("egreso");
      setAmount("");
      setReason("");
      setError("");
    }
  }, [isOpen]);
  const handleSubmit = (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("El monto debe ser un número positivo.");
      return;
    }
    if (!reason.trim()) {
      setError("Debe especificar una razón para el movimiento.");
      return;
    }
    setError("");
    onConfirm(type, numericAmount, reason);
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Registrar Movimiento de Caja" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Tipo de Movimiento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setType("egreso"),
              className: `px-4 py-3 font-semibold rounded-md border-2 ${type === "egreso" ? "bg-red-600/80 border-red-500 text-white" : "bg-slate-700 border-slate-600 hover:bg-slate-600"}`,
              children: "Egreso (Salida de Dinero)"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setType("ingreso"),
              className: `px-4 py-3 font-semibold rounded-md border-2 ${type === "ingreso" ? "bg-green-600/80 border-green-500 text-white" : "bg-slate-700 border-slate-600 hover:bg-slate-600"}`,
              children: "Ingreso (Entrada de Dinero)"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "movement-amount", className: "block text-sm font-medium text-slate-300 mb-2", children: "Monto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400", children: "$" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "movement-amount",
              type: "number",
              value: amount,
              onChange: (e) => setAmount(e.target.value),
              placeholder: "0.00",
              className: "w-full pl-7 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500",
              autoFocus: true,
              required: true
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "movement-reason", className: "block text-sm font-medium text-slate-300 mb-2", children: "Razón / Concepto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            id: "movement-reason",
            type: "text",
            value: reason,
            onChange: (e) => setReason(e.target.value),
            placeholder: type === "egreso" ? "Ej: Pago a proveedor, retiro" : "Ej: Fondo extra de caja",
            className: "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500",
            required: true
          }
        )
      ] }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex justify-end gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors", children: "Confirmar Movimiento" })
      ] })
    ] })
  ] }) });
};

export { CashMovementModal as default };
