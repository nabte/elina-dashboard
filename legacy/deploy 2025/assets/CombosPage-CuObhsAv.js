import { j as jsxRuntimeExports, b as reactExports } from './landing-DMNKFuas.js';
import { u as useServices, d as detectUnitOfMeasure } from './MainLayout-C0Ev0ilC.js';
import { e as useNotification, u as useAuth } from './index-B4F2XZYo.js';
import { f as formatCurrency } from './formatting-BolSclPB.js';
import { P as ProductPickerModal } from './ProductPickerModal-BgJ2gb1c.js';
import ConfirmationModal from './ConfirmationModal-D0s46AqS.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const CombosTable = ({ combos, isLoading, onEditCombo, onDeleteCombo }) => {
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-800 rounded-lg p-8 text-center text-slate-400", children: "Cargando combos..." });
  }
  if (combos.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-800 rounded-lg p-8 text-center text-slate-400", children: "No hay combos creados. Crea uno nuevo para comenzar." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-800 rounded-lg overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left text-sm font-semibold text-slate-200", children: "SKU" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left text-sm font-semibold text-slate-200", children: "Nombre" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left text-sm font-semibold text-slate-200", children: "Componentes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left text-sm font-semibold text-slate-200", children: "Precio" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left text-sm font-semibold text-slate-200", children: "Costo" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left text-sm font-semibold text-slate-200", children: "Margen" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left text-sm font-semibold text-slate-200", children: "Estado" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left text-sm font-semibold text-slate-200", children: "Acciones" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-slate-700", children: combos.map((combo) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-slate-700/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-sm text-slate-300", children: combo.sku }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-sm text-slate-300 font-medium", children: combo.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-4 py-3 text-sm text-slate-400", children: [
        combo.components.length,
        " ",
        combo.components.length === 1 ? "componente" : "componentes"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-sm text-slate-300 font-semibold", children: formatCurrency(combo.finalPrice) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-sm text-slate-400", children: formatCurrency(combo.costPrice) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-sm", children: combo.profitMargin !== void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: combo.profitMargin >= 0 ? "text-green-400" : "text-red-400", children: [
        combo.profitMargin.toFixed(1),
        "%"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-500", children: "-" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 py-1 rounded-full text-xs font-semibold ${combo.isActive ? "bg-green-900/50 text-green-300" : "bg-slate-700 text-slate-400"}`, children: combo.isActive ? "Activo" : "Inactivo" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => onEditCombo(combo),
            className: "text-sky-400 hover:text-sky-300 transition-colors",
            children: "Editar"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => onDeleteCombo(combo),
            className: "text-red-400 hover:text-red-300 transition-colors",
            children: "Eliminar"
          }
        )
      ] }) })
    ] }, combo.id)) })
  ] }) }) });
};

const ComboFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { comboService, inventoryService } = useServices();
  const { addNotification } = useNotification();
  const [sku, setSku] = reactExports.useState("");
  const [name, setName] = reactExports.useState("");
  const [finalPrice, setFinalPrice] = reactExports.useState("");
  const [isActive, setIsActive] = reactExports.useState(true);
  const [components, setComponents] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = reactExports.useState(false);
  const [activeComponentIndex, setActiveComponentIndex] = reactExports.useState(null);
  const [suggestedPrice, setSuggestedPrice] = reactExports.useState(0);
  const [costPrice, setCostPrice] = reactExports.useState(0);
  const [profitMargin, setProfitMargin] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSku(initialData.sku);
        setName(initialData.name);
        setFinalPrice(initialData.finalPrice.toString());
        setIsActive(initialData.isActive);
        const loadComponentsWithProductInfo = async () => {
          const componentsWithInfo = await Promise.all(
            initialData.components.map(async (comp, idx) => {
              try {
                const products = await inventoryService.searchInventory(comp.productId);
                const product = products.find((p) => p.id === comp.productId);
                let validSaleOption = comp.saleOption || "package";
                if (validSaleOption === "fraction" && !product?.fractionalEnabled) {
                  validSaleOption = "package";
                }
                return {
                  ...comp,
                  tempId: comp.id || `temp-${idx}`,
                  productName: product?.name || comp.productSku,
                  productFractionalEnabled: product?.fractionalEnabled || false,
                  productCostPrice: product?.costPrice || 0,
                  saleOption: validSaleOption
                };
              } catch (error) {
                console.error(`Error loading product ${comp.productId}:`, error);
                return {
                  ...comp,
                  tempId: comp.id || `temp-${idx}`,
                  productFractionalEnabled: false,
                  productCostPrice: 0
                };
              }
            })
          );
          setComponents(componentsWithInfo);
        };
        loadComponentsWithProductInfo();
        setSuggestedPrice(initialData.suggestedPrice);
        setCostPrice(initialData.costPrice);
        setProfitMargin(initialData.profitMargin ?? null);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData, inventoryService]);
  const resetForm = () => {
    setSku("");
    setName("");
    setFinalPrice("");
    setIsActive(true);
    setComponents([]);
    setSuggestedPrice(0);
    setCostPrice(0);
    setProfitMargin(null);
  };
  reactExports.useEffect(() => {
    if (components.length > 0) {
      calculatePrices();
    }
  }, [components]);
  const calculatePrices = async () => {
    if (components.length === 0) {
      setSuggestedPrice(0);
      setCostPrice(0);
      setProfitMargin(null);
      return;
    }
    try {
      const { suggestedPrice: suggested, costPrice: cost } = await comboService.calculateComboPrices(components);
      setSuggestedPrice(suggested);
      setCostPrice(cost);
      const final = parseFloat(finalPrice) || suggested;
      if (final > 0) {
        setProfitMargin((final - cost) / final * 100);
      } else {
        setProfitMargin(null);
      }
    } catch (error) {
      console.error("Error calculating prices:", error);
    }
  };
  reactExports.useEffect(() => {
    if (finalPrice) {
      const final = parseFloat(finalPrice);
      if (final > 0 && costPrice > 0) {
        setProfitMargin((final - costPrice) / final * 100);
      }
    }
  }, [finalPrice, costPrice]);
  const handleAddComponent = () => {
    setActiveComponentIndex(components.length);
    setIsProductPickerOpen(true);
  };
  const handleProductSelected = async (product) => {
    if (activeComponentIndex === null) return;
    let productSku = product.id;
    let saleOption = "package";
    if (product.fractionalEnabled && product.fractionalSubSkus && product.fractionalSubSkus.length > 0) {
      saleOption = "package";
    }
    let unitOfMeasure = product.unitOfMeasure || "pieza";
    if (!product.unitOfMeasure) {
      try {
        const detectedUnit = await detectUnitOfMeasure(product.name, product.category);
        unitOfMeasure = detectedUnit;
        addNotification(`Unidad detectada: ${detectedUnit}`, "info");
      } catch (error) {
        console.error("Error detecting unit:", error);
        unitOfMeasure = "pieza";
      }
    }
    const newComponent = {
      tempId: `temp-${Date.now()}`,
      productId: product.id,
      productSku,
      productName: product.name,
      quantity: 1,
      unitOfMeasure,
      saleOption: product.fractionalEnabled ? saleOption : "package",
      // Solo fracción si el producto lo permite
      isRequired: true,
      productFractionalEnabled: product.fractionalEnabled || false,
      productCostPrice: product.costPrice || 0
    };
    if (activeComponentIndex === components.length) {
      setComponents([...components, newComponent]);
    } else {
      setComponents(components.map(
        (comp, idx) => idx === activeComponentIndex ? newComponent : comp
      ));
    }
    setIsProductPickerOpen(false);
    setActiveComponentIndex(null);
  };
  const handleRemoveComponent = (index) => {
    setComponents(components.filter((_, idx) => idx !== index));
  };
  const handleComponentChange = (index, field, value) => {
    setComponents(components.map((comp, idx) => {
      if (idx !== index) return comp;
      if (field === "saleOption" && value === "fraction" && !comp.productFractionalEnabled) {
        addNotification("Este producto no permite venta por fracciones", "warning");
        return comp;
      }
      return { ...comp, [field]: value };
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      addNotification("SKU y nombre son requeridos", "error");
      return;
    }
    if (components.length === 0) {
      addNotification("Debe agregar al menos un componente", "error");
      return;
    }
    const final = parseFloat(finalPrice) || suggestedPrice;
    if (final <= 0) {
      addNotification("El precio final debe ser mayor a 0", "error");
      return;
    }
    for (const comp of components) {
      if (!comp.productId || !comp.productSku) {
        addNotification("Todos los componentes deben tener un producto seleccionado", "error");
        return;
      }
      if (!comp.quantity || comp.quantity <= 0) {
        addNotification("Todos los componentes deben tener una cantidad mayor a 0", "error");
        return;
      }
      if (!comp.unitOfMeasure) {
        addNotification("Todos los componentes deben tener una unidad de medida", "error");
        return;
      }
    }
    setIsLoading(true);
    try {
      const componentsData = components.map((comp) => ({
        productId: comp.productId,
        productSku: comp.productSku,
        quantity: comp.quantity,
        unitOfMeasure: comp.unitOfMeasure,
        saleOption: comp.saleOption || "package",
        // Asegurar valor por defecto
        isRequired: comp.isRequired ?? true
        // Asegurar valor por defecto
      }));
      if (initialData) {
        await comboService.updateCombo(initialData.id, {
          name,
          isActive,
          finalPrice: final,
          components: componentsData
        });
        addNotification("Combo actualizado correctamente", "success");
      } else {
        await comboService.createCombo({
          sku,
          name,
          finalPrice: final,
          components: componentsData
        });
        addNotification("Combo creado correctamente", "success");
      }
      onSubmit();
    } catch (error) {
      console.error("Error saving combo:", error);
      let errorMessage = "Error al guardar combo";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === "23505") {
        errorMessage = "Ya existe un combo con este SKU";
      } else if (error?.code === "23503") {
        errorMessage = "Uno de los productos seleccionados no existe o fue eliminado";
      } else if (error?.details) {
        errorMessage = `Error: ${error.details}`;
      } else if (error?.hint) {
        errorMessage = `Error: ${error.hint}`;
      }
      addNotification(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-4xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: initialData ? "Editar Combo" : "Nuevo Combo" }),
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "SKU" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: sku,
                onChange: (e) => setSku(e.target.value),
                disabled: !!initialData,
                className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 disabled:opacity-50",
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Nombre" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: name,
                onChange: (e) => setName(e.target.value),
                className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
                required: true
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300", children: "Componentes" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: handleAddComponent,
                className: "px-3 py-1 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-500",
                children: "+ Agregar Componente"
              }
            )
          ] }),
          components.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500 py-4 text-center", children: "No hay componentes. Agrega al menos uno." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: components.map((comp, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-700 rounded-lg p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start mb-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-100 font-medium", children: comp.productName || comp.productSku }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: comp.productSku }),
                comp.productCostPrice > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-emerald-400 mt-1", children: [
                  "Costo: ",
                  formatCurrency(comp.productCostPrice * comp.quantity),
                  comp.quantity > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-500", children: [
                    " (",
                    formatCurrency(comp.productCostPrice),
                    " c/u)"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handleRemoveComponent(idx),
                  className: "text-red-400 hover:text-red-300 text-sm",
                  children: "Eliminar"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Cantidad" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "number",
                    min: "0.01",
                    step: "0.01",
                    value: comp.quantity,
                    onChange: (e) => handleComponentChange(idx, "quantity", parseFloat(e.target.value) || 0),
                    className: "w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-sm"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Unidad" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    value: comp.unitOfMeasure || "pieza",
                    onChange: (e) => handleComponentChange(idx, "unitOfMeasure", e.target.value),
                    className: "w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-sm",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pieza", children: "Pieza" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "caja", children: "Caja" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "bolsa", children: "Bolsa" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "metro", children: "Metro" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "kg", children: "Kilogramo" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "lt", children: "Litro" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "servicio", children: "Servicio" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "horas", children: "Horas" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Opción de Venta" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    value: comp.saleOption || "package",
                    onChange: (e) => handleComponentChange(idx, "saleOption", e.target.value),
                    disabled: !comp.productFractionalEnabled,
                    className: "w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed",
                    title: !comp.productFractionalEnabled ? "Este producto no permite venta por fracciones" : "",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "package", children: "Paquete Completo" }),
                      comp.productFractionalEnabled && /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fraction", children: "Fracción" })
                    ]
                  }
                ),
                !comp.productFractionalEnabled && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Solo paquete completo" })
              ] })
            ] })
          ] }, comp.tempId)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-900/50 rounded-lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Precio Sugerido" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold text-slate-300", children: formatCurrency(suggestedPrice) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Costo Total" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold text-slate-300", children: formatCurrency(costPrice) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Margen de Ganancia" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-lg font-semibold ${profitMargin !== null && profitMargin >= 0 ? "text-green-400" : "text-red-400"}`, children: profitMargin !== null ? `${profitMargin.toFixed(1)}%` : "-" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Precio Final" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              min: "0",
              step: "0.01",
              value: finalPrice,
              onChange: (e) => setFinalPrice(e.target.value),
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
              required: true
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Puede modificar el precio sugerido" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              id: "isActive",
              checked: isActive,
              onChange: (e) => setIsActive(e.target.checked),
              className: "form-checkbox bg-slate-600"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "isActive", className: "text-sm text-slate-300", children: "Combo activo" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: onClose,
              className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors",
              children: "Cancelar"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "submit",
              disabled: isLoading,
              className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors disabled:opacity-50",
              children: isLoading ? "Guardando..." : "Guardar"
            }
          )
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ProductPickerModal,
      {
        isOpen: isProductPickerOpen,
        onClose: () => {
          setIsProductPickerOpen(false);
          setActiveComponentIndex(null);
        },
        onSelect: handleProductSelected,
        title: "Seleccionar Producto",
        filter: (product) => !product.isSupply
      }
    )
  ] });
};

