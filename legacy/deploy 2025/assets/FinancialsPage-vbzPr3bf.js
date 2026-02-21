const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ExpensesPage-CW9RNd-5.js","assets/landing-DMNKFuas.js","assets/MainLayout-C0Ev0ilC.js","assets/index-B4F2XZYo.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css","assets/inventoryCountService-Bo8nZII3.js","assets/SettingsIcon-DbPfflvT.js","assets/ConfirmationModal-D0s46AqS.js"])))=>i.map(i=>d[i]);
import { u as useAuth, e as useNotification, _ as __vitePreload } from './index-B4F2XZYo.js';
import { j as jsxRuntimeExports, b as reactExports } from './landing-DMNKFuas.js';
import { f as getPurchaseAmountBreakdown, u as useServices, b as usePersistentState } from './MainLayout-C0Ev0ilC.js';
import ConfirmationModal from './ConfirmationModal-D0s46AqS.js';
import { f as formatCurrency } from './formatting-BolSclPB.js';
import { p as parseSpreadsheetFile } from './fileParser-CZ0ywuS-.js';
import { g as getDocument, w as workerSrc, G as GlobalWorkerOptions } from './vendor-DeEp8S9j.js';
import { P as ProductPickerModal } from './ProductPickerModal-BgJ2gb1c.js';
import { P as PlusIcon } from './PlusIcon-Dp3X8gCD.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const statusStyles$1 = {
  "Pendiente": "bg-amber-800 text-amber-200",
  "Parcialmente Pagada": "bg-sky-800 text-sky-200",
  "Pagada": "bg-green-800 text-green-200",
  "Cancelada": "bg-slate-600 text-slate-200"
};
const PurchaseTable = ({ purchases, isLoading, onRegisterPayment, onCancel, onViewDetails }) => {
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando notas de compra..." });
  }
  if (purchases.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No se encontraron notas de compra." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Folio" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Proveedor" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Fecha" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Crédito" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Importes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Estado" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Acciones" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: purchases.map((purchase) => {
      const amounts = getPurchaseAmountBreakdown(purchase);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "tr",
        {
          className: "border-b border-slate-700 hover:bg-slate-700/50 cursor-pointer",
          onClick: () => onViewDetails(purchase),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-mono font-semibold text-slate-100", children: purchase.id }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: purchase.providerName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: new Date(purchase.date).toLocaleDateString() }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center text-xs", children: purchase.creditDays && purchase.creditDays > 0 && purchase.creditDueDate ? (() => {
              const diffDays = Math.ceil((purchase.creditDueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1e3));
              let label = "";
              let color = "text-slate-300";
              if (diffDays > 1) {
                label = `Vence en ${diffDays} días`;
              } else if (diffDays === 1) {
                label = "Vence mañana";
              } else if (diffDays === 0) {
                label = "Vence hoy";
                color = "text-amber-400";
              } else {
                label = `Venció hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? "" : "s"}`;
                color = "text-red-400";
              }
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold text-slate-200", children: [
                  purchase.creditDays,
                  " día",
                  purchase.creditDays === 1 ? "" : "s"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: color, children: label })
              ] });
            })() : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-500", children: "Contado" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-end gap-0.5 text-xs text-slate-400", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                "Subtotal ",
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono font-semibold text-slate-200", children: [
                  "$",
                  amounts.subtotal.toFixed(2)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                "Impuestos ",
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-slate-200", children: [
                  "$",
                  amounts.taxTotal.toFixed(2)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-semibold text-green-300 mt-1", children: [
                "Total ",
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
                  "$",
                  amounts.total.toFixed(2)
                ] })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 py-1 text-xs font-semibold rounded-full ${statusStyles$1[purchase.status]}`, children: purchase.status }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", onClick: (e) => e.stopPropagation(), children: (purchase.status === "Pendiente" || purchase.status === "Parcialmente Pagada") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onRegisterPayment(purchase), className: "px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-500", children: "Registrar Pago" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onCancel(purchase), className: "px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500", children: "Cancelar" })
            ] }) })
          ]
        },
        purchase.id
      );
    }) })
  ] }) });
};

const emptyPurchaseFormState = {
  providerId: "",
  items: [],
  productQuery: "",
  applyIva: false,
  pricesIncludeIva: false,
  selectedExtraTaxes: []
};
const NewPurchaseForm = ({ onCancel, onSuccess }) => {
  const { providerService, inventoryService, purchaseService } = useServices();
  const { session } = useAuth();
  const taxSettings = session?.organization?.taxSettings;
  const ivaPercent = taxSettings?.ivaPercent ?? 16;
  const ivaRate = ivaPercent / 100;
  const extraTaxRules = taxSettings?.extraTaxes ?? [];
  const MS_PER_DAY = 24 * 60 * 60 * 1e3;
  const defaultStateFromSettings = reactExports.useMemo(() => ({
    ...emptyPurchaseFormState,
    applyIva: taxSettings?.applyIvaByDefault ?? false,
    pricesIncludeIva: taxSettings?.pricesIncludeIvaByDefault ?? false,
    selectedExtraTaxes: extraTaxRules.filter((rule) => rule.applyByDefault).map((rule) => rule.id)
  }), [taxSettings, extraTaxRules]);
  const [providers, setProviders] = reactExports.useState([]);
  const [formState, setFormState] = usePersistentState("new-purchase-order", null);
  const currentFormState = formState ? { ...defaultStateFromSettings, ...formState } : defaultStateFromSettings;
  const selectedProvider = providers.find((p) => p.id === currentFormState.providerId);
  const dueDatePreview = selectedProvider?.creditDays && selectedProvider.creditDays > 0 ? new Date(Date.now() + selectedProvider.creditDays * MS_PER_DAY) : null;
  const [productResults, setProductResults] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const updateFormState = (updater) => {
    setFormState((prev) => {
      const base = prev ? { ...defaultStateFromSettings, ...prev } : defaultStateFromSettings;
      return updater(base);
    });
  };
  reactExports.useEffect(() => {
    const fetchProviders = async () => {
      const data = await providerService.getAllProviders();
      setProviders(data);
    };
    fetchProviders();
  }, [providerService]);
  reactExports.useEffect(() => {
    const handler = setTimeout(async () => {
      if (currentFormState.productQuery.length > 1) {
        const products = await inventoryService.searchInventory(currentFormState.productQuery);
        setProductResults(products);
      } else {
        setProductResults([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [currentFormState.productQuery, inventoryService]);
  const handleAddProduct = (product) => {
    setProductResults([]);
    if (currentFormState.items.some((item) => item.productId === product.id)) return;
    const baseCost = product.costPrice || 0;
    const enteredCost = currentFormState.pricesIncludeIva ? baseCost * (1 + ivaRate) : baseCost;
    const netCost = currentFormState.pricesIncludeIva ? enteredCost / (1 + ivaRate) : enteredCost;
    const newItem = {
      productId: product.id,
      name: product.name,
      quantity: 1,
      costPrice: netCost,
      enteredCostPrice: currentFormState.pricesIncludeIva ? enteredCost : void 0
    };
    updateFormState((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      productQuery: ""
    }));
  };
  const handleItemChange = (productId, field, value) => {
    updateFormState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.productId !== productId) return item;
        if (field === "quantity") {
          const safeQuantity = Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
          return { ...item, quantity: Math.max(1, safeQuantity) };
        }
        const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
        if (prev.pricesIncludeIva) {
          const entered = safeValue;
          const net = entered / (1 + ivaRate);
          return { ...item, costPrice: net, enteredCostPrice: entered };
        }
        return { ...item, costPrice: safeValue, enteredCostPrice: void 0 };
      })
    }));
  };
  const handleRemoveItem = (productId) => {
    updateFormState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.productId !== productId)
    }));
  };
  reactExports.useEffect(() => {
    updateFormState((prev) => {
      if (!prev) return prev;
      const valid = prev.selectedExtraTaxes.filter((id) => extraTaxRules.some((rule) => rule.id === id));
      if (valid.length === prev.selectedExtraTaxes.length) return prev;
      return { ...prev, selectedExtraTaxes: valid };
    });
  }, [extraTaxRules]);
  const subtotal = currentFormState.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
  const ivaAmount = currentFormState.applyIva ? subtotal * ivaRate : 0;
  const selectedExtraRules = extraTaxRules.filter((rule) => currentFormState.selectedExtraTaxes.includes(rule.id));
  const extraTaxBreakdown = selectedExtraRules.map((rule) => {
    const amount = subtotal * (rule.percent / 100);
    return { ...rule, amount };
  });
  const extraTaxSignedTotal = extraTaxBreakdown.reduce((sum, rule) => sum + (rule.type === "tax" ? rule.amount : -rule.amount), 0);
  const taxTotal = ivaAmount + extraTaxSignedTotal;
  const total = subtotal + taxTotal;
  const handleToggleApplyIva = (checked) => {
    updateFormState((prev) => ({ ...prev, applyIva: checked }));
  };
  const handleTogglePricesIncludeIva = (checked) => {
    updateFormState((prev) => ({
      ...prev,
      pricesIncludeIva: checked,
      items: prev.items.map((item) => {
        const net = item.costPrice || 0;
        return {
          ...item,
          enteredCostPrice: checked ? net * (1 + ivaRate) : void 0
        };
      })
    }));
  };
  const handleToggleExtraTax = (taxId) => {
    updateFormState((prev) => {
      const exists = prev.selectedExtraTaxes.includes(taxId);
      return {
        ...prev,
        selectedExtraTaxes: exists ? prev.selectedExtraTaxes.filter((id) => id !== taxId) : [...prev.selectedExtraTaxes, taxId]
      };
    });
  };
  const getDisplayedCost = (item) => {
    if (currentFormState.pricesIncludeIva) {
      if (item.enteredCostPrice !== void 0) return item.enteredCostPrice;
      return (item.costPrice || 0) * (1 + ivaRate);
    }
    return item.costPrice || 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentFormState.providerId || currentFormState.items.length === 0) {
      alert("Debe seleccionar un proveedor y añadir al menos un producto.");
      return;
    }
    setIsLoading(true);
    const selectedProvider2 = providers.find((p) => p.id === currentFormState.providerId);
    if (!selectedProvider2) {
      alert("Proveedor no válido.");
      setIsLoading(false);
      return;
    }
    const itemsForSave = currentFormState.items.map(({ enteredCostPrice, ...rest }) => rest);
    const providerCreditDays = selectedProvider2?.creditDays ?? 0;
    const creditDueDate = providerCreditDays > 0 ? new Date(Date.now() + providerCreditDays * MS_PER_DAY) : null;
    const taxBreakdown = {
      ivaApplied: currentFormState.applyIva,
      ivaPercent: currentFormState.applyIva ? ivaPercent : void 0,
      ivaAmount: currentFormState.applyIva ? ivaAmount : void 0,
      extraTaxes: extraTaxBreakdown.map((rule) => ({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        percent: rule.percent,
        amount: rule.amount
      }))
    };
    try {
      await purchaseService.savePurchaseNote({
        providerId: selectedProvider2.id,
        providerName: selectedProvider2.name,
        items: itemsForSave,
        subtotal,
        pricesIncludeIva: currentFormState.pricesIncludeIva,
        taxBreakdown,
        taxTotal,
        creditDays: providerCreditDays > 0 ? providerCreditDays : void 0,
        creditDueDate: creditDueDate ? creditDueDate.toISOString() : null
      });
      alert("Nota de compra creada exitosamente.");
      setFormState(null);
      setProductResults([]);
      onSuccess();
    } catch (error) {
      console.error("Failed to save purchase:", error);
      const errorMessage = error?.message || error?.details || "Error al guardar la nota de compra.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancel = () => {
    setFormState(null);
    setProductResults([]);
    onCancel();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100 mb-4", children: "Crear Nueva Nota de Compra" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "provider-select", className: "block text-sm font-medium text-slate-300 mb-2", children: "Proveedor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              id: "provider-select",
              value: currentFormState.providerId,
              onChange: (e) => updateFormState((prev) => ({ ...prev, providerId: e.target.value })),
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
              required: true,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", disabled: true, children: "Seleccione un proveedor..." }),
                providers.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.name }, p.id))
              ]
            }
          ),
          selectedProvider && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-1", children: selectedProvider.creditDays && selectedProvider.creditDays > 0 ? `Crédito pactado: ${selectedProvider.creditDays} día${selectedProvider.creditDays === 1 ? "" : "s"}.` : "Este proveedor se paga de contado." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-700/30 border border-slate-600 rounded-md p-4 text-sm text-slate-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                className: "form-checkbox bg-slate-600",
                checked: currentFormState.applyIva,
                onChange: (e) => handleToggleApplyIva(e.target.checked)
              }
            ),
            "Aplicar IVA (",
            ivaPercent,
            "%)"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                className: "form-checkbox bg-slate-600",
                checked: currentFormState.pricesIncludeIva,
                onChange: (e) => handleTogglePricesIncludeIva(e.target.checked)
              }
            ),
            "Precios del proveedor incluyen IVA"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mb-1", children: "Impuestos adicionales" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: extraTaxRules.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-500", children: "No hay impuestos configurados" }) : extraTaxRules.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded-md cursor-pointer", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  className: "form-checkbox bg-slate-600",
                  checked: currentFormState.selectedExtraTaxes.includes(rule.id),
                  onChange: () => handleToggleExtraTax(rule.id)
                }
              ),
              rule.name,
              " (",
              rule.percent,
              "% ",
              rule.type === "tax" ? "+" : "-",
              ")"
            ] }, rule.id)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "product-search", className: "block text-sm font-medium text-slate-300 mb-2", children: "Añadir Producto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            id: "product-search",
            value: currentFormState.productQuery,
            onChange: (e) => updateFormState((prev) => ({ ...prev, productQuery: e.target.value })),
            placeholder: "Buscar producto por nombre o SKU...",
            className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
          }
        ),
        productResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto", children: productResults.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { onClick: () => handleAddProduct(p), className: "px-4 py-3 cursor-pointer hover:bg-sky-700/50 flex justify-between items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            p.name,
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-slate-400", children: [
              "(",
              p.id,
              ")"
            ] })
          ] }),
          p.isSupply && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full", children: "Insumo" })
        ] }, p.id)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: currentFormState.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 gap-3 items-center bg-slate-700/50 p-2 rounded-md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-5 font-semibold", children: item.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs text-slate-400", children: [
            "Costo (",
            currentFormState.pricesIncludeIva ? "con IVA" : "sin IVA",
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              value: getDisplayedCost(item),
              onChange: (e) => handleItemChange(item.productId, "costPrice", parseFloat(e.target.value) || 0),
              className: "w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-slate-400", children: "Cant." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: item.quantity, onChange: (e) => handleItemChange(item.productId, "quantity", parseInt(e.target.value, 10) || 0), className: "w-full bg-slate-900 border border-slate-600 rounded px-2 py-1" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2 flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => handleRemoveItem(item.productId), className: "text-red-400 hover:text-red-300", children: "Eliminar" }) })
      ] }, item.productId)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900/40 border border-slate-700 rounded-md p-4 text-sm space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-slate-300", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Subtotal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
            "$",
            subtotal.toFixed(2)
          ] })
        ] }),
        currentFormState.applyIva && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-slate-300", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "IVA (",
            ivaPercent,
            "%)"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
            "$",
            ivaAmount.toFixed(2)
          ] })
        ] }),
        extraTaxBreakdown.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-slate-300", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            rule.name,
            " (",
            rule.percent,
            "% ",
            rule.type === "tax" ? "cargo" : "descuento",
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-mono ${rule.type === "tax" ? "text-slate-100" : "text-amber-300"}`, children: [
            rule.type === "tax" ? "+" : "-",
            "$",
            rule.amount.toFixed(2)
          ] })
        ] }, rule.id)),
        selectedProvider?.creditDays && selectedProvider.creditDays > 0 && dueDatePreview && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-slate-300", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Crédito · vence" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
            selectedProvider.creditDays,
            " día",
            selectedProvider.creditDays === 1 ? "" : "s",
            " · ",
            new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(dueDatePreview)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-lg font-bold text-slate-100 border-t border-slate-700 pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-green-400", children: [
            "$",
            total.toFixed(2)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4 border-t border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleCancel, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-500", children: isLoading ? "Guardando..." : "Guardar Compra" })
      ] })
    ] })
  ] });
};

