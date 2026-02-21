const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/InterfaceSettings-B5O0otKj.js","assets/landing-DMNKFuas.js","assets/index-B4F2XZYo.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css"])))=>i.map(i=>d[i]);
import { u as useAuth, e as useNotification, s as supabase, g as getLocalStorageItem, d as setLocalStorageItem, _ as __vitePreload } from './index-B4F2XZYo.js';
import { b as reactExports, j as jsxRuntimeExports, u as useI18n, p as platformSettingsService, A as ALL_FEATURES, c as React } from './landing-DMNKFuas.js';
import ConfirmationModal from './ConfirmationModal-D0s46AqS.js';
import { L as LoadingSpinner } from './LoadingSpinner-Ca-1SL1h.js';
import { u as useServices, h as buildTicketHtml, D as DEFAULT_TICKET_LAYOUT, n as normalizeThresholdMap, j as normalizeUnitKey } from './MainLayout-C0Ev0ilC.js';
import { b as bunnyService } from './bunnyService-Bv6QdtJu.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const CompanyProfileSettings = () => {
  const { session, updateOrganizationData } = useAuth();
  const { addNotification } = useNotification();
  const [profile, setProfile] = reactExports.useState({
    name: "",
    businessType: "",
    currency: "MXN"
  });
  const [isLoading, setIsLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (session?.organization) {
      setProfile({
        name: session.organization.name,
        businessType: session.organization.businessType,
        currency: session.organization.currency
      });
    }
  }, [session]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateOrganizationData(profile);
      addNotification("Perfil de la empresa actualizado.", "success");
    } catch (error) {
      addNotification("Error al actualizar el perfil.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-3xl mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-200 dark:border-slate-700", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 mb-4", children: "Perfil de la Empresa" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "Nombre del Negocio" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            name: "name",
            id: "name",
            value: profile.name || "",
            onChange: handleChange,
            className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "businessType", className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "Tipo de Negocio" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            name: "businessType",
            id: "businessType",
            value: profile.businessType || "",
            onChange: handleChange,
            className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "currency", className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "Moneda Principal" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            name: "currency",
            id: "currency",
            value: profile.currency,
            onChange: handleChange,
            className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "MXN", children: "Peso Mexicano (MXN)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "USD", children: "Dólar Americano (USD)" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: handleSave,
          disabled: isLoading,
          className: "w-full px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed",
          children: isLoading ? "Guardando..." : "Guardar Cambios"
        }
      )
    ] })
  ] }) });
};

const __vite_import_meta_env__ = {};
const STRIPE_DISABLED = __vite_import_meta_env__?.VITE_DISABLE_STRIPE === "true";
const STRIPE_PUBLISHABLE_KEY = __vite_import_meta_env__?.VITE_STRIPE_PUBLISHABLE_KEY ?? "pk_test_YOUR_PUBLISHABLE_KEY";
const getStripeInstance = async () => {
  if (STRIPE_DISABLED) {
    throw new Error("Stripe está deshabilitado temporalmente (VITE_DISABLE_STRIPE=true).");
  }
  if (typeof window === "undefined") {
    throw new Error("Stripe no está disponible en este entorno.");
  }
  const instantiate = () => {
    const globalStripe = window.Stripe;
    if (!globalStripe) {
      throw new Error("Stripe.js no se inicializó correctamente.");
    }
    return globalStripe(STRIPE_PUBLISHABLE_KEY);
  };
  if (window.Stripe) {
    return instantiate();
  }
  const script = document.querySelector('script[data-stripe-loader="true"]');
  if (!script) {
    throw new Error("Stripe.js no está cargado. Activa el flag o recarga la página.");
  }
  return new Promise((resolve, reject) => {
    const handleLoad = () => {
      try {
        resolve(instantiate());
      } catch (error) {
        reject(error);
      }
    };
    const handleError = () => reject(new Error("La carga de Stripe.js falló."));
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
  });
};
const SubscriptionPage = () => {
  const { session, updateOrganizationData } = useAuth();
  const { addNotification } = useNotification();
  const { t } = useI18n();
  const [allPlans, setAllPlans] = reactExports.useState([]);
  const [currency, setCurrency] = reactExports.useState("MXN");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [isPageLoading, setIsPageLoading] = reactExports.useState(true);
  const [planToChange, setPlanToChange] = reactExports.useState(null);
  reactExports.useEffect(() => {
    setIsPageLoading(true);
    platformSettingsService.getPlans().then((allFetchedPlans) => {
      const validPlanIds = ["gratuito", "solopreneur", "pyme", "empresarial"];
      const filteredPlans = allFetchedPlans.filter((p) => validPlanIds.includes(p.id));
      setAllPlans(filteredPlans);
    }).catch((err) => {
      console.error("Failed to load plans:", err);
      addNotification("No se pudieron cargar los planes de suscripción.", "error");
    }).finally(() => {
      setIsPageLoading(false);
    });
  }, [addNotification]);
  const currentOrgPlanId = session?.organization?.subscriptionTier;
  const currentPlan = allPlans.find((p) => p.id === currentOrgPlanId);
  const otherPlans = allPlans.filter((p) => p.id !== currentOrgPlanId);
  const handleConfirmPlanChange = async () => {
    if (!planToChange || !session) return;
    setIsLoading(true);
    try {
      if (STRIPE_DISABLED) {
        throw new Error("Stripe está deshabilitado temporalmente (VITE_DISABLE_STRIPE=true).");
      }
      const priceId = currency === "MXN" ? planToChange.stripeProductIdMXN : planToChange.stripeProductIdUSD;
      if (!priceId) {
        throw new Error(`El Price ID de Stripe para ${currency} no está configurado para este plan.`);
      }
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
        body: {
          priceId,
          userEmail: session.user.email
        }
      });
      if (error) throw error;
      if (!data.sessionId) {
        throw new Error("La función no devolvió un ID de sesión de Stripe.");
      }
      const stripe = await getStripeInstance();
      const result = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      addNotification(`Error al iniciar el pago: ${message}`, "error");
      setIsLoading(false);
    }
    setPlanToChange(null);
  };
  const getPlanPrice = (plan) => {
    return currency === "MXN" ? plan.priceMXN : plan.priceUSD;
  };
  if (isPageLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, {});
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 mb-4", children: t("subscriptionTitle") }),
    currentPlan && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-green-500 mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-lg font-semibold text-green-400", children: t("subscriptionCurrentPlan") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-baseline mt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-3xl font-bold text-slate-900 dark:text-white capitalize", children: currentPlan.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xl font-semibold text-slate-900 dark:text-white", children: [
          "$",
          getPlanPrice(currentPlan),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-normal text-slate-500 dark:text-slate-400", children: "/mes" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400 mt-2", children: currentPlan.description }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 text-sm disabled:opacity-50",
          title: "Esta función te llevaría al portal de Stripe para gestionar tus pagos.",
          disabled: true,
          children: t("subscriptionManageBilling")
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-lg font-semibold text-slate-900 dark:text-slate-200", children: t("subscriptionChangePlan") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center p-1 bg-slate-200 dark:bg-slate-700 rounded-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCurrency("MXN"), className: `px-3 py-1 text-xs font-semibold rounded-full transition-colors ${currency === "MXN" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`, children: "MXN" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCurrency("USD"), className: `px-3 py-1 text-xs font-semibold rounded-full transition-colors ${currency === "USD" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`, children: "USD" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: otherPlans.map((plan) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-sky-500 dark:text-sky-400 capitalize", children: plan.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-slate-500 dark:text-slate-400 flex-grow", children: plan.description }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-3xl font-bold text-slate-900 dark:text-white", children: [
            "$",
            getPlanPrice(plan)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-medium text-slate-500 dark:text-slate-400", children: "/mes" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setPlanToChange(plan), className: "mt-4 w-full px-4 py-2 font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-500", children: "Cambiar a este Plan" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-6 space-y-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-4", children: ALL_FEATURES.map((feature) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: `flex-shrink-0 h-4 w-4 mr-2 mt-0.5 ${plan.features.includes(feature.key) ? "text-green-500" : "text-slate-400 dark:text-slate-600"}`, viewBox: "0 0 20 20", fill: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: feature.label })
        ] }, feature.key)) })
      ] }, plan.id)) })
    ] }),
    planToChange && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: !!planToChange,
        onClose: () => setPlanToChange(null),
        onConfirm: handleConfirmPlanChange,
        title: t("subscriptionConfirmTitle"),
        confirmButtonText: isLoading ? "Redirigiendo..." : "Continuar a Pago Seguro",
        confirmButtonClass: "bg-green-600 hover:bg-green-500",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-300", children: [
          "Serás redirigido a Stripe para cambiar tu plan a ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-sky-300 capitalize", children: planToChange.name }),
          ".",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm", children: [
            "Nuevo cargo mensual: $",
            getPlanPrice(planToChange),
            " ",
            currency,
            "."
          ] })
        ] })
      }
    )
  ] });
};

