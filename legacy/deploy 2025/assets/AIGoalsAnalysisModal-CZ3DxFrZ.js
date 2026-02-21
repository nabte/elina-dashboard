import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useAuth, e as useNotification } from './index-B4F2XZYo.js';
import { n as normalizeThresholdMap, a as aggregatePurchaseBreakdown, i as isProductLowStock, l as analyzeBusinessGoals } from './MainLayout-C0Ev0ilC.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const AIGoalsAnalysisModal = ({ isOpen, onClose, sales, expenses, purchases, clients, products }) => {
  const { session, updateOrganizationData } = useAuth();
  const { addNotification } = useNotification();
  const [goals, setGoals] = reactExports.useState(session?.organization?.goals || "");
  const [challenges, setChallenges] = reactExports.useState(session?.organization?.challenges || "");
  const [isEditing, setIsEditing] = reactExports.useState(false);
  const [history, setHistory] = reactExports.useState([]);
  const [userInput, setUserInput] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const unitThresholdMap = reactExports.useMemo(
    () => normalizeThresholdMap(session?.organization?.uiSettings?.unitLowStockThresholds),
    [session?.organization?.uiSettings?.unitLowStockThresholds]
  );
  const defaultLowStockThreshold = session?.organization?.lowStockThreshold ?? 10;
  const dataSummary = reactExports.useMemo(() => {
    const salesOnly = sales.filter((s) => s.type === "sale");
    const totalRevenue = salesOnly.reduce((acc, sale) => acc + sale.total, 0);
    const totalCostOfGoods = salesOnly.reduce((acc, sale) => acc + sale.items.reduce((itemAcc, item) => itemAcc + (item.costPrice || 0) * item.quantity, 0), 0);
    const grossProfit = totalRevenue - totalCostOfGoods;
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const paidPurchaseBreakdown = aggregatePurchaseBreakdown(purchases.filter((p) => p.status === "Pagada"));
    const totalPurchases = paidPurchaseBreakdown.total;
    const netProfit = grossProfit - totalExpenses - totalPurchases;
    const totalSales = salesOnly.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    const productSales = /* @__PURE__ */ new Map();
    salesOnly.forEach((sale) => {
      sale.items.forEach((item) => {
        const profit = (item.price - (item.costPrice || 0)) * item.quantity - (item.discount?.calculatedDiscount || 0);
        const existing = productSales.get(item.id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.profit += profit;
        } else {
          productSales.set(item.id, { name: item.name, quantity: item.quantity, profit });
        }
      });
    });
    const bestSellers = [...productSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 3).map((p) => p.name);
    const mostProfitable = [...productSales.values()].sort((a, b) => b.profit - a.profit).slice(0, 3).map((p) => p.name);
    const totalInventoryUnits = products.reduce((sum, product) => sum + (product.stock ?? 0), 0);
    const inventoryValueCost = products.reduce((sum, product) => sum + (product.stock ?? 0) * (product.costPrice || 0), 0);
    const inventoryValuePrice = products.reduce((sum, product) => sum + (product.stock ?? 0) * (product.price || 0), 0);
    const lowStockCount = products.filter((product) => isProductLowStock(product, unitThresholdMap, defaultLowStockThreshold)).length;
    return {
      totalRevenue,
      grossProfit,
      netProfit,
      totalSales,
      averageSale,
      totalClients: clients.length,
      newClients: clients.length,
      // Placeholder, needs creation date on client
      bestSellers,
      mostProfitable,
      purchaseSubtotal: paidPurchaseBreakdown.subtotal,
      purchaseTaxes: paidPurchaseBreakdown.taxTotal,
      totalProducts: products.length,
      totalInventoryUnits,
      inventoryValueCost,
      inventoryValuePrice,
      lowStockCount
    };
  }, [sales, expenses, purchases, clients, products, unitThresholdMap, defaultLowStockThreshold]);
  reactExports.useEffect(() => {
    const getInitialAnalysis = async () => {
      setIsLoading(true);
      setHistory([]);
      const initialAnswer = await analyzeBusinessGoals(goals, challenges, dataSummary);
      setHistory([{ question: "Análisis Inicial", answer: initialAnswer }]);
      setIsLoading(false);
    };
    if (isOpen) {
      getInitialAnalysis();
    }
  }, [isOpen, goals, challenges, dataSummary]);
  const handleSaveGoals = async () => {
    try {
      await updateOrganizationData({ goals, challenges });
      addNotification("Metas actualizadas.", "success");
      setIsEditing(false);
    } catch (error) {
      addNotification("No se pudieron guardar las metas.", "error");
    }
  };
  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;
    const question = userInput;
    setHistory((prev) => [...prev, { question, answer: "Analizando..." }]);
    setUserInput("");
    setIsLoading(true);
    const answer = await analyzeBusinessGoals(goals, challenges, dataSummary, question);
    setHistory((prev) => prev.map((h) => h.question === question ? { ...h, answer } : h));
    setIsLoading(false);
  };
  const renderAnswer = (text) => {
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-300">$1</strong>').replace(/\n/g, "<br />");
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-slate-200 whitespace-pre-wrap", dangerouslySetInnerHTML: { __html: formattedText } });
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-4xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700 flex flex-col", style: { height: "calc(100vh - 4rem)" }, onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Análisis de Metas con IA" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-1 bg-slate-900/50 p-4 rounded-lg space-y-4 flex flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-lg text-slate-200", children: "Tus Metas y Desafíos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsEditing(!isEditing), className: "text-sm text-sky-400 hover:underline", children: isEditing ? "Cancelar" : "Editar" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium text-slate-400", children: "Metas Principales" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: goals, onChange: (e) => setGoals(e.target.value), rows: 4, disabled: !isEditing, className: "w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm disabled:bg-transparent disabled:border-transparent" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium text-slate-400", children: "Desafíos Actuales" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: challenges, onChange: (e) => setChallenges(e.target.value), rows: 4, disabled: !isEditing, className: "w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm disabled:bg-transparent disabled:border-transparent" })
        ] }),
        isEditing && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleSaveGoals, className: "w-full bg-green-600 text-white font-semibold py-2 rounded-md hover:bg-green-500", children: "Guardar Metas" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-2 flex flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-grow overflow-y-auto space-y-4 pr-2", children: [
          history.map((item, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            item.question !== "Análisis Inicial" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-sky-300 text-right mb-1", children: item.question }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-700/50 p-3 rounded-lg", children: renderAnswer(item.answer) })
          ] }, index)),
          isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-slate-300 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-sky-400 mx-auto" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmitQuestion, className: "mt-4 flex gap-2 flex-shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: userInput, onChange: (e) => setUserInput(e.target.value), placeholder: "Haz una pregunta de seguimiento...", className: "flex-grow bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md text-sm disabled:bg-slate-500", children: "Enviar" })
        ] })
      ] })
    ] })
  ] }) });
};

export { AIGoalsAnalysisModal as default };
