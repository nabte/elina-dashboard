import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';

const SummaryRow = ({ label, amount, positive = true }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-sm py-1.5 border-b border-slate-700/50", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400", children: label }),
  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-slate-200", children: [
    positive ? "+" : "-",
    " $",
    amount.toFixed(2)
  ] })
] });
const CloseRegisterModal = ({ isOpen, onClose, onConfirm, summary }) => {
  const [countedAmount, setCountedAmount] = reactExports.useState("");
  const [step, setStep] = reactExports.useState(1);
  const numericCountedAmount = reactExports.useMemo(() => parseFloat(countedAmount), [countedAmount]);
  const difference = reactExports.useMemo(() => {
    if (isNaN(numericCountedAmount)) {
      return 0;
    }
    return numericCountedAmount - (summary.expectedInDrawer ?? 0);
  }, [numericCountedAmount, summary.expectedInDrawer]);
  const canConfirm = reactExports.useMemo(() => {
    return !isNaN(numericCountedAmount) && numericCountedAmount >= 0;
  }, [numericCountedAmount]);
  reactExports.useEffect(() => {
    if (!isOpen) {
      setCountedAmount("");
      setStep(1);
    }
  }, [isOpen]);
  const handleContinue = () => {
    if (canConfirm) {
      setStep(2);
    }
  };
  const handleConfirmClick = () => {
    if (canConfirm) {
      onConfirm(numericCountedAmount);
    }
  };
  const differenceColor = difference < 0 ? "text-red-400" : difference > 0 ? "text-green-400" : "text-slate-300";
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "bg-slate-800 w-full max-w-md m-4 p-8 rounded-xl shadow-2xl border border-slate-700 transform transition-all",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold text-center text-white flex-1", children: "Cerrar Caja" }),
              step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: onClose,
                  className: "text-slate-400 hover:text-slate-200 transition-colors ml-4",
                  "aria-label": "Cerrar",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "h-6 w-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
                }
              )
            ] }),
            step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-400", children: "Antes de ver el resumen, por favor, cuenta todo el efectivo en el cajón e ingresa el total." }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "counted-amount-blind", className: "block text-sm font-medium text-slate-300 mb-2", children: "Monto Contado en Caja" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xl", children: "$" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "counted-amount-blind",
                      type: "number",
                      value: countedAmount,
                      onChange: (e) => setCountedAmount(e.target.value),
                      placeholder: "0.00",
                      className: "w-full pl-8 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-md text-slate-100 text-2xl focus:outline-none focus:ring-2 focus:ring-sky-500",
                      autoFocus: true
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 grid grid-cols-2 gap-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: onClose,
                    className: "w-full px-4 py-3 text-lg font-semibold text-slate-200 bg-slate-600/80 rounded-md hover:bg-slate-600 transition-colors",
                    children: "Cancelar"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: handleContinue,
                    disabled: !canConfirm,
                    className: "w-full px-4 py-3 text-lg font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed",
                    children: "Continuar"
                  }
                )
              ] })
            ] }),
            step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900/50 p-4 rounded-md space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Fondo Inicial", amount: summary.startAmount ?? 0 }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Ventas Netas en Efectivo", amount: summary.netCashSales ?? 0 }),
                (summary.cashReturns ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Devoluciones en Efectivo", amount: summary.cashReturns ?? 0, positive: false }),
                (summary.ingresos ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Ingresos de Caja", amount: summary.ingresos ?? 0 }),
                (summary.egresos ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryRow, { label: "Egresos de Caja", amount: summary.egresos ?? 0, positive: false }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between pt-2 mt-2 border-t-2 border-slate-600", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-slate-200", children: "Esperado en Caja:" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono font-bold text-sky-400 text-lg", children: [
                    "$",
                    (summary.expectedInDrawer ?? 0).toFixed(2)
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "counted-amount-confirm", className: "block text-sm font-medium text-slate-300 mb-2", children: "Confirmar Monto Contado (Oficial)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xl", children: "$" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "counted-amount-confirm",
                      type: "number",
                      value: countedAmount,
                      onChange: (e) => setCountedAmount(e.target.value),
                      placeholder: "0.00",
                      className: "w-full pl-8 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-md text-slate-100 text-2xl focus:outline-none focus:ring-2 focus:ring-sky-500",
                      autoFocus: true
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900/50 p-4 rounded-md text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400", children: "Diferencia:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: `text-3xl font-mono font-bold ${differenceColor}`, children: [
                  difference >= 0 ? "+" : "",
                  "$",
                  difference.toFixed(2)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-center text-amber-400 pt-2", children: "Para garantizar la integridad del cierre, no se puede cancelar en este punto. Por favor, revise los montos y confirme el cierre." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 grid grid-cols-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: handleConfirmClick,
                  disabled: !canConfirm,
                  className: "w-full px-4 py-3 text-lg font-semibold text-white bg-amber-600 rounded-md hover:bg-amber-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed",
                  children: "Confirmar y Cerrar Caja"
                }
              ) })
            ] })
          ]
        }
      )
    }
  );
};

export { CloseRegisterModal as default };