const statusStyles = {
  "Pendiente": "bg-amber-800 text-amber-200",
  "Parcialmente Pagada": "bg-sky-800 text-sky-200",
  "Pagada": "bg-green-800 text-green-200",
  "Cancelada": "bg-slate-600 text-slate-200"
};
const PurchaseDetailModal = ({ isOpen, onClose, purchase }) => {
  const { purchaseService } = useServices();
  const [payments, setPayments] = reactExports.useState([]);
  reactExports.useEffect(() => {
    if (isOpen) {
      purchaseService.getPaymentsForPurchase(purchase.id).then(setPayments);
    }
  }, [isOpen, purchase.id, purchaseService]);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "bg-slate-800 w-full max-w-3xl m-4 rounded-xl shadow-2xl border border-slate-700",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 border-b border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-2xl font-bold text-slate-100", children: [
                    "Detalles de Compra: ",
                    purchase.id
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
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
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-slate-400 mt-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                    "Proveedor: ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-300", children: purchase.providerName })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                    "Fecha: ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-300", children: new Date(purchase.date).toLocaleDateString() })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-3 py-1 text-sm font-semibold rounded-full ${statusStyles[purchase.status]}`, children: purchase.status })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 max-h-[50vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-200 mb-3", children: "Artículos Comprados" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm text-left", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-2 font-medium", children: "Producto" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-2 font-medium text-center", children: "Cant." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-2 font-medium text-right", children: "Costo" })
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: purchase.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700/50", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 pr-2 text-slate-100", children: item.name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 px-2 text-center text-slate-300", children: item.quantity }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-2 pl-2 text-right font-mono text-slate-100 font-medium", children: [
                      "$",
                      (item.quantity * item.costPrice).toFixed(2)
                    ] })
                  ] }, item.productId)) })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-200 mb-3", children: "Historial de Pagos" }),
                payments.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm text-left", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-2 font-medium", children: "Fecha" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-2 font-medium", children: "Método" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-2 font-medium text-right", children: "Monto" })
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: payments.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700/50", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: new Date(p.payment_date).toLocaleDateString() }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 capitalize", children: p.payment_method }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-2 text-right font-mono", children: [
                      "$",
                      p.amount.toFixed(2)
                    ] })
                  ] }, p.id)) })
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400 text-center py-4", children: "No se han registrado pagos." })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 bg-slate-900/50 rounded-b-xl space-y-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 text-sm text-slate-300", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Subtotal" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
                    "$",
                    (purchase.subtotal ?? purchase.total).toFixed(2)
                  ] })
                ] }),
                purchase.taxBreakdown?.ivaApplied && purchase.taxBreakdown.ivaAmount !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    "IVA (",
                    purchase.taxBreakdown.ivaPercent,
                    "% )"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
                    "$",
                    purchase.taxBreakdown.ivaAmount.toFixed(2)
                  ] })
                ] }),
                purchase.taxBreakdown?.extraTaxes?.map((extra) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    extra.name,
                    " (",
                    extra.percent,
                    "% ",
                    extra.type === "tax" ? "cargo" : "descuento",
                    ")"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-mono ${extra.type === "tax" ? "text-slate-100" : "text-amber-300"}`, children: [
                    extra.type === "tax" ? "+" : "-",
                    "$",
                    extra.amount.toFixed(2)
                  ] })
                ] }, extra.id)),
                purchase.creditDays && purchase.creditDays > 0 && purchase.creditDueDate && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Crédito" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-amber-300", children: [
                    purchase.creditDays,
                    " día",
                    purchase.creditDays === 1 ? "" : "s",
                    " · ",
                    new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(purchase.creditDueDate)
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-slate-300", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Total Pagado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
                  "$",
                  totalPaid.toFixed(2)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-slate-100 font-bold text-lg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Total de la Compra" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
                  "$",
                  purchase.total.toFixed(2)
                ] })
              ] }),
              purchase.importSource && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 text-xs text-slate-400 border-t border-slate-700 pt-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                  "Importada desde ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-200 font-semibold", children: purchase.importSource.fileType?.toUpperCase() || "archivo" }),
                  purchase.importSource.fileName && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    " — ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-200", children: purchase.importSource.fileName })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                  "Registrada el ",
                  purchase.importSource.importedAt.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
                ] })
              ] })
            ] })
          ]
        }
      )
    }
  );
};

