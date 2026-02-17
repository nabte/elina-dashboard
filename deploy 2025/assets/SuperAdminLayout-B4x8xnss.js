import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { s as supabase, u as useAuth } from './index-B4F2XZYo.js';
import ConfirmationModal from './ConfirmationModal-D0s46AqS.js';
import { D as DashboardIcon, S as SettingsIcon } from './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const getGlobalStats = async () => {
  try {
    const { data, error } = await supabase.rpc("get_global_stats");
    if (error) {
      console.error("Error calling get_global_stats RPC:", error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error calculating global stats:", error);
    return { totalRevenueUSD: 0, totalTransactions: 0 };
  }
};

const tierColors = {
  gratuito: "#64748b",
  // slate-500
  solopreneur: "#a855f7",
  // purple-500
  pyme: "#0ea5e9",
  // sky-500
  empresarial: "#10b981"
  // emerald-500
};
const SubscriptionPieChart = ({ organizations }) => {
  const data = reactExports.useMemo(() => {
    const counts = {
      gratuito: 0,
      solopreneur: 0,
      pyme: 0,
      empresarial: 0
    };
    organizations.forEach((org) => {
      if (counts.hasOwnProperty(org.subscriptionTier)) {
        counts[org.subscriptionTier]++;
      }
    });
    return Object.entries(counts).map(([tier, count]) => ({
      tier,
      count,
      percentage: organizations.length > 0 ? count / organizations.length * 100 : 0
    }));
  }, [organizations]);
  const circumference = 2 * Math.PI * 40;
  let accumulatedOffset = 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row items-center gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative w-48 h-48", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 100 100", className: "w-full h-full transform -rotate-90", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "50", cy: "50", r: "40", fill: "transparent", stroke: "#334155", strokeWidth: "20" }),
      data.map(({ tier, percentage }) => {
        if (percentage === 0) return null;
        const strokeDasharray = `${percentage / 100 * circumference} ${circumference}`;
        const strokeDashoffset = -accumulatedOffset;
        accumulatedOffset += percentage / 100 * circumference;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "circle",
          {
            cx: "50",
            cy: "50",
            r: "40",
            fill: "transparent",
            stroke: tierColors[tier],
            strokeWidth: "20",
            strokeDasharray,
            strokeDashoffset
          },
          tier
        );
      })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 space-y-2", children: data.map(({ tier, count, percentage }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-3 h-3 rounded-full", style: { backgroundColor: tierColors[tier] } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "capitalize", children: tier })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
        count,
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400", children: [
          "(",
          percentage.toFixed(1),
          "%)"
        ] })
      ] })
    ] }, tier)) })
  ] });
};

const StatCard = ({ title, value }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-medium text-slate-400", children: title }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-3xl font-bold text-slate-100 mt-2", children: value })
] });
const SuperAdminDashboard = () => {
  const [orgs, setOrgs] = reactExports.useState([]);
  const [globalStats, setGlobalStats] = reactExports.useState({ totalRevenueUSD: 0, totalTransactions: 0 });
  const [isLoading, setIsLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: organizations, error: orgError } = await supabase.from("organizations").select("*");
        if (orgError) throw orgError;
        const stats = await getGlobalStats();
        setOrgs(organizations.map((o) => ({ ...o, createdDate: new Date(o.created_at) })));
        setGlobalStats(stats);
      } catch (error) {
        console.error("Failed to fetch super admin data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: "Cargando dashboard..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold text-slate-100", children: "Dashboard de Super Admin" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { title: "Organizaciones Activas", value: orgs.filter((o) => o.status === "active").length }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { title: "Ingresos Globales (USD)", value: `$${globalStats.totalRevenueUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { title: "Transacciones Globales", value: globalStats.totalTransactions.toLocaleString() })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-4", children: "Distribución de Planes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SubscriptionPieChart, { organizations: orgs })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-4", children: "Organizaciones Recientes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: orgs.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()).slice(0, 5).map((org) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex justify-between p-2 bg-slate-700/50 rounded", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: org.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400", children: new Date(org.createdDate).toLocaleDateString() })
        ] }, org.id)) })
      ] })
    ] })
  ] });
};

