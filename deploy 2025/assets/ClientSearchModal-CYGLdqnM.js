import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import ClientFormModal from './ClientFormModal-CFrRxKaq.js';
import './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const ClientSearchModal = ({ isOpen, onClose, onSelectClient }) => {
  const { clientService } = useServices();
  const [query, setQuery] = reactExports.useState("");
  const [results, setResults] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [isCreating, setIsCreating] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setIsCreating(false);
      return;
    }
    const handler = setTimeout(async () => {
      setIsLoading(true);
      const clients = await clientService.searchClients(query);
      setResults(clients);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(handler);
  }, [query, isOpen, clientService]);
  const handleCreateAndSelect = async (clientData) => {
    try {
      const newClient = await clientService.addClient(clientData);
      onSelectClient(newClient);
    } catch (error) {
      console.error("Failed to create client from POS:", error);
      alert("No se pudo crear el cliente.");
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start pt-20 z-50",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700",
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Buscar Cliente" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsCreating(true), className: "px-3 py-1.5 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 text-sm", children: "+ Crear Nuevo Cliente" }),
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
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  value: query,
                  onChange: (e) => setQuery(e.target.value),
                  placeholder: "Buscar por nombre...",
                  className: "w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500",
                  autoFocus: true
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 max-h-80 overflow-y-auto", children: [
                isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-slate-400", children: "Buscando..." }),
                !isLoading && results.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-slate-400", children: "No se encontraron clientes." }),
                !isLoading && results.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: results.map((client) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "li",
                  {
                    onClick: () => onSelectClient(client),
                    className: "px-4 py-3 cursor-pointer bg-slate-700/50 rounded-md hover:bg-sky-700/50 flex justify-between items-center transition-colors",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-100", children: client.name }),
                      client.discountPercentage > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-green-400", children: [
                        client.discountPercentage,
                        "% de descuento"
                      ] })
                    ] })
                  },
                  client.id
                )) })
              ] })
            ]
          }
        )
      }
    ),
    isCreating && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ClientFormModal,
      {
        isOpen: isCreating,
        onClose: () => setIsCreating(false),
        onSubmit: handleCreateAndSelect
      }
    )
  ] });
};

export { ClientSearchModal as default };