const PurchasePaymentModal = ({ isOpen, onClose, onSave, purchase }) => {
  const { session } = useAuth();
  const { purchaseService } = useServices();
  const { addNotification } = useNotification();
  const [amount, setAmount] = reactExports.useState("");
  const [paymentMethod, setPaymentMethod] = reactExports.useState("transferencia");
  const [notes, setNotes] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [payments, setPayments] = reactExports.useState([]);
  const [isFetchingPayments, setIsFetchingPayments] = reactExports.useState(false);
  const paymentMethods = ["transferencia", "efectivo", "tarjeta_empresa", "otro"];
  reactExports.useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setNotes("");
      setPayments([]);
      setIsFetchingPayments(false);
      return;
    }
    let active = true;
    const fetchPayments = async () => {
      setIsFetchingPayments(true);
      try {
        const data = await purchaseService.getPaymentsForPurchase(purchase.id);
        if (active) setPayments(data);
      } catch (error) {
        console.error("Failed to load purchase payments", error);
        addNotification("No se pudieron cargar los pagos previos.", "error");
      } finally {
        if (active) setIsFetchingPayments(false);
      }
    };
    fetchPayments();
    return () => {
      active = false;
    };
  }, [isOpen, purchase.id, purchaseService, addNotification]);
  const amounts = reactExports.useMemo(() => {
    const subtotal = purchase.subtotal ?? purchase.total;
    const taxTotal = purchase.taxTotal ?? Math.max(0, purchase.total - subtotal);
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const total = subtotal + taxTotal;
    const remaining = Math.max(total - totalPaid, 0);
    return { subtotal, taxTotal, totalPaid, total, remaining };
  }, [purchase, payments]);
  const remainingAmount = amounts.remaining;
  const isFullyPaid = remainingAmount <= 0.01;
  const creditInfo = reactExports.useMemo(() => {
    if (!purchase.creditDays || purchase.creditDays <= 0 || !purchase.creditDueDate) return null;
    const now = /* @__PURE__ */ new Date();
    const dueDate = purchase.creditDueDate;
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1e3));
    let label = "";
    if (diffDays > 1) {
      label = `vence en ${diffDays} días`;
    } else if (diffDays === 1) {
      label = "vence mañana";
    } else if (diffDays === 0) {
      label = "vence hoy";
    } else {
      label = `venció hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? "" : "s"}`;
    }
    return {
      diffDays,
      label,
      formattedDate: new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(dueDate)
    };
  }, [purchase]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("El monto debe ser un número positivo.");
      return;
    }
    if (numericAmount > remainingAmount + 0.01) {
      alert("El monto excede el saldo pendiente.");
      return;
    }
    if (isFullyPaid) {
      alert("Esta compra ya está pagada.");
      return;
    }
    setIsLoading(true);
    try {
      await onSave(purchase.id, numericAmount, paymentMethod, notes);
      setAmount("");
      setNotes("");
    } finally {
      setIsLoading(false);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: "Registrar Pago a Proveedor" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-2 text-slate-300", children: [
      "Compra: ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold font-mono text-sky-300", children: purchase.id })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-1 text-slate-300", children: [
      "Total: ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: formatCurrency(amounts.total, session?.organization?.currency) })
    ] }),
    creditInfo && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-3 text-sm text-amber-300", children: [
      "Crédito: ",
      purchase.creditDays,
      " días · ",
      creditInfo.label,
      " (",
      creditInfo.formattedDate,
      ")"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900/40 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 space-y-1 mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Subtotal" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
          "$",
          amounts.subtotal.toFixed(2)
        ] })
      ] }),
      purchase.taxBreakdown?.ivaApplied && purchase.taxBreakdown.ivaAmount !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "IVA (",
          purchase.taxBreakdown.ivaPercent,
          "%)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
          "$",
          purchase.taxBreakdown.ivaAmount.toFixed(2)
        ] })
      ] }),
      purchase.taxBreakdown?.extraTaxes?.map((extra) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          extra.name,
          " (",
          extra.percent,
          "% ",
          extra.type === "tax" ? "cargo" : "descuento",
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-mono ${extra.type === "tax" ? "text-slate-100" : "text-amber-300"}`, children: [
          extra.type === "tax" ? "+" : "-",
          "$",
          extra.amount.toFixed(2)
        ] })
      ] }, extra.id)),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between font-semibold text-slate-100 border-t border-slate-700/70 pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Total" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
          "$",
          amounts.total.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-xs uppercase text-slate-400 pt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Pagado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-slate-200", children: [
          "$",
          amounts.totalPaid.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-xs uppercase text-slate-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Saldo pendiente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-mono ${isFullyPaid ? "text-green-400" : "text-amber-300"}`, children: [
          "$",
          remainingAmount.toFixed(2)
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Monto del Abono" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400", children: "$" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              value: amount,
              onChange: (e) => setAmount(e.target.value),
              placeholder: remainingAmount.toFixed(2),
              className: "w-full pl-7 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md disabled:bg-slate-600 disabled:cursor-not-allowed",
              required: true,
              step: "0.01",
              max: remainingAmount > 0 ? remainingAmount : void 0,
              disabled: isFullyPaid || isFetchingPayments
            }
          )
        ] }),
        isFetchingPayments && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Cargando pagos previos..." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Método de Pago" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            value: paymentMethod,
            onChange: (e) => setPaymentMethod(e.target.value),
            className: "w-full bg-slate-700 p-2 rounded capitalize disabled:bg-slate-600",
            disabled: isFullyPaid,
            children: paymentMethods.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m, children: m.replace("_", " ") }, m))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Notas (Opcional)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: notes,
            onChange: (e) => setNotes(e.target.value),
            placeholder: "Ej: No. de referencia, cheque...",
            className: "w-full bg-slate-700 p-2 rounded"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 rounded", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            disabled: isLoading || isFullyPaid,
            className: "px-4 py-2 bg-sky-600 rounded disabled:bg-slate-500",
            children: isLoading ? "Guardando..." : "Guardar Pago"
          }
        )
      ] })
    ] })
  ] }) });
};

GlobalWorkerOptions.workerSrc = workerSrc;
const normalizeRow = (text) => {
  return text.split(/\s{2,}|\t+/g).map((value) => value.trim()).filter(Boolean);
};
const parsePdfTable = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const rowMap = [];
  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const rowsByY = /* @__PURE__ */ new Map();
    textContent.items.forEach((item) => {
      if (!item?.str) return;
      const y = Math.round(item.transform[5]);
      if (!rowsByY.has(y)) {
        rowsByY.set(y, { y, items: [] });
      }
      rowsByY.get(y).items.push({ x: item.transform[4], str: item.str });
    });
    const pageRows = Array.from(rowsByY.values()).sort((a, b) => b.y - a.y).map((group) => {
      const line = group.items.sort((a, b) => a.x - b.x).map((item) => item.str.trim()).join(" ");
      return line.replace(/\s{2,}/g, " ").trim();
    }).filter(Boolean);
    pageRows.forEach((textLine) => {
      rowMap.push({ y: rowMap.length, text: normalizeRow(textLine) });
    });
  }
  const nonEmptyRows = rowMap.map((row) => row.text).filter((row) => row.length > 0);
  const headers = nonEmptyRows.shift() ?? [];
  return {
    headers,
    data: nonEmptyRows
  };
};