const createPreviewSale = () => ({
  id: "preview-sale",
  ticketNumber: 1284,
  date: /* @__PURE__ */ new Date(),
  items: [
    {
      id: "SKU-ACC-01",
      name: "Martillo de Acero",
      price: 155,
      costPrice: 80,
      unitOfMeasure: "pieza",
      quantity: 1,
      stock: 10,
      description: "Herramienta",
      isSupply: false,
      imageUrl: null,
      priceVariants: [],
      fractionalEnabled: false,
      sellUnit: "package"
    },
    {
      id: "SKU-ACC-02",
      name: 'Clavos 1" - Bolsa',
      price: 42,
      costPrice: 20,
      unitOfMeasure: "pieza",
      quantity: 2,
      stock: 30,
      description: "Accesorio",
      isSupply: false,
      imageUrl: null,
      priceVariants: [],
      fractionalEnabled: false,
      sellUnit: "package",
      discount: { type: "amount", value: 5, calculatedDiscount: 5 }
    }
  ],
  subtotal: 239,
  totalDiscount: 5,
  total: 234,
  cashRegisterSessionId: "preview-session",
  payments: [{ method: "efectivo", amount: 234 }],
  changeGiven: 0,
  employeeId: "demo-employee",
  employeeName: "Ana López",
  clientId: "demo-client",
  clientName: "Juan Pérez",
  type: "sale",
  originalTicketNumber: void 0,
  pointsEarned: 0,
  pointsRedeemed: 0
});
const TicketCustomizer = () => {
  const { session, updateOrganizationData } = useAuth();
  const { addNotification } = useNotification();
  const { ticketService } = useServices();
  const getInitialLayout = () => {
    const cached = getLocalStorageItem("ticketLayoutSettings");
    if (cached) return cached;
    return session?.organization?.uiSettings?.ticketLayout ? { ...DEFAULT_TICKET_LAYOUT, ...session.organization.uiSettings.ticketLayout } : DEFAULT_TICKET_LAYOUT;
  };
  const getInitialPrinters = () => {
    const cached = getLocalStorageItem("printerSettings");
    if (cached) return cached;
    return session?.organization?.printerSettings ?? { availablePrinters: [] };
  };
  const [layoutSettings, setLayoutSettings] = reactExports.useState(getInitialLayout());
  const [printerSettingsState, setPrinterSettingsState] = reactExports.useState(getInitialPrinters());
  const [newPrinterName, setNewPrinterName] = reactExports.useState("");
  const [newPrinterType, setNewPrinterType] = reactExports.useState("system");
  const [isSavingLayout, setIsSavingLayout] = reactExports.useState(false);
  const [isSavingPrinters, setIsSavingPrinters] = reactExports.useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = reactExports.useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (session?.organization?.uiSettings?.ticketLayout) {
      const cached = getLocalStorageItem("ticketLayoutSettings");
      if (!cached) {
        setLayoutSettings((prev) => ({ ...prev, ...session.organization.uiSettings.ticketLayout }));
      }
    }
    if (session?.organization?.printerSettings) {
      const cached = getLocalStorageItem("printerSettings");
      if (!cached) {
        setPrinterSettingsState(session.organization.printerSettings);
      }
    }
  }, [session]);
  reactExports.useEffect(() => {
    setLocalStorageItem("ticketLayoutSettings", layoutSettings);
  }, [layoutSettings]);
  reactExports.useEffect(() => {
    setLocalStorageItem("printerSettings", printerSettingsState);
  }, [printerSettingsState]);
  reactExports.useEffect(() => {
    if (!session?.organization) return;
    const timeoutId = setTimeout(async () => {
      try {
        const updatedUiSettings = {
          ...session.organization?.uiSettings ?? { showProductImages: true },
          ticketLayout: layoutSettings
        };
        await updateOrganizationData({ uiSettings: updatedUiSettings });
        console.log("[TicketCustomizer] ✅ Configuración del ticket guardada automáticamente en Supabase");
      } catch (error) {
        console.error("[TicketCustomizer] ❌ Error al guardar configuración del ticket en Supabase:", error);
      }
    }, 2e3);
    return () => clearTimeout(timeoutId);
  }, [layoutSettings, session?.organization?.id, updateOrganizationData]);
  reactExports.useEffect(() => {
    if (!session?.organization) return;
    const timeoutId = setTimeout(async () => {
      try {
        await updateOrganizationData({ printerSettings: printerSettingsState });
        console.log("[TicketCustomizer] ✅ Configuración de impresoras guardada automáticamente en Supabase");
      } catch (error) {
        console.error("[TicketCustomizer] ❌ Error al guardar configuración de impresoras en Supabase:", error);
      }
    }, 2e3);
    return () => clearTimeout(timeoutId);
  }, [printerSettingsState, session?.organization?.id, updateOrganizationData]);
  const availablePrinters = printerSettingsState.availablePrinters ?? [];
  const handleSaveLayout = async () => {
    if (!session?.organization) return;
    setIsSavingLayout(true);
    try {
      const updatedUiSettings = {
        ...session.organization.uiSettings ?? { showProductImages: true },
        ticketLayout: layoutSettings
      };
      await updateOrganizationData({ uiSettings: updatedUiSettings });
      addNotification("Diseño del ticket actualizado.", "success");
    } catch (error) {
      console.error(error);
      addNotification("No se pudo guardar el diseño del ticket.", "error");
    } finally {
      setIsSavingLayout(false);
    }
  };
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addNotification("El logo es demasiado grande. Máximo 2MB.", "error");
      return;
    }
    if (!file.type.startsWith("image/")) {
      addNotification("Solo se permiten archivos de imagen.", "error");
      return;
    }
    setIsUploadingLogo(true);
    try {
      const orgName = session?.organization?.name || "general";
      const cdnUrl = await bunnyService.uploadFile(file, orgName);
      setLayoutSettings((prev) => {
        const updated = { ...prev, logo: cdnUrl };
        setLocalStorageItem("ticketLayoutSettings", updated);
        return updated;
      });
      addNotification("Logo subido correctamente.", "success");
    } catch (error) {
      console.error("Error al subir logo:", error);
      addNotification("Error al subir el logo. Intenta de nuevo.", "error");
    } finally {
      setIsUploadingLogo(false);
    }
  };
  const handleLayoutChange = (key, value) => {
    setLayoutSettings((prev) => {
      const updated = { ...prev, [key]: value };
      setLocalStorageItem("ticketLayoutSettings", updated);
      return updated;
    });
  };
  const handleDetectPrinters = async () => {
    try {
      const detected = await ticketService.getBrowserPrinters();
      setPrinterSettingsState((prev) => {
        const list = prev.availablePrinters ?? [];
        const ids = new Set(list.map((p) => p.id));
        const merged = [...list];
        detected.forEach((printer) => {
          if (!ids.has(printer.id)) merged.push(printer);
        });
        const updated = { ...prev, availablePrinters: merged, lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString() };
        setLocalStorageItem("printerSettings", updated);
        return updated;
      });
      addNotification("Sincronizamos las impresoras disponibles.", "success");
    } catch (error) {
      console.error(error);
      addNotification("No se pudieron detectar impresoras. Revisa los permisos del navegador.", "error");
    }
  };
  const handleAddManualPrinter = () => {
    if (!newPrinterName.trim()) {
      addNotification("Escribe el nombre de la impresora manual.", "warning");
      return;
    }
    setPrinterSettingsState((prev) => {
      const updated = {
        ...prev,
        availablePrinters: [
          ...prev.availablePrinters ?? [],
          {
            id: `manual-${Date.now()}`,
            name: newPrinterName.trim(),
            type: newPrinterType,
            status: "online",
            capabilities: ["ticket"]
          }
        ]
      };
      setLocalStorageItem("printerSettings", updated);
      return updated;
    });
    setNewPrinterName("");
  };
  const handleRemovePrinter = (printerId) => {
    setPrinterSettingsState((prev) => {
      const filtered = (prev.availablePrinters ?? []).filter((p) => p.id !== printerId);
      const nextDefault = prev.defaultPrinterId === printerId ? void 0 : prev.defaultPrinterId;
      const updated = { ...prev, availablePrinters: filtered, defaultPrinterId: nextDefault };
      setLocalStorageItem("printerSettings", updated);
      return updated;
    });
  };
  const handleSavePrinters = async () => {
    setIsSavingPrinters(true);
    try {
      await updateOrganizationData({ printerSettings: printerSettingsState });
      addNotification("Preferencias de impresora guardadas y sincronizadas.", "success");
    } catch (error) {
      console.error(error);
      addNotification("No se pudo guardar la configuración de impresoras.", "error");
    } finally {
      setIsSavingPrinters(false);
    }
  };
  const handleTestPrinter = async () => {
    if (!session?.organization) return;
    if (availablePrinters.length === 0 && !printerSettingsState.defaultPrinterId) {
      addNotification("Agrega al menos una impresora antes de hacer la prueba.", "warning");
      return;
    }
    setIsTestingPrinter(true);
    try {
      await ticketService.printSaleTicket({
        sale: createPreviewSale(),
        organization: session.organization,
        printerSettings: printerSettingsState,
        layoutOverride: layoutSettings,
        overridePrinterId: printerSettingsState.defaultPrinterId
      });
      addNotification("Se envió un ticket de prueba a tu impresora.", "success");
    } catch (error) {
      console.error(error);
      addNotification("No se pudo imprimir el ticket de prueba. Revisa los permisos del navegador.", "error");
    } finally {
      setIsTestingPrinter(false);
    }
  };
  const previewHtml = reactExports.useMemo(() => {
    const fakeOrg = {
      ...session?.organization || {
        id: "preview-org",
        name: "Tu Comercio",
        businessType: "retail",
        onboardingCompleted: true,
        subscriptionTier: "pyme",
        aiUsageCount: 0,
        aiUsageLimit: 0,
        status: "active",
        createdDate: /* @__PURE__ */ new Date(),
        currency: "MXN",
        goals: "",
        challenges: "",
        address: "",
        phone: "",
        companyEmail: "",
        website: "",
        logoUrl: "",
        quoteTerms: "",
        loyaltySettings: { enabled: false, pointsPerDollar: 1, redemptionValuePerPoint: 1 },
        adminPin: "",
        minimumProfitMargin: 0,
        lowStockThreshold: 0,
        enabledPaymentMethods: [],
        pinProtectedActions: []
      },
      uiSettings: {
        ...session?.organization?.uiSettings ?? { showProductImages: true },
        ticketLayout: layoutSettings
      }
    };
    return buildTicketHtml(createPreviewSale(), fakeOrg, { layoutOverride: layoutSettings, variant: "preview" });
  }, [session, layoutSettings]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700 space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100", children: "Personalizar ticket" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Logo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "file",
              accept: "image/*",
              onChange: handleLogoChange,
              disabled: isUploadingLogo,
              className: "text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-100 file:text-sky-700 hover:file:bg-sky-200 disabled:opacity-50"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Tamaño recomendado: máximo 200x60px, formato PNG/JPG, máximo 2MB. El logo se mostrará automáticamente en todos los tickets." }),
          isUploadingLogo && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-sky-400 mt-1", children: "Subiendo logo..." }),
          layoutSettings.logo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: layoutSettings.logo, alt: "Logo actual", className: "h-12 object-contain" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => {
                  setLayoutSettings((prev) => ({ ...prev, logo: "" }));
                  setLocalStorageItem("ticketLayoutSettings", { ...layoutSettings, logo: "" });
                  addNotification("Logo eliminado. Guarda los cambios para aplicar.", "info");
                },
                className: "px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors",
                children: "Eliminar logo"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Encabezado" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: layoutSettings.headerText || "", onChange: (e) => handleLayoutChange("headerText", e.target.value), rows: 4, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Pie de página" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: layoutSettings.footerText || "", onChange: (e) => handleLayoutChange("footerText", e.target.value), rows: 3, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Tamaño de papel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: layoutSettings.paperSize || "58mm",
                onChange: (e) => handleLayoutChange("paperSize", e.target.value),
                className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "58mm", children: "58mm (Estándar)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "80mm", children: "80mm (Ancho)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "custom", children: "Personalizado" })
                ]
              }
            ),
            layoutSettings.paperSize === "custom" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Ancho personalizado (mm)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  min: "40",
                  max: "100",
                  value: layoutSettings.customPaperWidth || 58,
                  onChange: (e) => handleLayoutChange("customPaperWidth", parseInt(e.target.value) || 58),
                  className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Fuente normal" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  value: layoutSettings.fontFamily || "Fira Sans",
                  onChange: (e) => handleLayoutChange("fontFamily", e.target.value),
                  className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Fira Sans", children: "Fira Sans" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Roboto", children: "Roboto" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Open Sans", children: "Open Sans" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Lato", children: "Lato" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Montserrat", children: "Montserrat" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Poppins", children: "Poppins" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Inter", children: "Inter" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Nunito", children: "Nunito" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Raleway", children: "Raleway" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Ubuntu", children: "Ubuntu" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Fuente negrita/grande" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  value: layoutSettings.fontFamilyBold || layoutSettings.fontFamily || "Fira Sans",
                  onChange: (e) => handleLayoutChange("fontFamilyBold", e.target.value),
                  className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Fira Sans", children: "Fira Sans" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Roboto", children: "Roboto" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Open Sans", children: "Open Sans" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Lato", children: "Lato" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Montserrat", children: "Montserrat" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Poppins", children: "Poppins" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Inter", children: "Inter" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Nunito", children: "Nunito" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Raleway", children: "Raleway" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Ubuntu", children: "Ubuntu" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Tamaño fuente normal (px)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  min: "8",
                  max: "16",
                  value: layoutSettings.fontSize || 12,
                  onChange: (e) => handleLayoutChange("fontSize", parseInt(e.target.value) || 12),
                  className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Tamaño fuente negrita (px)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  min: "10",
                  max: "20",
                  value: layoutSettings.fontSizeBold || 14,
                  onChange: (e) => handleLayoutChange("fontSizeBold", parseInt(e.target.value) || 14),
                  className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-300", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: layoutSettings.showSku ?? true, onChange: (e) => handleLayoutChange("showSku", e.target.checked) }),
            " Mostrar SKU"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-300", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: layoutSettings.showClient ?? true, onChange: (e) => handleLayoutChange("showClient", e.target.checked) }),
            " Mostrar cliente"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-300", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: layoutSettings.showSeller ?? true, onChange: (e) => handleLayoutChange("showSeller", e.target.checked) }),
            " Mostrar vendedor"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-300", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: layoutSettings.showDiscounts ?? true, onChange: (e) => handleLayoutChange("showDiscounts", e.target.checked) }),
            " Desglose de descuentos"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleSaveLayout, disabled: isSavingLayout, className: "w-full px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:opacity-60", children: isSavingLayout ? "Guardando..." : "Guardar ahora" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-4 text-center", children: "Previsualización" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { dangerouslySetInnerHTML: { __html: previewHtml } })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-lg font-semibold text-slate-100", children: "Impresoras y ticket de prueba" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Selecciona la impresora térmica y sincroniza desde el navegador." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleDetectPrinters, className: "px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-700", children: "Sincronizar con navegador" })
      ] }),
      printerSettingsState.lastSyncedAt && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500", children: [
        "Última sincronización: ",
        new Date(printerSettingsState.lastSyncedAt).toLocaleString("es-MX")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: availablePrinters.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Aún no hay impresoras registradas." }) : availablePrinters.map((printer) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between border border-slate-600 rounded-md px-3 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-100", children: printer.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 capitalize", children: printer.type })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 mt-2 md:mt-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-xs text-slate-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "defaultPrinter", checked: printerSettingsState.defaultPrinterId === printer.id, onChange: () => {
              setPrinterSettingsState((prev) => {
                const updated = { ...prev, defaultPrinterId: printer.id };
                setLocalStorageItem("printerSettings", updated);
                return updated;
              });
            } }),
            "Usar por defecto"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleRemovePrinter(printer.id), className: "text-xs px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-500", children: "Quitar" })
        ] })
      ] }, printer.id)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3 items-end", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-500 mb-1", children: "Nombre manual" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: newPrinterName, onChange: (e) => setNewPrinterName(e.target.value), className: "w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm", placeholder: "Ej. USB Epson" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-500 mb-1", children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: newPrinterType, onChange: (e) => setNewPrinterType(e.target.value), className: "w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "system", children: "Sistema / USB" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "network", children: "Red / Bluetooth" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pdf", children: "PDF / Archivo" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleAddManualPrinter, className: "px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600", children: "Agregar" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "form-checkbox bg-slate-700", checked: printerSettingsState.autoPrintTickets ?? false, onChange: (e) => setPrinterSettingsState((prev) => ({ ...prev, autoPrintTickets: e.target.checked })) }),
          "Imprimir automáticamente al cobrar"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleTestPrinter, disabled: isTestingPrinter, className: "px-4 py-2 bg-sky-700 text-white rounded-md hover:bg-sky-600 disabled:opacity-60", children: isTestingPrinter ? "Enviando..." : "Ticket de prueba" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleSavePrinters, disabled: isSavingPrinters, className: "px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-500 disabled:opacity-60", children: isSavingPrinters ? "Guardando..." : "Guardar ahora" })
        ] })
      ] })
    ] })
  ] });
};

