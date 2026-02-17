import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useAuth, g as getLocalStorageItem, d as setLocalStorageItem } from './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const allPaymentInputs = [
  { key: "efectivo", label: "Efectivo" },
  { key: "tarjeta", label: "Tarjeta" },
  { key: "transferencia", label: "Transferencia" },
  { key: "cheque", label: "Cheque" },
  { key: "efectivo_factura", label: "Efectivo (Factura)" },
  { key: "tarjeta_factura", label: "Tarjeta (Factura)" },
  { key: "cheque_factura", label: "Cheque (Factura)" },
  { key: "otro", label: "Otro" }
];
const DEFAULT_ENABLED_METHODS = ["efectivo", "tarjeta", "transferencia"];
const CheckoutModal = ({ isOpen, onClose, onConfirm, total, client, loyaltySettings }) => {
  const { session, updateOrganizationData } = useAuth();
  const [paymentAmounts, setPaymentAmounts] = reactExports.useState({
    efectivo: "",
    tarjeta: "",
    transferencia: "",
    cheque: "",
    efectivo_factura: "",
    tarjeta_factura: "",
    cheque_factura: "",
    otro: "",
    credito: ""
  });
  const [pointsToRedeem, setPointsToRedeem] = reactExports.useState("");
  const [usePoints, setUsePoints] = reactExports.useState(false);
  const printerSettings = session?.organization?.printerSettings;
  const printerOptions = printerSettings?.availablePrinters ?? [];
  const defaultPrinterId = printerSettings?.defaultPrinterId || "browser-default";
  const getInitialPrinterId = () => {
    try {
      const stored = getLocalStorageItem("selectedPrinterId");
      if (stored) {
        console.log("[CheckoutModal] 🚀 Inicializando con impresora desde localStorage:", stored);
        return stored;
      }
    } catch (error) {
      console.error("[CheckoutModal] Error al leer localStorage al inicializar:", error);
    }
    return defaultPrinterId;
  };
  const [selectedPrinterId, setSelectedPrinterId] = reactExports.useState(getInitialPrinterId());
  reactExports.useEffect(() => {
    const checkStorage = () => {
      const stored = getLocalStorageItem("selectedPrinterId");
      if (stored) {
        setSelectedPrinterId((prev) => {
          if (prev !== stored) {
            console.log("[CheckoutModal] 🔄 Detectado cambio en localStorage. Actualizando de", prev, "a", stored);
            return stored;
          }
          return prev;
        });
      }
    };
    checkStorage();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("[CheckoutModal] 👁️ Página visible, verificando localStorage...");
        checkStorage();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  reactExports.useEffect(() => {
    if (!isOpen) return;
    const stored = getLocalStorageItem("selectedPrinterId");
    console.log("[CheckoutModal] 🔍 Restaurando impresora. localStorage:", stored, "Supabase default:", defaultPrinterId, "Opciones:", printerOptions.map((p) => p.id));
    let printerToUse = defaultPrinterId;
    if (stored) {
      if (stored === "browser-default" || printerOptions.some((p) => p.id === stored)) {
        printerToUse = stored;
        console.log("[CheckoutModal] ✅ Impresora restaurada desde localStorage:", stored);
      } else {
        console.log("[CheckoutModal] ⚠️ Impresora en localStorage ya no está disponible");
      }
    }
    if (printerToUse === defaultPrinterId && defaultPrinterId !== "browser-default") {
      console.log("[CheckoutModal] ℹ️ Usando impresora por defecto de Supabase:", defaultPrinterId);
    }
    setSelectedPrinterId((prev) => {
      if (prev !== printerToUse) {
        console.log("[CheckoutModal] 🔄 Actualizando impresora seleccionada de", prev, "a", printerToUse);
        return printerToUse;
      }
      return prev;
    });
  }, [isOpen, defaultPrinterId, printerOptions.length]);
  reactExports.useEffect(() => {
    if (selectedPrinterId && session?.organization) {
      setLocalStorageItem("selectedPrinterId", selectedPrinterId);
      const timeoutId = setTimeout(async () => {
        if (!session?.organization || !updateOrganizationData) return;
        try {
          const currentSettings = session.organization.printerSettings || { availablePrinters: [] };
          await updateOrganizationData({
            printerSettings: {
              ...currentSettings,
              defaultPrinterId: selectedPrinterId
            }
          });
          console.log("[CheckoutModal] ✅ Impresora guardada automáticamente en Supabase:", selectedPrinterId);
        } catch (error) {
          console.error("[CheckoutModal] ❌ ERROR: No se pudo guardar en Supabase:", error);
        }
      }, 1e3);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedPrinterId, session?.organization?.id, updateOrganizationData]);
  const paymentInputs = reactExports.useMemo(() => {
    const enabledMethods = session?.organization?.enabledPaymentMethods || DEFAULT_ENABLED_METHODS;
    const lookup = new Map(allPaymentInputs.map((entry) => [entry.key, entry]));
    return enabledMethods.map((method) => lookup.get(method) ?? { key: method, label: method }).filter((entry) => !!entry);
  }, [session]);
  const pointsValue = reactExports.useMemo(() => {
    if (!usePoints) return 0;
    const points = parseInt(pointsToRedeem, 10) || 0;
    return points * loyaltySettings.redemptionValuePerPoint;
  }, [pointsToRedeem, loyaltySettings.redemptionValuePerPoint, usePoints]);
  const totalAfterPoints = reactExports.useMemo(() => Math.max(0, total - pointsValue), [total, pointsValue]);
  const totalPaid = reactExports.useMemo(() => {
    return Object.values(paymentAmounts).reduce((sum, amount) => sum + (parseFloat(String(amount)) || 0), 0);
  }, [paymentAmounts]);
  const remaining = reactExports.useMemo(() => totalAfterPoints - totalPaid, [totalAfterPoints, totalPaid]);
  const change = reactExports.useMemo(() => {
    const cashAmount = parseFloat(paymentAmounts.efectivo) || 0;
    const totalWithoutCash = totalPaid - cashAmount;
    const cashNeeded = totalAfterPoints - totalWithoutCash;
    if (cashAmount > cashNeeded) {
      return cashAmount - cashNeeded;
    }
    return 0;
  }, [paymentAmounts, totalAfterPoints, totalPaid]);
  const canConfirm = reactExports.useMemo(() => totalPaid >= totalAfterPoints && total > 0, [totalPaid, totalAfterPoints, total]);
  const maxRedeemablePoints = reactExports.useMemo(() => {
    if (!client || !loyaltySettings.enabled) return 0;
    const maxPointsForTotal = Math.floor(total / loyaltySettings.redemptionValuePerPoint);
    return Math.min(client.loyaltyPoints, maxPointsForTotal);
  }, [client, total, loyaltySettings]);
  const availableCredit = reactExports.useMemo(() => {
    if (!client || !client.has_credit || !client.credit_limit) return 0;
    return client.credit_limit - (client.current_debt || 0);
  }, [client]);
  reactExports.useEffect(() => {
    if (!isOpen) {
      setPaymentAmounts({ efectivo: "", tarjeta: "", transferencia: "", cheque: "", efectivo_factura: "", tarjeta_factura: "", cheque_factura: "", otro: "", credito: "" });
      setPointsToRedeem("");
      setUsePoints(false);
    }
  }, [isOpen]);
  const handleAmountChange = (method, value) => {
    setPaymentAmounts((prev) => ({ ...prev, [method]: value }));
  };
  const handlePointsChange = (value) => {
    const points = parseInt(value, 10);
    if (isNaN(points)) {
      setPointsToRedeem("");
      return;
    }
    const validatedPoints = Math.max(0, Math.min(points, maxRedeemablePoints));
    setPointsToRedeem(validatedPoints.toString());
  };
  const handleConfirmClick = () => {
    if (!canConfirm) return;
    const payments = Object.entries(paymentAmounts).map(([method, amountStr]) => ({
      method,
      amount: parseFloat(String(amountStr)) || 0
    })).filter((p) => p.amount > 0);
    onConfirm(payments, change, usePoints ? parseInt(pointsToRedeem, 10) || 0 : 0, selectedPrinterId || void 0);
  };
  const handleMaxAmount = (method) => {
    if (remaining > 0) {
      handleAmountChange(method, (remaining + (parseFloat(paymentAmounts[method]) || 0)).toFixed(2));
    }
  };
  const handlePayWithCredit = () => {
    if (total > 0 && availableCredit >= total) {
      onConfirm([{ method: "credito", amount: total }], 0, 0);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "bg-slate-800 w-full max-w-lg p-4 rounded-xl shadow-2xl border border-slate-700 transform transition-all",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-center text-white flex-1", children: "Procesar Pago" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: onClose,
                  className: "text-slate-400 hover:text-slate-200 transition-colors ml-2",
                  "aria-label": "Cerrar",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "h-6 w-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center mb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: "Total a Pagar:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-3xl font-mono font-bold text-sky-400", children: [
                "$",
                total.toFixed(2)
              ] })
            ] }),
            client && loyaltySettings.enabled && client.loyaltyPoints > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 p-2 bg-amber-900/50 border border-amber-700 rounded-md", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: usePoints, onChange: (e) => setUsePoints(e.target.checked), className: "form-checkbox h-4 w-4 bg-slate-700 text-sky-500 rounded" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-amber-300", children: "Usar Puntos de Lealtad" })
              ] }),
              usePoints && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "points-redeem",
                      type: "number",
                      value: pointsToRedeem,
                      onChange: (e) => handlePointsChange(e.target.value),
                      placeholder: "0",
                      min: "0",
                      max: maxRedeemablePoints,
                      className: "w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-sm"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handlePointsChange(maxRedeemablePoints.toString()), className: "px-2 py-1.5 bg-slate-600 text-slate-200 text-xs font-semibold rounded-md hover:bg-slate-500", children: "MAX" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-amber-400 mt-1", children: [
                  "Disponibles: ",
                  client.loyaltyPoints.toLocaleString(),
                  " pts · Valor: ",
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
                    "$",
                    pointsValue.toFixed(2)
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2 mb-3", children: paymentInputs.map(({ key, label }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: `amount-${key}`, className: "block text-xs uppercase tracking-wide text-slate-400", children: label }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-grow", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 left-0 pl-2 flex items-center text-xs text-slate-400", children: "$" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: `amount-${key}`,
                      type: "number",
                      value: paymentAmounts[key],
                      onChange: (e) => handleAmountChange(key, e.target.value),
                      placeholder: "0.00",
                      className: "w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-600 rounded-md text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleMaxAmount(key), className: "px-2 py-1.5 bg-slate-600 text-slate-200 text-xs font-semibold rounded-md hover:bg-slate-500 whitespace-nowrap", children: "MAX" })
              ] })
            ] }, key)) }),
            client && client.has_credit && total > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: handlePayWithCredit,
                disabled: availableCredit < total,
                className: "w-full p-2 bg-sky-800 text-white rounded-md hover:bg-sky-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-sm",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Pagar con Crédito" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs block", children: availableCredit >= total ? `Disponible: $${availableCredit.toFixed(2)}` : `Insuficiente: $${availableCredit.toFixed(2)}` })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 space-y-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between p-2 bg-slate-700/50 rounded-md", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-slate-300", children: "Total Pagado:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono font-bold text-base text-slate-100", children: [
                  "$",
                  totalPaid.toFixed(2)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between p-2 bg-slate-900/50 rounded-md", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-slate-300", children: "Restante:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-mono font-bold text-base ${remaining > 0 ? "text-red-400" : "text-green-400"}`, children: [
                  "$",
                  remaining.toFixed(2)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between p-2 bg-slate-700/50 rounded-md", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-slate-300", children: "Cambio:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono font-bold text-base text-green-400", children: [
                  "$",
                  change.toFixed(2)
                ] })
              ] })
            ] }),
            (printerSettings || printerOptions.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 border border-slate-700 rounded-lg p-2 space-y-1.5 bg-slate-900/40", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-slate-200", children: "Impresora" }),
                printerSettings?.autoPrintTickets && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-emerald-400 font-semibold uppercase", children: "Auto" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  value: selectedPrinterId,
                  onChange: (e) => setSelectedPrinterId(e.target.value),
                  className: "w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-100",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "browser-default", children: "Diálogo del navegador" }),
                    printerOptions.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: option.id, children: [
                      option.name,
                      " · ",
                      option.type === "network" ? "Red/Bluetooth" : option.type === "pdf" ? "PDF" : "Sistema"
                    ] }, option.id))
                  ]
                }
              ),
              selectedPrinterId && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-slate-400 mt-1", children: selectedPrinterId === "browser-default" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Usando: Diálogo del navegador (selección manual al imprimir)" }) : (() => {
                const selectedPrinter = printerOptions.find((p) => p.id === selectedPrinterId);
                if (selectedPrinter) {
                  return `Seleccionada: ${selectedPrinter.name} (${selectedPrinter.type === "network" ? "Red/Bluetooth" : selectedPrinter.type === "pdf" ? "PDF" : "Sistema"})`;
                }
                return `ID guardado: ${selectedPrinterId} (no disponible actualmente)`;
              })() })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: onClose,
                  className: "w-full px-3 py-2 text-sm font-semibold text-slate-200 bg-slate-600/80 rounded-md hover:bg-slate-600 transition-colors",
                  children: "Cancelar"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: handleConfirmClick,
                  disabled: !canConfirm,
                  className: "w-full px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed",
                  children: "Confirmar Pago"
                }
              )
            ] })
          ]
        }
      )
    }
  );
};

export { CheckoutModal as default };