const generateRowId = () => typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `row-${Date.now()}-${Math.random()}`;
const parseNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const sanitized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
    const parsed = parseFloat(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};
const parseInteger = (value) => {
  const number = parseNumber(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
};
const guessColumnIndex = (headers, keywords) => {
  const idx = headers.findIndex(
    (header) => keywords.some((keyword) => header.toLowerCase().includes(keyword))
  );
  return idx >= 0 ? idx : void 0;
};
const PurchaseImportModal = ({ isOpen, onClose, onImported }) => {
  const { providerService, purchaseService } = useServices();
  const { addNotification } = useNotification();
  const { session } = useAuth();
  const taxSettings = session?.organization?.taxSettings;
  const extraTaxRules = taxSettings?.extraTaxes ?? [];
  const ivaPercent = taxSettings?.ivaPercent ?? 16;
  const ivaRate = ivaPercent / 100;
  const defaultStateFromSettings = reactExports.useMemo(() => ({
    providerId: "",
    rows: [],
    applyIva: taxSettings?.applyIvaByDefault ?? false,
    pricesIncludeIva: taxSettings?.pricesIncludeIvaByDefault ?? false,
    selectedExtraTaxes: extraTaxRules.filter((rule) => rule.applyByDefault).map((rule) => rule.id)
  }), [taxSettings, extraTaxRules]);
  const [wizardState, setWizardState] = usePersistentState("purchase-import-wizard", null);
  const currentState = wizardState ? { ...defaultStateFromSettings, ...wizardState } : defaultStateFromSettings;
  const [providers, setProviders] = reactExports.useState([]);
  const [providerCatalog, setProviderCatalog] = reactExports.useState([]);
  const [parsedHeaders, setParsedHeaders] = reactExports.useState([]);
  const [rawData, setRawData] = reactExports.useState([]);
  const [columnMapping, setColumnMapping] = reactExports.useState({});
  const [isParsing, setIsParsing] = reactExports.useState(false);
  const [isSaving, setIsSaving] = reactExports.useState(false);
  const [activeRowId, setActiveRowId] = reactExports.useState(null);
  const [isProductPickerOpen, setIsProductPickerOpen] = reactExports.useState(false);
  const rows = currentState.rows;
  const selectedProvider = providers.find((provider) => provider.id === currentState.providerId);
  const catalogMap = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    providerCatalog.forEach((entry) => {
      map.set(entry.vendorSku.toLowerCase(), entry);
    });
    return map;
  }, [providerCatalog]);
  reactExports.useEffect(() => {
    if (!isOpen) return;
    providerService.getAllProviders().then(setProviders).catch((error) => {
      console.error("Error loading providers", error);
      addNotification("No pudimos cargar los proveedores.", "error");
    });
  }, [isOpen, providerService, addNotification]);
  reactExports.useEffect(() => {
    if (!isOpen || !currentState.providerId) {
      setProviderCatalog([]);
      return;
    }
    providerService.getProviderCatalog(currentState.providerId).then(setProviderCatalog).catch((error) => {
      console.error("Error loading provider catalog", error);
      addNotification("No pudimos cargar el cat�logo del proveedor.", "error");
      setProviderCatalog([]);
    });
  }, [isOpen, currentState.providerId, providerService, addNotification]);
  reactExports.useEffect(() => {
    if (providerCatalog.length === 0) return;
    if (rows.length === 0) return;
    const updatedRows = rows.map((row) => {
      if (row.productId || !row.vendorSku) return row;
      const catalogMatch = catalogMap.get(row.vendorSku.toLowerCase());
      if (!catalogMatch) return row;
      return {
        ...row,
        productId: catalogMatch.productId,
        productName: catalogMatch.productName,
        matchSource: "catalog"
      };
    });
    const changed = updatedRows.some((row, index) => row.productId !== rows[index].productId);
    if (!changed) return;
    setWizardState((prev) => ({ ...prev ?? defaultStateFromSettings, ...currentState, rows: updatedRows }));
  }, [catalogMap]);
  const updateState = (updater) => {
    setWizardState((prev) => {
      const base = prev ? { ...defaultStateFromSettings, ...prev } : defaultStateFromSettings;
      return updater(base);
    });
  };
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension) throw new Error("Formato desconocido");
      let headers = [];
      let data = [];
      if (["csv", "xlsx", "xls"].includes(extension)) {
        const parsed = await parseSpreadsheetFile(file);
        headers = parsed.headers.map((header) => header.trim());
        data = parsed.data;
      } else if (extension === "pdf") {
        const parsed = await parsePdfTable(file);
        headers = parsed.headers;
        data = parsed.data;
      } else {
        throw new Error("Formato no soportado. Usa CSV, XLSX, XLS o PDF.");
      }
      setParsedHeaders(headers);
      setRawData(data);
      setColumnMapping({
        sku: guessColumnIndex(headers, ["sku", "c�digo", "codigo", "producto", "id"]),
        description: guessColumnIndex(headers, ["descripcion", "descripci�n", "producto", "detalle"]),
        quantity: guessColumnIndex(headers, ["cantidad", "qty", "pzas"]),
        unitCost: guessColumnIndex(headers, ["costo", "precio", "unitario"]),
        total: guessColumnIndex(headers, ["total", "importe", "subtotal"])
      });
      updateState((state) => ({
        ...state,
        rows: [],
        fileName: file.name,
        fileType: extension
      }));
      addNotification("Archivo le�do. Configura el mapeo para continuar.", "success");
    } catch (error) {
      console.error("Error parsing file", error);
      addNotification("No pudimos leer el archivo. Verifica el formato.", "error");
      setParsedHeaders([]);
      setRawData([]);
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  };
  const applyMapping = () => {
    if (rawData.length === 0) {
      addNotification("Primero carga un archivo para mapear.", "warning");
      return;
    }
    if (columnMapping.quantity === void 0 || columnMapping.unitCost === void 0) {
      addNotification("Debes indicar al menos las columnas de cantidad y costo unitario.", "warning");
      return;
    }
    const newRows = rawData.map((row, index) => {
      const vendorSku = columnMapping.sku !== void 0 ? row[columnMapping.sku] : "";
      const vendorDescription = columnMapping.description !== void 0 ? row[columnMapping.description] : "";
      const quantity = parseInteger(columnMapping.quantity !== void 0 ? row[columnMapping.quantity] : 0);
      const unitCost = parseNumber(columnMapping.unitCost !== void 0 ? row[columnMapping.unitCost] : 0);
      const totalCost = columnMapping.total !== void 0 ? parseNumber(row[columnMapping.total]) : void 0;
      const skuText = typeof vendorSku === "string" ? vendorSku : String(vendorSku || "");
      const catalogMatch = skuText ? catalogMap.get(skuText.toLowerCase()) : void 0;
      return {
        id: generateRowId(),
        vendorSku: skuText,
        vendorDescription: typeof vendorDescription === "string" ? vendorDescription : String(vendorDescription || ""),
        quantity: quantity || 1,
        unitCost,
        totalCost,
        productId: catalogMatch?.productId,
        productName: catalogMatch?.productName,
        matchSource: catalogMatch ? "catalog" : void 0,
        errors: []
      };
    }).filter((row) => row.quantity > 0 && row.unitCost > 0);
    updateState((state) => ({ ...state, rows: newRows }));
    addNotification("Mapeo aplicado. Revisa los productos importados.", "success");
  };
  const handleRowChange = (rowId, changes) => {
    updateState((state) => ({
      ...state,
      rows: state.rows.map((row) => row.id === rowId ? { ...row, ...changes } : row)
    }));
  };
  const handleRemoveRow = (rowId) => {
    updateState((state) => ({
      ...state,
      rows: state.rows.filter((row) => row.id !== rowId)
    }));
  };
  const openProductPicker = (rowId) => {
    setActiveRowId(rowId);
    setIsProductPickerOpen(true);
  };
  const handleProductSelected = (product) => {
    if (!activeRowId) return;
    handleRowChange(activeRowId, {
      productId: product.id,
      productName: product.name,
      matchSource: "manual"
    });
  };
  const netUnitCost = (row) => {
    if (currentState.pricesIncludeIva) {
      return Number(row.unitCost || 0) / (1 + ivaRate);
    }
    return Number(row.unitCost || 0);
  };
  const subtotal = rows.reduce((sum, row) => {
    if (!row.productId) return sum;
    return sum + netUnitCost(row) * row.quantity;
  }, 0);
  const ivaAmount = currentState.applyIva ? subtotal * ivaRate : 0;
  const selectedExtraRules = extraTaxRules.filter((rule) => currentState.selectedExtraTaxes.includes(rule.id));
  const extraTaxBreakdown = selectedExtraRules.map((rule) => {
    const amount = subtotal * (rule.percent / 100);
    return { ...rule, amount };
  });
  const extraTaxSignedTotal = extraTaxBreakdown.reduce((sum, rule) => sum + (rule.type === "tax" ? rule.amount : -rule.amount), 0);
  const taxTotal = ivaAmount + extraTaxSignedTotal;
  const total = subtotal + taxTotal;
  const missingProducts = rows.filter((row) => !row.productId).length;
  const handleImport = async () => {
    if (!currentState.providerId) {
      addNotification("Selecciona un proveedor.", "warning");
      return;
    }
    if (rows.length === 0) {
      addNotification("Importa al menos un producto.", "warning");
      return;
    }
    const validItems = rows.filter((row) => row.productId);
    if (validItems.length === 0) {
      addNotification("Asigna los productos a tus art�culos antes de guardar.", "warning");
      return;
    }
    const provider = providers.find((p) => p.id === currentState.providerId);
    if (!provider) {
      addNotification("Proveedor no v�lido.", "error");
      return;
    }
    setIsSaving(true);
    const items = validItems.map((row) => ({
      productId: row.productId,
      name: row.productName ?? row.vendorDescription ?? row.vendorSku ?? "Producto importado",
      quantity: Math.max(1, Math.round(row.quantity)),
      costPrice: netUnitCost(row)
    }));
    const creditDays = provider.creditDays ?? 0;
    const MS_PER_DAY = 24 * 60 * 60 * 1e3;
    const creditDueDate = creditDays > 0 ? new Date(Date.now() + creditDays * MS_PER_DAY) : null;
    const taxPayload = {
      ivaApplied: currentState.applyIva,
      ivaPercent: currentState.applyIva ? ivaPercent : void 0,
      ivaAmount: currentState.applyIva ? ivaAmount : void 0,
      extraTaxes: extraTaxBreakdown.map((rule) => ({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        percent: rule.percent,
        amount: rule.amount
      }))
    };
    try {
      await purchaseService.savePurchaseNote({
        providerId: provider.id,
        providerName: provider.name,
        items,
        subtotal,
        pricesIncludeIva: currentState.pricesIncludeIva,
        taxBreakdown: taxPayload,
        taxTotal,
        creditDays: creditDays || void 0,
        creditDueDate: creditDueDate ? creditDueDate.toISOString() : null,
        importMetadata: {
          fileName: currentState.fileName,
          fileType: currentState.fileType,
          columnMapping: Object.fromEntries(Object.entries(columnMapping).map(([key, index]) => {
            if (index === void 0) return [key, null];
            return [key, parsedHeaders[index] ?? `col-${index}`];
          })),
          rawMetadata: {
            headers: parsedHeaders,
            rowCount: rows.length,
            missingProducts
          }
        }
      });
      addNotification("Compra importada correctamente.", "success");
      setWizardState(null);
      setParsedHeaders([]);
      setRawData([]);
      setColumnMapping({});
      onImported();
      onClose();
    } catch (error) {
      console.error("Error importing purchase", error);
      addNotification("No pudimos guardar la compra importada.", "error");
    } finally {
      setIsSaving(false);
    }
  };
  const handleClose = () => {
    setActiveRowId(null);
    onClose();
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 border-b border-slate-800 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-semibold text-slate-100", children: "Importar compras desde archivo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Sube el PDF/CSV del proveedor y mapea las columnas." })
        ] }),
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto px-6 py-4 space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm text-slate-300 mb-1", children: "Proveedor" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: currentState.providerId,
                onChange: (e) => updateState((state) => ({ ...state, providerId: e.target.value })),
                className: "w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecciona..." }),
                  providers.map((provider) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: provider.id, children: provider.name }, provider.id))
                ]
              }
            ),
            selectedProvider?.creditDays ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
              "Cr�dito: ",
              selectedProvider.creditDays,
              " d�as."
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Este proveedor se paga de contado." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm text-slate-300 mb-1", children: "Archivo (PDF, CSV, XLSX)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "file",
                accept: ".pdf,.csv,.xlsx,.xls",
                onChange: handleFileUpload,
                className: "w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-slate-700 file:text-slate-100"
              }
            ),
            currentState.fileName && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
              "Archivo actual: ",
              currentState.fileName
            ] }),
            isParsing && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Procesando archivo..." })
          ] })
        ] }),
        parsedHeaders.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-slate-800 rounded-xl p-4 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-slate-100 font-semibold", children: "Mapeo de columnas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: applyMapping,
                className: "px-3 py-2 bg-sky-600 rounded-md text-white text-sm hover:bg-sky-500",
                children: "Aplicar mapeo"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: ["sku", "description", "quantity", "unitCost", "total"].map((key) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs uppercase text-slate-400 mb-1", children: key }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: columnMapping[key] ?? "",
                onChange: (e) => setColumnMapping((prev) => ({ ...prev, [key]: e.target.value ? Number(e.target.value) : void 0 })),
                className: "w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 text-sm",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Sin asignar" }),
                  parsedHeaders.map((header, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: index, children: header || `Columna ${index + 1}` }, `${header}-${index}`))
                ]
              }
            )
          ] }, key)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500", children: "Selecciona las columnas que corresponden a cada dato. Puedes dejar la descripci�n o total vac�os si tu archivo no los incluye." })
        ] }),
        rows.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 md:flex-row md:items-center md:justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-slate-100 font-semibold", children: [
              "Productos importados (",
              rows.length,
              ")"
            ] }),
            missingProducts > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-amber-400", children: [
              "Faltan ",
              missingProducts,
              " productos por asignar."
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto border border-slate-800 rounded-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-slate-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-slate-800 text-xs uppercase text-slate-400", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Referencia" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Cantidad" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Costo unitario" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Producto Ryze" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 text-center", children: "Acciones" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-slate-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-2 align-top", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs", children: row.vendorSku || "Sin SKU" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500", children: row.vendorDescription })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 align-top", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  min: 1,
                  value: row.quantity,
                  onChange: (e) => handleRowChange(row.id, { quantity: parseInteger(e.target.value) || 1 }),
                  className: "w-24 bg-slate-800 border border-slate-700 rounded-md px-2 py-1"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 align-top", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  min: 0,
                  step: "0.01",
                  value: row.unitCost,
                  onChange: (e) => handleRowChange(row.id, { unitCost: parseNumber(e.target.value) }),
                  className: "w-32 bg-slate-800 border border-slate-700 rounded-md px-2 py-1"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-2 align-top", children: [
                row.productId ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-100", children: row.productName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500", children: row.productId })
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-400", children: "Sin producto asignado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => openProductPicker(row.id),
                    className: "text-xs text-sky-400 hover:text-sky-300 mt-1",
                    children: "Buscar producto"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 align-top text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => handleRemoveRow(row.id),
                  className: "text-xs text-red-400 hover:text-red-300",
                  children: "Eliminar"
                }
              ) })
            ] }, row.id)) })
          ] }) })
        ] }),
        rows.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-200", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: currentState.applyIva,
                  onChange: (e) => updateState((state) => ({ ...state, applyIva: e.target.checked })),
                  className: "form-checkbox bg-slate-700"
                }
              ),
              "Aplicar IVA (",
              ivaPercent,
              "%)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-200", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: currentState.pricesIncludeIva,
                  onChange: (e) => updateState((state) => ({ ...state, pricesIncludeIva: e.target.checked })),
                  className: "form-checkbox bg-slate-700"
                }
              ),
              "Precios incluyen IVA"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-300", children: "Impuestos adicionales" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
              extraTaxRules.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-500", children: "Sin impuestos configurados." }),
              extraTaxRules.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-xs text-slate-200 bg-slate-800 px-2 py-1 rounded", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: currentState.selectedExtraTaxes.includes(rule.id),
                    onChange: (e) => {
                      const checked = e.target.checked;
                      updateState((state) => ({
                        ...state,
                        selectedExtraTaxes: checked ? [...state.selectedExtraTaxes, rule.id] : state.selectedExtraTaxes.filter((id) => id !== rule.id)
                      }));
                    },
                    className: "form-checkbox bg-slate-700"
                  }
                ),
                rule.name,
                " (",
                rule.percent,
                "% ",
                rule.type === "tax" ? "cargo" : "retenci�n",
                ")"
              ] }, rule.id))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 text-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Subtotal" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-lg font-semibold text-slate-100", children: [
              "$",
              subtotal.toFixed(2)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Impuestos" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-lg font-semibold text-slate-100", children: [
              "$",
              taxTotal.toFixed(2)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Total" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-2xl font-bold text-emerald-400", children: [
              "$",
              total.toFixed(2)
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 border-t border-slate-800 flex justify-end gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              setWizardState(null);
              setParsedHeaders([]);
              setRawData([]);
              setColumnMapping({});
              onClose();
            },
            className: "px-4 py-2 border border-slate-600 rounded-md text-slate-200 hover:bg-slate-800",
            children: "Cancelar"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleImport,
            className: "px-4 py-2 bg-emerald-600 rounded-md text-white hover:bg-emerald-500 disabled:opacity-60",
            disabled: rows.length === 0 || isSaving || !currentState.providerId,
            children: isSaving ? "Guardando..." : "Importar nota"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ProductPickerModal,
      {
        isOpen: isProductPickerOpen,
        onClose: () => setIsProductPickerOpen(false),
        onSelect: handleProductSelected,
        title: "Selecciona el producto correcto"
      }
    )
  ] });
};