const LoyaltySettings = () => {
  const { session, updateOrganizationData } = useAuth();
  const { addNotification } = useNotification();
  const [settings, setSettings] = reactExports.useState({
    enabled: false,
    pointsPerDollar: 1,
    redemptionValuePerPoint: 0.05
  });
  const [isLoading, setIsLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (session?.organization?.loyaltySettings) {
      setSettings(session.organization.loyaltySettings);
    }
  }, [session]);
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : parseFloat(value) || 0
    }));
  };
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateOrganizationData({ loyaltySettings: settings });
      addNotification("Configuración de lealtad guardada.", "success");
    } catch (error) {
      addNotification("Error al guardar la configuración.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-3xl mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-200 dark:border-slate-700", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 mb-4", children: "Configuración del Programa de Lealtad" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-3 cursor-pointer p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            name: "enabled",
            checked: settings.enabled,
            onChange: handleChange,
            className: "form-checkbox h-5 w-5 bg-slate-200 dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-sky-500 rounded focus:ring-sky-500"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-medium text-slate-800 dark:text-slate-200", children: "Activar Programa de Lealtad" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `space-y-4 transition-opacity ${settings.enabled ? "opacity-100" : "opacity-50 pointer-events-none"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "pointsPerDollar", className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "Puntos ganados por cada $1 gastado" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              name: "pointsPerDollar",
              id: "pointsPerDollar",
              value: settings.pointsPerDollar,
              onChange: handleChange,
              min: "0",
              step: "0.1",
              className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100",
              disabled: !settings.enabled
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1", children: "Ejemplo: Si pones 1, un cliente que gasta $50 gana 50 puntos." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "redemptionValuePerPoint", className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "Valor de 1 punto al canjear (en $)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              name: "redemptionValuePerPoint",
              id: "redemptionValuePerPoint",
              value: settings.redemptionValuePerPoint,
              onChange: handleChange,
              min: "0",
              step: "0.01",
              className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100",
              disabled: !settings.enabled
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1", children: "Ejemplo: Si pones 0.05, 100 puntos equivalen a un descuento de $5.00." })
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

const PasswordVerificationModal = ({ isOpen, onClose, onSuccess }) => {
  const { session } = useAuth();
  const [password, setPassword] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const handleConfirm = async () => {
    if (!password || !session) return;
    setIsLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password
    });
    setIsLoading(false);
    if (signInError) {
      setError("Contraseña incorrecta. Inténtalo de nuevo.");
    } else {
      onSuccess();
    }
  };
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleConfirm();
  };
  React.useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "bg-slate-800 w-full max-w-sm m-4 p-8 rounded-xl shadow-2xl border border-slate-700",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-center text-white flex-1", children: "Verificar Identidad" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: onClose,
                  className: "text-slate-400 hover:text-slate-200 transition-colors ml-2",
                  "aria-label": "Cerrar",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "h-6 w-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-400 mb-6", children: "Ingresa tu contraseña de la cuenta para continuar." }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleFormSubmit, className: "space-y-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "account-password", className: "sr-only", children: "Contraseña" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "account-password",
                    type: "password",
                    value: password,
                    onChange: (e) => setPassword(e.target.value),
                    placeholder: "Tu contraseña de la cuenta",
                    className: "w-full text-center px-4 py-3 bg-slate-900 border border-slate-600 rounded-md text-slate-100 text-lg focus:outline-none focus:ring-2 focus:ring-sky-500",
                    autoFocus: true
                  }
                )
              ] }),
              error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm text-center", children: error }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4 pt-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: onClose,
                    className: "w-full px-4 py-3 font-semibold text-slate-200 bg-slate-600/80 rounded-md hover:bg-slate-600 transition-colors",
                    children: "Cancelar"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "submit",
                    disabled: isLoading || !password,
                    className: "w-full px-4 py-3 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed",
                    children: isLoading ? "Verificando..." : "Verificar"
                  }
                )
              ] })
            ] })
          ]
        }
      )
    }
  );
};

