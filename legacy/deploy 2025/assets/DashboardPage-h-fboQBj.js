const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/AIGoalsAnalysisModal-CZ3DxFrZ.js","assets/landing-DMNKFuas.js","assets/index-B4F2XZYo.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css","assets/MainLayout-C0Ev0ilC.js","assets/inventoryCountService-Bo8nZII3.js","assets/SettingsIcon-DbPfflvT.js"])))=>i.map(i=>d[i]);
import { u as useAuth, e as useNotification, _ as __vitePreload } from './index-B4F2XZYo.js';
import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { a as aggregatePurchaseBreakdown, u as useServices, S as StarIcon, g as getBusinessSnapshotSummary } from './MainLayout-C0Ev0ilC.js';
import { f as formatCurrency } from './formatting-BolSclPB.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const InteractiveSalesChart = ({ sales, grouping, onGroupingChange }) => {
  const chartData = reactExports.useMemo(() => {
    const salesData = {};
    const now = /* @__PURE__ */ new Date();
    switch (grouping) {
      case "day":
        const startDateDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        for (let i = 0; i < 7; i++) {
          const d = new Date(startDateDay);
          d.setDate(d.getDate() + i);
          salesData[d.toISOString().split("T")[0]] = 0;
        }
        break;
      case "week":
        const startDateWeek = new Date(now);
        startDateWeek.setDate(now.getDate() - 27);
        for (let i = 0; i < 4; i++) {
          const d = new Date(startDateWeek);
          d.setDate(d.getDate() + i * 7);
          const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
          salesData[weekStart.toISOString().split("T")[0]] = 0;
        }
        break;
      case "month":
        const startDateMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        for (let i = 0; i < 12; i++) {
          const d = new Date(startDateMonth);
          d.setMonth(d.getMonth() + i);
          salesData[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
        }
        break;
    }
    sales.forEach((sale) => {
      const saleDate = new Date(sale.date);
      let key = "";
      switch (grouping) {
        case "day":
          key = saleDate.toISOString().split("T")[0];
          break;
        case "week":
          const weekStart = new Date(saleDate);
          weekStart.setDate(saleDate.getDate() - saleDate.getDay());
          key = weekStart.toISOString().split("T")[0];
          break;
        case "month":
          key = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
          break;
      }
      if (salesData.hasOwnProperty(key)) {
        salesData[key] += sale.total;
      }
    });
    const labels = Object.keys(salesData).sort();
    const data = labels.map((label) => salesData[label]);
    return { labels, data };
  }, [sales, grouping]);
  const maxValue = reactExports.useMemo(() => Math.max(...chartData.data, 1), [chartData]);
  const getLabelDisplay = (label) => {
    const date = /* @__PURE__ */ new Date(label + (grouping === "month" ? "-02T00:00:00" : "T00:00:00"));
    switch (grouping) {
      case "day":
        return date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
      case "week":
        const endDate = new Date(date);
        endDate.setDate(date.getDate() + 6);
        return `${date.getDate()} - ${endDate.getDate()} ${endDate.toLocaleString("es-ES", { month: "short" })}`;
      case "month":
        return date.toLocaleString("es-ES", { month: "short", year: "2-digit" });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-4 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-900 dark:text-slate-100", children: "Resumen de Ventas" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1", children: ["day", "week", "month"].map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => onGroupingChange(opt),
          className: `px-3 py-1 text-sm font-semibold rounded-md transition-colors ${grouping === opt ? "bg-white dark:bg-sky-600 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"}`,
          children: opt === "day" ? "Día" : opt === "week" ? "Semana" : "Mes"
        },
        opt
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-grow flex justify-around items-end gap-2", children: chartData.labels.map((label, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col justify-end items-center h-full group relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute -top-8 hidden group-hover:block bg-slate-900 text-white text-xs rounded py-1 px-2 pointer-events-none shadow-lg z-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold", children: getLabelDisplay(label) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-mono", children: [
          "$",
          chartData.data[index].toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "w-full bg-sky-500 rounded-t-md hover:bg-sky-400 transition-colors",
          style: { height: `${chartData.data[index] / maxValue * 100}%` }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400 mt-2 text-center", children: getLabelDisplay(label) })
    ] }, label)) })
  ] });
};