const PurchasesPage = ({ userRole }) => {
  const { purchaseService } = useServices();
  const { session } = useAuth();
  const { addNotification } = useNotification();
  const [purchases, setPurchases] = reactExports.useState(null);
  const isLoading = purchases === null;
  const [view, setView] = reactExports.useState("list");
  const [purchaseToCancel, setPurchaseToCancel] = reactExports.useState(null);
  const [purchaseToPay, setPurchaseToPay] = reactExports.useState(null);
  const [selectedPurchase, setSelectedPurchase] = reactExports.useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = reactExports.useState(false);
  const fetchPurchases = reactExports.useCallback(async () => {
    try {
      const data = await purchaseService.getPurchaseNotes();
      setPurchases(data);
    } catch (error) {
      addNotification("No se pudieron cargar las compras.", "error");
      console.error("Failed to fetch purchases:", error);
      setPurchases([]);
    }
  }, [purchaseService, addNotification]);
  reactExports.useEffect(() => {
    if (view === "list") {
      fetchPurchases();
    }
  }, [view, fetchPurchases]);
  const handleNewPurchaseSuccess = () => {
    setView("list");
    fetchPurchases();
  };
  const handleConfirmCancel = async () => {
    if (!purchaseToCancel) return;
    try {
      await purchaseService.updatePurchaseNoteStatus(purchaseToCancel.id, "Cancelada");
      setPurchaseToCancel(null);
      fetchPurchases();
      addNotification("La compra ha sido cancelada y el stock revertido.", "success");
    } catch (error) {
      console.error("Failed to cancel purchase:", error);
      addNotification(`Error al cancelar: ${error instanceof Error ? error.message : "Error desconocido"}`, "error");
    }
  };
  const handlePaymentSave = async (purchaseId, amount, method, notes) => {
    if (!session?.user) return;
    try {
      await purchaseService.addPayment({
        purchaseId,
        amount,
        paymentMethod: method,
        notes,
        employeeId: session.user.id,
        employeeName: session.user.email
      });
      setPurchaseToPay(null);
      fetchPurchases();
      addNotification("Abono registrado correctamente.", "success");
    } catch (error) {
      addNotification("Error al registrar el abono.", "error");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    view === "list" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col sm:flex-row justify-between items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Gestión de Compras" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setView("new"),
            className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors flex items-center gap-2 whitespace-nowrap",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { className: "h-5 w-5" }),
              "Nueva Compra"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        PurchaseTable,
        {
          purchases: purchases || [],
          isLoading,
          onRegisterPayment: setPurchaseToPay,
          onCancel: setPurchaseToCancel,
          onViewDetails: setSelectedPurchase
        }
      )
    ] }),
    view === "new" && /* @__PURE__ */ jsxRuntimeExports.jsx(NewPurchaseForm, { onCancel: () => setView("list"), onSuccess: handleNewPurchaseSuccess }),
    purchaseToCancel && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: !!purchaseToCancel,
        onClose: () => setPurchaseToCancel(null),
        onConfirm: handleConfirmCancel,
        title: "Confirmar Cancelación",
        confirmButtonText: "Confirmar Cancelación",
        confirmButtonClass: "bg-red-600 hover:bg-red-500",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-300", children: [
          "¿Estás seguro de que deseas cancelar la compra ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-slate-100", children: purchaseToCancel.id }),
          "?",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block mt-2 text-amber-400", children: "Esta acción revertirá la entrada de stock de los productos involucrados." })
        ] })
      }
    ),
    purchaseToPay && /* @__PURE__ */ jsxRuntimeExports.jsx(
      PurchasePaymentModal,
      {
        isOpen: !!purchaseToPay,
        onClose: () => setPurchaseToPay(null),
        onSave: handlePaymentSave,
        purchase: purchaseToPay
      }
    ),
    selectedPurchase && /* @__PURE__ */ jsxRuntimeExports.jsx(
      PurchaseDetailModal,
      {
        isOpen: !!selectedPurchase,
        onClose: () => setSelectedPurchase(null),
        purchase: selectedPurchase
      }
    ),
    isImportModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      PurchaseImportModal,
      {
        isOpen: isImportModalOpen,
        onClose: () => setIsImportModalOpen(false),
        onImported: fetchPurchases
      }
    )
  ] });
};

