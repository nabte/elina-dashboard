import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { e as useNotification } from './index-B4F2XZYo.js';

const ProductPickerModal = ({ isOpen, onClose, onSelect, title = "Buscar producto", filter }) => {
  const { inventoryService } = useServices();
  const { addNotification } = useNotification();
  const [query, setQuery] = reactExports.useState("");
  const [results, setResults] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        let products = await inventoryService.searchInventory(query.trim());
        if (filter) {
          products = products.filter(filter);
        }
        setResults(products.slice(0, 25));
      } catch (error) {
        console.error("Error searching products", error);
        addNotification("No pudimos buscar productos. Intenta de nuevo.", "error");
      } finally {
        setIsLoading(false);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [query, isOpen, inventoryService, filter, addNotification]);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 border-b border-slate-800 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-semibold text-slate-100", children: title }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: query,
          onChange: (e) => setQuery(e.target.value),
          placeholder: "Busca por nombre o SKU...",
          className: "w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
        }
      ),
      isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Buscando..." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-[45vh] overflow-y-auto divide-y divide-slate-800", children: [
        results.length === 0 && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500 text-center py-6", children: "Empieza a escribir para ver resultados." }),
        results.map((product) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => {
              onSelect(product);
              onClose();
            },
            className: "w-full text-left px-4 py-3 hover:bg-slate-800 rounded-lg transition flex justify-between items-center",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-100 font-semibold", children: product.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: product.id })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-emerald-400 font-mono", children: [
                  "$",
                  product.costPrice?.toFixed(2) ?? product.price.toFixed(2)
                ] }),
                product.unitOfMeasure && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500", children: product.unitOfMeasure })
              ] })
            ]
          },
          product.id
        ))
      ] })
    ] })
  ] }) });
};

export { ProductPickerModal as P };
