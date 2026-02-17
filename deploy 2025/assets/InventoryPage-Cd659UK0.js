const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ProductFormModal-PW0MJqBg.js","assets/index-B4F2XZYo.js","assets/landing-DMNKFuas.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css","assets/MainLayout-C0Ev0ilC.js","assets/inventoryCountService-Bo8nZII3.js","assets/SettingsIcon-DbPfflvT.js","assets/ConfirmationModal-D0s46AqS.js","assets/CategoryManagerModal-CyXVRuUP.js","assets/AIInventoryOptimizer-CP5Ymeol.js","assets/ImportMappingModal-CZxsWzhz.js"])))=>i.map(i=>d[i]);
import { u as useAuth, e as useNotification, _ as __vitePreload } from './index-B4F2XZYo.js';
import { j as jsxRuntimeExports, b as reactExports } from './landing-DMNKFuas.js';
import { n as normalizeThresholdMap, i as isProductLowStock, u as useServices, d as detectUnitOfMeasure } from './MainLayout-C0Ev0ilC.js';
import { P as PlusIcon } from './PlusIcon-Dp3X8gCD.js';
import { S as SearchIcon } from './SearchIcon-adFEEg0f.js';
import { p as parseSpreadsheetFile, e as exportToCsv } from './fileParser-CZ0ywuS-.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import { b as bunnyService } from './bunnyService-Bv6QdtJu.js';
import { f as formatCurrency } from './formatting-BolSclPB.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const InventoryToolbar = ({
  title,
  searchTerm,
  onSearchChange,
  onAddProduct,
  addProductButtonLabel = "Nuevo Producto",
  onManageCategories,
  onExport,
  onImport,
  onOpenAITool,
  aiToolButtonLabel = "Herramienta IA",
  onDetectUnits,
  isDetectingUnits = false,
  subscriptionTier
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col sm:flex-row justify-between items-center gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-grow w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "Buscar...",
            value: searchTerm,
            onChange: (e) => onSearchChange(e.target.value),
            className: "w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SearchIcon, { className: "h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 w-full sm:w-auto", children: [
        onImport && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onImport, className: "px-3 py-2 text-sm bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-500 w-full sm:w-auto", children: "Importar" }),
        onExport && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onExport, className: "px-3 py-2 text-sm bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-500 w-full sm:w-auto", children: "Exportar" }),
        onManageCategories && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onManageCategories, className: "px-3 py-2 text-sm bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-500 w-full sm:w-auto whitespace-nowrap", children: "Categorías" }),
        onDetectUnits && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onDetectUnits,
            disabled: isDetectingUnits,
            className: "px-3 py-2 text-sm bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto whitespace-nowrap",
            title: "Detectar unidades de medida con IA para productos sin unidad",
            children: isDetectingUnits ? "Detectando..." : "Detectar Unidad IA"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 w-full sm:w-auto", children: [
        onOpenAITool && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onOpenAITool, className: "px-3 py-2 text-sm bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-500 w-full sm:w-auto whitespace-nowrap", children: aiToolButtonLabel }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: onAddProduct,
            className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { className: "h-5 w-5" }),
              addProductButtonLabel
            ]
          }
        )
      ] })
    ] })
  ] });
};