const StatCard = ({ title, value, colorClass, helper }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-200 dark:border-slate-700", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-medium text-slate-500 dark:text-slate-400", children: title }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-3xl font-bold mt-2 ${colorClass || "text-slate-900 dark:text-slate-100"}`, children: value }),
  helper && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1", children: helper })
] });
const DashboardSummary = ({ sales, purchases, expenses, investments }) => {
  const { session } = useAuth();
  const currency = session?.organization?.currency || "USD";
  const isSolopreneur = session?.organization?.subscriptionTier === "solopreneur";
  const summary = reactExports.useMemo(() => {
    const salesOnly = sales.filter((s) => s.type === "sale");
    const totalRevenue = salesOnly.reduce((acc, sale) => acc + sale.total, 0);
    const totalCostOfGoods = salesOnly.reduce(
      (acc, sale) => acc + sale.items.reduce((itemAcc, item) => itemAcc + (item.costPrice || 0) * item.quantity, 0),
      0
    );
    const grossProfit = totalRevenue - totalCostOfGoods;
    const paidPurchases = purchases.filter((p) => p.status === "Pagada");
    const purchaseBreakdown = aggregatePurchaseBreakdown(paidPurchases);
    const totalPurchases = purchaseBreakdown.total;
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = grossProfit - totalExpenses - (isSolopreneur ? 0 : totalPurchases);
    const totalInvestmentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
    return {
      totalRevenue,
      grossProfit,
      totalPurchases,
      purchaseBreakdown,
      totalExpenses,
      netProfit,
      totalInvestmentValue
    };
  }, [sales, purchases, expenses, investments, isSolopreneur]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        title: "Ingresos Totales",
        value: formatCurrency(summary.totalRevenue, currency)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        title: "Ganancia Bruta (Ventas)",
        value: formatCurrency(summary.grossProfit, currency),
        colorClass: "text-green-500 dark:text-green-400"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        title: "Ganancia Neta (Operativa)",
        value: formatCurrency(summary.netProfit, currency),
        colorClass: summary.netProfit >= 0 ? "text-green-600 dark:text-green-300" : "text-red-500 dark:text-red-400"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        title: "Total Gastos",
        value: formatCurrency(summary.totalExpenses, currency),
        colorClass: "text-amber-500 dark:text-amber-400"
      }
    ),
    !isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        title: "Total Compras",
        value: formatCurrency(summary.totalPurchases, currency),
        helper: `Base: ${formatCurrency(summary.purchaseBreakdown.subtotal, currency)} · Imp.: ${formatCurrency(summary.purchaseBreakdown.taxTotal, currency)}`,
        colorClass: "text-sky-500 dark:text-sky-400"
      }
    ),
    isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        title: "Valor de Inversiones",
        value: formatCurrency(summary.totalInvestmentValue, currency),
        colorClass: "text-purple-500 dark:text-purple-400"
      }
    )
  ] });
};

const TargetIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z", clipRule: "evenodd" }) });

const AIGoalsAnalysisModal = reactExports.lazy(() => __vitePreload(() => import('./AIGoalsAnalysisModal-CZ3DxFrZ.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8]):void 0));
const BusinessSnapshotBar = ({ allSales }) => {
  const [analysis, setAnalysis] = reactExports.useState("Analizando datos del negocio...");
  const [isLoading, setIsLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const getAnalysis = async () => {
      setIsLoading(true);
      const cacheKey = `businessSnapshot_${todayStr}`;
      const cachedAnalysis = localStorage.getItem(cacheKey);
      if (cachedAnalysis) {
        setAnalysis(cachedAnalysis);
        setIsLoading(false);
        return;
      }
      if (allSales.length < 2) {
        const noDataMsg = "Se necesitan más datos de ventas para un análisis general.";
        setAnalysis(noDataMsg);
        localStorage.setItem(cacheKey, noDataMsg);
        setIsLoading(false);
        return;
      }
      try {
        const result = await getBusinessSnapshotSummary(allSales);
        setAnalysis(result);
        localStorage.setItem(cacheKey, result);
      } catch (error) {
        setAnalysis("No se pudo generar el análisis de IA.");
      } finally {
        setIsLoading(false);
      }
    };
    getAnalysis();
  }, [allSales]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 p-3 rounded-lg flex items-start gap-3 w-full flex-shrink-0 h-28 overflow-y-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(StarIcon, { className: "h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-300 text-sm whitespace-pre-line", children: isLoading ? "Analizando..." : analysis })
  ] });
};
const DashboardPage = () => {
  const { saleService, purchaseService, expenseService, investmentService, clientService, inventoryService } = useServices();
  const { session } = useAuth();
  const { addNotification } = useNotification();
  const [allSales, setAllSales] = reactExports.useState([]);
  const [allPurchases, setAllPurchases] = reactExports.useState([]);
  const [allExpenses, setAllExpenses] = reactExports.useState([]);
  const [allInvestments, setAllInvestments] = reactExports.useState([]);
  const [allClients, setAllClients] = reactExports.useState([]);
  const [allProducts, setAllProducts] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [grouping, setGrouping] = reactExports.useState("day");
  const [isGoalsModalOpen, setIsGoalsModalOpen] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [salesData, purchasesData, expensesData, investmentsData, clientsData, productsData] = await Promise.all([
          saleService.getSales(),
          purchaseService.getPurchaseNotes(),
          expenseService.getAllExpenses(),
          investmentService.getInvestments(),
          clientService.getAllClients(),
          inventoryService.searchInventory("")
        ]);
        setAllSales(salesData);
        setAllPurchases(purchasesData);
        setAllExpenses(expensesData);
        setAllInvestments(investmentsData);
        setAllClients(clientsData);
        setAllProducts(productsData);
      } catch (error) {
        addNotification("Error al cargar los datos del dashboard.", "error");
        console.error("Dashboard fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);
  const { filteredSales, filteredPurchases, filteredExpenses, filteredClients } = reactExports.useMemo(() => {
    const now = /* @__PURE__ */ new Date();
    let startDate;
    switch (grouping) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 27);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        break;
      default:
        return { filteredSales: allSales, filteredPurchases: allPurchases, filteredExpenses: allExpenses, filteredClients: allClients };
    }
    return {
      filteredSales: allSales.filter((sale) => new Date(sale.date) >= startDate),
      filteredPurchases: allPurchases.filter((p) => new Date(p.date) >= startDate),
      filteredExpenses: allExpenses.filter((e) => new Date(e.date) >= startDate),
      // This is a proxy for new clients; real implementation would check creation date
      filteredClients: allClients.filter((c) => new Date(c.loyaltyPoints > 0 ? Date.now() : 0) >= startDate)
    };
  }, [allSales, allPurchases, allExpenses, allClients, grouping]);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-slate-500 dark:text-slate-400", children: "Cargando dashboard..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6 space-y-6 flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-900 dark:text-slate-100", children: "Dashboard" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setIsGoalsModalOpen(true),
          className: "px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-500 transition-colors flex items-center gap-2",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TargetIcon, { className: "h-5 w-5" }),
            "Analizar Metas con IA"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardSummary, { sales: filteredSales, purchases: filteredPurchases, expenses: filteredExpenses, investments: allInvestments }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-grow min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      InteractiveSalesChart,
      {
        sales: filteredSales,
        grouping,
        onGroupingChange: setGrouping
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(BusinessSnapshotBar, { allSales }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}), children: isGoalsModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      AIGoalsAnalysisModal,
      {
        isOpen: isGoalsModalOpen,
        onClose: () => setIsGoalsModalOpen(false),
        sales: filteredSales,
        expenses: filteredExpenses,
        purchases: filteredPurchases,
        clients: filteredClients,
        products: allProducts
      }
    ) })
  ] });
};

export { DashboardPage as default };
