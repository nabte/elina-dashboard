const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/InventoryCountMobilePage-6b5_EEJ3.js","assets/landing-DMNKFuas.js","assets/inventoryCountService-Bo8nZII3.js","assets/index-B4F2XZYo.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css"])))=>i.map(i=>d[i]);
import { e as useNotification, u as useAuth, _ as __vitePreload } from './index-B4F2XZYo.js';
import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const CreateInventoryCountModal = ({ isOpen, onClose, onSuccess }) => {
  const { inventoryService, inventoryCountService } = useServices();
  const { addNotification } = useNotification();
  const { session } = useAuth();
  const [countName, setCountName] = reactExports.useState("");
  const [expiresInDays, setExpiresInDays] = reactExports.useState(7);
  const [categories, setCategories] = reactExports.useState([]);
  const [groups, setGroups] = reactExports.useState([{ groupName: "", categoryIds: [] }]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [isCreating, setIsCreating] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setCountName("");
      setExpiresInDays(7);
      setGroups([{ groupName: "", categoryIds: [] }]);
    }
  }, [isOpen, inventoryService]);
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const cats = await inventoryService.getUniqueCategories();
      setCategories(cats);
    } catch (error) {
      addNotification("Error al cargar categorías", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleAddGroup = () => {
    setGroups([...groups, { groupName: "", categoryIds: [] }]);
  };
  const handleRemoveGroup = (index) => {
    setGroups(groups.filter((_, i) => i !== index));
  };
  const handleGroupNameChange = (index, name) => {
    const updated = [...groups];
    updated[index].groupName = name;
    setGroups(updated);
  };
  const handleCategoryToggle = (index, categoryId) => {
    const updated = [...groups];
    const categoryIds = updated[index].categoryIds;
    if (categoryIds.includes(categoryId)) {
      updated[index].categoryIds = categoryIds.filter((id) => id !== categoryId);
    } else {
      updated[index].categoryIds = [...categoryIds, categoryId];
    }
    setGroups(updated);
  };
  const handleCreate = async () => {
    if (!countName.trim()) {
      addNotification("Ingresa un nombre para el conteo", "warning");
      return;
    }
    const validGroups = groups.filter((g) => g.groupName.trim() && g.categoryIds.length > 0);
    if (validGroups.length === 0) {
      addNotification("Crea al menos un grupo con categorías seleccionadas", "warning");
      return;
    }
    setIsCreating(true);
    try {
      const count = await inventoryCountService.createCount(
        countName.trim(),
        validGroups.map((g) => ({
          groupName: g.groupName.trim(),
          categoryIds: g.categoryIds
        })),
        expiresInDays
      );
      addNotification("Conteo creado exitosamente", "success");
      onSuccess(count);
      onClose();
    } catch (error) {
      console.error("Error creating count:", error);
      addNotification("Error al crear el conteo", "error");
    } finally {
      setIsCreating(false);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl border border-slate-700 flex flex-col", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 border-b border-slate-700 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: "Crear Nuevo Conteo de Inventario" }),
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
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400 mt-1", children: "Crea grupos de categorías y genera URLs para que múltiples personas puedan contar simultáneamente" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 overflow-y-auto flex-1 space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Nombre del Conteo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: countName,
            onChange: (e) => setCountName(e.target.value),
            placeholder: "Ej. Conteo Mensual - Noviembre 2025",
            className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Expira en (días)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            value: expiresInDays,
            onChange: (e) => setExpiresInDays(parseInt(e.target.value) || 7),
            min: "1",
            max: "90",
            className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Las URLs dejarán de funcionar después de este tiempo" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300", children: "Grupos de Categorías" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleAddGroup,
              className: "px-3 py-1.5 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-500",
              children: "+ Agregar Grupo"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: groups.map((group, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: group.groupName,
                onChange: (e) => handleGroupNameChange(index, e.target.value),
                placeholder: `Nombre del Grupo ${index + 1} (ej. Equipo 1, Zona A, etc.)`,
                className: "flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-slate-100 mr-3"
              }
            ),
            groups.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => handleRemoveGroup(index),
                className: "px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-500",
                children: "Eliminar"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mb-2", children: "Selecciona las categorías para este grupo:" }),
            isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: "Cargando categorías..." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 p-2 bg-slate-800 rounded hover:bg-slate-700 cursor-pointer", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: group.categoryIds.length === 0,
                    onChange: () => {
                      const updated = [...groups];
                      updated[index].categoryIds = [];
                      setGroups(updated);
                    },
                    className: "form-checkbox bg-slate-700"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-300", children: "Sin categoría" })
              ] }),
              categories.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 p-2 bg-slate-800 rounded hover:bg-slate-700 cursor-pointer", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: group.categoryIds.includes(cat.id),
                    onChange: () => handleCategoryToggle(index, cat.id),
                    className: "form-checkbox bg-slate-700"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-300", children: cat.name })
              ] }, cat.id))
            ] })
          ] })
        ] }, index)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 border-t border-slate-700 flex justify-end gap-3 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onClose,
          className: "px-4 py-2 bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-500",
          children: "Cancelar"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: handleCreate,
          disabled: isCreating,
          className: "px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 disabled:opacity-50",
          children: isCreating ? "Creando..." : "Crear Conteo"
        }
      )
    ] })
  ] }) });
};

