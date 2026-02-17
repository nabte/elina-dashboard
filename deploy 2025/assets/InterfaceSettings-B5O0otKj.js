import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useAuth, e as useNotification } from './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const InterfaceSettings = () => {
  const { session, updateOrganizationData } = useAuth();
  const { addNotification } = useNotification();
  const [settings, setSettings] = reactExports.useState({ showProductImages: true });
  const [isLoading, setIsLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (session?.organization?.uiSettings) {
      setSettings(session.organization.uiSettings);
    }
  }, [session]);
  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateOrganizationData({ uiSettings: settings });
      addNotification("Configuración de interfaz guardada.", "success");
    } catch (error) {
      addNotification("Error al guardar la configuración.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-3xl mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-200 dark:border-slate-700", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 mb-4", children: "Configuración de Interfaz" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between cursor-pointer p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-slate-800 dark:text-slate-200", children: "Mostrar imágenes de productos en POS e Inventario" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: settings.showProductImages,
              onChange: () => handleToggle("showProductImages"),
              className: "sr-only peer"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: handleSave,
          disabled: isLoading,
          className: "w-full px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed",
          children: isLoading ? "Guardando..." : "Guardar Configuración"
        }
      )
    ] })
  ] }) });
};

export { InterfaceSettings as default };