const InventoryTable = ({ products, isLoading, onEditProduct, onDeleteProduct }) => {
  const { session } = useAuth();
  const showImages = session?.organization?.uiSettings?.showProductImages;
  const unitThresholdMap = reactExports.useMemo(
    () => normalizeThresholdMap(session?.organization?.uiSettings?.unitLowStockThresholds),
    [session?.organization?.uiSettings?.unitLowStockThresholds]
  );
  const defaultLowStockThreshold = session?.organization?.lowStockThreshold ?? 10;
  const [sortConfig, setSortConfig] = reactExports.useState(null);
  const sortedProducts = reactExports.useMemo(() => {
    let sortableProducts = [...products];
    if (sortConfig !== null) {
      sortableProducts.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === void 0 || aValue === null) return 1;
        if (bValue === void 0 || bValue === null) return -1;
        if (aValue < bValue) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableProducts;
  }, [products, sortConfig]);
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };
  const getSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === "ascending" ? "▲" : "▼";
  };
  const renderPriceVariants = (product) => {
    if (!product.priceVariants || product.priceVariants.length === 0) return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex flex-wrap justify-end gap-1", children: product.priceVariants.map((variant) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "span",
      {
        className: "px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-200",
        children: [
          variant.priceListName || "Lista",
          ": $",
          variant.price.toFixed(2)
        ]
      },
      `${product.id}-${variant.priceListId}`
    )) });
  };
  const renderStock = (product) => {
    if (!product.fractionalEnabled || !product.fractionalUnitsPerPackage || product.stock == null) {
      return product.unitOfMeasure === "servicio" || product.unitOfMeasure === "horas" ? "∞" : product.stock ?? "0";
    }
    const unitsPerPackage = product.fractionalUnitsPerPackage;
    const total = product.stock || 0;
    const packages = Math.floor(total / unitsPerPackage);
    const remainder = Math.round((total % unitsPerPackage + Number.EPSILON) * 100) / 100;
    return `${packages} ${product.unitOfMeasure}(s) + ${remainder} ${product.fractionalUnitName || "ud"}`;
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando productos..." });
  }
  if (products.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No se encontraron productos." });
  }
  const SortableHeader = ({ sortKey, label, className }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { scope: "col", className: `px-6 py-3 cursor-pointer select-none ${className}`, onClick: () => requestSort(sortKey), children: [
    label,
    " ",
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sky-400 text-xs", children: getSortIcon(sortKey) })
  ] });
  const EditIcon = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }) });
  const DeleteIcon = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-800 rounded-lg border border-slate-700 flex flex-col", style: { maxHeight: "calc(100vh - 380px)", minHeight: "450px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-y-auto overflow-x-auto flex-1 scrollbar-thin", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50 sticky top-0 z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-2 md:px-4 py-3 text-center w-20", children: "Acciones" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SortableHeader, { sortKey: "id", label: "SKU", className: "px-3 md:px-6" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SortableHeader, { sortKey: "name", label: "Nombre" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SortableHeader, { sortKey: "category", label: "Categoría", className: "hidden md:table-cell" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SortableHeader, { sortKey: "unitOfMeasure", label: "Unidad", className: "hidden lg:table-cell" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SortableHeader, { sortKey: "costPrice", label: "Costo", className: "text-right hidden lg:table-cell" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SortableHeader, { sortKey: "price", label: "Precio", className: "text-right" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SortableHeader, { sortKey: "stock", label: "Stock", className: "text-center" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: sortedProducts.map((product) => {
      const lowStock = isProductLowStock(product, unitThresholdMap, defaultLowStockThreshold);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 md:px-4 py-3 md:py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => onEditProduct(product),
              className: "p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-400/10 rounded transition-colors",
              title: "Editar producto",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(EditIcon, {})
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => onDeleteProduct(product),
              className: "p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors",
              title: "Eliminar producto",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(DeleteIcon, {})
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 md:px-6 py-3 md:py-4 font-mono font-semibold text-slate-100 text-xs md:text-sm", children: product.id }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 md:px-6 py-3 md:py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 md:gap-3", children: [
          showImages && (product.imageUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: product.imageUrl, alt: product.name, className: "h-8 w-8 md:h-10 md:w-10 rounded-md object-cover flex-shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-8 md:h-10 md:w-10 rounded-md bg-slate-700 flex items-center justify-center font-bold text-slate-500 text-xs flex-shrink-0", children: "IMG" })),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-xs md:text-sm truncate", children: product.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:hidden text-xs text-slate-400", children: [
              product.category || "Sin categoría",
              " · ",
              product.unitOfMeasure
            ] }),
            product.isSupply && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full", children: "Insumo" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 md:px-6 py-3 md:py-4 hidden md:table-cell", children: product.category || "Sin categoría" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 md:px-6 py-3 md:py-4 capitalize hidden lg:table-cell", children: product.unitOfMeasure }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 md:px-6 py-3 md:py-4 text-right font-mono text-amber-400 text-xs md:text-sm hidden lg:table-cell", children: [
          "$",
          product.costPrice.toFixed(2)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 md:px-6 py-3 md:py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `text-right font-mono text-xs md:text-sm ${product.price <= product.costPrice || product.price === 0 ? "text-red-400" : "text-green-400"}`, children: [
            "$",
            product.price.toFixed(2)
          ] }),
          renderPriceVariants(product)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `px-3 md:px-6 py-3 md:py-4 text-center font-semibold text-xs md:text-sm ${lowStock ? "text-red-400" : ""}`, children: renderStock(product) })
      ] }, product.id);
    }) })
  ] }) }) });
};