const InventoryCountReportPage = ({ countId, onBack }) => {
  const { inventoryCountService } = useServices();
  const { addNotification } = useNotification();
  const { session } = useAuth();
  const [report, setReport] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [isApproving, setIsApproving] = reactExports.useState(false);
  const [filter, setFilter] = reactExports.useState("all");
  reactExports.useEffect(() => {
    fetchReport();
  }, [countId]);
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryCountService.getCountById(countId);
      setReport(data);
    } catch (error) {
      console.error("Error fetching report:", error);
      addNotification("Error al cargar el reporte", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleApprove = async (updateInventory = true) => {
    if (!confirm(`¿Aprobar este conteo y ${updateInventory ? "actualizar el inventario" : "solo guardarlo"}?`)) {
      return;
    }
    setIsApproving(true);
    try {
      await inventoryCountService.approveCount(countId, updateInventory);
      addNotification("Conteo aprobado exitosamente", "success");
      await fetchReport();
    } catch (error) {
      console.error("Error approving count:", error);
      addNotification("Error al aprobar el conteo", "error");
    } finally {
      setIsApproving(false);
    }
  };
  const handleReject = async () => {
    if (!confirm("¿Rechazar este conteo? Se marcará como rechazado y no se actualizará el inventario.")) {
      return;
    }
    try {
      await inventoryCountService.updateCountStatus(countId, "rejected");
      addNotification("Conteo rechazado", "info");
      await fetchReport();
    } catch (error) {
      console.error("Error rejecting count:", error);
      addNotification("Error al rechazar el conteo", "error");
    }
  };
  const getItemColor = (item) => {
    if (item.countedStock === void 0) return "bg-slate-800";
    if (item.difference === 0) return "bg-green-900/30 border-green-700";
    if (item.difference < 0) return "bg-red-900/30 border-red-700";
    return "bg-amber-900/30 border-amber-700";
  };
  const getItemTextColor = (item) => {
    if (item.countedStock === void 0) return "text-slate-400";
    if (item.difference === 0) return "text-green-300";
    if (item.difference < 0) return "text-red-300";
    return "text-amber-300";
  };
  const filteredItems = report?.items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "exact") return item.difference === 0;
    if (filter === "less") return item.difference !== void 0 && item.difference < 0;
    if (filter === "more") return item.difference !== void 0 && item.difference > 0;
    return true;
  }) || [];
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.countedStock === void 0) return 1;
    if (b.countedStock === void 0) return -1;
    if (a.difference < 0 && b.difference >= 0) return -1;
    if (a.difference >= 0 && b.difference < 0) return 1;
    if (a.difference > 0 && b.difference <= 0) return -1;
    if (a.difference <= 0 && b.difference > 0) return 1;
    return 0;
  });
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 text-center text-slate-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4" }),
      "Cargando reporte..."
    ] });
  }
  if (!report) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-slate-400", children: "No se pudo cargar el reporte" });
  }
  const stats = report.statistics;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6 space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: report.count.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-slate-400", children: [
          "Creado: ",
          report.count.createdAt.toLocaleString(),
          " | Estado: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `font-semibold ${report.count.status === "approved" ? "text-green-400" : report.count.status === "rejected" ? "text-red-400" : report.count.status === "pending_approval" ? "text-amber-400" : "text-slate-400"}`, children: report.count.status === "approved" ? "Aprobado" : report.count.status === "rejected" ? "Rechazado" : report.count.status === "pending_approval" ? "Pendiente de Aprobación" : report.count.status === "in_progress" ? "En Progreso" : "Borrador" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onBack,
          className: "px-4 py-2 bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-500",
          children: "← Volver"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg p-4 border border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mb-1", children: "Total" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-slate-100", children: stats.totalProducts })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg p-4 border border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mb-1", children: "Contados" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-green-400", children: stats.countedProducts })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg p-4 border border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mb-1", children: "Pendientes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-amber-400", children: stats.pendingProducts })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-green-900/30 rounded-lg p-4 border border-green-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-green-400 mb-1", children: "Iguales" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-green-300", children: stats.exactMatches })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-red-900/30 rounded-lg p-4 border border-red-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-red-400 mb-1", children: "Menos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-red-300", children: stats.lessThanSystem })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-900/30 rounded-lg p-4 border border-amber-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-400 mb-1", children: "Más" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-amber-300", children: stats.moreThanSystem })
      ] })
    ] }),
    report.count.categoryGroups.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg p-4 border border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-100 mb-3", children: "URLs de Grupos" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: report.count.categoryGroups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between bg-slate-900/50 rounded p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-200", children: group.groupName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-400", children: [
            group.categoryIds.length,
            " categorías"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: group.url || "",
              readOnly: true,
              className: "bg-slate-700 border border-slate-600 rounded px-3 py-1 text-xs text-slate-300 w-64"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => {
                navigator.clipboard.writeText(group.url || "");
                addNotification("URL copiada al portapapeles", "success");
              },
              className: "px-3 py-1 bg-sky-600 text-white rounded text-xs hover:bg-sky-500",
              children: "Copiar"
            }
          )
        ] })
      ] }, group.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setFilter("all"),
          className: `px-4 py-2 rounded-md text-sm font-semibold ${filter === "all" ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-300"}`,
          children: [
            "Todos (",
            stats.totalProducts,
            ")"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setFilter("less"),
          className: `px-4 py-2 rounded-md text-sm font-semibold ${filter === "less" ? "bg-red-600 text-white" : "bg-slate-700 text-slate-300"}`,
          children: [
            "Menos (",
            stats.lessThanSystem,
            ")"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setFilter("more"),
          className: `px-4 py-2 rounded-md text-sm font-semibold ${filter === "more" ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-300"}`,
          children: [
            "Más (",
            stats.moreThanSystem,
            ")"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setFilter("exact"),
          className: `px-4 py-2 rounded-md text-sm font-semibold ${filter === "exact" ? "bg-green-600 text-white" : "bg-slate-700 text-slate-300"}`,
          children: [
            "Iguales (",
            stats.exactMatches,
            ")"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left", children: "Producto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-center", children: "Stock Sistema" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-center", children: "Stock Contado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-center", children: "Diferencia" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-center", children: "Estado" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: sortedItems.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "tr",
        {
          className: `border-b border-slate-700 ${getItemColor(item)} ${getItemTextColor(item)}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-4 py-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: item.productName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs opacity-75", children: item.productSku })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-center font-mono", children: item.systemStock }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-center font-mono", children: item.countedStock !== void 0 ? item.countedStock : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-center font-mono font-semibold", children: item.difference !== void 0 ? item.difference === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-green-400", children: "0" }) : item.difference < 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-400", children: item.difference }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-amber-400", children: [
              "+",
              item.difference
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-500", children: "-" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-center", children: item.countedStock === void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-1 bg-slate-700 rounded-full", children: "Pendiente" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-1 bg-green-900/50 text-green-300 rounded-full", children: "Contado" }) })
          ]
        },
        item.id
      )) })
    ] }) }),
    report.count.status !== "approved" && report.count.status !== "rejected" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-3 justify-end", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => handleReject(),
          className: "px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-500",
          children: "Rechazar"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => handleApprove(false),
          className: "px-4 py-2 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-500",
          children: "Aprobar (sin actualizar inventario)"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => handleApprove(true),
          disabled: isApproving,
          className: "px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 disabled:opacity-50",
          children: isApproving ? "Aprobando..." : "Aprobar y Actualizar Inventario"
        }
      )
    ] })
  ] });
};

const InventoryCountMobilePage = reactExports.lazy(() => __vitePreload(() => import('./InventoryCountMobilePage-6b5_EEJ3.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6]):void 0));
const InventoryCountReportsPageContainer = () => {
  const { session } = useAuth();
  const { inventoryCountService } = useServices();
  const { addNotification } = useNotification();
  const [counts, setCounts] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = reactExports.useState(false);
  const [selectedCountId, setSelectedCountId] = reactExports.useState(null);
  const [token, setToken] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token") || window.location.pathname.split("/count/")[1];
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);
  reactExports.useEffect(() => {
    if (!token) {
      fetchCounts();
    }
  }, [token]);
  const fetchCounts = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryCountService.getCounts();
      setCounts(data);
    } catch (error) {
      console.error("Error fetching counts:", error);
      addNotification("Error al cargar los conteos", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleCreateSuccess = (count) => {
    fetchCounts();
    addNotification(`Conteo "${count.name}" creado. URLs generadas.`, "success");
  };
  if (token) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-slate-900 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" }) }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(InventoryCountMobilePage, { token }) });
  }
  if (selectedCountId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      InventoryCountReportPage,
      {
        countId: selectedCountId,
        onBack: () => setSelectedCountId(null)
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-center gap-4 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Conteos de Inventario" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setIsCreateModalOpen(true),
          className: "px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 transition-colors flex items-center gap-2 whitespace-nowrap",
          children: "+ Crear Nuevo Conteo"
        }
      )
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center p-8 text-slate-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4" }),
      "Cargando conteos..."
    ] }) : counts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-4", children: "No hay conteos creados." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setIsCreateModalOpen(true),
          className: "px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500",
          children: "Crear Primer Conteo"
        }
      )
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Nombre" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Creado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Grupos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Progreso" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Estado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Acciones" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: counts.map((count) => {
        const stats = count.statistics || {
          totalProducts: 0,
          countedProducts: 0};
        const progress = stats.totalProducts > 0 ? Math.round(stats.countedProducts / stats.totalProducts * 100) : 0;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-100", children: count.name }),
            count.notes && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-1", children: count.notes })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: count.createdAt.toLocaleString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
            count.categoryGroups.length,
            " grupo(s)"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-slate-700 rounded-full h-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "bg-sky-600 h-2 rounded-full transition-all",
                  style: { width: `${progress}%` }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-slate-400 w-12 text-right", children: [
                progress,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
              stats.countedProducts,
              " / ",
              stats.totalProducts,
              " productos"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs px-2 py-1 rounded-full font-semibold ${count.status === "approved" ? "bg-green-900/50 text-green-300" : count.status === "rejected" ? "bg-red-900/50 text-red-300" : count.status === "pending_approval" ? "bg-amber-900/50 text-amber-300" : count.status === "in_progress" ? "bg-sky-900/50 text-sky-300" : "bg-slate-700 text-slate-300"}`, children: count.status === "approved" ? "Aprobado" : count.status === "rejected" ? "Rechazado" : count.status === "pending_approval" ? "Pendiente" : count.status === "in_progress" ? "En Progreso" : "Borrador" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setSelectedCountId(count.id),
              className: "text-sky-400 hover:text-sky-300 font-medium text-sm",
              children: "Ver Reporte"
            }
          ) })
        ] }, count.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CreateInventoryCountModal,
      {
        isOpen: isCreateModalOpen,
        onClose: () => setIsCreateModalOpen(false),
        onSuccess: handleCreateSuccess
      }
    )
  ] });
};

export { InventoryCountReportsPageContainer as default };
