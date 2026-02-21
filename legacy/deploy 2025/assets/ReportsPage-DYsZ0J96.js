import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import SaleDetailModal from './SaleDetailModal-DKc9AHtw.js';
import { D as DateRangePickerModal } from './DateRangePickerModal-C8t1skse.js';
import { e as useNotification, u as useAuth } from './index-B4F2XZYo.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const StatCard$1 = ({ title, value, subtext }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-medium text-slate-400", children: title }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-3xl font-bold text-slate-100 mt-2", children: value }),
  subtext && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-1", children: subtext })
] });
const ReportSummary = ({ sales }) => {
  const summary = reactExports.useMemo(() => {
    const salesOnly = sales.filter((s) => s.type === "sale");
    const totalRevenue = salesOnly.reduce((acc, sale) => acc + sale.total, 0);
    const totalSales = salesOnly.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    const totalItemsSold = salesOnly.reduce((acc, sale) => acc + sale.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0), 0);
    return {
      totalRevenue,
      totalSales,
      averageSale,
      totalItemsSold
    };
  }, [sales]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard$1,
      {
        title: "Ingresos Totales",
        value: `$${summary.totalRevenue.toFixed(2)}`
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard$1,
      {
        title: "Número de Ventas",
        value: summary.totalSales.toLocaleString()
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard$1,
      {
        title: "Ticket Promedio",
        value: `$${summary.averageSale.toFixed(2)}`
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard$1,
      {
        title: "Artículos Vendidos",
        value: summary.totalItemsSold.toLocaleString()
      }
    )
  ] });
};

const SalesTable = ({ sales, onViewDetails }) => {
  if (sales.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400 h-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-2", children: "Historial de Ventas" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "No hay ventas en el período seleccionado." })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 p-4 border-b border-slate-700", children: "Historial de Ventas" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Ticket #" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Fecha y Hora" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Vendedor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Artículos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Total" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: sales.map((sale) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "tr",
        {
          className: "border-b border-slate-700 hover:bg-slate-700/50 cursor-pointer",
          onClick: () => onViewDetails(sale),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-mono font-semibold text-slate-100", children: sale.ticketNumber }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: new Date(sale.date).toLocaleString() }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: sale.employeeName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: sale.items.reduce((acc, item) => acc + item.quantity, 0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4 text-right font-mono font-semibold text-green-300", children: [
              "$",
              sale.total.toFixed(2)
            ] })
          ]
        },
        sale.id
      )) })
    ] }) })
  ] });
};

const filters = [
  { key: "all", label: "Todos" },
  { key: "today", label: "Hoy" },
  { key: "last7", label: "Últimos 7 días" },
  { key: "last30", label: "Últimos 30 días" }
];
const DateFilter = ({ currentFilter, onFilterChange, onCustomRangeClick }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1 flex-wrap", children: [
    filters.map(({ key, label }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => onFilterChange(key),
        className: `px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${currentFilter === key ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-700"}`,
        children: label
      },
      key
    )),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: onCustomRangeClick,
        className: `px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${currentFilter === "custom" ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-700"}`,
        children: "Personalizado"
      }
    )
  ] });
};

const TopProductsChart = ({ sales }) => {
  const topProducts = reactExports.useMemo(() => {
    const productMap = /* @__PURE__ */ new Map();
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productMap.get(item.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          productMap.set(item.id, {
            name: item.name,
            quantity: item.quantity
          });
        }
      });
    });
    return Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [sales]);
  const maxQuantity = reactExports.useMemo(() => {
    return topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.quantity)) : 0;
  }, [topProducts]);
  if (sales.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-4 h-full flex flex-col items-center justify-center text-slate-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-2", children: "Productos Más Vendidos" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "No hay datos de ventas para mostrar." })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-4 h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-4", children: "Productos Más Vendidos" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      topProducts.map((product, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center text-sm mb-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-slate-200 truncate pr-2", children: product.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-slate-300", children: [
            product.quantity,
            " uds."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-slate-700 rounded-full h-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "bg-sky-500 h-2.5 rounded-full",
            style: { width: `${maxQuantity > 0 ? product.quantity / maxQuantity * 100 : 0}%` }
          }
        ) })
      ] }, index)),
      topProducts.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-center pt-8", children: "No hay productos vendidos en este período." })
    ] })
  ] });
};