const InvestmentsTable = ({ investments, isLoading, currency, onEdit, onDelete, onViewLog }) => {
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando inversiones..." });
  }
  if (investments.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No has registrado ninguna inversión." });
  }
  const renderGainLoss = (investment) => {
    const gainLoss = investment.currentValue - investment.initialCost;
    const percentage = investment.initialCost > 0 ? gainLoss / investment.initialCost * 100 : 0;
    const color = gainLoss >= 0 ? "text-green-400" : "text-red-400";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `font-mono ${color}`, children: [
      gainLoss >= 0 ? "+" : "",
      formatCurrency(gainLoss, currency),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs ml-2", children: [
        "(",
        percentage.toFixed(1),
        "%)"
      ] })
    ] });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Nombre / Activo" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Tipo" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Valor Actual" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Ganancia / Pérdida" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Acciones" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: investments.map((inv) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4 font-semibold", children: [
        inv.name,
        " ",
        inv.ticker && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-slate-400 ml-1", children: [
          "(",
          inv.ticker,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 capitalize", children: inv.type }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-mono font-semibold text-sky-300", children: formatCurrency(inv.currentValue, currency) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right", children: renderGainLoss(inv) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onViewLog(inv), className: "text-purple-400 hover:text-purple-300 font-medium", children: "Movimientos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onEdit(inv), className: "text-sky-400 hover:text-sky-300 font-medium", children: "Editar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onDelete(inv), className: "text-red-400 hover:text-red-300 font-medium", children: "Eliminar" })
      ] }) })
    ] }, inv.id)) })
  ] }) });
};

const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSkW3dHhmnPzlVV0LuYmwYaJ2QsLNrXPOoKfivgSH7gMX2ZcaKKICIys7tCQB71KhLJn-Xg_bHBXvsu/pub?output=csv";
let cachedData = [];
let lastFetchTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1e3;
const fetchAndParseSheet = async () => {
  try {
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) {
      throw new Error(`Error al obtener la hoja: ${response.statusText}`);
    }
    const csvTextWithBOM = await response.text();
    const csvText = csvTextWithBOM.replace(/^\uFEFF/, "");
    const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim() !== "");
    if (lines.length < 2) {
      return [];
    }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const tickerIndex = headers.indexOf("ticker");
    const nameIndex = headers.indexOf("name");
    const priceIndex = headers.indexOf("price");
    const typeIndex = headers.indexOf("type");
    if (tickerIndex === -1 || nameIndex === -1 || priceIndex === -1 || typeIndex === -1) {
      throw new Error("El CSV debe tener las columnas 'ticker', 'name', 'price' y 'type'.");
    }
    const assets = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const price = parseFloat(values[priceIndex]);
      if (!isNaN(price)) {
        assets.push({
          ticker: values[tickerIndex],
          name: values[nameIndex],
          price,
          type: values[typeIndex].toLowerCase()
        });
      }
    }
    return assets;
  } catch (error) {
    console.error("Error al obtener o parsear los datos de Google Sheet:", error);
    throw error;
  }
};
const getMarketData = async () => {
  const now = Date.now();
  if (cachedData.length > 0 && now - lastFetchTimestamp < CACHE_DURATION) {
    return cachedData;
  }
  try {
    cachedData = await fetchAndParseSheet();
    lastFetchTimestamp = now;
  } catch (error) {
    console.warn("Could not refresh market data, returning stale cache if available.");
    if (cachedData.length > 0) {
      return cachedData;
    }
    throw error;
  }
  return cachedData;
};
const marketDataService = {
  searchStocks: async (query) => {
    const data = await getMarketData();
    const lowerQuery = query.toLowerCase();
    return data.filter(
      (asset) => asset.type === "stock" && (asset.name.toLowerCase().includes(lowerQuery) || asset.ticker.toLowerCase().includes(lowerQuery))
    );
  },
  searchCryptos: async (query) => {
    const data = await getMarketData();
    const lowerQuery = query.toLowerCase();
    return data.filter(
      (asset) => asset.type === "crypto" && (asset.name.toLowerCase().includes(lowerQuery) || asset.ticker.toLowerCase().includes(lowerQuery))
    );
  },
  getPriceForTicker: async (ticker) => {
    const data = await fetchAndParseSheet();
    cachedData = data;
    lastFetchTimestamp = Date.now();
    const asset = data.find((a) => a.ticker.toLowerCase() === ticker.toLowerCase());
    return asset ? asset.price : null;
  }
};