const CombosPage = () => {
  const { session } = useAuth();
  const { comboService } = useServices();
  const { addNotification } = useNotification();
  const [combos, setCombos] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = reactExports.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = reactExports.useState(false);
  const [editingCombo, setEditingCombo] = reactExports.useState(null);
  const [deletingCombo, setDeletingCombo] = reactExports.useState(null);
  const [searchTerm, setSearchTerm] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (session?.organization?.id) {
      fetchCombos();
    }
  }, [session?.organization?.id]);
  const fetchCombos = async () => {
    if (!session?.organization?.id) return;
    setIsLoading(true);
    try {
      const data = await comboService.getAllCombos();
      setCombos(data);
    } catch (error) {
      console.error("Error fetching combos:", error);
      addNotification("Error al cargar combos", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleOpenAddModal = () => {
    setEditingCombo(null);
    setIsFormModalOpen(true);
  };
  const handleOpenEditModal = (combo) => {
    setEditingCombo(combo);
    setIsFormModalOpen(true);
  };
  const handleOpenDeleteModal = (combo) => {
    setDeletingCombo(combo);
    setIsDeleteModalOpen(true);
  };
  const handleCloseModals = () => {
    setIsFormModalOpen(false);
    setIsDeleteModalOpen(false);
    setEditingCombo(null);
    setDeletingCombo(null);
  };
  const handleSaveCombo = async () => {
    await fetchCombos();
    handleCloseModals();
    addNotification(editingCombo ? "Combo actualizado correctamente" : "Combo creado correctamente", "success");
  };
  const handleDeleteCombo = async () => {
    if (!deletingCombo) return;
    try {
      await comboService.deleteCombo(deletingCombo.id);
      await fetchCombos();
      handleCloseModals();
      addNotification("Combo eliminado correctamente", "success");
    } catch (error) {
      console.error("Error deleting combo:", error);
      addNotification("Error al eliminar combo", "error");
    }
  };
  const filteredCombos = combos.filter(
    (combo) => combo.name.toLowerCase().includes(searchTerm.toLowerCase()) || combo.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold text-slate-100", children: "Combos" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: handleOpenAddModal,
          className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors",
          children: "+ Nuevo Combo"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "text",
        placeholder: "Buscar combos...",
        value: searchTerm,
        onChange: (e) => setSearchTerm(e.target.value),
        className: "w-full max-w-md bg-slate-700 border border-slate-600 rounded-md px-4 py-2 text-slate-100 placeholder-slate-400"
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CombosTable,
      {
        combos: filteredCombos,
        isLoading,
        onEditCombo: handleOpenEditModal,
        onDeleteCombo: handleOpenDeleteModal
      }
    ),
    isFormModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ComboFormModal,
      {
        isOpen: isFormModalOpen,
        onClose: handleCloseModals,
        onSubmit: handleSaveCombo,
        initialData: editingCombo
      }
    ),
    isDeleteModalOpen && deletingCombo && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: isDeleteModalOpen,
        onClose: handleCloseModals,
        onConfirm: handleDeleteCombo,
        title: "Eliminar Combo",
        message: `¿Estás seguro de que deseas eliminar el combo "${deletingCombo.name}"? Esta acción no se puede deshacer.`
      }
    )
  ] });
};

export { CombosPage as default };