const SecuritySettings = ({ onVerificationCancel }) => {
  const { session, updateOrganizationData, isSecuritySectionVerified, setSecuritySectionVerified } = useAuth();
  const { addNotification } = useNotification();
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [newPin, setNewPin] = reactExports.useState("");
  const [confirmPin, setConfirmPin] = reactExports.useState("");
  const handleVerificationSuccess = () => {
    setSecuritySectionVerified(true);
  };
  const handlePinUpdate = async (e) => {
    e.preventDefault();
    if (newPin.length < 4) {
      addNotification("El PIN debe tener al menos 4 caracteres.", "error");
      return;
    }
    if (newPin !== confirmPin) {
      addNotification("Los PINs no coinciden.", "error");
      return;
    }
    setIsLoading(true);
    try {
      await updateOrganizationData({ adminPin: newPin });
      addNotification("Tu PIN de Administrador ha sido actualizado.", "success");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      addNotification("Error al actualizar el PIN.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  if (!isSecuritySectionVerified) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      PasswordVerificationModal,
      {
        isOpen: !isSecuritySectionVerified,
        onClose: onVerificationCancel,
        onSuccess: handleVerificationSuccess
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md mx-auto bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 mb-4", children: "Gestionar PIN de Administrador" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500 dark:text-slate-400 mb-4 text-sm", children: "Este PIN se utiliza para autorizar acciones importantes dentro de la plataforma. Si lo olvidas, siempre puedes usar tu contraseña de inicio de sesión como alternativa para llegar a esta pantalla." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handlePinUpdate, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "PIN Actual" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: session?.organization?.adminPin || "PIN no establecido",
            className: "w-full bg-slate-200 dark:bg-slate-900 border-transparent rounded-md px-3 py-2 text-slate-500 dark:text-slate-400",
            readOnly: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "newPin", className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "Nuevo PIN" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "password",
            id: "newPin",
            value: newPin,
            onChange: (e) => setNewPin(e.target.value),
            className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100",
            minLength: 4,
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "confirmPin", className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "Confirmar Nuevo PIN" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "password",
            id: "confirmPin",
            value: confirmPin,
            onChange: (e) => setConfirmPin(e.target.value),
            className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100",
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 disabled:bg-slate-500", children: isLoading ? "Actualizando..." : "Actualizar PIN" })
    ] })
  ] });
};

