import { j as jsxRuntimeExports, b as reactExports } from './landing-DMNKFuas.js';
import { b as usePersistentState, u as useServices } from './MainLayout-C0Ev0ilC.js';
import { e as useNotification } from './index-B4F2XZYo.js';
import ConfirmationModal from './ConfirmationModal-D0s46AqS.js';
import { P as ProductPickerModal } from './ProductPickerModal-BgJ2gb1c.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const ProviderTable = ({ providers, isLoading, onEdit, onDelete, onManageCatalog }) => {
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando proveedores..." });
  }
  if (providers.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No se encontraron proveedores." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Nombre" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Contacto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Teléfono" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Email" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Crédito" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Acciones" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: providers.map((provider) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: provider.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: provider.contactPerson }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: provider.phone }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: provider.email }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: provider.creditDays && provider.creditDays > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-2 py-1 rounded-full bg-slate-700 text-xs text-slate-200", children: [
        provider.creditDays,
        " días"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-400", children: "Contado" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap justify-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onManageCatalog(provider), className: "text-emerald-400 hover:text-emerald-300 font-medium", children: "Catálogo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onEdit(provider), className: "text-sky-400 hover:text-sky-300 font-medium", children: "Editar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onDelete(provider), className: "text-red-400 hover:text-red-300 font-medium", children: "Eliminar" })
      ] }) })
    ] }, provider.id)) })
  ] }) });
};

const createEmptyProviderFormState = () => ({
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  creditDays: "",
  vendorReferenceId: ""
});
const mapProviderToFormState = (provider) => ({
  name: provider.name,
  contactPerson: provider.contactPerson ?? "",
  phone: provider.phone ?? "",
  email: provider.email ?? "",
  address: provider.address ?? "",
  creditDays: provider.creditDays != null ? provider.creditDays.toString() : "",
  vendorReferenceId: provider.vendorReferenceId ?? ""
});
const ProviderFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const persistenceKey = initialData ? `editing-provider-${initialData.id}` : "new-provider";
  const [providerFormState, setProviderFormState] = usePersistentState(persistenceKey, null);
  const derivedInitialProviderState = reactExports.useMemo(
    () => initialData ? mapProviderToFormState(initialData) : createEmptyProviderFormState(),
    [initialData]
  );
  const provider = providerFormState ?? derivedInitialProviderState;
  const isEditing = !!initialData;
  reactExports.useEffect(() => {
    if (!isOpen) return;
    if (providerFormState === null) {
      setProviderFormState(derivedInitialProviderState);
    }
  }, [isOpen, providerFormState, derivedInitialProviderState, setProviderFormState]);
  reactExports.useEffect(() => {
    if (!isOpen && providerFormState !== null) {
      setProviderFormState(null);
    }
  }, [isOpen, providerFormState, setProviderFormState]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProviderFormState((prev) => {
      const baseState = prev ?? derivedInitialProviderState;
      return {
        ...baseState,
        [name]: value
      };
    });
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const creditDaysValue = parseInt(provider.creditDays, 10);
    const payload = {
      name: provider.name,
      contactPerson: provider.contactPerson,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      creditDays: Number.isFinite(creditDaysValue) && creditDaysValue > 0 ? creditDaysValue : 0,
      vendorReferenceId: provider.vendorReferenceId?.trim() || void 0
    };
    const dataToSend = initialData ? { ...payload, id: initialData.id } : payload;
    onSubmit(dataToSend);
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: isEditing ? "Editar Proveedor" : "Nuevo Proveedor" }),
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
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-slate-300 mb-1", children: "Nombre" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "name", id: "name", value: provider.name, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "contactPerson", className: "block text-sm font-medium text-slate-300 mb-1", children: "Persona de Contacto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "contactPerson", id: "contactPerson", value: provider.contactPerson, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "phone", className: "block text-sm font-medium text-slate-300 mb-1", children: "Teléfono" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "tel", name: "phone", id: "phone", value: provider.phone, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-slate-300 mb-1", children: "Email" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", name: "email", id: "email", value: provider.email, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "address", className: "block text-sm font-medium text-slate-300 mb-1", children: "Dirección" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "address", id: "address", value: provider.address, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "vendorReferenceId", className: "block text-sm font-medium text-slate-300 mb-1", children: "ID de referencia del proveedor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              name: "vendorReferenceId",
              id: "vendorReferenceId",
              value: provider.vendorReferenceId,
              onChange: handleChange,
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
              placeholder: "Ej. código en PDF"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Se usa para relacionar las referencias del proveedor en importaciones de compras." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "creditDays", className: "block text-sm font-medium text-slate-300 mb-1", children: "Días de crédito" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              name: "creditDays",
              id: "creditDays",
              min: "0",
              value: provider.creditDays,
              onChange: handleChange,
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Se usa para programar recordatorios de pago. Deja 0 si pagas de contado." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors", children: "Guardar" })
      ] })
    ] })
  ] }) });
};