const subscriptionTiers = ["gratuito", "solopreneur", "pyme", "empresarial"];
const OrganizationEditModal = ({ isOpen, onClose, organization, onSave }) => {
  const [formData, setFormData] = reactExports.useState({});
  reactExports.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: organization.name,
        subscriptionTier: organization.subscriptionTier,
        aiUsageLimit: organization.aiUsageLimit,
        isComped: organization.isComped || false
      });
    }
  }, [isOpen, organization]);
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === "checkbox";
    const checked = e.target.checked;
    setFormData((prev) => ({
      ...prev,
      [name]: isCheckbox ? checked : name === "aiUsageLimit" ? parseInt(value, 10) : value
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-xl font-bold text-slate-100", children: [
        "Editar Organización: ",
        organization.name
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-slate-300 mb-1", children: "Nombre" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "name", id: "name", value: formData.name || "", onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "subscriptionTier", className: "block text-sm font-medium text-slate-300 mb-1", children: "Plan de Suscripción" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { name: "subscriptionTier", id: "subscriptionTier", value: formData.subscriptionTier || "", onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 capitalize", children: subscriptionTiers.map((tier) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: tier, children: tier }, tier)) })
      ] }),
      formData.subscriptionTier !== "gratuito" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", name: "isComped", checked: formData.isComped, onChange: handleChange, className: "form-checkbox bg-slate-600" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-slate-300", children: "Otorgar como cortesía (gratis)" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "aiUsageLimit", className: "block text-sm font-medium text-slate-300 mb-1", children: "Límite de Uso de IA (mensual)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", name: "aiUsageLimit", id: "aiUsageLimit", value: formData.aiUsageLimit || 0, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500", children: "Guardar Cambios" })
      ] })
    ] })
  ] }) });
};

const SuperAdminOrganizationsPage = () => {
  const { startImpersonation } = useAuth();
  const [orgs, setOrgs] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [searchTerm, setSearchTerm] = reactExports.useState("");
  const [editingOrg, setEditingOrg] = reactExports.useState(null);
  const [confirmingAction, setConfirmingAction] = reactExports.useState(null);
  const fetchOrgs = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: organizations, error: orgError } = await supabase.from("organizations").select("*");
      if (orgError) throw orgError;
      const orgsWithUsers = await Promise.all(
        organizations.map(async (org) => {
          const { data: profiles, error: profileError } = await supabase.from("profiles").select("*").eq("organization_id", org.id);
          const users = profileError ? [] : profiles.map((p) => ({ id: p.id, email: "N/A", role: p.role, createdDate: /* @__PURE__ */ new Date() }));
          return { ...org, users, createdDate: new Date(org.created_at) };
        })
      );
      setOrgs(orgsWithUsers);
    } catch (error) {
      console.error("Failed to fetch organizations", error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);
  const filteredOrgs = reactExports.useMemo(() => {
    return orgs.filter((org) => org.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [orgs, searchTerm]);
  const handleSaveOrg = async (updatedData) => {
    if (!editingOrg) return;
    try {
      const { error } = await supabase.from("organizations").update(updatedData).eq("id", editingOrg.id);
      if (error) throw error;
      setEditingOrg(null);
      await fetchOrgs();
    } catch (error) {
      console.error("Failed to update org:", error);
      alert("Error al actualizar la organización.");
    }
  };
  const handleConfirmStatusChange = async () => {
    if (!confirmingAction) return;
    const { org, action } = confirmingAction;
    const newStatus = action === "suspend" ? "suspended" : "active";
    try {
      await handleSaveOrg({ status: newStatus });
      setConfirmingAction(null);
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Error al cambiar el estado.");
    }
  };
  const confirmationProps = reactExports.useMemo(() => {
    if (!confirmingAction) return null;
    if (confirmingAction.action === "suspend") {
      return {
        buttonText: "Confirmar Suspensión",
        buttonClass: "bg-amber-600 hover:bg-amber-500"
      };
    }
    return {
      buttonText: "Confirmar Reactivación",
      buttonClass: "bg-green-600 hover:bg-green-500"
    };
  }, [confirmingAction]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold text-slate-100", children: "Organizaciones" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          placeholder: "Buscar por nombre...",
          value: searchTerm,
          onChange: (e) => setSearchTerm(e.target.value),
          className: "w-64 pl-4 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md"
        }
      )
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Cargando..." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Nombre" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Plan" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Usuarios" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Estado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Acciones" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filteredOrgs.map((org) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-semibold", children: org.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4 capitalize", children: [
          org.subscriptionTier,
          org.isComped && org.subscriptionTier !== "gratuito" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs bg-purple-800 text-purple-200 px-2 py-0.5 rounded-full", children: "Cortesía" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: org.users.length }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 py-1 text-xs font-semibold rounded-full capitalize ${org.status === "active" ? "bg-green-800 text-green-200" : "bg-red-800 text-red-200"}`, children: org.status }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => startImpersonation(org.id),
              className: "px-2 py-1 text-xs bg-sky-700 rounded hover:bg-sky-600",
              title: "La suplantación requiere una configuración de seguridad avanzada (RPC) en el backend para funcionar con RLS.",
              children: "Suplantar"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditingOrg(org), className: "px-2 py-1 text-xs bg-slate-600 rounded hover:bg-slate-500", children: "Editar" }),
          org.status === "active" ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setConfirmingAction({ org, action: "suspend" }), className: "px-2 py-1 text-xs bg-amber-700 rounded hover:bg-amber-600", children: "Suspender" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setConfirmingAction({ org, action: "reactivate" }), className: "px-2 py-1 text-xs bg-green-700 rounded hover:bg-green-600", children: "Reactivar" })
        ] }) })
      ] }, org.id)) })
    ] }) }),
    editingOrg && /* @__PURE__ */ jsxRuntimeExports.jsx(
      OrganizationEditModal,
      {
        isOpen: !!editingOrg,
        onClose: () => setEditingOrg(null),
        organization: editingOrg,
        onSave: handleSaveOrg
      }
    ),
    confirmingAction && confirmationProps && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: !!confirmingAction,
        onClose: () => setConfirmingAction(null),
        onConfirm: handleConfirmStatusChange,
        title: `Confirmar ${confirmingAction.action === "suspend" ? "Suspensión" : "Reactivación"}`,
        confirmButtonText: confirmationProps.buttonText,
        confirmButtonClass: confirmationProps.buttonClass,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "¿Estás seguro de que quieres ",
          confirmingAction.action === "suspend" ? "suspender" : "reactivar",
          " la organización",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-bold", children: [
            " ",
            confirmingAction.org.name
          ] }),
          "?"
        ] })
      }
    )
  ] });
};