const investmentTypes = [
  { key: "acciones", label: "Acciones" },
  { key: "cripto", label: "Criptomoneda" },
  { key: "inmueble", label: "Bien Raíz" },
  { key: "otro", label: "Otro" }
];
const InvestmentFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { session } = useAuth();
  const defaultCurrency = session?.organization?.currency || "MXN";
  const [investment, setInvestment] = reactExports.useState({
    name: "",
    type: "acciones",
    initialCost: "",
    initialCostCurrency: defaultCurrency,
    currentValue: "",
    ticker: "",
    quantity: ""
  });
  const [tickerResults, setTickerResults] = reactExports.useState([]);
  const [pricePerUnit, setPricePerUnit] = reactExports.useState(null);
  const isEditing = !!initialData;
  const isMarketAsset = investment.type === "acciones" || investment.type === "cripto";
  reactExports.useEffect(() => {
    if (initialData) {
      setInvestment({
        name: initialData.name,
        type: initialData.type,
        initialCost: initialData.initialCost.toString(),
        initialCostCurrency: initialData.initialCostCurrency || defaultCurrency,
        currentValue: initialData.currentValue.toString(),
        ticker: initialData.ticker || "",
        quantity: initialData.quantity?.toString() || ""
      });
      if (initialData.ticker && initialData.quantity && initialData.quantity > 0) {
        setPricePerUnit(initialData.currentValue / initialData.quantity);
      }
    } else {
      setInvestment({ name: "", type: "acciones", initialCost: "", initialCostCurrency: defaultCurrency, currentValue: "", ticker: "", quantity: "" });
      setPricePerUnit(null);
    }
  }, [initialData, isOpen, defaultCurrency]);
  reactExports.useEffect(() => {
    const handler = setTimeout(async () => {
      if (investment.ticker.length > 1 && isMarketAsset && pricePerUnit === null) {
        const results = investment.type === "acciones" ? await marketDataService.searchStocks(investment.ticker) : await marketDataService.searchCryptos(investment.ticker);
        setTickerResults(results);
      } else {
        setTickerResults([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [investment.ticker, investment.type, isMarketAsset, pricePerUnit]);
  reactExports.useEffect(() => {
    if (isMarketAsset && pricePerUnit !== null) {
      const quantity = parseFloat(investment.quantity) || 0;
      const totalValue = quantity * pricePerUnit;
      setInvestment((prev) => ({ ...prev, currentValue: totalValue.toFixed(2) }));
    }
  }, [investment.quantity, pricePerUnit, isMarketAsset]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "type") {
      setPricePerUnit(null);
    }
    if (name === "ticker") {
      setPricePerUnit(null);
    }
    setInvestment((prev) => ({ ...prev, [name]: value }));
  };
  const handleSelectTicker = (asset) => {
    setPricePerUnit(asset.price);
    setInvestment((prev) => ({ ...prev, name: asset.name, ticker: asset.ticker }));
    setTickerResults([]);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      name: investment.name,
      type: investment.type,
      initialCost: parseFloat(investment.initialCost) || 0,
      initialCostCurrency: investment.initialCostCurrency,
      currentValue: parseFloat(investment.currentValue) || 0,
      ticker: isMarketAsset ? investment.ticker : void 0,
      quantity: isMarketAsset ? parseFloat(investment.quantity) || void 0 : void 0
    };
    onSubmit(data);
  };
  const canSubmit = !isMarketAsset || isMarketAsset && pricePerUnit !== null && !!investment.quantity;
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: isEditing ? "Editar Inversión" : "Nueva Inversión" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Tipo de Inversión" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { name: "type", value: investment.type, onChange: handleChange, className: "w-full bg-slate-700 p-2 rounded", children: investmentTypes.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t.key, children: t.label }, t.key)) })
      ] }),
      isMarketAsset ? /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Buscar por Ticker" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "ticker", value: investment.ticker, onChange: handleChange, placeholder: "Ej: AAPL, BTC...", className: "w-full bg-slate-700 p-2 rounded", autoComplete: "off" }),
          tickerResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "absolute z-20 w-full mt-1 bg-slate-900 border border-slate-600 rounded-md shadow-lg max-h-40 overflow-y-auto", children: tickerResults.map((res) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { onClick: () => handleSelectTicker(res), className: "px-3 py-2 cursor-pointer hover:bg-sky-700/50 text-sm", children: [
            res.name,
            " (",
            res.ticker,
            ")"
          ] }, res.ticker)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Nombre del Activo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: investment.name, readOnly: true, className: "w-full bg-slate-900 border-transparent p-2 rounded" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Cantidad" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", name: "quantity", value: investment.quantity, onChange: handleChange, placeholder: "0.00", step: "any", className: "w-full bg-slate-700 p-2 rounded", required: true })
          ] })
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Nombre / Descripción" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "name", value: investment.name, onChange: handleChange, className: "w-full bg-slate-700 p-2 rounded", required: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Costo Inicial Total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", name: "initialCost", value: investment.initialCost, onChange: handleChange, placeholder: "0.00", step: "any", className: "w-full bg-slate-700 p-2 rounded", required: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Moneda" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { name: "initialCostCurrency", value: investment.initialCostCurrency, onChange: handleChange, className: "w-full bg-slate-700 p-2 rounded", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "MXN", children: "MXN" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "USD", children: "USD" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Valor Actual Total" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", name: "currentValue", value: investment.currentValue, onChange: handleChange, placeholder: "0.00", step: "any", className: "w-full bg-slate-700 p-2 rounded", required: true, disabled: isMarketAsset })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 rounded", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: !canSubmit, className: "px-4 py-2 bg-sky-600 rounded disabled:bg-slate-500 disabled:cursor-not-allowed", children: "Guardar" })
      ] })
    ] })
  ] }) });
};

const InvestmentLogModal = ({ isOpen, onClose, investment }) => {
  const { investmentService } = useServices();
  const [logs, setLogs] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [newLog, setNewLog] = reactExports.useState({ type: "costo", description: "", amount: "" });
  const fetchLogs = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await investmentService.getLogsForInvestment(investment.id);
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [investment.id, investmentService]);
  reactExports.useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);
  const handleAddLog = async (e) => {
    e.preventDefault();
    const amount = parseFloat(newLog.amount);
    if (!newLog.description || isNaN(amount) || amount <= 0) return;
    await investmentService.addLog({
      investmentId: investment.id,
      type: newLog.type,
      description: newLog.description,
      amount
    });
    setNewLog({ type: "costo", description: "", amount: "" });
    fetchLogs();
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-2xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700 flex flex-col", style: { height: "calc(100vh - 8rem)" }, onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-xl font-bold text-slate-100", children: [
        "Movimientos de: ",
        investment.name
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
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-grow my-4 overflow-y-auto pr-2", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Cargando..." }) : logs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-center py-8", children: "No hay movimientos registrados." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: logs.map((log) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: new Date(log.date).toLocaleDateString() }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: log.description }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: `py-2 text-right font-mono ${log.type === "ingreso" ? "text-green-400" : "text-red-400"}`, children: [
        log.type === "ingreso" ? "+" : "-",
        " ",
        formatCurrency(log.amount, "USD")
      ] })
    ] }, log.id)) }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("form", { onSubmit: handleAddLog, className: "mt-auto pt-4 border-t border-slate-600 flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: newLog.type, onChange: (e) => setNewLog({ ...newLog, type: e.target.value }), className: "col-span-3 bg-slate-700 p-2 rounded text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "costo", children: "Costo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ingreso", children: "Ingreso" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: newLog.description, onChange: (e) => setNewLog({ ...newLog, description: e.target.value }), placeholder: "Descripción (ej. Mantenimiento, Renta)", className: "col-span-5 bg-slate-700 p-2 rounded text-sm" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: newLog.amount, onChange: (e) => setNewLog({ ...newLog, amount: e.target.value }), placeholder: "Monto", className: "col-span-2 bg-slate-700 p-2 rounded text-sm" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "col-span-2 bg-sky-600 rounded text-sm font-semibold", children: "Añadir" })
    ] }) })
  ] }) });
};

