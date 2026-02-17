import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices, k as generateCampaignContent } from './MainLayout-C0Ev0ilC.js';
import { e as useNotification } from './index-B4F2XZYo.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const CampaignCreatorModal = ({ isOpen, onClose, onSuccess, initialCampaign, prefilledSegment }) => {
  const { marketingService } = useServices();
  const { addNotification } = useNotification();
  const [campaign, setCampaign] = reactExports.useState({ name: "", targetSegment: "", subject: "", body: "" });
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [isAILoading, setIsAILoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (isOpen) {
      if (initialCampaign) {
        setCampaign(initialCampaign);
      } else {
        setCampaign({ name: "", targetSegment: prefilledSegment || "", subject: "", body: "" });
      }
    }
  }, [isOpen, initialCampaign, prefilledSegment]);
  const handleChange = (e) => {
    setCampaign((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleGenerateContent = async () => {
    if (!campaign.targetSegment || !campaign.name) {
      addNotification("Por favor, define un nombre de campaña y un segmento objetivo primero.", "warning");
      return;
    }
    setIsAILoading(true);
    try {
      const result = await generateCampaignContent(campaign.targetSegment, campaign.name);
      const content = JSON.parse(result);
      if (content.subject && content.body) {
        setCampaign((prev) => ({ ...prev, subject: content.subject, body: content.body }));
      }
    } catch (error) {
      addNotification("Error al generar contenido con IA.", "error");
    } finally {
      setIsAILoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await marketingService.saveCampaign({
        id: initialCampaign?.id,
        ...campaign,
        status: initialCampaign?.status || "Borrador"
      });
      addNotification(`Campaña '${campaign.name}' guardada.`, "success");
      onSuccess();
    } catch (error) {
      addNotification("Error al guardar la campaña.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-3xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: initialCampaign ? "Editar Campaña" : "Nueva Campaña" }),
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { name: "name", value: campaign.name, onChange: handleChange, placeholder: "Nombre de la Campaña", className: "w-full bg-slate-700 p-2 rounded", required: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { name: "targetSegment", value: campaign.targetSegment, onChange: handleChange, placeholder: "Segmento Objetivo", className: "w-full bg-slate-700 p-2 rounded", required: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { name: "subject", value: campaign.subject, onChange: handleChange, placeholder: "Asunto del Email", className: "w-full bg-slate-700 p-2 rounded pr-28", required: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleGenerateContent, disabled: isAILoading, className: "absolute right-1 top-1 px-2 py-1 text-xs bg-purple-600 font-semibold rounded hover:bg-purple-500 disabled:bg-slate-500", children: isAILoading ? "..." : "Generar con IA" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { name: "body", value: campaign.body, onChange: handleChange, placeholder: "Cuerpo del email...", rows: 8, className: "w-full bg-slate-700 p-2 rounded", required: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 rounded", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "px-4 py-2 bg-sky-600 rounded disabled:bg-slate-500", children: isLoading ? "Guardando..." : "Guardar Campaña" })
      ] })
    ] })
  ] }) });
};

export { CampaignCreatorModal as default };
