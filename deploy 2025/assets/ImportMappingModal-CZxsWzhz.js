import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { e as useNotification } from './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const RYZE_FIELDS = [
  { key: "id", label: "SKU / ID", required: true },
  { key: "name", label: "Nombre del Producto", required: true },
  { key: "price", label: "Precio de Venta", required: true },
  { key: "costPrice", label: "Precio de Costo", required: false },
  { key: "stock", label: "Existencia (Stock)", required: false },
  { key: "category", label: "Categoría", required: false },
  { key: "description", label: "Descripción", required: false }
];
const ImportMappingModal = ({ isOpen, onClose, onConfirm, fileHeaders, fileData }) => {
  const [mappings, setMappings] = reactExports.useState({});
  const [error, setError] = reactExports.useState("");
  const { addNotification } = useNotification();
  reactExports.useEffect(() => {
    const initialMappings = {};
    const lowerCaseHeaders = fileHeaders.map((h) => h ? h.toLowerCase() : "");
    RYZE_FIELDS.forEach((field) => {
      const keywords = [field.key.toLowerCase(), field.label.toLowerCase().split(" ")[0]];
      if (field.key === "id") keywords.push("sku");
      if (field.key === "costPrice") keywords.push("costo");
      if (field.key === "price") keywords.push("precio");
      if (field.key === "stock") keywords.push("existencia");
      const foundIndex = lowerCaseHeaders.findIndex((h) => keywords.some((kw) => h && h.includes(kw)));
      initialMappings[field.key] = foundIndex > -1 ? fileHeaders[foundIndex] : "ignore";
    });
    setMappings(initialMappings);
  }, [fileHeaders]);
  const handleMappingChange = (ryzeField, fileHeader) => {
    setMappings((prev) => ({ ...prev, [ryzeField]: fileHeader }));
  };
  const handleConfirm = () => {
    setError("");
    const requiredFieldsMet = RYZE_FIELDS.every((field) => {
      if (!field.required) return true;
      return mappings[field.key] && mappings[field.key] !== "ignore";
    });
    if (!requiredFieldsMet) {
      setError("Debes mapear todos los campos obligatorios (SKU, Nombre, Precio).");
      return;
    }
    const invalidRows = [];
    const getOptionalNumber = (value) => {
      if (value === void 0 || value === null || String(value).trim() === "") {
        return void 0;
      }
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? void 0 : parsed;
    };
    const mappedProductsWithDuplicates = fileData.map((row, rowIndex) => {
      const product = {};
      for (const ryzeField in mappings) {
        const fileHeader = mappings[ryzeField];
        if (fileHeader !== "ignore") {
          const headerIndex = fileHeaders.indexOf(fileHeader);
          if (headerIndex > -1 && row[headerIndex] !== void 0 && row[headerIndex] !== null) {
            product[ryzeField] = row[headerIndex];
          }
        }
      }
      const id = String(product.id || "").trim();
      if (!id) {
        invalidRows.push({ index: rowIndex + 2, reason: "Falta el SKU / ID." });
        return null;
      }
      if (!product.name || String(product.name).trim() === "") {
        invalidRows.push({ index: rowIndex + 2, reason: `Falta el Nombre para el SKU ${id}.` });
        return null;
      }
      const priceNum = getOptionalNumber(product.price);
      if (priceNum === void 0) {
        invalidRows.push({ index: rowIndex + 2, reason: `El Precio de Venta para el SKU ${id} es inválido o está vacío.` });
        return null;
      }
      let categoryValue = product.category;
      if (categoryValue && (String(categoryValue).trim() === "" || String(categoryValue).trim().toLowerCase() === "ninguna" || String(categoryValue).trim().toLowerCase() === "(ninguna)")) {
        categoryValue = void 0;
      }
      return {
        id,
        name: String(product.name),
        price: priceNum,
        costPrice: getOptionalNumber(product.costPrice) ?? 0,
        stock: getOptionalNumber(product.stock),
        category: categoryValue || void 0,
        description: product.description || void 0,
        unitOfMeasure: product.unitOfMeasure || void 0
        // Se detectará después si no está
      };
    }).filter(Boolean);
    if (invalidRows.length > 0) {
      const errorMessages = invalidRows.slice(0, 3).map((e) => `Fila ${e.index}: ${e.reason}`).join("\n");
      const fullError = `Se encontraron ${invalidRows.length} filas con errores en tu archivo. Por favor, corrígelas e intenta de nuevo.
Ejemplos:
${errorMessages}`;
      setError(fullError);
      return;
    }
    const productMap = /* @__PURE__ */ new Map();
    mappedProductsWithDuplicates.forEach((product) => {
      if (product.id) {
        productMap.set(product.id, product);
      }
    });
    const mappedProducts = Array.from(productMap.values());
    if (mappedProducts.length < mappedProductsWithDuplicates.length) {
      const duplicatesFound = mappedProductsWithDuplicates.length - mappedProducts.length;
      addNotification(`${duplicatesFound} productos duplicados fueron omitidos. Se importará la última versión de cada SKU.`, "warning");
    }
    onConfirm(mappedProducts);
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-2xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: "Mapear Columnas para Importación" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-sm mb-4", children: "Vincula las columnas de tu archivo con los campos de producto en Ryze. Los campos obligatorios están marcados con *." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3 max-h-80 overflow-y-auto pr-2", children: RYZE_FIELDS.map((field) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4 items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: `map-${field.key}`, className: "font-semibold text-slate-300 text-right", children: [
        field.label,
        " ",
        field.required && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-400", children: "*" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          id: `map-${field.key}`,
          value: mappings[field.key] || "ignore",
          onChange: (e) => handleMappingChange(field.key, e.target.value),
          className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ignore", children: "-- No importar --" }),
            fileHeaders.map((header, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: header, children: header }, `${header}-${index}`))
          ]
        }
      )
    ] }, field.key)) }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm mt-4 whitespace-pre-wrap", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-6 mt-4 border-t border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500", children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleConfirm, className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500", children: "Confirmar e Importar" })
    ] })
  ] }) });
};

export { ImportMappingModal as default };