const SalesReportsContent = () => {
  const { saleService } = useServices();
  const { addNotification } = useNotification();
  const [sales, setSales] = reactExports.useState(null);
  const isLoading = sales === null;
  const [selectedSale, setSelectedSale] = reactExports.useState(null);
  const [filter, setFilter] = reactExports.useState("today");
  const [isDatePickerOpen, setIsDatePickerOpen] = reactExports.useState(false);
  const [customRange, setCustomRange] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const fetchSales = async () => {
      try {
        const salesData = await saleService.getSales();
        setSales(salesData);
      } catch (err) {
        addNotification("No se pudieron cargar las ventas.", "error");
        console.error(err);
        setSales([]);
      }
    };
    fetchSales();
  }, [saleService, addNotification]);
  const filteredSales = reactExports.useMemo(() => {
    if (!sales) return [];
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (filter) {
      case "today":
        const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1e3 - 1);
        return sales.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= today && saleDate <= endOfToday;
        });
      case "last7":
        const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1e3);
        return sales.filter((sale) => new Date(sale.date) >= sevenDaysAgo);
      case "last30":
        const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1e3);
        return sales.filter((sale) => new Date(sale.date) >= thirtyDaysAgo);
      case "custom":
        if (!customRange) return [];
        const endDate = new Date(customRange.end);
        endDate.setHours(23, 59, 59, 999);
        return sales.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= customRange.start && saleDate <= endDate;
        });
      case "all":
      default:
        return sales;
    }
  }, [sales, filter, customRange]);
  const handleViewSaleDetails = (sale) => {
    setSelectedSale(sale);
  };
  const handleCloseModal = () => {
    setSelectedSale(null);
  };
  const handleCustomDateChange = (start, end) => {
    setCustomRange({ start, end });
    setFilter("custom");
    setIsDatePickerOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Visión General de Ventas" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        DateFilter,
        {
          currentFilter: filter,
          onFilterChange: setFilter,
          onCustomRangeClick: () => setIsDatePickerOpen(true)
        }
      )
    ] }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando reportes..." }),
    !isLoading && sales && sales.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No se han registrado ventas." }),
    !isLoading && sales && sales.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ReportSummary, { sales: filteredSales }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SalesTable, { sales: filteredSales, onViewDetails: handleViewSaleDetails }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TopProductsChart, { sales: filteredSales }) })
      ] })
    ] }),
    selectedSale && /* @__PURE__ */ jsxRuntimeExports.jsx(
      SaleDetailModal,
      {
        isOpen: !!selectedSale,
        onClose: handleCloseModal,
        sale: selectedSale
      }
    ),
    isDatePickerOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      DateRangePickerModal,
      {
        isOpen: isDatePickerOpen,
        onClose: () => setIsDatePickerOpen(false),
        onApply: handleCustomDateChange
      }
    )
  ] });
};