const ALL_PAYMENT_METHODS = [
  { key: "efectivo", label: "Efectivo" },
  { key: "tarjeta", label: "Tarjeta de Crédito/Débito" },
  { key: "transferencia", label: "Transferencia Bancaria" },
  { key: "cheque", label: "Cheque" },
  { key: "efectivo_factura", label: "Efectivo (para Factura)" },
  { key: "tarjeta_factura", label: "Tarjeta (para Factura)" },
  { key: "cheque_factura", label: "Cheque (para Factura)" },
  { key: "otro", label: "Otro" }
];
const DEFAULT_METHODS = ["efectivo", "tarjeta", "transferencia"];
const PaymentMethodsSettings = () => {
  const { session, updateOrganizationData } = useAuth();
  const { addNotification } = useNotification();
  const [enabledMethods, setEnabledMethods] = reactExports.useState(DEFAULT_METHODS);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [saveError, setSaveError] = reactExports.useState(null);
  const paymentLabelMap = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    ALL_PAYMENT_METHODS.forEach((method) => map.set(method.key, method.label));
    return map;
  }, []);
  reactExports.useEffect(() => {
    if (session?.organization?.enabledPaymentMethods) {
      setEnabledMethods(session.organization.enabledPaymentMethods);
    }
  }, [session]);
  const handleToggleMethod = (method) => {
    setEnabledMethods((prev) => {
      if (prev.includes(method)) {
        return prev.filter((m) => m !== method);
      }
      return [...prev, method];
    });
  };
  const handleMove = (method, direction) => {
    setEnabledMethods((prev) => {
      const index = prev.indexOf(method);
      if (index === -1) return prev;
      const delta = direction === "up" ? -1 : 1;
      const newIndex = index + delta;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[newIndex];
      updated[newIndex] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };
  const handleSave = async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      await updateOrganizationData({ enabledPaymentMethods: enabledMethods });
      addNotification("Métodos de pago actualizados.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
      addNotification("Error al guardar la configuración.", "error");
      if (message.includes("enum") || error?.code === "22P02" || error?.code === "23514") {
        setSaveError('Error de base de datos: Uno de los métodos de pago seleccionados no es válido en la configuración de la base de datos. Por favor, contacta a soporte para actualizar los tipos de pago permitidos (ej. añadir "cheque").');
      } else {
        setSaveError(`No se pudo guardar. Error: ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-3xl mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-200 dark:border-slate-700", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 mb-2", children: "Métodos de Pago Aceptados" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400 mb-6", children: "Selecciona qué métodos estarán disponibles y ordena la lista como quieres que aparezca en el POS." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: ALL_PAYMENT_METHODS.map((method) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-3 cursor-pointer p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: enabledMethods.includes(method.key),
            onChange: () => handleToggleMethod(method.key),
            className: "form-checkbox h-5 w-5 bg-slate-200 dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-sky-500 rounded focus:ring-sky-500"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-slate-800 dark:text-slate-200", children: method.label })
      ] }, method.key)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-600 dark:text-slate-200 mb-2", children: "Orden en pantalla" }),
        enabledMethods.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Activa al menos un método para definir su orden." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: enabledMethods.map((method, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center justify-between bg-slate-100 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-slate-800 dark:text-slate-100", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400 font-mono w-6 text-center", children: index + 1 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: paymentLabelMap.get(method) ?? method })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => handleMove(method, "up"),
                disabled: index === 0,
                className: "px-2 py-1 text-xs rounded-md bg-slate-800 text-white disabled:opacity-40",
                children: "↑"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => handleMove(method, "down"),
                disabled: index === enabledMethods.length - 1,
                className: "px-2 py-1 text-xs rounded-md bg-slate-800 text-white disabled:opacity-40",
                children: "↓"
              }
            )
          ] })
        ] }, method)) })
      ] }),
      saveError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-md text-sm", children: saveError }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: handleSave,
          disabled: isLoading,
          className: "w-full mt-4 px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed",
          children: isLoading ? "Guardando..." : "Guardar Configuración"
        }
      )
    ] })
  ] }) });
};

const BusinessLogicSettings = () => {
  const { session, updateOrganizationData } = useAuth();
  const { addNotification } = useNotification();
  const { priceListService } = useServices();
  const [minimumProfitMargin, setMinimumProfitMargin] = reactExports.useState(0);
  const [lowStockThreshold, setLowStockThreshold] = reactExports.useState(10);
  const [unitThresholds, setUnitThresholds] = reactExports.useState({});
  const [newUnitName, setNewUnitName] = reactExports.useState("");
  const [newUnitValue, setNewUnitValue] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [multiPriceEnabled, setMultiPriceEnabled] = reactExports.useState(session?.organization?.multiPriceEnabled ?? false);
  const [priceListLimit, setPriceListLimit] = reactExports.useState(session?.organization?.priceListLimit ?? 1);
  const [priceLists, setPriceLists] = reactExports.useState([]);
  const [isLoadingPriceLists, setIsLoadingPriceLists] = reactExports.useState(false);
  const [isUpdatingMultiPrice, setIsUpdatingMultiPrice] = reactExports.useState(false);
  const [isMutatingLists, setIsMutatingLists] = reactExports.useState(false);
  const [newListName, setNewListName] = reactExports.useState("");
  const [listNameDrafts, setListNameDrafts] = reactExports.useState({});
  const [listMarginDrafts, setListMarginDrafts] = reactExports.useState({});
  const [listMarginSourceDrafts, setListMarginSourceDrafts] = reactExports.useState({});
  const [selectedBulkListId, setSelectedBulkListId] = reactExports.useState("");
  const [bulkMarginPercent, setBulkMarginPercent] = reactExports.useState(0);
  const [bulkMarginSource, setBulkMarginSource] = reactExports.useState("base_price");
  const [ivaPercent, setIvaPercent] = reactExports.useState(16);
  const [applyIvaByDefault, setApplyIvaByDefault] = reactExports.useState(false);
  const [pricesIncludeIvaByDefault, setPricesIncludeIvaByDefault] = reactExports.useState(false);
  const [extraTaxes, setExtraTaxes] = reactExports.useState([]);
  const [newTaxName, setNewTaxName] = reactExports.useState("");
  const [newTaxPercent, setNewTaxPercent] = reactExports.useState("");
  const [newTaxType, setNewTaxType] = reactExports.useState("tax");
  const [newTaxApplyDefault, setNewTaxApplyDefault] = reactExports.useState(false);
  const [isSavingTaxSettings, setIsSavingTaxSettings] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (session?.organization) {
      setMinimumProfitMargin(session.organization.minimumProfitMargin || 0);
      setLowStockThreshold(session.organization.lowStockThreshold || 10);
      setMultiPriceEnabled(session.organization.multiPriceEnabled ?? false);
      setPriceListLimit(session.organization.priceListLimit ?? 1);
      setUnitThresholds(normalizeThresholdMap(session.organization.uiSettings?.unitLowStockThresholds));
      const taxConfig = session.organization.taxSettings;
      setIvaPercent(taxConfig?.ivaPercent ?? 16);
      setApplyIvaByDefault(taxConfig?.applyIvaByDefault ?? false);
      setPricesIncludeIvaByDefault(taxConfig?.pricesIncludeIvaByDefault ?? false);
      setExtraTaxes(taxConfig?.extraTaxes ?? []);
    }
  }, [session]);
  const fetchPriceLists = reactExports.useCallback(async () => {
    if (!multiPriceEnabled) {
      setPriceLists([]);
      return;
    }
    setIsLoadingPriceLists(true);
    try {
      const lists = await priceListService.getPriceLists();
      setPriceLists(lists);
    } catch (error) {
      console.error(error);
      addNotification("No se pudieron cargar las listas de precios.", "error");
    } finally {
      setIsLoadingPriceLists(false);
    }
  }, [multiPriceEnabled, priceListService, addNotification]);
  reactExports.useEffect(() => {
    if (multiPriceEnabled) {
      fetchPriceLists();
    } else {
      setPriceLists([]);
    }
  }, [multiPriceEnabled, fetchPriceLists]);
  reactExports.useEffect(() => {
    setListNameDrafts((prev) => {
      const next = { ...prev };
      let changed = false;
      const ids = new Set(priceLists.map((list) => list.id));
      priceLists.forEach((list) => {
        if (next[list.id] === void 0) {
          next[list.id] = list.name;
          changed = true;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!ids.has(key)) {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setListMarginDrafts((prev) => {
      const next = { ...prev };
      let changed = false;
      priceLists.forEach((list) => {
        if (next[list.id] === void 0) {
          next[list.id] = list.defaultMarginPercent;
          changed = true;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!priceLists.some((l) => l.id === key)) {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setListMarginSourceDrafts((prev) => {
      const next = { ...prev };
      let changed = false;
      priceLists.forEach((list) => {
        if (next[list.id] === void 0) {
          next[list.id] = list.defaultMarginSource;
          changed = true;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!priceLists.some((l) => l.id === key)) {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    if (!selectedBulkListId && priceLists[0]) {
      setSelectedBulkListId(priceLists[0].id);
    }
  }, [priceLists, selectedBulkListId]);
  const handleUnitThresholdValueChange = (unit, value) => {
    const numeric = parseFloat(value);
    setUnitThresholds((prev) => ({
      ...prev,
      [unit]: Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
    }));
  };
  const handleRemoveUnitThreshold = (unit) => {
    setUnitThresholds((prev) => {
      const next = { ...prev };
      delete next[unit];
      return next;
    });
  };
  const handleAddUnitThreshold = () => {
    const normalizedKey = normalizeUnitKey(newUnitName);
    if (!normalizedKey) {
      addNotification("Escribe un nombre de unidad para agregar un umbral específico.", "warning");
      return;
    }
    const numericValue = parseFloat(newUnitValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      addNotification("Ingresa un umbral mayor a 0.", "warning");
      return;
    }
    setUnitThresholds((prev) => ({ ...prev, [normalizedKey]: numericValue }));
    setNewUnitName("");
    setNewUnitValue("");
  };
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const sanitizedThresholds = normalizeThresholdMap(unitThresholds);
      const updatedUiSettings = {
        ...session?.organization?.uiSettings ?? { showProductImages: true },
        unitLowStockThresholds: sanitizedThresholds
      };
      await updateOrganizationData({ minimumProfitMargin, lowStockThreshold, uiSettings: updatedUiSettings });
      setUnitThresholds(sanitizedThresholds);
      addNotification("Reglas de negocio actualizadas.", "success");
    } catch (error) {
      addNotification("Error al guardar las reglas de negocio.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleToggleMultiPrice = async (enabled) => {
    setIsUpdatingMultiPrice(true);
    try {
      await updateOrganizationData({ multiPriceEnabled: enabled });
      setMultiPriceEnabled(enabled);
      if (enabled) {
        await fetchPriceLists();
      }
    } catch (error) {
      addNotification("No se pudo actualizar la configuración de precios múltiples.", "error");
    } finally {
      setIsUpdatingMultiPrice(false);
    }
  };
  const handleLimitBlur = async (value) => {
    if (value < 1 || value > 10) {
      addNotification("El número de listas debe estar entre 1 y 10.", "warning");
      return;
    }
    try {
      await updateOrganizationData({ priceListLimit: value });
      addNotification("Límite de listas actualizado.", "success");
    } catch (error) {
      addNotification("No se pudo actualizar el límite de listas.", "error");
    }
  };
  const handleCreatePriceList = async () => {
    if (!newListName.trim()) {
      addNotification("Ingresa un nombre para la lista.", "warning");
      return;
    }
    if (priceLists.length >= priceListLimit) {
      addNotification("Ya alcanzaste el límite de listas configurado.", "warning");
      return;
    }
    setIsMutatingLists(true);
    try {
      const defaultMargin = minimumProfitMargin || 30;
      const list = await priceListService.createPriceList({
        name: newListName.trim(),
        marginSource: "base_price",
        marginPercent: defaultMargin
      });
      setNewListName("");
      await fetchPriceLists();
      addNotification(`Lista "${list.name}" creada con ${defaultMargin}% de ganancia.`, "success");
    } catch (error) {
      console.error(error);
      addNotification("No se pudo crear la lista.", "error");
    } finally {
      setIsMutatingLists(false);
    }
  };
  const handleRenamePriceList = async (listId) => {
    const name = listNameDrafts[listId]?.trim();
    if (!name) {
      addNotification("El nombre no puede estar vacío.", "warning");
      return;
    }
    setIsMutatingLists(true);
    try {
      await priceListService.updatePriceList(listId, { name });
      await fetchPriceLists();
      addNotification("Lista actualizada.", "success");
    } catch (error) {
      console.error(error);
      addNotification("No se pudo actualizar la lista.", "error");
    } finally {
      setIsMutatingLists(false);
    }
  };
  const handleUpdatePriceListMargin = async (listId) => {
    const marginPercent = listMarginDrafts[listId];
    const marginSource = listMarginSourceDrafts[listId];
    if (marginPercent === void 0 || marginSource === void 0) {
      return;
    }
    const list = priceLists.find((l) => l.id === listId);
    if (!list) return;
    if (marginPercent === list.defaultMarginPercent && marginSource === list.defaultMarginSource) {
      return;
    }
    setIsMutatingLists(true);
    try {
      await priceListService.updatePriceList(listId, {
        marginPercent,
        marginSource
      });
      await fetchPriceLists();
      addNotification("Margen de ganancia actualizado.", "success");
    } catch (error) {
      console.error(error);
      addNotification("No se pudo actualizar el margen.", "error");
    } finally {
      setIsMutatingLists(false);
    }
  };
  const handleTogglePriceListActive = async (listId, isActive) => {
    if (session?.organization?.defaultPriceListId === listId && !isActive) {
      addNotification("No se puede desactivar la lista de precios por defecto.", "warning");
      return;
    }
    setIsMutatingLists(true);
    try {
      await priceListService.updatePriceList(listId, { isActive });
      await fetchPriceLists();
      addNotification(`Lista ${isActive ? "activada" : "desactivada"}.`, "success");
    } catch (error) {
      console.error(error);
      addNotification("No se pudo actualizar el estado de la lista.", "error");
    } finally {
      setIsMutatingLists(false);
    }
  };
  const handleDeletePriceList = async (listId) => {
    if (!window.confirm("¿Eliminar esta lista de precios?")) return;
    setIsMutatingLists(true);
    try {
      await priceListService.deletePriceList(listId);
      await fetchPriceLists();
      addNotification("Lista eliminada.", "info");
    } catch (error) {
      console.error(error);
      addNotification("No se pudo eliminar la lista.", "error");
    } finally {
      setIsMutatingLists(false);
    }
  };
  const handleApplyBulkMargin = async () => {
    if (!selectedBulkListId) {
      addNotification("Selecciona una lista para aplicar el margen.", "warning");
      return;
    }
    setIsMutatingLists(true);
    try {
      await priceListService.applyMarginRule(selectedBulkListId, bulkMarginSource, bulkMarginPercent);
      await fetchPriceLists();
      addNotification("Precios recalculados.", "success");
    } catch (error) {
      console.error(error);
      addNotification("No se pudieron recalcular los precios.", "error");
    } finally {
      setIsMutatingLists(false);
    }
  };
  const generateTaxId = () => typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `tax-${Date.now()}`;
  const handleAddExtraTax = () => {
    const percentValue = parseFloat(newTaxPercent);
    if (!newTaxName.trim()) {
      addNotification("Ingresa un nombre para el impuesto o bonificación.", "warning");
      return;
    }
    if (isNaN(percentValue)) {
      addNotification("Ingresa un porcentaje válido.", "warning");
      return;
    }
    const newRule = {
      id: generateTaxId(),
      name: newTaxName.trim(),
      type: newTaxType,
      percent: percentValue,
      applyByDefault: newTaxApplyDefault
    };
    setExtraTaxes((prev) => [...prev, newRule]);
    setNewTaxName("");
    setNewTaxPercent("");
    setNewTaxApplyDefault(false);
    setNewTaxType("tax");
  };
  const handleExtraTaxChange = (id, field, value) => {
    setExtraTaxes((prev) => prev.map((rule) => rule.id === id ? { ...rule, [field]: value } : rule));
  };
  const handleRemoveExtraTax = (id) => {
    setExtraTaxes((prev) => prev.filter((rule) => rule.id !== id));
  };
  const handleSaveTaxSettings = async () => {
    setIsSavingTaxSettings(true);
    try {
      const payload = {
        ivaPercent,
        applyIvaByDefault,
        pricesIncludeIvaByDefault,
        extraTaxes
      };
      await updateOrganizationData({ taxSettings: payload });
      addNotification("Configuración de impuestos guardada.", "success");
    } catch (error) {
      console.error(error);
      addNotification("No se pudieron guardar los impuestos.", "error");
    } finally {
      setIsSavingTaxSettings(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-200 dark:border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 mb-4", children: "Reglas de Negocio y Precios" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "minimumProfitMargin", className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "Margen de Ganancia Mínimo Deseado (%)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              name: "minimumProfitMargin",
              id: "minimumProfitMargin",
              value: minimumProfitMargin,
              onChange: (e) => setMinimumProfitMargin(parseFloat(e.target.value) || 0),
              className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1", children: "Este porcentaje alimenta las sugerencias de precios y alertas." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "lowStockThreshold", className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "Umbral de Alerta de Stock Bajo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              name: "lowStockThreshold",
              id: "lowStockThreshold",
              value: lowStockThreshold,
              onChange: (e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0),
              className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1", children: "El sistema notificará cuando el stock de un producto caiga por debajo de este número." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-800 dark:text-slate-200", children: "Umbrales específicos por unidad" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Reemplazan el umbral general para esa unidad." })
            ] }),
            Object.keys(unitThresholds).length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Aún no has definido umbrales por unidad." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: Object.entries(unitThresholds).map(([unit, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row items-center gap-3 border border-slate-200 dark:border-slate-700 rounded-md p-3 bg-slate-50/40 dark:bg-slate-900/40", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 w-full", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium capitalize text-slate-800 dark:text-slate-100", children: unit }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Productos con esta unidad usarán este umbral." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  step: "0.01",
                  className: "w-full md:w-32 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm",
                  value: value ?? 0,
                  onChange: (e) => handleUnitThresholdValueChange(unit, e.target.value)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => handleRemoveUnitThreshold(unit), className: "text-xs px-3 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600", children: "Quitar" })
            ] }, unit)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3 items-end", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Unidad" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: newUnitName,
                    onChange: (e) => setNewUnitName(e.target.value),
                    placeholder: "pieza, caja, litro...",
                    className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Umbral" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "number",
                    step: "0.01",
                    value: newUnitValue,
                    onChange: (e) => setNewUnitValue(e.target.value),
                    placeholder: "Ej. 5",
                    className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: handleAddUnitThreshold,
                  className: "px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 text-sm",
                  children: "Agregar unidad"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Si un producto maneja fracciones (por ejemplo cajas y piezas), puedes registrar ambos umbrales. Cuando ya no queden cajas completas, se evaluará el umbral definido para las piezas restantes." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-semibold text-slate-800 dark:text-slate-200", children: "Listas de precios múltiples" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Activa listas alternativas y asigna precios personalizados por cliente o venta." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => handleToggleMultiPrice(!multiPriceEnabled),
                className: `px-4 py-2 rounded-md text-sm font-semibold ${multiPriceEnabled ? "bg-green-600 text-white" : "bg-slate-600 text-slate-200"}`,
                disabled: isUpdatingMultiPrice,
                children: isUpdatingMultiPrice ? "Guardando..." : multiPriceEnabled ? "Activo" : "Inactivo"
              }
            )
          ] }),
          multiPriceEnabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "priceListLimit", className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "Número máximo de listas" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  id: "priceListLimit",
                  min: 1,
                  max: 10,
                  value: priceListLimit,
                  onChange: (e) => setPriceListLimit(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1))),
                  onBlur: (e) => handleLimitBlur(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1))),
                  className: "w-24 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1", children: [
                "Puedes definir hasta 10 listas. Actualmente tienes ",
                priceLists.length,
                "."
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: isLoadingPriceLists ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: "Cargando listas..." }) : priceLists.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Crea tu primera lista para definir precios alternativos." }) : priceLists.map((list) => {
              const isDefault = session?.organization?.defaultPriceListId === list.id;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-slate-200 dark:border-slate-700 rounded-md p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/40", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row md:items-center gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "text",
                      value: listNameDrafts[list.id] ?? list.name,
                      onChange: (e) => setListNameDrafts((prev) => ({ ...prev, [list.id]: e.target.value })),
                      className: "flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm",
                      placeholder: "Ej: VIP, Premium, Mayorista..."
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleRenamePriceList(list.id),
                        className: "px-3 py-2 text-xs bg-sky-600 text-white rounded-md hover:bg-sky-500 disabled:opacity-50",
                        disabled: isMutatingLists,
                        children: "Guardar nombre"
                      }
                    ),
                    !isDefault && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleDeletePriceList(list.id),
                        className: "px-3 py-2 text-xs bg-red-600 text-white rounded-md hover:bg-red-500 disabled:opacity-50",
                        disabled: isMutatingLists,
                        children: "Eliminar"
                      }
                    )
                  ] })
                ] }),
                isDefault && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-500 dark:text-amber-400", children: "⭐ Lista de precios por defecto (siempre activa)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "% Ganancia" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "number",
                        min: "0",
                        max: "100",
                        step: "0.1",
                        value: listMarginDrafts[list.id] ?? list.defaultMarginPercent,
                        onChange: (e) => setListMarginDrafts((prev) => ({ ...prev, [list.id]: parseFloat(e.target.value) || 0 })),
                        className: "w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Base de cálculo" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "select",
                      {
                        value: listMarginSourceDrafts[list.id] ?? list.defaultMarginSource,
                        onChange: (e) => setListMarginSourceDrafts((prev) => ({ ...prev, [list.id]: e.target.value })),
                        className: "w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "base_price", children: "Sobre precio base" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cost", children: "Sobre costo" })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => handleUpdatePriceListMargin(list.id),
                      className: "w-full px-3 py-2 text-xs bg-violet-600 text-white rounded-md hover:bg-violet-500 disabled:opacity-50",
                      disabled: isMutatingLists,
                      children: "Guardar margen"
                    }
                  ) })
                ] }),
                !isDefault && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-300", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: list.isActive,
                      onChange: (e) => handleTogglePriceListActive(list.id, e.target.checked),
                      disabled: isMutatingLists,
                      className: "form-checkbox bg-slate-700"
                    }
                  ),
                  "Lista activa"
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
                  "Recomendación: ",
                  listMarginSourceDrafts[list.id] ?? list.defaultMarginSource === "cost" ? `Precio = Costo × (1 + ${(listMarginDrafts[list.id] ?? list.defaultMarginPercent) / 100})` : `Precio = Precio base × (1 + ${(listMarginDrafts[list.id] ?? list.defaultMarginPercent) / 100})`
                ] })
              ] }, list.id);
            }) }),
            priceLists.length < priceListLimit && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row gap-3 items-end pt-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Nombre de la nueva lista" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: newListName,
                    onChange: (e) => setNewListName(e.target.value),
                    className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: handleCreatePriceList,
                  className: "px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 text-sm disabled:opacity-50",
                  disabled: isMutatingLists,
                  children: "Crear lista"
                }
              )
            ] }),
            priceLists.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Aplicar margen rápido" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "select",
                  {
                    value: selectedBulkListId,
                    onChange: (e) => setSelectedBulkListId(e.target.value),
                    className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm",
                    children: priceLists.map((list) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: list.id, children: list.name }, list.id))
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    value: bulkMarginSource,
                    onChange: (e) => setBulkMarginSource(e.target.value),
                    className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "base_price", children: "Sobre lista base" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cost", children: "Sobre costo" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "number",
                    value: bulkMarginPercent,
                    onChange: (e) => setBulkMarginPercent(parseFloat(e.target.value) || 0),
                    className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm",
                    placeholder: "%"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: handleApplyBulkMargin,
                    className: "px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 text-sm disabled:opacity-50",
                    disabled: isMutatingLists,
                    children: "Aplicar"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Esto recalcula los precios de todos los productos para la lista seleccionada." })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleSave,
            disabled: isLoading,
            className: "w-full px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed",
            children: isLoading ? "Guardando..." : "Guardar Reglas"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-200 dark:border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 mb-4", children: "Impuestos y configuración de compras" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1", children: "IVA (%)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "number",
                value: ivaPercent,
                onChange: (e) => setIvaPercent(parseFloat(e.target.value) || 0),
                className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "form-checkbox bg-slate-600", checked: applyIvaByDefault, onChange: (e) => setApplyIvaByDefault(e.target.checked) }),
            "Aplicar IVA por defecto"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "form-checkbox bg-slate-600", checked: pricesIncludeIvaByDefault, onChange: (e) => setPricesIncludeIvaByDefault(e.target.checked) }),
            "Precios del proveedor ya incluyen IVA"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: "Impuestos / retenciones adicionales" }),
          extraTaxes.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: "Aún no tienes impuestos adicionales configurados." }) : extraTaxes.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-900/40 border border-slate-700 rounded-md p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: rule.name, onChange: (e) => handleExtraTaxChange(rule.id, "name", e.target.value), className: "bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm", placeholder: "Nombre" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", step: "0.01", value: rule.percent, onChange: (e) => handleExtraTaxChange(rule.id, "percent", parseFloat(e.target.value) || 0), className: "bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm", placeholder: "%" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: rule.type, onChange: (e) => handleExtraTaxChange(rule.id, "type", e.target.value), className: "bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm capitalize", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "tax", children: "Impuesto (suma)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "retention", children: "Retención / descuento" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "bonus", children: "Bonificación" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-xs text-slate-300", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "form-checkbox bg-slate-600", checked: rule.applyByDefault ?? false, onChange: (e) => handleExtraTaxChange(rule.id, "applyByDefault", e.target.checked) }),
              "Aplicar por defecto"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => handleRemoveExtraTax(rule.id), className: "text-xs px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-500", children: "Eliminar" }) })
          ] }, rule.id)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-900/20 border border-dashed border-slate-600 rounded-md p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: newTaxName, onChange: (e) => setNewTaxName(e.target.value), placeholder: "Nombre", className: "bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", step: "0.01", value: newTaxPercent, onChange: (e) => setNewTaxPercent(e.target.value), placeholder: "%", className: "bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: newTaxType, onChange: (e) => setNewTaxType(e.target.value), className: "bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm capitalize", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "tax", children: "Impuesto (suma)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "retention", children: "Retención / descuento" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "bonus", children: "Bonificación" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-xs text-slate-300", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "form-checkbox bg-slate-600", checked: newTaxApplyDefault, onChange: (e) => setNewTaxApplyDefault(e.target.checked) }),
              "Aplicar por defecto"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleAddExtraTax, className: "px-4 py-2 text-sm bg-slate-700 text-white rounded-md hover:bg-slate-600", children: "Agregar" }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: handleSaveTaxSettings,
          className: "px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-500 disabled:bg-slate-500",
          disabled: isSavingTaxSettings,
          children: isSavingTaxSettings ? "Guardando..." : "Guardar impuestos"
        }
      ) })
    ] })
  ] });
};

const ALL_PERMISSIONS = [
  { key: "pos.access", label: "Acceder al Punto de Venta (POS)" },
  { key: "pos.apply_discount", label: "Aplicar descuentos en POS" },
  { key: "pos.edit_price", label: "Editar precios en el carrito" },
  { key: "pos.process_return", label: "Procesar devoluciones" },
  { key: "pos.close_register", label: "Realizar cierre de caja" },
  { key: "inventory.manage", label: "Crear, editar y eliminar productos" },
  { key: "inventory.import_export", label: "Importar y exportar inventario" },
  { key: "clients.manage", label: "Gestionar clientes" },
  { key: "reports.view", label: "Ver todos los reportes" },
  { key: "employees.manage", label: "Gestionar empleados y roles" },
  { key: "payroll.manage", label: "Gestionar nómina" },
  { key: "timeclock.manage", label: "Gestionar checador de horas (como admin)" },
  { key: "purchases.manage", label: "Registrar y gestionar compras" },
  { key: "settings.access", label: "Acceder a la configuración de la empresa" }
];
const PermissionEditor = ({ role, onBack }) => {
  const { roleService } = useServices();
  const { addNotification } = useNotification();
  const { updateOrganizationData } = useAuth();
  const [permissions, setPermissions] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    const fetchPerms = async () => {
      setIsLoading(true);
      const data = await roleService.getPermissionsForRole(role.id);
      setPermissions((data || []).filter((p) => p.requires_pin));
      setIsLoading(false);
    };
    fetchPerms();
  }, [role.id, roleService]);
  const handleToggle = (key, checked) => {
    setPermissions((prev) => {
      if (checked) {
        if (prev.some((p) => p.permission === key)) return prev;
        return [...prev, { id: "", role_id: role.id, permission: key, requires_pin: true }];
      }
      return prev.filter((p) => p.permission !== key);
    });
  };
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const permissionsToSet = permissions.map((p) => ({ permission: p.permission, requires_pin: true }));
      const allKeys = ALL_PERMISSIONS.map((p) => p.key);
      const updatedPins = await roleService.setPermissionsForRole(role.id, permissionsToSet, allKeys);
      await updateOrganizationData({ pinProtectedActions: updatedPins });
      addNotification(`Permisos para el rol "${role.name}" actualizados.`, "success");
      onBack();
    } catch (error) {
      addNotification("Error al guardar los permisos.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoading) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Cargando permisos..." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onBack, className: "text-sm text-sky-500 dark:text-sky-400 hover:underline mb-4", children: "← Volver a la lista de roles" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 mb-4", children: [
      "Editando Permisos para: ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sky-500 dark:text-sky-300", children: role.name })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: ALL_PERMISSIONS.map((p) => {
      const isProtected = permissions.some((cp) => cp.permission === p.key);
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: isProtected,
            onChange: (e) => handleToggle(p.key, e.target.checked),
            className: "form-checkbox h-5 w-5 bg-slate-200 dark:bg-slate-600 text-sky-500 rounded"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-800 dark:text-slate-200", children: [
          p.label,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs text-slate-500 dark:text-slate-400", children: "Requiere PIN para este rol" })
        ] })
      ] }) }) }, p.key);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleSave, disabled: isLoading, className: "px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 disabled:bg-slate-500", children: isLoading ? "Guardando..." : "Guardar Permisos" }) })
  ] });
};
const RoleSettings = () => {
  const { roleService } = useServices();
  const { addNotification } = useNotification();
  const [roles, setRoles] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [newRoleName, setNewRoleName] = reactExports.useState("");
  const [roleToDelete, setRoleToDelete] = reactExports.useState(null);
  const [selectedRole, setSelectedRole] = reactExports.useState(null);
  const fetchRoles = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (error) {
      addNotification("Error al cargar los roles.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [roleService, addNotification]);
  reactExports.useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);
  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      await roleService.addRole(newRoleName.trim());
      addNotification(`Rol "${newRoleName.trim()}" creado.`, "success");
      setNewRoleName("");
      fetchRoles();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      addNotification(message, "error");
    }
  };
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    if (["Vendedor", "Gerente", "Admin"].includes(roleToDelete.name)) {
      addNotification(`El rol "${roleToDelete.name}" es un rol base y no puede ser eliminado.`, "warning");
      setRoleToDelete(null);
      return;
    }
    try {
      await roleService.deleteRole(roleToDelete.id);
      addNotification(`Rol "${roleToDelete.name}" eliminado.`, "success");
      setRoleToDelete(null);
      fetchRoles();
    } catch (error) {
      addNotification("Error al eliminar el rol. Asegúrate de que ningún empleado esté usando este rol.", "error");
    }
  };
  if (selectedRole) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PermissionEditor, { role: selectedRole, onBack: () => setSelectedRole(null) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-200 dark:border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 mb-2", children: "Roles y Permisos" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400 mb-6", children: "Define los roles de tu negocio. Haz clic en un rol para editar sus permisos y decidir qué acciones requerirán un PIN de autorización." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleAddRole, className: "flex gap-2 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: newRoleName,
            onChange: (e) => setNewRoleName(e.target.value),
            placeholder: "Nombre del nuevo rol (ej: Bodeguero)",
            className: "flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-slate-900 dark:text-slate-100",
            required: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500", children: "Crear Rol" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Cargando roles..." }) : roles.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSelectedRole(role), className: "text-left flex-grow", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-800 dark:text-slate-100 font-semibold hover:text-sky-500 dark:hover:text-sky-300", children: role.name }) }),
          !["Vendedor", "Gerente", "Admin"].includes(role.name) && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setRoleToDelete(role), className: "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium text-sm", children: "Eliminar" })
        ] }, role.id)),
        roles.length === 0 && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-500 py-4", children: "No has creado ningún rol personalizado." })
      ] })
    ] }),
    roleToDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: !!roleToDelete,
        onClose: () => setRoleToDelete(null),
        onConfirm: handleDeleteRole,
        title: "Confirmar Eliminación de Rol",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-300", children: [
          "¿Estás seguro de que quieres eliminar el rol ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-slate-100", children: roleToDelete.name }),
          "?",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-amber-400 text-sm", children: "Asegúrate de que ningún empleado tenga este rol asignado antes de eliminarlo." })
        ] })
      }
    )
  ] });
};

const InterfaceSettings = reactExports.lazy(() => __vitePreload(() => import('./InterfaceSettings-B5O0otKj.js'),true              ?__vite__mapDeps([0,1,2,3,4,5]):void 0));
const SettingsPage = ({ onNavigate }) => {
  const { session, isSecuritySectionVerified, setSecuritySectionVerified, requiresPin } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = reactExports.useState("profile");
  const isSolopreneur = session?.organization?.subscriptionTier === "solopreneur";
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "settings.access";
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, permissionKey]);
  const handleTabChange = (tab) => {
    if (activeTab === "security" && tab !== "security") {
      setSecuritySectionVerified(false);
    }
    setActiveTab(tab);
  };
  const tabs = [
    { key: "profile", label: t("settingsTabProfile") },
    { key: "subscription", label: t("settingsTabSubscription") },
    { key: "receipt", label: t("settingsTabReceipt") },
    { key: "payments", label: "Métodos de Pago" },
    { key: "rules", label: "Reglas de Negocio" },
    { key: "loyalty", label: t("settingsTabLoyalty") },
    { key: "roles", label: "Roles y Permisos", forSolopreneur: false },
    { key: "interface", label: "Interfaz" },
    { key: "security", label: "Seguridad" }
  ];
  const availableTabs = isSolopreneur ? tabs.filter((tab) => tab.forSolopreneur !== false) : tabs;
  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CompanyProfileSettings, {});
      case "subscription":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(SubscriptionPage, {});
      case "receipt":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(TicketCustomizer, {});
      case "loyalty":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(LoyaltySettings, {});
      case "payments":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(PaymentMethodsSettings, {});
      case "rules":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(BusinessLogicSettings, {});
      case "roles":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(RoleSettings, {});
      case "interface":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(InterfaceSettings, {});
      case "security":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(SecuritySettings, { onVerificationCancel: () => setActiveTab("profile") });
      default:
        return null;
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
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4", children: t("navSettings") }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row gap-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "md:w-1/4 lg:w-1/5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "space-y-1", children: availableTabs.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => handleTabChange(tab.key),
          className: `w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-sky-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`,
          children: tab.label
        },
        tab.key
      )) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-6", children: "Cargando..." }), children: renderContent() }) })
    ] })
  ] });
};

export { SettingsPage as default };
