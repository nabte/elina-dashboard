import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { c as createInventoryCountService } from './inventoryCountService-Bo8nZII3.js';
import { e as useNotification, s as supabase } from './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const InventoryCountMobilePage = ({ token }) => {
  const { addNotification } = useNotification();
  const [orgId, setOrgId] = reactExports.useState(null);
  const [items, setItems] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [counts, setCounts] = reactExports.useState({});
  const [showSystemStock, setShowSystemStock] = reactExports.useState(false);
  const inventoryCountService = orgId ? createInventoryCountService(orgId) : null;
  reactExports.useEffect(() => {
    fetchOrgId();
  }, [token]);
  reactExports.useEffect(() => {
    if (orgId && inventoryCountService) {
      fetchItems();
    }
  }, [orgId, token]);
  const fetchOrgId = async () => {
    try {
      const { data, error } = await supabase.from("inventory_count_category_groups").select("count_id").eq("access_token", token).single();
      if (error) throw error;
      const { data: countData, error: countError } = await supabase.from("inventory_counts").select("organization_id").eq("id", data.count_id).single();
      if (countError) throw countError;
      setOrgId(countData.organization_id);
    } catch (error) {
      console.error("Error fetching orgId:", error);
      addNotification("Error al cargar el conteo. Verifica que el enlace sea válido.", "error");
    }
  };
  const fetchItems = async () => {
    if (!inventoryCountService) return;
    setIsLoading(true);
    try {
      const products = await inventoryCountService.getProductsByToken(token);
      setItems(products);
      const initialCounts = {};
      products.forEach((item) => {
        if (item.countedStock !== void 0) {
          initialCounts[item.productId] = item.countedStock.toString();
        }
      });
      setCounts(initialCounts);
    } catch (error) {
      console.error("Error fetching items:", error);
      addNotification("Error al cargar productos. Verifica que el enlace sea válido.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleCountChange = (productId, value) => {
    const numericValue = value.replace(/[^0-9.]/g, "");
    setCounts((prev) => ({ ...prev, [productId]: numericValue }));
  };
  const handleSave = async (productId) => {
    if (!inventoryCountService) return;
    const countValue = parseFloat(counts[productId]);
    if (isNaN(countValue) || countValue < 0) {
      addNotification("Ingresa un número válido", "warning");
      return;
    }
    try {
      await inventoryCountService.saveCount(token, productId, countValue);
      addNotification("Conteo guardado", "success");
      setItems((prev) => prev.map(
        (item) => item.productId === productId ? { ...item, countedStock: countValue, status: "counted" } : item
      ));
    } catch (error) {
      console.error("Error saving count:", error);
      addNotification("Error al guardar el conteo", "error");
    }
  };
  const handleSaveAll = async () => {
    if (!inventoryCountService) return;
    const itemsToSave = items.filter((item) => {
      const countValue = parseFloat(counts[item.productId] || "");
      return !isNaN(countValue) && countValue >= 0;
    });
    if (itemsToSave.length === 0) {
      addNotification("No hay conteos para guardar", "warning");
      return;
    }
    try {
      for (const item of itemsToSave) {
        const countValue = parseFloat(counts[item.productId]);
        await inventoryCountService.saveCount(token, item.productId, countValue);
      }
      addNotification(`Se guardaron ${itemsToSave.length} conteos`, "success");
      await fetchItems();
    } catch (error) {
      console.error("Error saving counts:", error);
      addNotification("Error al guardar los conteos", "error");
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-slate-900 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400", children: "Cargando productos..." })
    ] }) });
  }
  if (items.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-slate-900 flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-lg", children: "No hay productos asignados a este grupo" }) }) });
  }
  const pendingCount = items.filter((item) => !item.countedStock).length;
  const completedCount = items.filter((item) => item.countedStock !== void 0).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-slate-900 text-slate-100 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl mx-auto space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg p-4 border border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold mb-2", children: "Conteo de Inventario" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-400", children: [
            "Pendientes: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-amber-400 font-semibold", children: pendingCount })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-400", children: [
            "Completados: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-green-400 font-semibold", children: completedCount })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: showSystemStock,
              onChange: (e) => setShowSystemStock(e.target.checked),
              className: "form-checkbox bg-slate-700"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Mostrar stock sistema" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg p-4 border border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-100", children: item.productName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: item.productSku }),
          showSystemStock && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
            "Sistema: ",
            item.systemStock,
            " ",
            item.unitOfMeasure
          ] })
        ] }),
        item.countedStock !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-1 bg-green-900/50 text-green-300 rounded-full", children: "✓ Contado" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            inputMode: "decimal",
            value: counts[item.productId] || "",
            onChange: (e) => handleCountChange(item.productId, e.target.value),
            placeholder: "Cantidad contada",
            className: "flex-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 text-lg"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => handleSave(item.productId),
            className: "px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500 font-semibold",
            children: "Guardar"
          }
        )
      ] })
    ] }, item.productId)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: handleSaveAll,
        className: "w-full py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500",
        children: "Guardar Todos los Conteos"
      }
    )
  ] }) });
};

export { InventoryCountMobilePage as default };