const generateTempId = () => typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `tmp-${Date.now()}-${Math.random()}`;
const mapCatalogToRows = (catalog) => {
  return catalog.map((item) => ({
    tempId: item.id || generateTempId(),
    id: item.id,
    vendorSku: item.vendorSku,
    vendorDescription: item.vendorDescription,
    productId: item.productId,
    productName: item.productName
  }));
};
const createEmptyRow = () => ({
  tempId: generateTempId(),
  vendorSku: ""
});
const ProviderCatalogModal = ({ provider, isOpen, onClose }) => {
  const { providerService } = useServices();
  const { addNotification } = useNotification();
  const persistenceKey = reactExports.useMemo(() => `provider-catalog-${provider.id}`, [provider.id]);
  const [rowsState, setRowsState] = usePersistentState(persistenceKey, null);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [isSaving, setIsSaving] = reactExports.useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = reactExports.useState(false);
  const [activeRowId, setActiveRowId] = reactExports.useState(null);
  const rows = rowsState ?? [];
  reactExports.useEffect(() => {
    if (!isOpen) return;
    if (rowsState !== null) return;
    let isMounted = true;
    setIsLoading(true);
    providerService.getProviderCatalog(provider.id).then((data) => {
      if (!isMounted) return;
      setRowsState(mapCatalogToRows(data));
    }).catch((error) => {
      console.error("Error fetching provider catalog", error);
      addNotification("No pudimos cargar el catálogo del proveedor.", "error");
      setRowsState([]);
    }).finally(() => {
      if (isMounted) setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, provider.id, providerService, addNotification, rowsState, setRowsState]);
  const openProductPicker = (rowId) => {
    setActiveRowId(rowId);
    setIsProductPickerOpen(true);
  };
  const handleProductSelected = (product) => {
    if (!activeRowId) return;
    setRowsState((prev) => {
      const base = prev ?? rows;
      return base.map(
        (row) => row.tempId === activeRowId ? { ...row, productId: product.id, productName: product.name } : row
      );
    });
  };
  const handleAddRow = () => {
    setRowsState((prev) => {
      const base = prev ?? rows;
      return [...base, createEmptyRow()];
    });
  };
  const handleUpdateRow = (tempId, changes) => {
    setRowsState((prev) => {
      const base = prev ?? rows;
      return base.map((row) => row.tempId === tempId ? { ...row, ...changes } : row);
    });
  };
  const handleDeleteRow = async (row) => {
    if (row.id) {
      try {
        await providerService.deleteProviderCatalogEntry(row.id);
        addNotification("Registro eliminado.", "success");
      } catch (error) {
        console.error("Error deleting catalog entry", error);
        addNotification("No pudimos eliminar el registro.", "error");
        return;
      }
    }
    setRowsState((prev) => {
      const base = prev ?? rows;
      return base.filter((r) => r.tempId !== row.tempId);
    });
  };
  const handleSave = async () => {
    const validRows = rows.filter((row) => row.vendorSku.trim().length > 0 && row.productId);
    if (validRows.length === 0) {
      addNotification("Agrega al menos un producto con referencia del proveedor.", "warning");
      return;
    }
    setIsSaving(true);
    try {
      await providerService.upsertProviderCatalog(provider.id, validRows.map((row) => ({
        id: row.id,
        vendorSku: row.vendorSku.trim(),
        vendorDescription: row.vendorDescription?.trim(),
        productId: row.productId
      })));
      addNotification("Catálogo guardado.", "success");
      setRowsState(null);
      onClose();
    } catch (error) {
      console.error("Error saving provider catalog", error);
      addNotification("No pudimos guardar el catálogo.", "error");
    } finally {
      setIsSaving(false);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 border-b border-slate-800 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-semibold text-slate-100", children: "Catálogo del proveedor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: provider.name })
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 overflow-y-auto flex-1 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Relaciona los códigos del proveedor con tus productos para que las importaciones desde PDF/CSV se llenen automáticamente." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleAddRow, className: "px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 hover:bg-slate-700", children: "+ Agregar referencia" }) }),
        isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Cargando catálogo..." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto border border-slate-800 rounded-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-slate-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-slate-800 text-xs uppercase text-slate-400", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2", children: "Referencia proveedor" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2 w-1/3", children: "Descripción proveedor" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2", children: "Producto en Ryze" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2 text-center", children: "Acciones" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-slate-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 align-top", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  value: row.vendorSku,
                  onChange: (e) => handleUpdateRow(row.tempId, { vendorSku: e.target.value }),
                  className: "w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500",
                  placeholder: "SKU / ID proveedor"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 align-top", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "textarea",
                {
                  value: row.vendorDescription ?? "",
                  onChange: (e) => handleUpdateRow(row.tempId, { vendorDescription: e.target.value }),
                  rows: 2,
                  className: "w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500",
                  placeholder: "Descripción opcional del proveedor"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 align-top", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 bg-slate-800 border border-slate-700 rounded-md", children: row.productId ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-100", children: row.productName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500", children: row.productId })
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500", children: "Sin producto asignado" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => openProductPicker(row.tempId),
                    className: "text-sm text-sky-400 hover:text-sky-300 font-medium",
                    children: "Buscar producto"
                  }
                )
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 align-top text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => handleDeleteRow(row),
                  className: "text-sm text-red-400 hover:text-red-300",
                  children: "Eliminar"
                }
              ) })
            ] }, row.tempId)),
            rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, className: "px-4 py-6 text-center text-slate-500", children: "Aún no hay referencias guardadas." }) })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 border-t border-slate-800 flex justify-end gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onClose,
            className: "px-4 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800",
            disabled: isSaving,
            children: "Cancelar"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleSave,
            className: "px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-60",
            disabled: isSaving,
            children: isSaving ? "Guardando..." : "Guardar catálogo"
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
        title: "Selecciona el producto"
      }
    )
  ] });
};