const ProductFormModal = reactExports.lazy(() => __vitePreload(() => import('./ProductFormModal-PW0MJqBg.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8]):void 0));
const ConfirmationModal = reactExports.lazy(() => __vitePreload(() => import('./ConfirmationModal-D0s46AqS.js'),true              ?__vite__mapDeps([9,2]):void 0));
const CategoryManagerModal = reactExports.lazy(() => __vitePreload(() => import('./CategoryManagerModal-CyXVRuUP.js'),true              ?__vite__mapDeps([10,2,6,1,3,4,5,7,8]):void 0));
const AIInventoryOptimizer = reactExports.lazy(() => __vitePreload(() => import('./AIInventoryOptimizer-CP5Ymeol.js'),true              ?__vite__mapDeps([11,2,6,1,3,4,5,7,8]):void 0));
const ImportMappingModal = reactExports.lazy(() => __vitePreload(() => import('./ImportMappingModal-CZxsWzhz.js'),true              ?__vite__mapDeps([12,2,1,3,4,5]):void 0));
const InventoryPage = ({ userRole, subscriptionTier, onNavigate }) => {
  const { inventoryService, priceListService, subSkuService, aiDataCacheService } = useServices();
  const [products, setProducts] = reactExports.useState(null);
  const isLoading = products === null;
  const [searchTerm, setSearchTerm] = reactExports.useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = reactExports.useState(searchTerm);
  const [refreshTrigger, setRefreshTrigger] = reactExports.useState(0);
  const [isFormModalOpen, setIsFormModalOpen] = reactExports.useState(false);
  const [editingProduct, setEditingProduct] = reactExports.useState(null);
  const [productToDelete, setProductToDelete] = reactExports.useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = reactExports.useState(false);
  const [isAIOptimizerOpen, setIsAIOptimizerOpen] = reactExports.useState(false);
  const [importData, setImportData] = reactExports.useState(null);
  const [isDetectingUnits, setIsDetectingUnits] = reactExports.useState(false);
  const { addNotification } = useNotification();
  const { session, hasPermission, requiresPin } = useAuth();
  const unitThresholdMap = reactExports.useMemo(
    () => normalizeThresholdMap(session?.organization?.uiSettings?.unitLowStockThresholds),
    [session?.organization?.uiSettings?.unitLowStockThresholds]
  );
  const defaultLowStockThreshold = session?.organization?.lowStockThreshold ?? 10;
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "inventory.manage";
  const [inventoryStats, setInventoryStats] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey) || hasPermission(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, hasPermission, permissionKey]);
  reactExports.useEffect(() => {
    const loadStats = async () => {
      try {
        const cache = await aiDataCacheService.getCache();
        if (cache) {
          setInventoryStats({
            totalProducts: cache.totalProducts,
            totalUnits: cache.totalInventoryUnits,
            valueAtCost: cache.inventoryValueAtCost,
            valueAtPrice: cache.inventoryValueAtPrice,
            lowStockCount: cache.lowStockCount
          });
        } else {
          if (products && products.length > 0) {
            let totalUnits = 0;
            let valueAtCost = 0;
            let valueAtPrice = 0;
            let lowStockCount = 0;
            products.forEach((product) => {
              const stock = Number(product.stock) || 0;
              totalUnits += stock;
              valueAtCost += stock * (product.costPrice || 0);
              valueAtPrice += stock * (product.price || 0);
              if (isProductLowStock(product, unitThresholdMap, defaultLowStockThreshold)) {
                lowStockCount += 1;
              }
            });
            setInventoryStats({
              totalProducts: products.length,
              totalUnits,
              valueAtCost,
              valueAtPrice,
              lowStockCount
            });
          }
        }
      } catch (error) {
        console.error("Error loading inventory stats:", error);
        if (products && products.length > 0) {
          let totalUnits = 0;
          let valueAtCost = 0;
          let valueAtPrice = 0;
          let lowStockCount = 0;
          products.forEach((product) => {
            const stock = Number(product.stock) || 0;
            totalUnits += stock;
            valueAtCost += stock * (product.costPrice || 0);
            valueAtPrice += stock * (product.price || 0);
            if (isProductLowStock(product, unitThresholdMap, defaultLowStockThreshold)) {
              lowStockCount += 1;
            }
          });
          setInventoryStats({
            totalProducts: products.length,
            totalUnits,
            valueAtCost,
            valueAtPrice,
            lowStockCount
          });
        }
      }
    };
    if (isUnlocked) {
      loadStats();
    }
  }, [aiDataCacheService, refreshTrigger, isUnlocked, products, unitThresholdMap, defaultLowStockThreshold]);
  const triggerRefresh = () => setRefreshTrigger((c) => c + 1);
  reactExports.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);
  reactExports.useEffect(() => {
    const doFetchProducts = async () => {
      try {
        const results = await inventoryService.searchInventory(debouncedSearchTerm);
        setProducts(results);
      } catch (error) {
        addNotification("Error al cargar productos.", "error");
        setProducts([]);
      }
    };
    if (isUnlocked) {
      doFetchProducts();
    }
  }, [debouncedSearchTerm, isUnlocked, refreshTrigger, inventoryService, addNotification]);
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsFormModalOpen(true);
  };
  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setIsFormModalOpen(true);
  };
  const handleOpenDeleteModal = (product) => {
    setProductToDelete(product);
  };
  const handleCloseModals = () => {
    setIsFormModalOpen(false);
    setEditingProduct(null);
    setProductToDelete(null);
    setIsCategoryModalOpen(false);
    setIsAIOptimizerOpen(false);
    setImportData(null);
  };
  const handleSaveProduct = async ({ productData, imageFile, priceListValues, recipe }) => {
    try {
      let finalProductData = { ...productData };
      if (imageFile && session?.organization?.name) {
        addNotification("Subiendo imagen (simulación)...", "info");
        const imageUrl = await bunnyService.uploadFile(imageFile, session.organization.name);
        finalProductData = { ...finalProductData, imageUrl };
      }
      let savedProduct;
      if (editingProduct) {
        savedProduct = await inventoryService.updateProduct({ ...finalProductData, id: editingProduct.id });
        addNotification("Producto actualizado exitosamente.", "success");
      } else {
        savedProduct = await inventoryService.addProduct(finalProductData);
        addNotification("Producto creado exitosamente.", "success");
      }
      if (session?.organization?.multiPriceEnabled && priceListValues && priceListValues.length > 0) {
        await priceListService.saveProductPrices(savedProduct.id, priceListValues);
      }
      if (recipe && recipe.components.length > 0) {
        await inventoryService.upsertProductRecipe({ ...recipe, productId: savedProduct.id });
      } else if (editingProduct) {
        await inventoryService.deleteProductRecipe(savedProduct.id);
      }
      if (savedProduct.fractionalEnabled && savedProduct.fractionalUnitsPerPackage && savedProduct.fractionalUnitsPerPackage > 0) {
        try {
          await subSkuService.generateSubSkus(savedProduct.id);
        } catch (error) {
          console.error("Error generando subSKUs:", error);
        }
      } else if (!savedProduct.fractionalEnabled) {
        try {
          await subSkuService.deactivateSubSkus(savedProduct.id);
        } catch (error) {
          console.error("Error desactivando subSKUs:", error);
        }
      }
      try {
        await aiDataCacheService.refreshCache();
      } catch (error) {
        console.error("Error refreshing AI cache:", error);
      }
      if (!editingProduct) {
        localStorage.removeItem("new-product");
      }
      handleCloseModals();
      triggerRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      addNotification(`Error al guardar: ${message}`, "error");
    }
  };
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await inventoryService.deleteProduct(productToDelete.id);
      addNotification("Producto eliminado.", "success");
      handleCloseModals();
      triggerRefresh();
    } catch (error) {
      addNotification("Error al eliminar el producto.", "error");
    }
  };
  const handleExport = () => {
    if (products) {
      exportToCsv("inventario.csv", products);
      addNotification("Inventario exportado a CSV.", "info");
    }
  };
  const handleDetectUnitsWithAI = async () => {
    if (!products || products.length === 0) {
      addNotification("No hay productos para procesar", "warning");
      return;
    }
    const productsWithoutUnit = products.filter((p) => !p.unitOfMeasure);
    if (productsWithoutUnit.length === 0) {
      addNotification("Todos los productos ya tienen unidad de medida asignada", "info");
      return;
    }
    setIsDetectingUnits(true);
    addNotification(`Detectando unidades para ${productsWithoutUnit.length} productos...`, "info");
    try {
      let successCount = 0;
      let errorCount = 0;
      for (const product of productsWithoutUnit) {
        try {
          const detectedUnit = await detectUnitOfMeasure(product.name, product.category);
          await inventoryService.updateProduct({
            ...product,
            unitOfMeasure: detectedUnit
          });
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error detecting unit for ${product.name}:`, error);
          errorCount++;
        }
      }
      addNotification(
        `Detección completada: ${successCount} productos actualizados${errorCount > 0 ? `, ${errorCount} errores` : ""}`,
        successCount > 0 ? "success" : "warning"
      );
      triggerRefresh();
    } catch (error) {
      console.error("Error in batch unit detection:", error);
      addNotification("Error al detectar unidades. Intenta de nuevo.", "error");
    } finally {
      setIsDetectingUnits(false);
    }
  };
  const handleFileSelectForImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv, .xlsx, .xls";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const { headers, data } = await parseSpreadsheetFile(file);
          setImportData({ headers, data });
        } catch (error) {
          addNotification(error instanceof Error ? error.message : "Error al procesar el archivo.", "error");
        }
      }
    };
    input.click();
  };
  const handleConfirmImport = async (mappedProducts) => {
    try {
      setProducts(null);
      handleCloseModals();
      const existingCategories = await inventoryService.getUniqueCategories();
      const categoryIndex = /* @__PURE__ */ new Map();
      existingCategories.forEach((cat) => {
        const key = `${cat.parent_id ?? "root"}::${cat.name.trim().toLowerCase()}`;
        categoryIndex.set(key, cat);
      });
      const categoryPathCache = /* @__PURE__ */ new Map();
      const ensureCategoryPath = async (rawPath) => {
        const sanitized = rawPath.replace(/>/g, "/").split("/").map((part) => part.trim()).filter(Boolean);
        if (sanitized.length === 0) return void 0;
        const cacheKey = sanitized.join(" / ").toLowerCase();
        if (categoryPathCache.has(cacheKey)) {
          return categoryPathCache.get(cacheKey);
        }
        let parentId = null;
        for (const part of sanitized) {
          const lookupKey = `${parentId ?? "root"}::${part.toLowerCase()}`;
          let category = categoryIndex.get(lookupKey);
          if (!category) {
            const created = await inventoryService.createCategory(part, parentId);
            category = created;
            categoryIndex.set(lookupKey, category);
          }
          parentId = category.id;
        }
        categoryPathCache.set(cacheKey, parentId || void 0);
        return categoryPathCache.get(cacheKey);
      };
      const productsWithCategories = [];
      for (const product of mappedProducts) {
        let categoryId;
        if (product.category && product.category.trim() !== "") {
          categoryId = await ensureCategoryPath(product.category);
        }
        let unitOfMeasure = product.unitOfMeasure;
        if (!unitOfMeasure && product.name) {
          try {
            unitOfMeasure = await detectUnitOfMeasure(product.name, product.category);
            addNotification(`Unidad detectada para ${product.name}: ${unitOfMeasure}`, "info");
          } catch (error) {
            console.error("Error detecting unit:", error);
            unitOfMeasure = "pieza";
          }
        } else if (!unitOfMeasure) {
          unitOfMeasure = "pieza";
        }
        productsWithCategories.push({
          ...product,
          categoryId,
          category: void 0,
          unitOfMeasure
        });
      }
      await inventoryService.upsertProducts(productsWithCategories);
      addNotification(`${productsWithCategories.length} productos importados/actualizados.`, "success");
      triggerRefresh();
    } catch (error) {
      console.error("Error during upsert:", error);
      let message = "Ocurrió un error al guardar los datos en la base de datos.";
      if (error instanceof Error && error.code) {
        const dbError = error;
        message += ` (Código: ${dbError.code}). Detalle: ${dbError.details || dbError.message}`;
      } else if (error instanceof Error) {
        message = error.message;
      }
      addNotification(message, "error");
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
  const StatCard = ({ label, value, helper, accent }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/80 border border-slate-700 rounded-lg p-3 shadow-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-wide text-slate-400 mb-1", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-xl font-semibold text-slate-100 ${accent || ""}`, children: value }),
    helper && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-500 mt-0.5", children: helper })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      InventoryToolbar,
      {
        title: "Productos",
        searchTerm,
        onSearchChange: setSearchTerm,
        onAddProduct: handleOpenAddModal,
        onManageCategories: () => setIsCategoryModalOpen(true),
        onExport: handleExport,
        onImport: handleFileSelectForImport,
        onOpenAITool: () => setIsAIOptimizerOpen(true),
        aiToolButtonLabel: "Optimizar con IA",
        onDetectUnits: handleDetectUnitsWithAI,
        isDetectingUnits,
        subscriptionTier
      }
    ),
    inventoryStats && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm text-slate-400", children: "Estadísticas de Inventario" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: async () => {
              try {
                addNotification("Actualizando estadísticas...", "info");
                await aiDataCacheService.refreshCache();
                triggerRefresh();
                addNotification("Estadísticas actualizadas", "success");
              } catch (error) {
                addNotification("Error al actualizar estadísticas", "error");
              }
            },
            className: "text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded",
            title: "Actualizar estadísticas",
            children: "🔄 Actualizar"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "SKUs activos", value: inventoryStats.totalProducts.toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Unidades en inventario", value: inventoryStats.totalUnits.toLocaleString(void 0, { maximumFractionDigits: 2 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          StatCard,
          {
            label: "Valor inventario (costo)",
            value: formatCurrency(inventoryStats.valueAtCost, session?.organization?.currency || "MXN"),
            helper: `A precio de venta: ${formatCurrency(inventoryStats.valueAtPrice, session?.organization?.currency || "MXN")}`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          StatCard,
          {
            label: "Productos con stock bajo",
            value: inventoryStats.lowStockCount.toLocaleString(),
            accent: inventoryStats.lowStockCount > 0 ? "text-amber-400" : "text-green-400",
            helper: inventoryStats.lowStockCount > 0 ? "Revisa umbrales para estas unidades." : "Todo el stock está sano."
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      InventoryTable,
      {
        products: products || [],
        isLoading,
        onEditProduct: handleOpenEditModal,
        onDeleteProduct: handleOpenDeleteModal
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}), children: [
      isFormModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ProductFormModal,
        {
          isOpen: isFormModalOpen,
          onClose: handleCloseModals,
          onSubmit: handleSaveProduct,
          initialData: editingProduct
        }
      ),
      isAIOptimizerOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        AIInventoryOptimizer,
        {
          isOpen: isAIOptimizerOpen,
          onClose: handleCloseModals
        }
      ),
      isCategoryModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        CategoryManagerModal,
        {
          isOpen: isCategoryModalOpen,
          onClose: handleCloseModals,
          onCategoriesUpdated: triggerRefresh
        }
      ),
      productToDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ConfirmationModal,
        {
          isOpen: !!productToDelete,
          onClose: handleCloseModals,
          onConfirm: handleConfirmDelete,
          title: "Confirmar Eliminación",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-300", children: [
            "¿Estás seguro de que deseas eliminar el producto ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-slate-100", children: productToDelete.name }),
            "? Esta acción no se puede deshacer."
          ] })
        }
      ),
      importData && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ImportMappingModal,
        {
          isOpen: !!importData,
          onClose: handleCloseModals,
          onConfirm: handleConfirmImport,
          fileHeaders: importData.headers,
          fileData: importData.data
        }
      )
    ] })
  ] });
};

export { InventoryPage as default };