const StatCard = ({ title, value, colorClass = "text-slate-100" }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-medium text-slate-400", children: title }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-3xl font-bold mt-2 ${colorClass}`, children: value })
] });
const ProfitabilitySummary = ({ sales }) => {
  const summary = reactExports.useMemo(() => {
    const salesOnly = sales.filter((s) => s.type === "sale");
    const totalRevenue = salesOnly.reduce((acc, sale) => acc + sale.total, 0);
    const totalCost = salesOnly.reduce(
      (acc, sale) => acc + sale.items.reduce((itemAcc, item) => itemAcc + item.costPrice * item.quantity, 0),
      0
    );
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? grossProfit / totalRevenue * 100 : 0;
    return {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin
    };
  }, [sales]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        title: "Ingresos Totales",
        value: `$${summary.totalRevenue.toFixed(2)}`
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        title: "Costo de Bienes Vendidos",
        value: `$${summary.totalCost.toFixed(2)}`,
        colorClass: "text-amber-400"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        title: "Ganancia Bruta",
        value: `$${summary.grossProfit.toFixed(2)}`,
        colorClass: "text-green-400"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatCard,
      {
        title: "Margen de Ganancia",
        value: `${summary.profitMargin.toFixed(1)}%`,
        colorClass: "text-sky-400"
      }
    )
  ] });
};

const TopProfitableProductsChart = ({ sales }) => {
  const topProducts = reactExports.useMemo(() => {
    const productMap = /* @__PURE__ */ new Map();
    sales.filter((s) => s.type === "sale").forEach((sale) => {
      sale.items.forEach((item) => {
        const profitPerItem = item.price - item.costPrice;
        const totalProfitForItem = profitPerItem * item.quantity - (item.discount?.calculatedDiscount || 0);
        const existing = productMap.get(item.id);
        if (existing) {
          existing.profit += totalProfitForItem;
        } else {
          productMap.set(item.id, {
            name: item.name,
            profit: totalProfitForItem
          });
        }
      });
    });
    return Array.from(productMap.values()).filter((p) => p.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [sales]);
  const maxProfit = reactExports.useMemo(() => {
    return topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.profit)) : 0;
  }, [topProducts]);
  if (sales.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-4 h-full flex flex-col items-center justify-center text-slate-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-2", children: "Productos Más Rentables" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "No hay datos de ventas para mostrar." })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-4 h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-4", children: "Top 5 Productos Más Rentables" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      topProducts.map((product, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center text-sm mb-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-slate-200 truncate pr-2", children: product.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-green-300", children: [
            "$",
            product.profit.toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-slate-700 rounded-full h-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "bg-green-500 h-2.5 rounded-full",
            style: { width: `${maxProfit > 0 ? product.profit / maxProfit * 100 : 0}%` }
          }
        ) })
      ] }, index)),
      topProducts.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-center pt-8", children: "No hay productos con ganancia en este período." })
    ] })
  ] });
};

const ProfitByCategoryChart = ({ sales }) => {
  const categoryProfits = reactExports.useMemo(() => {
    const categoryMap = /* @__PURE__ */ new Map();
    sales.filter((s) => s.type === "sale").forEach((sale) => {
      sale.items.forEach((item) => {
        const categoryName = item.category || "Sin Categoría";
        const profitPerItem = item.price - item.costPrice;
        const totalProfitForItem = profitPerItem * item.quantity - (item.discount?.calculatedDiscount || 0);
        const existing = categoryMap.get(categoryName);
        if (existing) {
          existing.profit += totalProfitForItem;
        } else {
          categoryMap.set(categoryName, {
            name: categoryName,
            profit: totalProfitForItem
          });
        }
      });
    });
    return Array.from(categoryMap.values()).filter((c) => c.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [sales]);
  const maxProfit = reactExports.useMemo(() => {
    return categoryProfits.length > 0 ? Math.max(...categoryProfits.map((c) => c.profit)) : 0;
  }, [categoryProfits]);
  if (sales.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-4 h-full flex flex-col items-center justify-center text-slate-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-2", children: "Ganancia por Categoría" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "No hay datos de ventas para mostrar." })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-4 h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-4", children: "Top 5 Categorías Más Rentables" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      categoryProfits.map((category, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center text-sm mb-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-slate-200 truncate pr-2", children: category.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-green-300", children: [
            "$",
            category.profit.toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-slate-700 rounded-full h-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "bg-sky-500 h-2.5 rounded-full",
            style: { width: `${maxProfit > 0 ? category.profit / maxProfit * 100 : 0}%` }
          }
        ) })
      ] }, index)),
      categoryProfits.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-center pt-8", children: "No hay categorías con ganancia en este período." })
    ] })
  ] });
};

