const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ClientFormModal-CFrRxKaq.js","assets/landing-DMNKFuas.js","assets/index-B4F2XZYo.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css","assets/MainLayout-C0Ev0ilC.js","assets/inventoryCountService-Bo8nZII3.js","assets/SettingsIcon-DbPfflvT.js","assets/ConfirmationModal-D0s46AqS.js","assets/AIClientSegmentation-BfAh_hDL.js","assets/CampaignCreatorModal-BktY079p.js","assets/ClientLoyaltyLogModal-BEIIWgXq.js"])))=>i.map(i=>d[i]);
import { e as useNotification, u as useAuth, _ as __vitePreload } from './index-B4F2XZYo.js';
import { j as jsxRuntimeExports, b as reactExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const ClientTable = ({ clients, isLoading, onEdit, onDelete, onViewLog }) => {
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando clientes..." });
  }
  if (clients.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No se encontraron clientes." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Nombre" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Info Adicional" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Puntos de Lealtad" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Deuda Actual" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Acciones" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: clients.map((client) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: client.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
        client.discountPercentage > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs bg-green-800 text-green-200 px-2 py-0.5 rounded-full", children: [
          client.discountPercentage,
          "% Descuento"
        ] }),
        client.has_credit && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs bg-sky-800 text-sky-200 px-2 py-0.5 rounded-full ml-2", children: "Crédito" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-mono text-amber-400", children: client.loyaltyPoints.toLocaleString() }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4 text-right font-mono text-red-400", children: [
        "$",
        (client.current_debt || 0).toFixed(2)
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onViewLog(client), className: "text-purple-400 hover:text-purple-300 font-medium", children: "Ver Historial" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onEdit(client), className: "text-sky-400 hover:text-sky-300 font-medium", children: "Editar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onDelete(client), className: "text-red-400 hover:text-red-300 font-medium", children: "Eliminar" })
      ] }) })
    ] }, client.id)) })
  ] }) });
};

const ClientFormModal = reactExports.lazy(() => __vitePreload(() => import('./ClientFormModal-CFrRxKaq.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8]):void 0));
const ConfirmationModal = reactExports.lazy(() => __vitePreload(() => import('./ConfirmationModal-D0s46AqS.js'),true              ?__vite__mapDeps([9,1]):void 0));
const AIClientSegmentation = reactExports.lazy(() => __vitePreload(() => import('./AIClientSegmentation-BfAh_hDL.js'),true              ?__vite__mapDeps([10,1,6,2,3,4,5,7,8]):void 0));
const CampaignCreatorModal = reactExports.lazy(() => __vitePreload(() => import('./CampaignCreatorModal-BktY079p.js'),true              ?__vite__mapDeps([11,1,6,2,3,4,5,7,8]):void 0));
const ClientLoyaltyLogModal = reactExports.lazy(() => __vitePreload(() => import('./ClientLoyaltyLogModal-BEIIWgXq.js'),true              ?__vite__mapDeps([12,1,6,2,3,4,5,7,8]):void 0));
const ClientsPage = ({ userRole, onNavigate }) => {
  const { clientService } = useServices();
  const { addNotification } = useNotification();
  const { requiresPin, hasPermission } = useAuth();
  const [clients, setClients] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [isFormOpen, setIsFormOpen] = reactExports.useState(false);
  const [editingClient, setEditingClient] = reactExports.useState(null);
  const [clientToDelete, setClientToDelete] = reactExports.useState(null);
  const [isSegmenterOpen, setIsSegmenterOpen] = reactExports.useState(false);
  const [isCampaignCreatorOpen, setIsCampaignCreatorOpen] = reactExports.useState(false);
  const [prefilledSegment, setPrefilledSegment] = reactExports.useState();
  const [logClient, setLogClient] = reactExports.useState(null);
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "clients.manage";
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey) || hasPermission(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, hasPermission, permissionKey]);
  const fetchClients = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await clientService.getAllClients();
      setClients(data);
    } catch (error) {
      addNotification("Error al cargar los clientes.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [clientService, addNotification]);
  reactExports.useEffect(() => {
    if (isUnlocked) {
      fetchClients();
    }
  }, [fetchClients, isUnlocked]);
  const handleSave = async (data) => {
    try {
      if (editingClient) {
        await clientService.updateClient({ ...data, id: editingClient.id, loyaltyPoints: editingClient.loyaltyPoints });
        addNotification("Cliente actualizado.", "success");
      } else {
        await clientService.addClient(data);
        addNotification("Cliente creado.", "success");
      }
      setIsFormOpen(false);
      setEditingClient(null);
      fetchClients();
    } catch (error) {
      addNotification("Error al guardar el cliente.", "error");
    }
  };
  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      await clientService.deleteClient(clientToDelete.id);
      addNotification("Cliente eliminado.", "success");
      setClientToDelete(null);
      fetchClients();
    } catch (error) {
      addNotification("Error al eliminar el cliente.", "error");
    }
  };
  const handleCreateCampaign = (segmentName) => {
    setIsSegmenterOpen(false);
    setPrefilledSegment(segmentName);
    setIsCampaignCreatorOpen(true);
  };
  const handleOpenAdd = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };
  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setIsFormOpen(true);
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
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Gestión de Clientes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsSegmenterOpen(true), className: "px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-500", children: "Segmentar con IA" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleOpenAdd, className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500", children: "+ Nuevo Cliente" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ClientTable,
      {
        clients,
        isLoading,
        onEdit: handleOpenEdit,
        onDelete: setClientToDelete,
        onViewLog: setLogClient
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}), children: [
      isFormOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ClientFormModal,
        {
          isOpen: isFormOpen,
          onClose: () => setIsFormOpen(false),
          onSubmit: handleSave,
          initialData: editingClient
        }
      ),
      clientToDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ConfirmationModal,
        {
          isOpen: !!clientToDelete,
          onClose: () => setClientToDelete(null),
          onConfirm: handleDelete,
          title: "Confirmar Eliminación",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            '¿Estás seguro de que quieres eliminar al cliente "',
            clientToDelete.name,
            '"?'
          ] })
        }
      ),
      isSegmenterOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        AIClientSegmentation,
        {
          isOpen: isSegmenterOpen,
          onClose: () => setIsSegmenterOpen(false),
          onCreateCampaign: handleCreateCampaign
        }
      ),
      isCampaignCreatorOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        CampaignCreatorModal,
        {
          isOpen: isCampaignCreatorOpen,
          onClose: () => setIsCampaignCreatorOpen(false),
          onSuccess: () => setIsCampaignCreatorOpen(false),
          prefilledSegment
        }
      ),
      logClient && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ClientLoyaltyLogModal,
        {
          isOpen: !!logClient,
          onClose: () => setLogClient(null),
          client: logClient
        }
      )
    ] })
  ] });
};

export { ClientsPage as default };
