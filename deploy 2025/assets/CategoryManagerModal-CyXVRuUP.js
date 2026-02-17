import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { e as useNotification } from './index-B4F2XZYo.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const CategoryManagerModal = ({ isOpen, onClose, onCategoriesUpdated }) => {
  const { inventoryService } = useServices();
  const [categories, setCategories] = reactExports.useState([]);
  const [editingCategory, setEditingCategory] = reactExports.useState(null);
  const [newName, setNewName] = reactExports.useState("");
  const [newCategoryName, setNewCategoryName] = reactExports.useState("");
  const [newParentId, setNewParentId] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const { addNotification } = useNotification();
  const fetchCategories = async () => {
    setIsLoading(true);
    const cats = await inventoryService.getUniqueCategories();
    setCategories(cats);
    setIsLoading(false);
  };
  reactExports.useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);
  const handleDelete = async (category) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"? Los productos en esta categoría quedarán sin clasificar.`)) {
      try {
        await inventoryService.deleteCategory(category.id);
        addNotification(`Categoría '${category.name}' eliminada.`, "success");
        await fetchCategories();
        onCategoriesUpdated();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        addNotification(`Error al eliminar: ${message}`, "error");
      }
    }
  };
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await inventoryService.createCategory(newCategoryName, newParentId);
      addNotification("Categoría creada.", "success");
      setNewCategoryName("");
      setNewParentId(null);
      await fetchCategories();
      onCategoriesUpdated();
    } catch (error) {
      addNotification(error instanceof Error ? error.message : "Error al crear.", "error");
    }
  };
  const parentCategories = categories.filter((c) => !c.parent_id);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-2xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: "Administrar Categorías" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleCreate, className: "space-y-3 mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: newCategoryName,
            onChange: (e) => setNewCategoryName(e.target.value),
            placeholder: "Nombre de la nueva categoría",
            className: "w-full bg-slate-700 border border-slate-600 rounded px-3 py-2",
            required: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: newParentId || "",
            onChange: (e) => setNewParentId(e.target.value || null),
            className: "w-full bg-slate-700 border border-slate-600 rounded px-3 py-2",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "-- Es una Categoría Principal --" }),
              parentCategories.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: cat.id, children: cat.name }, cat.id))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500", children: "Crear Categoría" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-slate-700 pt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-200 mb-3", children: "Categorías Existentes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-80 overflow-y-auto pr-2", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Cargando..." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-2", children: [
        parentCategories.map((parent) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 bg-slate-700/50 rounded-md", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-100 font-semibold", children: parent.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleDelete(parent), className: "text-red-400 hover:text-red-300 font-medium text-sm", children: "Eliminar" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "pl-6 mt-1 space-y-1", children: categories.filter((c) => c.parent_id === parent.id).map((child) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center justify-between p-2 bg-slate-700/30 rounded-md", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-200", children: child.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleDelete(child), className: "text-red-400 hover:text-red-300 font-medium text-sm", children: "Eliminar" }) })
          ] }, child.id)) })
        ] }, parent.id)),
        categories.length === 0 && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500 text-center py-4", children: "No has creado ninguna categoría." })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end pt-4 mt-4 border-t border-slate-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors", children: "Cerrar" }) })
  ] }) });
};

export { CategoryManagerModal as default };