const ProfitabilityPage = () => {
  const { saleService } = useServices();
  const [sales, setSales] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [filter, setFilter] = reactExports.useState("today");
  const [isDatePickerOpen, setIsDatePickerOpen] = reactExports.useState(false);
  const [customRange, setCustomRange] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const fetchSales = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const salesData = await saleService.getSales();
        const sanitizedSales = salesData.map((sale) => ({
          ...sale,
          items: sale.items.map((item) => ({
            ...item,
            costPrice: typeof item.costPrice === "number" ? item.costPrice : 0
          }))
        }));
        setSales(sanitizedSales);
      } catch (err) {
        setError("No se pudieron cargar los datos de ventas para el análisis.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSales();
  }, [saleService]);
  const filteredSales = reactExports.useMemo(() => {
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (filter) {
      case "today":
        return sales.filter((sale) => new Date(sale.date) >= today);
      case "last7":
        const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1e3);
        return sales.filter((sale) => new Date(sale.date) >= sevenDaysAgo);
      case "last30":
        const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1e3);
        return sales.filter((sale) => new Date(sale.date) >= thirtyDaysAgo);
      case "custom":
        if (!customRange) return [];
        const endDate = new Date(customRange.end);
        endDate.setHours(23, 59, 59, 999);
        return sales.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= customRange.start && saleDate <= endDate;
        });
      case "all":
      default:
        return sales;
    }
  }, [sales, filter, customRange]);
  const handleCustomDateChange = (start, end) => {
    setCustomRange({ start, end });
    setFilter("custom");
    setIsDatePickerOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Análisis de Rentabilidad" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        DateFilter,
        {
          currentFilter: filter,
          onFilterChange: setFilter,
          onCustomRangeClick: () => setIsDatePickerOpen(true)
        }
      )
    ] }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Calculando rentabilidad..." }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-red-400", children: error }),
    !isLoading && !error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ProfitabilitySummary, { sales: filteredSales }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TopProfitableProductsChart, { sales: filteredSales }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ProfitByCategoryChart, { sales: filteredSales })
      ] })
    ] }),
    isDatePickerOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      DateRangePickerModal,
      {
        isOpen: isDatePickerOpen,
        onClose: () => setIsDatePickerOpen(false),
        onApply: handleCustomDateChange
      }
    )
  ] });
};

const ReportsPage = ({ onNavigate }) => {
  const { session, requiresPin } = useAuth();
  const [activeTab, setActiveTab] = reactExports.useState("sales");
  const isSolopreneur = session?.organization?.subscriptionTier === "solopreneur";
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "reports.view";
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, permissionKey]);
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
  if (isSolopreneur) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 md:p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SalesReportsContent, {}) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex border-b border-slate-700 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setActiveTab("sales"),
          className: `px-4 py-3 text-sm font-medium transition-colors capitalize border-b-2
                        ${activeTab === "sales" ? "border-sky-400 text-sky-300" : "border-transparent text-slate-400 hover:text-slate-200"}`,
          children: "Reporte de Ventas"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setActiveTab("profitability"),
          className: `px-4 py-3 text-sm font-medium transition-colors capitalize border-b-2
                        ${activeTab === "profitability" ? "border-sky-400 text-sky-300" : "border-transparent text-slate-400 hover:text-slate-200"}`,
          children: "Análisis de Rentabilidad"
        }
      )
    ] }),
    activeTab === "sales" && /* @__PURE__ */ jsxRuntimeExports.jsx(SalesReportsContent, {}),
    activeTab === "profitability" && /* @__PURE__ */ jsxRuntimeExports.jsx(ProfitabilityPage, {})
  ] });
};

export { ReportsPage as default };