const StatCard = ({ title, value, colorClass = "text-slate-100" }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-medium text-slate-400", children: title }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-3xl font-bold mt-2 ${colorClass}`, children: value })
] });
const InvestmentsPage = () => {
  const { investmentService } = useServices();
  const { addNotification } = useNotification();
  const { session } = useAuth();
  const currency = session?.organization?.currency || "USD";
  const [investments, setInvestments] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [isUpdatingMarket, setIsUpdatingMarket] = reactExports.useState(false);
  const [isFormOpen, setIsFormOpen] = reactExports.useState(false);
  const [isLogOpen, setIsLogOpen] = reactExports.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = reactExports.useState(null);
  const [selectedInvestment, setSelectedInvestment] = reactExports.useState(null);
  const fetchInvestments = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await investmentService.getInvestments();
      setInvestments(data);
    } catch (error) {
      addNotification("Error al cargar las inversiones.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [investmentService, addNotification]);
  reactExports.useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);
  const summary = reactExports.useMemo(() => {
    const totalInitialCost = investments.reduce((sum, i) => sum + i.initialCost, 0);
    const totalCurrentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
    const totalGainLoss = totalCurrentValue - totalInitialCost;
    return { totalInitialCost, totalCurrentValue, totalGainLoss };
  }, [investments]);
  const handleSave = async (data) => {
    try {
      await investmentService.saveInvestment(data);
      addNotification("Inversión guardada.", "success");
      fetchInvestments();
      handleCloseModals();
    } catch (error) {
      addNotification("Error al guardar.", "error");
    }
  };
  const handleDelete = async () => {
    if (!isDeleteOpen) return;
    try {
      await investmentService.deleteInvestment(isDeleteOpen.id);
      addNotification("Inversión eliminada.", "success");
      fetchInvestments();
      handleCloseModals();
    } catch (error) {
      addNotification("Error al eliminar.", "error");
    }
  };
  const handleUpdateMarketValues = async () => {
    setIsUpdatingMarket(true);
    let updatedCount = 0;
    try {
      const updatedInvestments = [...investments];
      for (let i = 0; i < updatedInvestments.length; i++) {
        const investment = updatedInvestments[i];
        if (investment.ticker && investment.quantity) {
          const latestPrice = await marketDataService.getPriceForTicker(investment.ticker);
          if (latestPrice !== null) {
            const newCurrentValue = latestPrice * investment.quantity;
            const updatedInvestment = { ...investment, currentValue: newCurrentValue, lastUpdated: /* @__PURE__ */ new Date() };
            await investmentService.saveInvestment(updatedInvestment);
            updatedInvestments[i] = updatedInvestment;
            updatedCount++;
          }
        }
      }
      if (updatedCount > 0) {
        setInvestments(updatedInvestments);
        addNotification(`${updatedCount} inversiones han sido actualizadas con precios de mercado.`, "success");
      } else {
        addNotification("No se encontraron precios de mercado para tus inversiones compatibles (acciones/criptos).", "info");
      }
    } catch (error) {
      addNotification("Ocurrió un error al actualizar los valores.", "error");
    } finally {
      setIsUpdatingMarket(false);
    }
  };
  const handleCloseModals = () => {
    setIsFormOpen(false);
    setIsLogOpen(false);
    setIsDeleteOpen(null);
    setSelectedInvestment(null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col sm:flex-row justify-between items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Portafolio de Inversiones" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleUpdateMarketValues, disabled: isUpdatingMarket, className: "px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-500 disabled:bg-slate-500 text-sm", children: isUpdatingMarket ? "Actualizando..." : "Actualizar Valores de Mercado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          setSelectedInvestment(null);
          setIsFormOpen(true);
        }, className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 text-sm", children: "+ Añadir Inversión" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { title: "Total Invertido", value: formatCurrency(summary.totalInitialCost, currency) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { title: "Valor Actual del Portafolio", value: formatCurrency(summary.totalCurrentValue, currency), colorClass: "text-sky-400" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { title: "Ganancia / Pérdida", value: formatCurrency(summary.totalGainLoss, currency), colorClass: summary.totalGainLoss >= 0 ? "text-green-400" : "text-red-400" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      InvestmentsTable,
      {
        investments,
        isLoading,
        currency,
        onEdit: (inv) => {
          setSelectedInvestment(inv);
          setIsFormOpen(true);
        },
        onDelete: setIsDeleteOpen,
        onViewLog: (inv) => {
          setSelectedInvestment(inv);
          setIsLogOpen(true);
        }
      }
    ),
    isFormOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      InvestmentFormModal,
      {
        isOpen: isFormOpen,
        onClose: handleCloseModals,
        onSubmit: handleSave,
        initialData: selectedInvestment
      }
    ),
    isLogOpen && selectedInvestment && /* @__PURE__ */ jsxRuntimeExports.jsx(
      InvestmentLogModal,
      {
        isOpen: isLogOpen,
        onClose: handleCloseModals,
        investment: selectedInvestment
      }
    ),
    isDeleteOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: !!isDeleteOpen,
        onClose: handleCloseModals,
        onConfirm: handleDelete,
        title: "Confirmar Eliminación",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          '¿Seguro que quieres eliminar la inversión: "',
          isDeleteOpen.name,
          '"?'
        ] })
      }
    )
  ] });
};

const ExpensesPage = reactExports.lazy(() => __vitePreload(() => import('./ExpensesPage-CW9RNd-5.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8,9]):void 0));
const ClientPaymentModal = ({ isOpen, onClose, onSave, client }) => {
  const { clientService } = useServices();
  const { addNotification } = useNotification();
  const { session } = useAuth();
  const [amount, setAmount] = reactExports.useState("");
  const [paymentMethod, setPaymentMethod] = reactExports.useState("efectivo");
  const [notes, setNotes] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      addNotification("El monto debe ser un número positivo.", "error");
      return;
    }
    if (!session?.user) return;
    setIsLoading(true);
    try {
      await clientService.addClientPayment({
        client_id: client.id,
        amount: numericAmount,
        payment_method: paymentMethod,
        notes,
        employee_id: session.user.id,
        employee_name: session.user.email
      });
      addNotification(`Pago de ${client.name} registrado.`, "success");
      onSave();
    } catch (error) {
      addNotification("Error al registrar el pago.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: "Registrar Abono de Cliente" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-2 text-slate-300", children: [
      "Cliente: ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-sky-300", children: client.name })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-4 text-slate-300", children: [
      "Deuda actual: ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-red-400", children: formatCurrency(client.current_debt || 0, session?.organization?.currency) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "Monto del abono", className: "w-full bg-slate-700 p-2 rounded", required: true, step: "0.01" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: paymentMethod, onChange: (e) => setPaymentMethod(e.target.value), className: "w-full bg-slate-700 p-2 rounded", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "efectivo", children: "Efectivo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "tarjeta", children: "Tarjeta" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "transferencia", children: "Transferencia" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "Notas (opcional)", className: "w-full bg-slate-700 p-2 rounded" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 rounded", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "px-4 py-2 bg-sky-600 rounded disabled:bg-slate-500", children: isLoading ? "Guardando..." : "Guardar Abono" })
      ] })
    ] })
  ] }) });
};
const AccountsReceivablePage = () => {
  const { clientService } = useServices();
  const { addNotification } = useNotification();
  const { session } = useAuth();
  const [debtors, setDebtors] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [selectedClient, setSelectedClient] = reactExports.useState(null);
  const fetchDebtors = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const allClients = await clientService.getAllClients();
      setDebtors(allClients.filter((c) => c.has_credit && c.current_debt && c.current_debt > 0));
    } catch (error) {
      addNotification("Error al cargar la lista de deudores.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [clientService, addNotification]);
  reactExports.useEffect(() => {
    fetchDebtors();
  }, [fetchDebtors]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4 flex flex-col sm:flex-row justify-between items-center gap-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Cuentas por Cobrar (Crédito a Clientes)" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-right", children: "Límite de Crédito" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-right", children: "Deuda Actual" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Acciones" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, className: "text-center p-4", children: "Cargando..." }) }) : debtors.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, className: "text-center p-8 text-slate-400", children: "No hay clientes con deudas pendientes." }) }) : debtors.map((client) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-semibold", children: client.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-mono", children: formatCurrency(client.credit_limit || 0, session?.organization?.currency) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-mono text-red-400", children: formatCurrency(client.current_debt || 0, session?.organization?.currency) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSelectedClient(client), className: "text-green-400 font-medium hover:text-green-300", children: "Registrar Abono" }) })
      ] }, client.id)) })
    ] }) }),
    selectedClient && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ClientPaymentModal,
      {
        isOpen: !!selectedClient,
        onClose: () => setSelectedClient(null),
        onSave: () => {
          setSelectedClient(null);
          fetchDebtors();
        },
        client: selectedClient
      }
    )
  ] });
};
const FinancialsPage = ({ userRole, onNavigate, subscriptionTier }) => {
  const { requiresPin, hasPermission } = useAuth();
  const isSolopreneur = subscriptionTier === "solopreneur";
  const [activeTab, setActiveTab] = reactExports.useState(isSolopreneur ? "investments" : "purchases");
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "purchases.manage";
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey) || hasPermission(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, hasPermission, permissionKey]);
  if (!isUnlocked) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      AuthorizationModal,
      {
        isOpen: true,
        onClose: () => onNavigate("dashboard"),
        onSuccess: () => setIsUnlocked(true),
        permissionRequired: permissionKey
      }
    ) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex border-b border-slate-700 mb-6", children: [
      !isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setActiveTab("purchases"),
          className: `px-4 py-3 text-sm font-medium transition-colors capitalize border-b-2
                            ${activeTab === "purchases" ? "border-sky-400 text-sky-300" : "border-transparent text-slate-400 hover:text-slate-200"}`,
          children: "Compras a Proveedores"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setActiveTab("expenses"),
          className: `px-4 py-3 text-sm font-medium transition-colors capitalize border-b-2
                        ${activeTab === "expenses" ? "border-sky-400 text-sky-300" : "border-transparent text-slate-400 hover:text-slate-200"}`,
          children: "Gastos Generales"
        }
      ),
      !isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setActiveTab("receivables"),
          className: `px-4 py-3 text-sm font-medium transition-colors capitalize border-b-2
                            ${activeTab === "receivables" ? "border-sky-400 text-sky-300" : "border-transparent text-slate-400 hover:text-slate-200"}`,
          children: "Cuentas por Cobrar"
        }
      ),
      isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setActiveTab("investments"),
          className: `px-4 py-3 text-sm font-medium transition-colors capitalize border-b-2
                            ${activeTab === "investments" ? "border-sky-400 text-sky-300" : "border-transparent text-slate-400 hover:text-slate-200"}`,
          children: "Portafolio de Inversiones"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8", children: "Cargando..." }), children: [
      activeTab === "purchases" && !isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsx(PurchasesPage, { userRole }),
      activeTab === "expenses" && /* @__PURE__ */ jsxRuntimeExports.jsx(ExpensesPage, { subscriptionTier }),
      activeTab === "investments" && isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsx(InvestmentsPage, {}),
      activeTab === "receivables" && !isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsx(AccountsReceivablePage, {})
    ] })
  ] });
};

export { FinancialsPage as default };