const ProvidersPage = () => {
  const { providerService } = useServices();
  const { addNotification } = useNotification();
  const [providers, setProviders] = reactExports.useState(null);
  const isLoading = providers === null;
  const [isFormOpen, setIsFormOpen] = reactExports.useState(false);
  const [editingProvider, setEditingProvider] = reactExports.useState(null);
  const [providerToDelete, setProviderToDelete] = reactExports.useState(null);
  const [catalogProvider, setCatalogProvider] = reactExports.useState(null);
  const fetchProviders = reactExports.useCallback(async () => {
    try {
      const data = await providerService.getAllProviders();
      setProviders(data);
    } catch (error) {
      addNotification("Error al cargar los proveedores.", "error");
      setProviders([]);
    }
  }, [providerService, addNotification]);
  reactExports.useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);
  const handleSave = async (data) => {
    try {
      if (editingProvider) {
        await providerService.updateProvider({ ...data, id: editingProvider.id });
        addNotification("Proveedor actualizado.", "success");
      } else {
        await providerService.addProvider(data);
        addNotification("Proveedor creado.", "success");
      }
      setIsFormOpen(false);
      setEditingProvider(null);
      fetchProviders();
    } catch (error) {
      addNotification("Error al guardar el proveedor.", "error");
    }
  };
  const handleDelete = async () => {
    if (!providerToDelete) return;
    try {
      await providerService.deleteProvider(providerToDelete.id);
      addNotification("Proveedor eliminado.", "success");
      setProviderToDelete(null);
      fetchProviders();
    } catch (error) {
      addNotification("Error al eliminar el proveedor.", "error");
    }
  };
  const handleOpenAdd = () => {
    setEditingProvider(null);
    setIsFormOpen(true);
  };
  const handleOpenEdit = (provider) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col sm:flex-row justify-between items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Gestión de Proveedores" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: handleOpenAdd,
          className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500",
          children: "+ Nuevo Proveedor"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ProviderTable,
      {
        providers: providers || [],
        isLoading,
        onEdit: handleOpenEdit,
        onDelete: setProviderToDelete,
        onManageCatalog: setCatalogProvider
      }
    ),
    isFormOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ProviderFormModal,
      {
        isOpen: isFormOpen,
        onClose: () => setIsFormOpen(false),
        onSubmit: handleSave,
        initialData: editingProvider
      }
    ),
    providerToDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: !!providerToDelete,
        onClose: () => setProviderToDelete(null),
        onConfirm: handleDelete,
        title: "Confirmar Eliminación",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          '¿Seguro que quieres eliminar al proveedor "',
          providerToDelete.name,
          '"?'
        ] })
      }
    ),
    catalogProvider && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ProviderCatalogModal,
      {
        provider: catalogProvider,
        isOpen: !!catalogProvider,
        onClose: () => setCatalogProvider(null)
      }
    )
  ] });
};

export { ProvidersPage as default };