const SuperAdminPlatformSettingsPage = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold text-slate-100", children: "Configuración de la Plataforma" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Aquí es donde el super admin podría configurar los planes, anuncios, contenido de la landing page, etc." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-slate-400", children: "Esta sección está en construcción." })
    ] })
  ] });
};

const OrgsIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm-1 4a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1H5a1 1 0 01-1-1V8zm5 0a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 01-1 1h-2a1 1 0 01-1-1V8z", clipRule: "evenodd" }) });

const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardIcon, { className: "h-5 w-5" })
  },
  {
    key: "organizations",
    label: "Organizaciones",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(OrgsIcon, { className: "h-5 w-5" })
  },
  {
    key: "settings",
    label: "Configuración",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsIcon, { className: "h-5 w-5" })
  }
];
const SuperAdminLayout = () => {
  const { session, signOut } = useAuth();
  const [activePage, setActivePage] = reactExports.useState("dashboard");
  if (!session || session.user.role !== "super_admin") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Access Denied" });
  }
  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(SuperAdminDashboard, {});
      case "organizations":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(SuperAdminOrganizationsPage, {});
      case "settings":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(SuperAdminPlatformSettingsPage, {});
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(SuperAdminDashboard, {});
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-slate-900 text-slate-100 flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "w-64 bg-slate-800 border-r border-slate-700 flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-16 flex items-center justify-center border-b border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold text-sky-400", children: "Super Admin" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex-grow p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: navItems.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setActivePage(item.key),
          className: `w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activePage === item.key ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-700"}`,
          children: [
            item.icon,
            item.label
          ]
        }
      ) }, item.key)) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "h-16 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 flex items-center justify-end px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-slate-400", children: session.user.email }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: signOut,
            className: "px-3 py-1.5 bg-slate-700 text-slate-200 font-semibold rounded-md hover:bg-slate-600 text-xs",
            children: "Cerrar Sesión"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 p-6 overflow-y-auto", children: renderContent() })
    ] })
  ] });
};

export { SuperAdminLayout as default };
