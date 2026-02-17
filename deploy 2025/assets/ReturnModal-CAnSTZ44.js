import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';

const ReturnModal = ({ isOpen, onClose, onFindSale, onProcessReturn }) => {
  const [ticketNumber, setTicketNumber] = reactExports.useState("");
  const [foundSale, setFoundSale] = reactExports.useState(null);
  const [itemsToReturn, setItemsToReturn] = reactExports.useState(/* @__PURE__ */ new Map());
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const resetState = () => {
    setTicketNumber("");
    setFoundSale(null);
    setItemsToReturn(/* @__PURE__ */ new Map());
    setIsLoading(false);
    setError(null);
  };
  const handleClose = () => {
    resetState();
    onClose();
  };
  const handleFindSale = async (e) => {
    e.preventDefault();
    const numTicket = parseInt(ticketNumber, 10);
    if (isNaN(numTicket)) {
      setError("Por favor, ingrese un número de ticket válido.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setFoundSale(null);
    const sale = await onFindSale(numTicket);
    if (sale) {
      setFoundSale(sale);
      const initialReturnMap = /* @__PURE__ */ new Map();
      sale.items.forEach((item) => initialReturnMap.set(item.id, 0));
      setItemsToReturn(initialReturnMap);
    } else {
      setError(`No se encontró la venta con el ticket #${ticketNumber}.`);
    }
    setIsLoading(false);
  };
  const handleQuantityChange = (itemId, newQuantity, maxQuantity) => {
    const validatedQuantity = Math.max(0, Math.min(newQuantity, maxQuantity));
    setItemsToReturn((prev) => new Map(prev).set(itemId, validatedQuantity));
  };
  const handleProcessReturn = async () => {
    if (!foundSale) return;
    const finalItemsToReturn = [];
    itemsToReturn.forEach((quantity, itemId) => {
      if (quantity > 0) {
        const originalItem = foundSale.items.find((i) => i.id === itemId);
        if (originalItem) {
          finalItemsToReturn.push({ ...originalItem, quantity });
        }
      }
    });
    if (finalItemsToReturn.length === 0) {
      alert("Debe seleccionar al menos un artículo para devolver.");
      return;
    }
    setIsLoading(true);
    const success = await onProcessReturn(foundSale, finalItemsToReturn);
    setIsLoading(false);
    if (success) {
      handleClose();
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-2xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Procesar Devolución" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: handleClose,
          className: "text-slate-400 hover:text-slate-200 transition-colors",
          "aria-label": "Cerrar",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "h-6 w-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
        }
      )
    ] }),
    !foundSale ? /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleFindSale, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400", children: "Ingrese el número de ticket de la venta original para buscar los artículos." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ticket-number", className: "block text-sm font-medium text-slate-300 mb-1", children: "Número de Ticket" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            id: "ticket-number",
            type: "number",
            value: ticketNumber,
            onChange: (e) => setTicketNumber(e.target.value),
            className: "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500",
            autoFocus: true,
            required: true
          }
        )
      ] }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading || !ticketNumber, className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-500", children: isLoading ? "Buscando..." : "Buscar Venta" })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-semibold text-slate-200 mb-2", children: [
        "Artículos del Ticket #",
        foundSale.ticketNumber
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400 mb-4", children: "Seleccione la cantidad a devolver de cada artículo." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3 max-h-60 overflow-y-auto pr-2", children: foundSale.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center bg-slate-700/50 p-3 rounded-md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-slate-100", children: item.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-400", children: [
            "Comprados: ",
            item.quantity
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: `return-qty-${item.id}`, className: "text-sm text-slate-300", children: "Devolver:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: `return-qty-${item.id}`,
              type: "number",
              min: "0",
              max: item.quantity,
              value: itemsToReturn.get(item.id) || 0,
              onChange: (e) => handleQuantityChange(item.id, parseInt(e.target.value, 10), item.quantity),
              className: "w-20 text-center bg-slate-900 border border-slate-600 rounded-md p-1"
            }
          )
        ] })
      ] }, item.id)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4 mt-4 border-t border-slate-600", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setFoundSale(null), className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500", children: "Atrás" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleProcessReturn, disabled: isLoading, className: "px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 disabled:bg-slate-500", children: isLoading ? "Procesando..." : "Confirmar Devolución" })
      ] })
    ] })
  ] }) });
};

export { ReturnModal as default };
