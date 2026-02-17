import { j as jsxRuntimeExports, b as reactExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { e as useNotification, u as useAuth } from './index-B4F2XZYo.js';
import CampaignCreatorModal from './CampaignCreatorModal-BktY079p.js';
import AIClientSegmentation from './AIClientSegmentation-BfAh_hDL.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const statusStyles = {
  "Borrador": "bg-slate-600 text-slate-200",
  "Enviada": "bg-green-800 text-green-200"
};
const CampaignTable = ({ campaigns, onEdit, onSend }) => {
  if (campaigns.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No has creado ninguna campaña de marketing." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Nombre Campaña" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Segmento" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Fecha Creación" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Estado" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Acciones" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: campaigns.map((campaign) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-semibold", children: campaign.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: campaign.targetSegment }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: new Date(campaign.createdDate).toLocaleDateString() }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[campaign.status]}`, children: campaign.status }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onEdit(campaign), className: "text-sky-400 font-medium", children: "Editar" }),
        campaign.status === "Borrador" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onSend(campaign), className: "text-green-400 font-medium", children: "Enviar" })
      ] }) })
    ] }, campaign.id)) })
  ] }) });
};

const MarketingPage = ({ onNavigate }) => {
  const { marketingService } = useServices();
  const { addNotification } = useNotification();
  const { requiresPin } = useAuth();
  const [campaigns, setCampaigns] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = reactExports.useState(false);
  const [isSegmenterOpen, setIsSegmenterOpen] = reactExports.useState(false);
  const [editingCampaign, setEditingCampaign] = reactExports.useState(null);
  const [prefilledSegment, setPrefilledSegment] = reactExports.useState();
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "clients.manage";
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, permissionKey]);
  const fetchCampaigns = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await marketingService.getCampaigns();
      setCampaigns(data.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()));
    } catch (error) {
      addNotification("Error al cargar campañas.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [marketingService, addNotification]);
  reactExports.useEffect(() => {
    if (isUnlocked) {
      fetchCampaigns();
    }
  }, [fetchCampaigns, isUnlocked]);
  const handleOpenCreator = (campaign = null, segment) => {
    setEditingCampaign(campaign);
    setPrefilledSegment(segment);
    setIsCreatorOpen(true);
  };
  const handleCloseModals = () => {
    setIsCreatorOpen(false);
    setIsSegmenterOpen(false);
    setEditingCampaign(null);
    setPrefilledSegment(void 0);
  };
  const handleSaveSuccess = () => {
    handleCloseModals();
    fetchCampaigns();
  };
  const handleCreateFromSegment = (segmentName) => {
    setIsSegmenterOpen(false);
    handleOpenCreator(null, segmentName);
  };
  const handleSendCampaign = async (campaign) => {
    if (window.confirm(`¿Estás seguro de que quieres "enviar" la campaña "${campaign.name}"? Esta acción no se puede deshacer.`)) {
      try {
        await marketingService.saveCampaign({ ...campaign, status: "Enviada" });
        addNotification("Campaña enviada.", "success");
        fetchCampaigns();
      } catch (error) {
        addNotification("Error al enviar la campaña.", "error");
      }
    }
  };
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col sm:flex-row justify-between items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Marketing por Email" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsSegmenterOpen(true), className: "px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-500", children: "Segmentar Clientes con IA" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleOpenCreator(), className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500", children: "+ Nueva Campaña" })
      ] })
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Cargando..." }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CampaignTable, { campaigns, onEdit: handleOpenCreator, onSend: handleSendCampaign }),
    isCreatorOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      CampaignCreatorModal,
      {
        isOpen: isCreatorOpen,
        onClose: handleCloseModals,
        onSuccess: handleSaveSuccess,
        initialCampaign: editingCampaign,
        prefilledSegment
      }
    ),
    isSegmenterOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      AIClientSegmentation,
      {
        isOpen: isSegmenterOpen,
        onClose: handleCloseModals,
        onCreateCampaign: handleCreateFromSegment
      }
    )
  ] });
};

export { MarketingPage as default };
