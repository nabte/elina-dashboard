const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/CommissionRuleFormModal-mo-Sg_Mv.js","assets/landing-DMNKFuas.js","assets/MainLayout-C0Ev0ilC.js","assets/index-B4F2XZYo.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css","assets/inventoryCountService-Bo8nZII3.js","assets/SettingsIcon-DbPfflvT.js","assets/ConfirmationModal-D0s46AqS.js"])))=>i.map(i=>d[i]);
import { e as useNotification, u as useAuth, _ as __vitePreload } from './index-B4F2XZYo.js';
import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { f as formatCurrency } from './formatting-BolSclPB.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const CommissionRuleFormModal = reactExports.lazy(() => __vitePreload(() => import('./CommissionRuleFormModal-mo-Sg_Mv.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8]):void 0));
const ConfirmationModal = reactExports.lazy(() => __vitePreload(() => import('./ConfirmationModal-D0s46AqS.js'),true              ?__vite__mapDeps([9,1]):void 0));
const CommissionManagementPage = ({ onNavigate }) => {
  const { commissionService } = useServices();
  const { addNotification } = useNotification();
  const { requiresPin, hasPermission } = useAuth();
  const [rules, setRules] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [isFormOpen, setIsFormOpen] = reactExports.useState(false);
  const [editingRule, setEditingRule] = reactExports.useState(null);
  const [ruleToDelete, setRuleToDelete] = reactExports.useState(null);
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "employees.manage";
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey) || hasPermission(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, hasPermission, permissionKey]);
  const fetchRules = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await commissionService.getCommissionRules();
      setRules(data);
    } catch (error) {
      addNotification("Error al cargar las reglas de comisión.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [commissionService, addNotification]);
  reactExports.useEffect(() => {
    if (isUnlocked) {
      fetchRules();
    }
  }, [fetchRules, isUnlocked]);
  const handleSave = async () => {
    addNotification("Regla de comisión guardada.", "success");
    setIsFormOpen(false);
    setEditingRule(null);
    fetchRules();
  };
  const handleDelete = async () => {
    if (!ruleToDelete) return;
    try {
      await commissionService.deleteCommissionRule(ruleToDelete.id);
      addNotification("Regla eliminada.", "success");
      setRuleToDelete(null);
      fetchRules();
    } catch (error) {
      addNotification("Error al eliminar. La regla podría estar en uso.", "error");
    }
  };
  const formatValue = (rule) => {
    switch (rule.type) {
      case "percentage_sale":
      case "percentage_profit":
        return `${rule.value}%`;
      case "fixed_amount_per_item":
        return formatCurrency(rule.value, "USD");
    }
  };
  const formatType = (type) => {
    switch (type) {
      case "percentage_sale":
        return "% de la Venta";
      case "percentage_profit":
        return "% de la Ganancia";
      case "fixed_amount_per_item":
        return "Monto Fijo / U.";
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
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Gestión de Comisiones" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            setEditingRule(null);
            setIsFormOpen(true);
          },
          className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500",
          children: "+ Nueva Regla de Comisión"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Nombre Regla" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Valor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Aplica A" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Objetivo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Acciones" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, className: "text-center p-4", children: "Cargando..." }) }) : rules.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-semibold", children: rule.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: formatType(rule.type) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-mono", children: formatValue(rule) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 capitalize", children: rule.applies_to_id || rule.applies_to_type.replace("_", " ") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 capitalize", children: rule.target_id || rule.target_type.replace("_", " ") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
              setEditingRule(rule);
              setIsFormOpen(true);
            }, className: "text-sky-400 font-medium", children: "Editar" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setRuleToDelete(rule), className: "text-red-400 font-medium", children: "Eliminar" })
          ] }) })
        ] }, rule.id)) })
      ] }),
      rules.length === 0 && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "No has creado ninguna regla de comisión." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}), children: [
      isFormOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        CommissionRuleFormModal,
        {
          isOpen: isFormOpen,
          onClose: () => setIsFormOpen(false),
          onSuccess: handleSave,
          initialData: editingRule
        }
      ),
      ruleToDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ConfirmationModal,
        {
          isOpen: !!ruleToDelete,
          onClose: () => setRuleToDelete(null),
          onConfirm: handleDelete,
          title: "Confirmar Eliminación",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            '¿Seguro que quieres eliminar la regla de comisión "',
            ruleToDelete.name,
            '"?'
          ] })
        }
      )
    ] })
  ] });
};

export { CommissionManagementPage as default };
