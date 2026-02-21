import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { e as useNotification, u as useAuth } from './index-B4F2XZYo.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const formatPaymentMethod = (method) => {
  switch (method) {
    case "efectivo":
      return "Efectivo";
    case "tarjeta":
      return "Tarjeta";
    case "transferencia":
      return "Transferencia";
    case "cheque":
      return "Cheque";
    case "efectivo_factura":
      return "Efectivo (Factura)";
    case "tarjeta_factura":
      return "Tarjeta (Factura)";
    case "cheque_factura":
      return "Cheque (Factura)";
    case "otro":
      return "Otro";
    default:
      return "Desconocido";
  }
};
const ALL_PAYMENT_METHODS = [
  { key: "efectivo", label: "Efectivo" },
  { key: "tarjeta", label: "Tarjeta" },
  { key: "transferencia", label: "Transferencia" },
  { key: "cheque", label: "Cheque" },
  { key: "efectivo_factura", label: "Efectivo (Factura)" },
  { key: "tarjeta_factura", label: "Tarjeta (Factura)" },
  { key: "cheque_factura", label: "Cheque (Factura)" },
  { key: "otro", label: "Otro" }
];
const SaleDetailModal = ({ isOpen, onClose, sale, onSaleUpdated }) => {
  const { saleService } = useServices();
  const { addNotification } = useNotification();
  const { session, hasPermission, requiresPin, checkPinPermission } = useAuth();
  const [isChangingPayment, setIsChangingPayment] = reactExports.useState(false);
  const [showPaymentChangeModal, setShowPaymentChangeModal] = reactExports.useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = reactExports.useState(sale.payments[0]?.method || "efectivo");
  const [currentSale, setCurrentSale] = reactExports.useState(sale);
  reactExports.useEffect(() => {
    setCurrentSale(sale);
    setSelectedPaymentMethod(sale.payments[0]?.method || "efectivo");
  }, [sale]);
  const handleChangePaymentMethod = async () => {
    if (!session) return;
    const permissionKey = "edit_sale_payment";
    if (requiresPin(permissionKey) && !hasPermission(permissionKey)) {
      const pin = prompt("Ingrese el PIN para cambiar el método de pago:");
      if (!pin) return;
      const { isAuthorized } = await checkPinPermission(pin, permissionKey);
      if (!isAuthorized) {
        addNotification("PIN incorrecto o sin permisos", "error");
        return;
      }
    }
    setIsChangingPayment(true);
    try {
      const updatedSale = await saleService.updatePaymentMethod(currentSale.id, selectedPaymentMethod);
      setCurrentSale(updatedSale);
      addNotification("Método de pago actualizado correctamente", "success");
      setShowPaymentChangeModal(false);
      if (onSaleUpdated) {
        onSaleUpdated(updatedSale);
      }
    } catch (error) {
      console.error("Error al cambiar método de pago:", error);
      addNotification(error.message || "Error al cambiar el método de pago", "error");
    } finally {
      setIsChangingPayment(false);
    }
  };
  if (!isOpen) return null;
  const renderDiscountForRow = (item) => {
    if (!item.discount) return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-green-400 ml-2", children: [
      "(-$",
      item.discount.calculatedDiscount.toFixed(2),
      ")"
    ] });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "bg-slate-800 w-full max-w-2xl m-4 rounded-xl shadow-2xl border border-slate-700",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 border-b border-slate-700", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-2xl font-bold text-slate-100", children: [
                  "Detalles del Ticket #",
                  sale.ticketNumber
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
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-sm text-slate-400 mt-2 flex-wrap gap-x-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: new Date(sale.date).toLocaleString() }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  "Vendido por: ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-300", children: sale.employeeName })
                ] }),
                sale.clientName && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  "Cliente: ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-300", children: sale.clientName })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 max-h-[50vh] overflow-y-auto", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-200 mb-3", children: "Artículos Vendidos" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm text-left", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-2 font-medium", children: "Producto" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-2 font-medium text-center", children: "Cant." }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-2 font-medium text-right", children: "Precio Unit." }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-2 font-medium text-right", children: "Subtotal" })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: sale.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700/50", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-3 pr-2 text-slate-100", children: [
                    item.name,
                    item.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-1 font-normal", children: item.description })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 px-2 text-center text-slate-300", children: Math.abs(item.quantity) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-3 px-2 text-right font-mono text-slate-300", children: [
                    "$",
                    item.price.toFixed(2)
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-3 pl-2 text-right font-mono text-slate-100 font-medium", children: [
                    "$",
                    (Math.abs(item.quantity) * item.price).toFixed(2),
                    renderDiscountForRow(item)
                  ] })
                ] }, item.id)) })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 bg-slate-900/50 rounded-b-xl space-y-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-slate-300", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Subtotal" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
                  "$",
                  Math.abs(sale.subtotal).toFixed(2)
                ] })
              ] }),
              sale.totalDiscount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-green-400", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Descuentos Totales" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
                  "-$",
                  Math.abs(sale.totalDiscount).toFixed(2)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-slate-100 font-bold text-lg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Total" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
                  "$",
                  Math.abs(sale.total).toFixed(2)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-3 border-t border-slate-700", children: [
                currentSale.payments.map((payment, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center text-slate-300", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                      "Pago (",
                      formatPaymentMethod(payment.method),
                      ")"
                    ] }),
                    index === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        onClick: () => setShowPaymentChangeModal(true),
                        className: "text-xs px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded",
                        title: "Cambiar método de pago",
                        children: "Editar"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
                    "$",
                    Math.abs(payment.amount).toFixed(2)
                  ] })
                ] }, index)),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-slate-300", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Cambio Devuelto" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-green-400", children: [
                    "$",
                    currentSale.changeGiven.toFixed(2)
                  ] })
                ] })
              ] })
            ] }),
            showPaymentChangeModal && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-md m-4 rounded-xl shadow-2xl border border-slate-700 p-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-4", children: "Cambiar Método de Pago" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Nuevo Método de Pago" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "select",
                    {
                      value: selectedPaymentMethod,
                      onChange: (e) => setSelectedPaymentMethod(e.target.value),
                      className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100",
                      children: ALL_PAYMENT_METHODS.map((method) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: method.key, children: method.label }, method.key))
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: () => setShowPaymentChangeModal(false),
                      className: "px-4 py-2 bg-slate-600 text-slate-200 rounded-md hover:bg-slate-500",
                      children: "Cancelar"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      onClick: handleChangePaymentMethod,
                      disabled: isChangingPayment || selectedPaymentMethod === currentSale.payments[0]?.method,
                      className: "px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed",
                      children: isChangingPayment ? "Guardando..." : "Guardar Cambio"
                    }
                  )
                ] })
              ] })
            ] }) })
          ]
        }
      )
    }
  );
};

export { SaleDetailModal as default };
