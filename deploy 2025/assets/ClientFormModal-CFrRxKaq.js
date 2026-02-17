import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useAuth } from './index-B4F2XZYo.js';
import { u as useServices, b as usePersistentState } from './MainLayout-C0Ev0ilC.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const createEmptyClientFormState = () => ({
  name: "",
  discountPercentage: 0,
  email: "",
  phone: "",
  has_credit: false,
  credit_limit: 0,
  priceListId: ""
});
const mapClientToFormState = (client) => ({
  name: client.name,
  discountPercentage: client.discountPercentage,
  email: client.email || "",
  phone: client.phone || "",
  has_credit: client.has_credit || false,
  credit_limit: client.credit_limit || 0,
  priceListId: client.priceListId || ""
});
const ClientFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { session } = useAuth();
  const { priceListService } = useServices();
  const isSolopreneur = session?.organization?.subscriptionTier === "solopreneur";
  const multiPriceEnabled = !!session?.organization?.multiPriceEnabled;
  const [priceLists, setPriceLists] = reactExports.useState([]);
  const [isLoadingPriceLists, setIsLoadingPriceLists] = reactExports.useState(false);
  const persistenceKey = initialData ? `editing-client-${initialData.id}` : "new-client";
  const [clientFormState, setClientFormState] = usePersistentState(persistenceKey, null);
  const derivedInitialClientState = reactExports.useMemo(
    () => initialData ? mapClientToFormState(initialData) : createEmptyClientFormState(),
    [initialData]
  );
  const client = clientFormState ?? derivedInitialClientState;
  const isEditing = !!initialData;
  reactExports.useEffect(() => {
    if (!isOpen) return;
    if (clientFormState === null) {
      setClientFormState(derivedInitialClientState);
    }
  }, [isOpen, clientFormState, derivedInitialClientState, setClientFormState]);
  reactExports.useEffect(() => {
    if (!isOpen && clientFormState !== null) {
      setClientFormState(null);
    }
  }, [isOpen, clientFormState, setClientFormState]);
  reactExports.useEffect(() => {
    if (!multiPriceEnabled || !isOpen) {
      setPriceLists([]);
      return;
    }
    let isMounted = true;
    const loadLists = async () => {
      setIsLoadingPriceLists(true);
      try {
        const lists = await priceListService.getPriceLists();
        if (!isMounted) return;
        setPriceLists(lists);
      } catch (error) {
        console.error("Error loading price lists for clients", error);
      } finally {
        if (isMounted) setIsLoadingPriceLists(false);
      }
    };
    loadLists();
    return () => {
      isMounted = false;
    };
  }, [multiPriceEnabled, isOpen, priceListService]);
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClientFormState((prev) => {
      const baseState = prev ?? derivedInitialClientState;
      return {
        ...baseState,
        [name]: type === "checkbox" ? checked : type === "number" ? parseFloat(value) : value
      };
    });
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(client);
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: isEditing ? "Editar Cliente" : "Nuevo Cliente" }),
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
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-slate-300 mb-1", children: "Nombre Completo o Razón Social" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "name", id: "name", value: client.name, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-slate-300 mb-1", children: "Email (Opcional)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", name: "email", id: "email", value: client.email, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "phone", className: "block text-sm font-medium text-slate-300 mb-1", children: "Teléfono (Opcional)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "tel", name: "phone", id: "phone", value: client.phone, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "discountPercentage", className: "block text-sm font-medium text-slate-300 mb-1", children: "Porcentaje de Descuento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", name: "discountPercentage", id: "discountPercentage", value: client.discountPercentage, onChange: handleChange, min: "0", max: "100", step: "1", className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
      ] }),
      multiPriceEnabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "priceListId", className: "block text-sm font-medium text-slate-300 mb-1", children: "Lista de Precios" }),
        isLoadingPriceLists ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500", children: "Cargando listas..." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            name: "priceListId",
            id: "priceListId",
            value: client.priceListId || "",
            onChange: handleChange,
            className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Precio base" }),
              priceLists.map((list) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: list.id, children: list.name }, list.id))
            ]
          }
        )
      ] }),
      !isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", name: "has_credit", checked: client.has_credit, onChange: handleChange, className: "form-checkbox h-5 w-5 bg-slate-700 text-sky-500 rounded" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-slate-200", children: "Habilitar Crédito para este Cliente" })
        ] }),
        client.has_credit && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 pl-8", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "credit_limit", className: "block text-sm font-medium text-slate-300 mb-1", children: "Límite de Crédito ($)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", name: "credit_limit", id: "credit_limit", value: client.credit_limit, onChange: handleChange, min: "0", step: "100", className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors", children: "Guardar" })
      ] })
    ] })
  ] }) });
};

export { ClientFormModal as default };
