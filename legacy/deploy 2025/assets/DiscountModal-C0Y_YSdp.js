import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';

const DiscountModal = ({ isOpen, onClose, onApply, cart, initialTab = "product" }) => {
  const [activeTab, setActiveTab] = reactExports.useState(initialTab);
  const [selectedProductId, setSelectedProductId] = reactExports.useState(cart[0]?.id || "");
  const [discountType, setDiscountType] = reactExports.useState("percentage");
  const [discountValue, setDiscountValue] = reactExports.useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    const numericValue = parseFloat(discountValue);
    if (isNaN(numericValue) || numericValue <= 0) {
      alert("Por favor, ingrese un valor de descuento válido y positivo.");
      return;
    }
    const target = activeTab === "product" ? selectedProductId : "total";
    if (!target) {
      alert("Por favor, seleccione un producto.");
      return;
    }
    onApply(target, discountType, numericValue);
  };
  reactExports.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedProductId(cart[0]?.id || "");
      setDiscountValue("");
      setDiscountType("percentage");
    }
  }, [isOpen, cart, initialTab]);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Aplicar Descuento" }),
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
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex border-b border-slate-600 mb-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setActiveTab("product"), className: `px-4 py-2 text-sm font-semibold ${activeTab === "product" ? "border-b-2 border-sky-400 text-sky-300" : "text-slate-400"}`, children: "Por Producto" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setActiveTab("total"), className: `px-4 py-2 text-sm font-semibold ${activeTab === "total" ? "border-b-2 border-sky-400 text-sky-300" : "text-slate-400"}`, children: "Al Total" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
              activeTab === "product" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "product-select", className: "block text-sm font-medium text-slate-300 mb-2", children: "Seleccionar Producto" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "select",
                  {
                    id: "product-select",
                    value: selectedProductId,
                    onChange: (e) => setSelectedProductId(e.target.value),
                    className: "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none",
                    children: cart.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: item.id, children: [
                      item.name,
                      " ($",
                      (item.price * item.quantity).toFixed(2),
                      ")"
                    ] }, item.id))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300", children: "Tipo de Descuento:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "discountType", value: "percentage", checked: discountType === "percentage", onChange: () => setDiscountType("percentage"), className: "form-radio bg-slate-700 text-sky-500" }),
                    "Porcentaje (%)"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "discountType", value: "amount", checked: discountType === "amount", onChange: () => setDiscountType("amount"), className: "form-radio bg-slate-700 text-sky-500" }),
                    "Monto Fijo ($)"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "discount-value", className: "block text-sm font-medium text-slate-300 mb-2", children: "Valor del Descuento" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400", children: discountType === "amount" ? "$" : "%" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "discount-value",
                      type: "number",
                      value: discountValue,
                      onChange: (e) => setDiscountValue(e.target.value),
                      placeholder: "0.00",
                      className: "w-full pl-8 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500",
                      autoFocus: true
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex justify-end gap-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors", children: "Cancelar" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors", children: "Aplicar Descuento" })
              ] })
            ] })
          ]
        }
      )
    }
  );
};

export { DiscountModal as default };
