const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/OpenRegisterPage-DGm3AL9V.js","assets/landing-DMNKFuas.js","assets/MainLayout-C0Ev0ilC.js","assets/index-B4F2XZYo.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css","assets/inventoryCountService-Bo8nZII3.js","assets/SettingsIcon-DbPfflvT.js","assets/CheckoutModal-DSI5sj64.js","assets/SaleDetailModal-DKc9AHtw.js","assets/CloseRegisterModal-rX-RDY_c.js","assets/DiscountModal-C0Y_YSdp.js","assets/ClientSearchModal-CYGLdqnM.js","assets/ClientFormModal-CFrRxKaq.js","assets/ReturnModal-CAnSTZ44.js","assets/CashMovementModal-C_YClm_4.js","assets/AuthorizationModal-BKtBOwJR.js","assets/CashDrawerModal-BTlt_Xmw.js","assets/CrossSellSuggestion-B4LvEyHa.js","assets/ProjectHelperModal-FVURWHRB.js","assets/EditPriceModal-OGX55tjd.js"])))=>i.map(i=>d[i]);
import { e as useNotification, u as useAuth, _ as __vitePreload, d as setLocalStorageItem, g as getLocalStorageItem } from './index-B4F2XZYo.js';
import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices, b as usePersistentState, c as getCrossSellSuggestion, P as POSIcon } from './MainLayout-C0Ev0ilC.js';
import { S as SearchIcon } from './SearchIcon-adFEEg0f.js';
import ConfirmationModal from './ConfirmationModal-D0s46AqS.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const ProductSearch = ({ onAddToCart }) => {
  const { inventoryService } = useServices();
  const { addNotification } = useNotification();
  const [query, setQuery] = reactExports.useState("");
  const [results, setResults] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  reactExports.useRef(null);
  const barcodeTimeoutRef = reactExports.useRef(null);
  const lastBarcodeInputRef = reactExports.useRef("");
  reactExports.useEffect(() => {
    if (!query) return;
    const isNumericOnly = /^\d+$/.test(query);
    const isLongEnough = query.length >= 3;
    if (isNumericOnly && isLongEnough) {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
      barcodeTimeoutRef.current = setTimeout(async () => {
        if (query === lastBarcodeInputRef.current || query.length >= 3) {
          try {
            const searchResults = await inventoryService.searchInventory(query);
            const matchingProduct = searchResults.find(
              (p) => !p.isSupply && (p.id === query || p.sku === query)
            );
            if (matchingProduct) {
              onAddToCart(matchingProduct);
              setQuery("");
              setResults([]);
              lastBarcodeInputRef.current = "";
            } else {
              addNotification(`Producto "${query}" no se encontró`, "warning");
              setQuery("");
              setResults([]);
              lastBarcodeInputRef.current = "";
            }
          } catch (error) {
            console.error("Error searching for barcode:", error);
          }
        }
      }, 100);
      lastBarcodeInputRef.current = query;
    }
    return () => {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, [query, inventoryService, onAddToCart, addNotification]);
  reactExports.useEffect(() => {
    const handler = setTimeout(async () => {
      const isNumericOnly = /^\d+$/.test(query);
      if (isNumericOnly && query.length >= 3) {
        return;
      }
      if (query.trim().length > 1) {
        setIsLoading(true);
        const searchResults = await inventoryService.searchInventory(query);
        setResults(searchResults.filter((p) => !p.isSupply));
        setIsLoading(false);
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query, inventoryService]);
  const handleSelectProduct = (product) => {
    onAddToCart(product);
    setQuery("");
    setResults([]);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "text",
        value: query,
        onChange: (e) => setQuery(e.target.value),
        placeholder: "Buscar producto por nombre o SKU...",
        className: "w-full pl-10 pr-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-md text-slate-100 text-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SearchIcon, { className: "h-6 w-6 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-full mt-1 w-full p-2 bg-slate-700 text-center rounded-md", children: "Buscando..." }),
    results.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-80 overflow-y-auto", children: results.map((product) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "li",
      {
        onClick: () => handleSelectProduct(product),
        className: "px-4 py-3 cursor-pointer hover:bg-sky-700/50 flex justify-between items-center",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-100", children: product.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: product.id })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-mono font-semibold text-green-400", children: [
              "$",
              product.price.toFixed(2)
            ] }),
            product.fractionalEnabled && product.fractionalUnitsPerPackage && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-400", children: [
              product.fractionalUnitName || "Fracción",
              ": $",
              (product.fractionalPrice || product.price / product.fractionalUnitsPerPackage).toFixed(2)
            ] }),
            product.unitOfMeasure !== "servicio" && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: `text-xs ${product.stock && product.stock > 0 ? "text-slate-400" : "text-red-400 font-bold"}`, children: [
              "Stock: ",
              product.stock
            ] })
          ] })
        ]
      },
      product.id
    )) })
  ] });
};

const PencilIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" }) });

const TrashIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) });

const CartDisplay = ({
  cart,
  onRemoveFromCart,
  onUpdateQuantity,
  onCheckout,
  onOpenDiscountModal,
  onAssignClient,
  selectedClient,
  onClearClient,
  totals,
  subscriptionTier,
  onEditItem,
  onSwitchSeller,
  sellerForSale,
  onClearSellerOverride,
  onToggleItemUnit
}) => {
  const { subtotal, totalDiscount, total } = totals;
  const renderDiscountInfo = (item) => {
    if (!item.discount) return null;
    const { type, value, calculatedDiscount } = item.discount;
    const displayValue = type === "percentage" ? `${value}%` : `$${value.toFixed(2)}`;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-green-400 mt-1", children: [
      "Descuento: ",
      displayValue,
      " (-$",
      calculatedDiscount.toFixed(2),
      ")"
    ] });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-6 rounded-lg shadow-md border border-slate-700 flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100 mb-4", children: "Carrito de Compras" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 p-3 bg-slate-700/50 rounded-md space-y-2", children: [
      selectedClient ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: "Cliente:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-sky-300", children: selectedClient.name })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClearClient, className: "text-slate-400 hover:text-red-400 text-xs", children: "Quitar" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onAssignClient, className: "w-full text-center text-sky-400 hover:text-sky-300 text-sm font-semibold", children: "+ Asignar Cliente" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-slate-600/50 my-1" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: "Venta por:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-purple-300", children: sellerForSale?.name || "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onSwitchSeller, className: "text-slate-400 hover:text-sky-400 text-xs", children: "Cambiar" })
      ] })
    ] }),
    cart.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-grow flex items-center justify-center text-slate-400", children: "El carrito está vacío" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-grow overflow-y-auto -mr-3 pr-3", children: cart.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between mb-4 pb-4 border-b border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-grow mr-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-200", children: item.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-slate-400", children: [
            "$",
            item.price.toFixed(2),
            " x ",
            item.quantity,
            " ",
            item.sellUnit === "fraction" ? item.fractionalUnitName || "unidad" : item.unitOfMeasure
          ] }),
          subscriptionTier === "solopreneur" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onEditItem(item), className: "text-sky-400 hover:text-sky-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PencilIcon, { className: "h-4 w-4" }) }),
          item.fractionalEnabled && item.fractionalUnitsPerPackage && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => onToggleItemUnit(item),
              className: "text-xs px-2 py-0.5 rounded-full border border-slate-500 text-slate-200 hover:bg-slate-700",
              children: item.sellUnit === "fraction" ? `Vender como ${item.unitOfMeasure}` : `Vender por ${item.fractionalUnitName || "fracción"}`
            }
          )
        ] }),
        item.manualPrice ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-300 mt-0.5", children: "Precio manual" }) : item.appliedPriceListName ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: item.appliedPriceListName }) : null,
        renderDiscountInfo(item)
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            min: "0.01",
            step: "0.01",
            max: item.unitOfMeasure === "servicio" || item.unitOfMeasure === "horas" ? void 0 : (() => {
              if (!item.fractionalEnabled || !item.fractionalUnitsPerPackage) return item.stock;
              if (item.sellUnit === "package") {
                if (!item.stock) return void 0;
                return Math.max(1, Math.floor(item.stock / item.fractionalUnitsPerPackage));
              }
              return item.stock;
            })(),
            value: item.quantity,
            onChange: (e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value > 0) {
                onUpdateQuantity(item.id, value);
              }
            },
            className: "w-16 text-center bg-slate-700 rounded-md p-1"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onRemoveFromCart(item.id), className: "text-red-400 hover:text-red-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrashIcon, { className: "h-5 w-5" }) })
      ] })
    ] }, item.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto pt-4 border-t border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 text-slate-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Subtotal:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
            "$",
            subtotal.toFixed(2)
          ] })
        ] }),
        totalDiscount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-green-400", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Descuentos:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
            "-$",
            totalDiscount.toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-lg font-bold text-white", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Total:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
            "$",
            total.toFixed(2)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => onOpenDiscountModal("product"),
          disabled: cart.length === 0,
          className: "w-full mt-4 py-2 text-sm bg-sky-700 text-white font-semibold rounded-md hover:bg-sky-600 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed",
          children: "Aplicar Descuento"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onCheckout,
          disabled: cart.length === 0,
          className: "w-full mt-2 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed",
          children: "Cobrar"
        }
      )
    ] })
  ] });
};

const ImagePlaceholderIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" }) });

const FRACTIONAL_CONFIG_UPDATED_EVENT = "ryze:fractional-config-updated";

const QuickAccessGrid = ({ onAddToCart }) => {
  const { inventoryService, saleService } = useServices();
  const { session } = useAuth();
  const [quickProducts, setQuickProducts] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const showImages = session?.organization?.uiSettings?.showProductImages ?? true;
  reactExports.useEffect(() => {
    let isMounted = true;
    const fetchQuickProducts = async () => {
      setIsLoading(true);
      try {
        const bestSellers = await saleService.getBestSellingProducts(20);
        const allProducts = await inventoryService.searchInventory("");
        if (!isMounted) return;
        const productMap = new Map(allProducts.map((p) => [p.id, p]));
        const availableBestSellers = bestSellers.map((bs) => productMap.get(bs.productId)).filter((p) => {
          if (!p || p.isSupply) return false;
          if (p.unitOfMeasure === "servicio" || p.unitOfMeasure === "horas") return true;
          return (p.stock ?? 0) > 0;
        }).slice(0, 20);
        if (availableBestSellers.length < 20) {
          const saleableProducts = allProducts.filter(
            (p) => !p.isSupply && !availableBestSellers.some((bs) => bs.id === p.id) && (p.unitOfMeasure === "servicio" || p.unitOfMeasure === "horas" || (p.stock ?? 0) > 0)
          );
          availableBestSellers.push(...saleableProducts.slice(0, 20 - availableBestSellers.length));
        }
        setQuickProducts(availableBestSellers);
      } catch (error) {
        console.error("Error loading quick products:", error);
        try {
          const allProducts = await inventoryService.searchInventory("");
          if (!isMounted) return;
          const saleableProducts = allProducts.filter(
            (p) => !p.isSupply && (p.unitOfMeasure === "servicio" || p.unitOfMeasure === "horas" || (p.stock ?? 0) > 0)
          );
          setQuickProducts(saleableProducts.slice(0, 20));
        } catch (fallbackError) {
          console.error("Error in fallback:", fallbackError);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    const handleFractionalUpdate = (_event) => {
      fetchQuickProducts();
    };
    fetchQuickProducts();
    window.addEventListener(FRACTIONAL_CONFIG_UPDATED_EVENT, handleFractionalUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener(FRACTIONAL_CONFIG_UPDATED_EVENT, handleFractionalUpdate);
    };
  }, [inventoryService]);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-slate-400", children: "Cargando accesos rápidos..." });
  }
  if (quickProducts.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-700 h-full flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-bold text-slate-100 mb-3 flex-shrink-0", children: "Acceso Rápido" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 lg:grid-cols-5 gap-3 overflow-y-auto flex-grow min-h-0", children: quickProducts.map((product) => {
      const isOutOfStock = product.stock !== void 0 && product.stock <= 0 && product.unitOfMeasure !== "servicio" && product.unitOfMeasure !== "horas";
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative", title: isOutOfStock ? "Producto agotado" : product.name, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => onAddToCart(product),
          className: "w-full h-full p-3 bg-slate-700 rounded-md hover:bg-sky-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:ring-1 disabled:ring-red-500/50 flex flex-col justify-between",
          disabled: isOutOfStock,
          children: [
            showImages && (product.imageUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: product.imageUrl, alt: product.name, className: "w-full h-16 object-cover rounded-md mb-2" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full h-16 bg-slate-800 rounded-md mb-2 flex items-center justify-center font-bold text-slate-500", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ImagePlaceholderIcon, { className: "h-6 w-6" }) })),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-grow", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-200 text-sm leading-tight break-words [hyphens:auto]", children: product.name }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-400 font-mono mt-1 flex-shrink-0", children: [
              "$",
              product.price.toFixed(2)
            ] })
          ]
        }
      ) }, product.id);
    }) })
  ] });
};

const OpenRegisterPage$1 = reactExports.lazy(() => __vitePreload(() => import('./OpenRegisterPage-DGm3AL9V.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8]):void 0));
const POSSessionSelectorPage = ({ onSelectSession, onCancel }) => {
  const { cashRegisterService, employeeService } = useServices();
  const { addNotification } = useNotification();
  const [view, setView] = reactExports.useState("auth");
  const [authorizedEmployee, setAuthorizedEmployee] = reactExports.useState(null);
  const [openSessions, setOpenSessions] = reactExports.useState([]);
  const [accessCode, setAccessCode] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const inputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (view === "auth") {
      inputRef.current?.focus();
    }
  }, [view]);
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || !accessCode) return;
    setIsLoading(true);
    setError(null);
    try {
      const employee = await employeeService.findEmployeeByAccessCode(accessCode);
      if (employee) {
        setAuthorizedEmployee(employee);
        const allOpenSessions = await cashRegisterService.getActiveSessions();
        setOpenSessions(allOpenSessions);
        setView("select_or_open");
      } else {
        setError("PIN incorrecto o empleado no encontrado.");
        setAccessCode("");
        inputRef.current?.focus();
      }
    } catch (err) {
      setError("Ocurrió un error al verificar el PIN.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleRegisterOpen = async (initialAmount, employee) => {
    try {
      const newSession = await cashRegisterService.createSession(initialAmount, employee.id, employee.name);
      onSelectSession(newSession, employee);
    } catch (error2) {
      if (error2 instanceof Error && error2.message === "SESSION_ALREADY_OPEN") {
        addNotification("Este empleado ya tiene una caja abierta. Cierra o reanuda la existente.", "warning");
        return;
      }
      addNotification("No se pudo abrir la caja registradora.", "error");
    }
  };
  const handleSelectExistingSession = (session) => {
    if (!authorizedEmployee) return;
    onSelectSession(session, authorizedEmployee);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando..." }), children: [
    view === "auth" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-sm m-4 p-8 rounded-xl shadow-2xl border border-slate-700 bg-slate-800", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-center text-white mb-2", children: "Punto de Venta" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-400 mb-6", children: "Ingresa tu PIN de empleado para iniciar o reanudar un turno." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handlePinSubmit, className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "pos-access-code", className: "sr-only", children: "PIN de Acceso" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              ref: inputRef,
              id: "pos-access-code",
              type: "password",
              value: accessCode,
              onChange: (e) => setAccessCode(e.target.value),
              placeholder: "****",
              className: "w-full text-center px-4 py-3 bg-slate-900 border border-slate-600 rounded-md text-slate-100 text-3xl tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500",
              autoFocus: true
            }
          )
        ] }),
        error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm text-center", children: error }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4 pt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onCancel, className: "w-full px-4 py-3 font-semibold text-slate-200 bg-slate-600/80 rounded-md hover:bg-slate-600", children: "Cancelar" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading || !accessCode, className: "w-full px-4 py-3 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-500 disabled:bg-slate-500", children: isLoading ? "Verificando..." : "Entrar" })
        ] })
      ] })
    ] }),
    view === "select_or_open" && authorizedEmployee && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-lg m-4 p-8 rounded-xl shadow-2xl border border-slate-700 bg-slate-800", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-2xl font-bold text-slate-100 mb-2", children: [
        "Bienvenido, ",
        authorizedEmployee.name
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 mb-6", children: "Selecciona una caja para reanudar o abre una nueva." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3 max-h-60 overflow-y-auto pr-2 mb-4", children: openSessions.length > 0 ? openSessions.map((session) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => handleSelectExistingSession(session), className: "w-full text-left p-3 bg-slate-700/50 rounded-md hover:bg-sky-700/50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-semibold text-slate-200", children: [
          "Reanudar caja de: ",
          session.employeeName
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-400", children: [
          "Abierta a las ",
          new Date(session.startTime).toLocaleTimeString()
        ] })
      ] }, session.id)) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-500 py-4", children: "No hay cajas abiertas en este momento." }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(OpenRegisterPage$1, { onRegisterOpen: (amount) => handleRegisterOpen(amount, authorizedEmployee) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setView("auth"), className: "w-full text-center text-sm text-sky-400 hover:underline mt-6", children: "← Ingresar con otro PIN" })
    ] })
  ] }) });
};

const ChevronDownIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z", clipRule: "evenodd" }) });

const __vite_import_meta_env__ = {};
const OpenRegisterPage = reactExports.lazy(() => __vitePreload(() => import('./OpenRegisterPage-DGm3AL9V.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8]):void 0));
const CheckoutModal = reactExports.lazy(() => __vitePreload(() => import('./CheckoutModal-DSI5sj64.js'),true              ?__vite__mapDeps([9,1,3,4,5,6]):void 0));
const SaleDetailModal = reactExports.lazy(() => __vitePreload(() => import('./SaleDetailModal-DKc9AHtw.js'),true              ?__vite__mapDeps([10,1,2,3,4,5,6,7,8]):void 0));
const CloseRegisterModal = reactExports.lazy(() => __vitePreload(() => import('./CloseRegisterModal-rX-RDY_c.js'),true              ?__vite__mapDeps([11,1]):void 0));
const DiscountModal = reactExports.lazy(() => __vitePreload(() => import('./DiscountModal-C0Y_YSdp.js'),true              ?__vite__mapDeps([12,1]):void 0));
const ClientSearchModal = reactExports.lazy(() => __vitePreload(() => import('./ClientSearchModal-CYGLdqnM.js'),true              ?__vite__mapDeps([13,1,2,3,4,5,6,7,8,14]):void 0));
const ReturnModal = reactExports.lazy(() => __vitePreload(() => import('./ReturnModal-CAnSTZ44.js'),true              ?__vite__mapDeps([15,1]):void 0));
const CashMovementModal = reactExports.lazy(() => __vitePreload(() => import('./CashMovementModal-C_YClm_4.js'),true              ?__vite__mapDeps([16,1]):void 0));
const AuthorizationModal = reactExports.lazy(() => __vitePreload(() => import('./AuthorizationModal-BKtBOwJR.js'),true              ?__vite__mapDeps([17,1,3,4,5,6]):void 0));
const CashDrawerModal = reactExports.lazy(() => __vitePreload(() => import('./CashDrawerModal-BTlt_Xmw.js'),true              ?__vite__mapDeps([18,1]):void 0));
const STRIPE_FEATURES_DISABLED = __vite_import_meta_env__?.VITE_DISABLE_STRIPE === "true";
const DisabledCrossSell = () => null;
const CrossSellSuggestion = STRIPE_FEATURES_DISABLED ? DisabledCrossSell : reactExports.lazy(() => __vitePreload(() => import('./CrossSellSuggestion-B4LvEyHa.js'),true              ?__vite__mapDeps([19,1]):void 0));
const ProjectHelperModal = reactExports.lazy(() => __vitePreload(() => import('./ProjectHelperModal-FVURWHRB.js'),true              ?__vite__mapDeps([20,1,2,3,4,5,6,7,8]):void 0));
const EditPriceModal = reactExports.lazy(() => __vitePreload(() => import('./EditPriceModal-OGX55tjd.js'),true              ?__vite__mapDeps([21,1]):void 0));
const POSActionsMenu = ({ onAction }) => {
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const menuRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleSelect = (action) => {
    onAction(action);
    setIsOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", ref: menuRef, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setIsOpen(!isOpen), className: "w-full p-2.5 text-sm bg-slate-600 rounded-md hover:bg-slate-500 flex justify-between items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Acciones de Caja" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDownIcon, { className: `h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}` })
    ] }),
    isOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-full left-0 right-0 mt-1 z-20 bg-slate-700 rounded-md shadow-lg p-2 grid grid-cols-2 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleSelect("return"), className: "p-2 text-xs bg-slate-600 rounded-md hover:bg-slate-500", children: "Devolución" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleSelect("movement"), className: "p-2 text-xs bg-slate-600 rounded-md hover:bg-slate-500", children: "Movimiento" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleSelect("project"), className: "p-2 text-xs bg-slate-600 rounded-md hover:bg-slate-500", children: "Asistente" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleSelect("close"), className: "p-2 text-xs bg-amber-600 rounded-md hover:bg-amber-500", children: "Cerrar Caja" })
    ] })
  ] });
};
const POSPage = ({
  activeSession,
  employeeForSession,
  onSessionStart,
  onSessionEnd,
  onNavigate
}) => {
  const { inventoryService, saleService, clientService, cashRegisterService, priceListService, ticketService } = useServices();
  const { session, hasPermission, requiresPin, updateOrganizationData } = useAuth();
  const { addNotification } = useNotification();
  const orgStorageKey = session?.organization?.id ?? "anon";
  const [cart, setCart] = usePersistentState(`pos-cart-${orgStorageKey}`, []);
  const [storedSelectedClient, setStoredSelectedClient] = usePersistentState(`pos-client-${orgStorageKey}`, null);
  const [storedTotalDiscount, setStoredTotalDiscount] = usePersistentState(`pos-discount-${orgStorageKey}`, null);
  const [storedOverrideSeller, setStoredOverrideSeller] = usePersistentState(`pos-seller-${orgStorageKey}`, null);
  const selectedClient = storedSelectedClient;
  const totalDiscount = storedTotalDiscount;
  const overrideSeller = storedOverrideSeller;
  const [isCheckoutOpen, setIsCheckoutOpen] = reactExports.useState(false);
  const [isCloseRegisterOpen, setIsCloseRegisterOpen] = reactExports.useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = reactExports.useState(false);
  const [discountInitialTab, setDiscountInitialTab] = reactExports.useState("product");
  const [isClientModalOpen, setIsClientModalOpen] = reactExports.useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = reactExports.useState(false);
  const [isCashMovementOpen, setIsCashMovementOpen] = reactExports.useState(false);
  const [isCashDrawerOpen, setIsCashDrawerOpen] = reactExports.useState(false);
  const [isProjectHelperOpen, setIsProjectHelperOpen] = reactExports.useState(false);
  const [isSellerAuthOpen, setIsSellerAuthOpen] = reactExports.useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = reactExports.useState(false);
  const [actionAfterAuth, setActionAfterAuth] = reactExports.useState(null);
  const [lastSale, setLastSale] = reactExports.useState(null);
  const [closeRegisterSummary, setCloseRegisterSummary] = reactExports.useState(null);
  const [crossSellSuggestion, setCrossSellSuggestion] = reactExports.useState("");
  const [itemToEdit, setItemToEdit] = reactExports.useState(null);
  const multiPriceEnabled = !!session?.organization?.multiPriceEnabled;
  const defaultPriceListId = session?.organization?.defaultPriceListId || null;
  const [priceLists, setPriceLists] = reactExports.useState([]);
  const [isPriceListLoading, setIsPriceListLoading] = reactExports.useState(false);
  const [selectedPriceListId, setSelectedPriceListIdState] = reactExports.useState(defaultPriceListId);
  reactExports.useEffect(() => {
    if (session?.organization?.uiSettings?.posSelectedPriceListId) {
      setSelectedPriceListIdState(session.organization.uiSettings.posSelectedPriceListId);
    } else if (defaultPriceListId) {
      setSelectedPriceListIdState(defaultPriceListId);
    }
  }, [session?.organization?.uiSettings?.posSelectedPriceListId, defaultPriceListId]);
  const setSelectedPriceListId = reactExports.useCallback((value) => {
    setSelectedPriceListIdState(value);
    setLocalStorageItem(`pos-price-list-${orgStorageKey}`, value);
    if (session?.organization && updateOrganizationData) {
      const timeoutId = setTimeout(async () => {
        try {
          const updatedUiSettings = {
            ...session.organization?.uiSettings ?? { showProductImages: true },
            posSelectedPriceListId: value
          };
          await updateOrganizationData({ uiSettings: updatedUiSettings });
          console.log("[POSPage] ✅ Lista de precios seleccionada guardada en Supabase:", value);
        } catch (error) {
          console.error("[POSPage] ❌ Error al guardar lista de precios en Supabase:", error);
        }
      }, 1e3);
      return () => clearTimeout(timeoutId);
    }
  }, [session?.organization, updateOrganizationData, orgStorageKey]);
  const [fractionSetupItem, setFractionSetupItem] = reactExports.useState(null);
  const [fractionUnitsInput, setFractionUnitsInput] = reactExports.useState("");
  const [fractionUnitNameInput, setFractionUnitNameInput] = reactExports.useState("");
  const [fractionPriceInput, setFractionPriceInput] = reactExports.useState("");
  const [isSavingFractionSetup, setIsSavingFractionSetup] = reactExports.useState(false);
  const fractionPreviewPrice = reactExports.useMemo(() => {
    if (!fractionSetupItem) return null;
    const unitsValue = parseFloat(fractionUnitsInput);
    if (!Number.isFinite(unitsValue) || unitsValue <= 0) {
      return null;
    }
    if (fractionPriceInput.trim()) {
      const explicitPrice = parseFloat(fractionPriceInput);
      if (Number.isFinite(explicitPrice) && explicitPrice > 0) {
        return explicitPrice;
      }
    }
    const basePriceValue = fractionSetupItem.basePrice ?? fractionSetupItem.price;
    return basePriceValue / unitsValue;
  }, [fractionSetupItem, fractionUnitsInput, fractionPriceInput]);
  reactExports.useEffect(() => {
    if (!multiPriceEnabled) {
      if (selectedPriceListId !== null) {
        setSelectedPriceListId(null);
      }
      return;
    }
    if (!selectedPriceListId && defaultPriceListId) {
      setSelectedPriceListId(defaultPriceListId);
    }
  }, [multiPriceEnabled, defaultPriceListId, selectedPriceListId]);
  const setSelectedClient = (client) => {
    setStoredSelectedClient(client);
    if (multiPriceEnabled) {
      if (client?.priceListId) {
        setSelectedPriceListId(client.priceListId);
      } else {
        setSelectedPriceListId(defaultPriceListId ?? null);
      }
    }
  };
  const setTotalDiscount = (discount) => setStoredTotalDiscount(discount);
  const setOverrideSeller = (employee) => setStoredOverrideSeller(employee);
  const [isAdditionalRegisterModalOpen, setIsAdditionalRegisterModalOpen] = reactExports.useState(false);
  const [isCreatingAdditionalRegister, setIsCreatingAdditionalRegister] = reactExports.useState(false);
  const [pendingRegisterSwitch, setPendingRegisterSwitch] = reactExports.useState(null);
  const [isSwitchSessionConfirmOpen, setIsSwitchSessionConfirmOpen] = reactExports.useState(false);
  const recipeCacheRef = reactExports.useRef({});
  const fetchRecipeForProduct = reactExports.useCallback(async (productId) => {
    if (recipeCacheRef.current[productId] !== void 0) {
      return recipeCacheRef.current[productId];
    }
    try {
      const recipe = await inventoryService.getProductRecipe(productId);
      recipeCacheRef.current[productId] = recipe;
      return recipe;
    } catch (error) {
      console.error("Failed to load recipe for product", productId, error);
      recipeCacheRef.current[productId] = null;
      return null;
    }
  }, [inventoryService]);
  reactExports.useEffect(() => {
    setCart((prev) => prev.map((item) => ({ ...item, basePrice: item.basePrice ?? item.price })));
  }, []);
  const withAuth = (action, permission) => {
    if (!requiresPin(permission) || hasPermission(permission)) {
      action();
      return;
    }
    setActionAfterAuth({ action, permission });
  };
  const handleAuthSuccess = () => {
    if (actionAfterAuth) {
      actionAfterAuth.action();
    }
    setActionAfterAuth(null);
  };
  const findPriceListName = reactExports.useCallback((priceListId) => {
    if (!priceListId) return void 0;
    return priceLists.find((list) => list.id === priceListId)?.name;
  }, [priceLists]);
  const resolvePriceForProduct = reactExports.useCallback((product, priceListId) => {
    if (!priceListId) return product.price;
    const variant = product.priceVariants?.find((v) => v.priceListId === priceListId);
    return variant?.price ?? product.price;
  }, []);
  const applyPriceListToCart = reactExports.useCallback((priceListId) => {
    if (!multiPriceEnabled) return;
    setCart((prev) => prev.map((item) => {
      if (item.manualPrice) {
        return item;
      }
      const basePriceValue = priceListId ? resolvePriceForProduct(item, priceListId) : item.basePrice ?? item.price;
      const fractionalUnitPrice = item.fractionalEnabled && item.fractionalUnitsPerPackage ? item.fractionalPrice || basePriceValue / item.fractionalUnitsPerPackage : basePriceValue;
      return {
        ...item,
        price: item.sellUnit === "fraction" ? fractionalUnitPrice : basePriceValue,
        basePrice: basePriceValue,
        appliedPriceListId: priceListId,
        appliedPriceListName: priceListId ? findPriceListName(priceListId) : void 0
      };
    }));
  }, [multiPriceEnabled, resolvePriceForProduct, findPriceListName, setCart]);
  reactExports.useEffect(() => {
    if (!multiPriceEnabled) {
      setPriceLists([]);
      setSelectedPriceListId(null);
      return;
    }
    let isMounted = true;
    const loadLists = async () => {
      setIsPriceListLoading(true);
      try {
        const lists = await priceListService.getPriceLists();
        if (!isMounted) return;
        setPriceLists(lists);
        if (!selectedPriceListId) {
          const fallback = defaultPriceListId && lists.some((list) => list.id === defaultPriceListId) ? defaultPriceListId : lists[0]?.id ?? null;
          setSelectedPriceListId(fallback ?? null);
        }
      } catch (error) {
        console.error("Error loading price lists", error);
      } finally {
        if (isMounted) setIsPriceListLoading(false);
      }
    };
    loadLists();
    return () => {
      isMounted = false;
    };
  }, [multiPriceEnabled, priceListService, defaultPriceListId, selectedPriceListId]);
  reactExports.useEffect(() => {
    if (!multiPriceEnabled) return;
    if (selectedPriceListId && priceLists.every((list) => list.id !== selectedPriceListId)) {
      setSelectedPriceListId(priceLists[0]?.id ?? null);
    }
  }, [priceLists, selectedPriceListId, multiPriceEnabled]);
  reactExports.useEffect(() => {
    if (!multiPriceEnabled) return;
    applyPriceListToCart(selectedPriceListId ?? null);
  }, [selectedPriceListId, applyPriceListToCart, multiPriceEnabled]);
  reactExports.useEffect(() => {
    if (!multiPriceEnabled) return;
    if (!selectedPriceListId && defaultPriceListId) {
      setSelectedPriceListId(defaultPriceListId);
    }
  }, [defaultPriceListId, selectedPriceListId, multiPriceEnabled]);
  reactExports.useEffect(() => {
    if (!multiPriceEnabled) return;
    if (selectedClient?.priceListId && selectedClient.priceListId !== selectedPriceListId) {
      setSelectedPriceListId(selectedClient.priceListId);
    }
  }, [selectedClient, selectedPriceListId, multiPriceEnabled]);
  const handleAddToCart = reactExports.useCallback(async (product) => {
    const availableStock = product.stock ?? 0;
    if (product.unitOfMeasure !== "servicio" && product.unitOfMeasure !== "horas") {
      if (availableStock <= 0) {
        addNotification(`Producto "${product.name}" sin stock.`, "warning");
        return;
      }
    }
    const existingItem = cart.find((item) => item.id === product.id && (!item.fractionalEnabled || item.sellUnit === "package"));
    if (existingItem) {
      handleUpdateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const activePriceListId = multiPriceEnabled ? selectedPriceListId : null;
      const resolvedPrice = multiPriceEnabled ? resolvePriceForProduct(product, activePriceListId) : product.price;
      const priceListName = activePriceListId ? findPriceListName(activePriceListId) : void 0;
      const newItem = {
        ...product,
        quantity: 1,
        price: resolvedPrice,
        basePrice: product.basePrice ?? product.price,
        appliedPriceListId: activePriceListId ?? null,
        appliedPriceListName: priceListName,
        manualPrice: false,
        sellUnit: product.fractionalEnabled ? "package" : void 0
      };
      setCart((prev) => [...prev, newItem]);
    }
    const tier = session?.organization?.subscriptionTier || "gratuito";
    if (!STRIPE_FEATURES_DISABLED && tier !== "gratuito") {
      const inventory = await inventoryService.searchInventory("");
      const suggestion = await getCrossSellSuggestion(product.name, cart.map((i) => i.name), tier, inventory);
      if (suggestion) setCrossSellSuggestion(suggestion);
    }
  }, [cart, addNotification, inventoryService, session, multiPriceEnabled, selectedPriceListId, resolvePriceForProduct, findPriceListName]);
  const handleRemoveFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };
  const handleUpdateQuantity = (productId, quantity) => {
    setCart((prev) => prev.map((item) => {
      if (item.id === productId) {
        const isDecimalAllowed = ["kilo", "kg", "kilogramo", "litro", "lt", "l", "metro", "m", "metro lineal", "ml"].some(
          (unit) => item.unitOfMeasure?.toLowerCase().includes(unit.toLowerCase())
        );
        const minQuantity = isDecimalAllowed ? 0.01 : 1;
        return { ...item, quantity: Math.max(minQuantity, quantity) };
      }
      return item;
    }));
  };
  const totals = reactExports.useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    let totalDiscountAmount = cart.reduce((acc, item) => acc + (item.discount?.calculatedDiscount || 0), 0);
    if (totalDiscount) {
      totalDiscountAmount += totalDiscount.calculatedDiscount;
    }
    const total = subtotal - totalDiscountAmount;
    return { subtotal, totalDiscount: totalDiscountAmount, total };
  }, [cart, totalDiscount]);
  const handleApplyDiscount = (target, type, value) => {
    if (target === "total") {
      const calculatedDiscount = type === "percentage" ? totals.subtotal * (value / 100) : value;
      setTotalDiscount({ type, value, calculatedDiscount });
    } else {
      setCart((prev) => prev.map((item) => {
        if (item.id === target) {
          const itemTotal = item.price * item.quantity;
          const calculatedDiscount = type === "percentage" ? itemTotal * (value / 100) : value;
          return { ...item, discount: { type, value, calculatedDiscount } };
        }
        return item;
      }));
    }
    setIsDiscountModalOpen(false);
  };
  const handleConfirmPayment = async (payments, changeGiven, pointsRedeemed, printerId) => {
    if (!activeSession || !employeeForSession) {
      addNotification("Error: Sesión de caja no activa o empleado no definido.", "error");
      return;
    }
    const loyaltySettings = session?.organization?.loyaltySettings;
    let pointsEarned = 0;
    if (loyaltySettings?.enabled && selectedClient) {
      pointsEarned = Math.floor(totals.total * loyaltySettings.pointsPerDollar);
    }
    const sellerForThisSale = overrideSeller || employeeForSession;
    try {
      const newSale = await saleService.saveSale({
        items: cart,
        ...totals,
        cashRegisterSessionId: activeSession.id,
        payments,
        changeGiven,
        employeeId: sellerForThisSale.id,
        employeeName: sellerForThisSale.name,
        clientId: selectedClient?.id,
        clientName: selectedClient?.name,
        pointsEarned,
        pointsRedeemed
      });
      const stockUpdates = [];
      for (const item of cart) {
        let pieces = item.quantity;
        if (item.fractionalEnabled && item.fractionalUnitsPerPackage) {
          pieces = item.sellUnit === "package" ? item.quantity * item.fractionalUnitsPerPackage : item.quantity;
        }
        stockUpdates.push({
          productId: item.id,
          quantityChange: -pieces
        });
        const recipe = await fetchRecipeForProduct(item.id);
        if (recipe?.components?.length) {
          const yieldQty = recipe.yieldQuantity && recipe.yieldQuantity > 0 ? recipe.yieldQuantity : 1;
          const multiplier = yieldQty > 0 ? pieces / yieldQty : pieces;
          recipe.components.forEach((component) => {
            if (component.includeInventory === false) return;
            if (!component.componentProductId) return;
            const componentBaseQty = component.quantity || 0;
            const componentQuantity = componentBaseQty * multiplier;
            if (!componentQuantity) return;
            stockUpdates.push({
              productId: component.componentProductId,
              quantityChange: -componentQuantity
            });
          });
        }
      }
      await inventoryService.updateStock(stockUpdates);
      if (selectedClient && (pointsEarned > 0 || pointsRedeemed > 0)) {
        if (pointsEarned > 0) await clientService.addPoints(selectedClient.id, pointsEarned);
        if (pointsRedeemed > 0) await clientService.redeemPoints(selectedClient.id, pointsRedeemed);
      }
      setLastSale(newSale);
      if (session?.organization) {
        try {
          let layoutOverride = void 0;
          try {
            layoutOverride = session.organization.uiSettings?.ticketLayout || getLocalStorageItem("ticketLayoutSettings");
          } catch (layoutError) {
            console.warn("Error al leer layout de ticket, usando valores por defecto:", layoutError);
            layoutOverride = void 0;
          }
          await ticketService.printSaleTicket({
            sale: newSale,
            organization: session.organization,
            printerSettings: session.organization.printerSettings,
            overridePrinterId: printerId,
            layoutOverride
          });
        } catch (printError) {
          console.error("Error al imprimir ticket", printError);
          addNotification("Venta registrada, pero no pudimos abrir la impresión.", "warning");
        }
      }
      resetSale();
      setIsCheckoutOpen(false);
      setIsMobileCartOpen(false);
      const hasCashPayment = payments.some((p) => p.method.startsWith("efectivo"));
      if (hasCashPayment) setIsCashDrawerOpen(true);
    } catch (error) {
      console.error(error);
      addNotification("Error al guardar la venta.", "error");
    }
  };
  const resetSale = () => {
    setCart([]);
    setSelectedClient(null);
    setTotalDiscount(null);
    setOverrideSeller(null);
  };
  const handleConfirmSwitchSession = () => {
    resetSale();
    setIsSwitchSessionConfirmOpen(false);
    setIsMobileCartOpen(false);
    onSessionEnd();
  };
  const handleStartCloseRegister = async () => {
    if (!activeSession) return;
    const summaryData = await cashRegisterService.getSessionDetails(activeSession.id);
    setCloseRegisterSummary(summaryData);
    setIsCloseRegisterOpen(true);
  };
  const handleConfirmCloseRegister = async (countedAmount) => {
    if (!activeSession) return;
    try {
      await cashRegisterService.closeSession(activeSession.id, countedAmount);
      addNotification("Caja cerrada exitosamente.", "success");
      onSessionEnd();
      setIsCloseRegisterOpen(false);
    } catch (error) {
      console.error("Failed to close register:", error);
      addNotification("Error al cerrar la caja registradora.", "error");
    }
  };
  const handleProcessReturn = async (originalSale, itemsToReturn) => {
    if (!activeSession || !employeeForSession) {
      addNotification("Error: Sesión de caja no activa o empleado no definido.", "error");
      return false;
    }
    const returnSubtotal = itemsToReturn.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const returnTotal = returnSubtotal;
    try {
      await saleService.processReturn({
        items: itemsToReturn,
        subtotal: returnSubtotal,
        totalDiscount: 0,
        total: returnTotal,
        cashRegisterSessionId: activeSession.id,
        payments: [{ method: "efectivo", amount: returnTotal }],
        changeGiven: 0,
        employeeId: employeeForSession.id,
        employeeName: employeeForSession.name,
        originalTicketNumber: originalSale.ticketNumber
      });
      const stockUpdates = itemsToReturn.map((item) => ({
        productId: item.id,
        quantityChange: item.quantity
      }));
      await inventoryService.updateStock(stockUpdates);
      addNotification("Devolución procesada exitosamente.", "success");
      setIsCashDrawerOpen(true);
      return true;
    } catch (error) {
      console.error(error);
      addNotification("Error al procesar la devolución.", "error");
      return false;
    }
  };
  const handleCashMovement = async (type, amount, reason) => {
    if (!activeSession || !employeeForSession) return;
    try {
      await cashRegisterService.addCashMovement(activeSession.id, type, amount, reason, employeeForSession.id, employeeForSession.name);
      addNotification("Movimiento de caja registrado.", "success");
      setIsCashMovementOpen(false);
      setIsCashDrawerOpen(true);
    } catch (error) {
      addNotification("Error al registrar movimiento.", "error");
    }
  };
  const handleRegisterOpen = async (initialAmount, employee) => {
    try {
      const newSession = await cashRegisterService.createSession(initialAmount, employee.id, employee.name);
      onSessionStart(newSession, employee);
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_ALREADY_OPEN") {
        addNotification("Este empleado ya tiene una caja abierta. Reanuda o cierra la caja activa antes de abrir otra.", "warning");
        return;
      }
      addNotification("No se pudo abrir la caja registradora.", "error");
    }
  };
  const handleEditItemInCart = (item) => {
    withAuth(() => setItemToEdit(item), "pos.edit_price");
  };
  const handleSaveItemPrice = (productId, newPrice) => {
    setCart((prev) => prev.map((item) => item.id === productId ? { ...item, price: newPrice, manualPrice: true, appliedPriceListId: null, appliedPriceListName: "Precio manual" } : item));
    setItemToEdit(null);
    addNotification("Precio del producto actualizado en el carrito.", "success");
  };
  const startFractionSetup = (item) => {
    setFractionSetupItem(item);
    setFractionUnitsInput(item.fractionalUnitsPerPackage?.toString() || "");
    setFractionUnitNameInput(item.fractionalUnitName || "");
    setFractionPriceInput(item.fractionalPrice?.toString() || "");
  };
  const handleCreateAdditionalRegister = async (initialAmount, employee) => {
    if (isCreatingAdditionalRegister) return;
    setIsCreatingAdditionalRegister(true);
    try {
      const newSession = await cashRegisterService.createSession(initialAmount, employee.id, employee.name);
      addNotification(`Se abrió una nueva caja para ${employee.name}.`, "success");
      setIsAdditionalRegisterModalOpen(false);
      setPendingRegisterSwitch({ session: newSession, employee });
    } catch (error) {
      console.error("Failed to open additional register:", error);
      if (error instanceof Error && error.message === "SESSION_ALREADY_OPEN") {
        addNotification("Este empleado ya tiene una caja abierta. Usa o cierra la caja actual antes de crear otra.", "warning");
      } else {
        addNotification("No se pudo abrir la caja adicional.", "error");
      }
    } finally {
      setIsCreatingAdditionalRegister(false);
    }
  };
  const handleToggleItemUnit = (targetItem) => {
    if (!targetItem.fractionalEnabled || !targetItem.fractionalUnitsPerPackage || targetItem.fractionalUnitsPerPackage <= 0) {
      startFractionSetup(targetItem);
      return;
    }
    const unitsPerPackage = targetItem.fractionalUnitsPerPackage;
    const basePrice = targetItem.basePrice ?? targetItem.price;
    const availablePieces = typeof targetItem.stock === "number" ? targetItem.stock : null;
    setCart((prev) => prev.map((item) => {
      if (item.id !== targetItem.id) {
        return item;
      }
      if (item.sellUnit === "fraction") {
        const maxPackagesFromStock = availablePieces !== null ? Math.floor(availablePieces / unitsPerPackage) : null;
        if (maxPackagesFromStock !== null && maxPackagesFromStock <= 0) {
          addNotification("No hay paquetes completos disponibles en inventario.", "warning");
          return item;
        }
        const desiredPackages = Math.max(1, Math.floor(item.quantity / unitsPerPackage));
        const finalPackages = maxPackagesFromStock !== null ? Math.min(desiredPackages, Math.max(1, maxPackagesFromStock)) : desiredPackages;
        if (maxPackagesFromStock !== null && desiredPackages > maxPackagesFromStock) {
          addNotification("La cantidad se ajusto al maximo de paquetes disponibles.", "info");
        }
        return {
          ...item,
          sellUnit: "package",
          quantity: finalPackages,
          price: basePrice
        };
      }
      if (availablePieces !== null && availablePieces <= 0) {
        addNotification("No hay fracciones disponibles en inventario.", "warning");
        return item;
      }
      const desiredPieces = Math.max(1, Math.round(item.quantity * unitsPerPackage));
      const maxPiecesFromStock = availablePieces !== null ? Math.floor(availablePieces) : null;
      if (maxPiecesFromStock !== null && maxPiecesFromStock <= 0) {
        addNotification("No hay fracciones disponibles en inventario.", "warning");
        return item;
      }
      let finalPieces = desiredPieces;
      if (maxPiecesFromStock !== null && desiredPieces > maxPiecesFromStock) {
        finalPieces = maxPiecesFromStock;
        addNotification("La cantidad se ajusto al inventario disponible.", "info");
      }
      return {
        ...item,
        sellUnit: "fraction",
        quantity: finalPieces,
        price: item.fractionalPrice || basePrice / unitsPerPackage
      };
    }));
  };
  const handleCancelFractionSetup = () => {
    setFractionSetupItem(null);
    setFractionUnitsInput("");
    setFractionUnitNameInput("");
    setFractionPriceInput("");
  };
  const handleConfirmFractionSetup = async () => {
    if (!fractionSetupItem) return;
    const units = parseFloat(fractionUnitsInput);
    if (!Number.isFinite(units) || units <= 0) {
      addNotification("Ingresa cuantas fracciones contiene cada paquete.", "warning");
      return;
    }
    const unitName = fractionUnitNameInput.trim() || "unidad";
    let fractionalPriceValue;
    if (fractionPriceInput.trim().length > 0) {
      const parsedPrice = parseFloat(fractionPriceInput);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        addNotification("Ingresa un precio valido para la fraccion.", "warning");
        return;
      }
      fractionalPriceValue = parsedPrice;
    }
    const basePrice = fractionSetupItem.basePrice ?? fractionSetupItem.price;
    if (fractionalPriceValue === void 0) {
      fractionalPriceValue = basePrice / units;
    }
    setIsSavingFractionSetup(true);
    try {
      await inventoryService.updateFractionalConfig(fractionSetupItem.id, {
        fractionalUnitName: unitName,
        fractionalUnitsPerPackage: units,
        fractionalPrice: fractionalPriceValue
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(FRACTIONAL_CONFIG_UPDATED_EVENT, {
          detail: { productId: fractionSetupItem.id }
        }));
      }
      setCart((prev) => prev.map((item) => {
        if (item.id !== fractionSetupItem.id) return item;
        const maxPiecesFromStock = typeof item.stock === "number" ? Math.floor(item.stock) : null;
        let nextQuantity = Math.max(1, Math.round(item.quantity * units));
        if (maxPiecesFromStock !== null && maxPiecesFromStock <= 0) {
          addNotification("El inventario disponible para este producto es cero.", "warning");
          nextQuantity = 1;
        } else if (maxPiecesFromStock !== null && nextQuantity > maxPiecesFromStock) {
          addNotification("La cantidad en carrito se ajusto al stock disponible.", "info");
          nextQuantity = maxPiecesFromStock;
        }
        return {
          ...item,
          fractionalEnabled: true,
          fractionalUnitsPerPackage: units,
          fractionalUnitName: unitName,
          fractionalPrice: fractionalPriceValue,
          sellUnit: "fraction",
          quantity: nextQuantity
        };
      }));
      addNotification("Configuracion de fracciones guardada.", "success");
      handleCancelFractionSetup();
    } catch (error) {
      console.error(error);
      addNotification("No se pudo guardar la configuracion fraccionada.", "error");
    } finally {
      setIsSavingFractionSetup(false);
    }
  };
  const handleSellerOverrideSuccess = (employee) => {
    setOverrideSeller(employee);
    setIsSellerAuthOpen(false);
    addNotification(`Venta asignada a ${employee.name}.`, "info");
  };
  const handleClearClientSelection = () => {
    setSelectedClient(null);
  };
  const handleActionMenuSelect = (action) => {
    switch (action) {
      case "return":
        withAuth(() => setIsReturnModalOpen(true), "pos.process_return");
        break;
      case "movement":
        setIsCashMovementOpen(true);
        break;
      case "project":
        setIsProjectHelperOpen(true);
        break;
      case "close":
        withAuth(handleStartCloseRegister, "pos.close_register");
        break;
    }
  };
  if (!activeSession) {
    if (session?.organization?.subscriptionTier === "solopreneur" && session.user) {
      const solopreneurEmployee = { id: session.user.id, name: session.user.email.split("@")[0], role: "Admin", accessCode: "" };
      return /* @__PURE__ */ jsxRuntimeExports.jsx(OpenRegisterPage, { onRegisterOpen: (amount) => handleRegisterOpen(amount, solopreneurEmployee) });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(POSSessionSelectorPage, { onSelectSession: onSessionStart, onCancel: () => onNavigate("dashboard") });
  }
  const cartDisplayProps = {
    cart,
    onRemoveFromCart: handleRemoveFromCart,
    onUpdateQuantity: handleUpdateQuantity,
    onCheckout: () => setIsCheckoutOpen(true),
    onOpenDiscountModal: (tab = "product") => withAuth(() => {
      setDiscountInitialTab(tab);
      setIsDiscountModalOpen(true);
    }, "pos.apply_discount"),
    onAssignClient: () => setIsClientModalOpen(true),
    selectedClient,
    onClearClient: handleClearClientSelection,
    totals,
    subscriptionTier: session.organization.subscriptionTier,
    onEditItem: handleEditItemInCart,
    onSwitchSeller: () => setIsSellerAuthOpen(true),
    sellerForSale: overrideSeller || employeeForSession,
    onClearSellerOverride: () => setOverrideSeller(null),
    onToggleItemUnit: handleToggleItemUnit
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full text-[0.92rem] sm:text-base", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6 flex flex-col lg:flex-row gap-6 h-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 lg:w-2/3 flex flex-col gap-4 min-h-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ProductSearch, { onAddToCart: handleAddToCart }) }),
        multiPriceEnabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800/60 border border-slate-700 rounded-md p-3 flex flex-col md:flex-row md:items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Lista de precios activa" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: selectedPriceListId ?? "",
                onChange: (e) => setSelectedPriceListId(e.target.value || null),
                disabled: isPriceListLoading,
                className: "w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm disabled:opacity-50",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Precio base" }),
                  priceLists.map((list) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: list.id, children: list.name }, list.id))
                ]
              }
            ),
            isPriceListLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Cargando listas..." })
          ] }),
          selectedClient?.priceListId && selectedClient.priceListId !== selectedPriceListId && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setSelectedPriceListId(selectedClient.priceListId),
              className: "px-3 py-2 text-xs bg-sky-700 text-white rounded-md hover:bg-sky-600",
              children: [
                "Usar lista de ",
                selectedClient.name.split(" ")[0]
              ]
            }
          )
        ] }),
        !STRIPE_FEATURES_DISABLED && crossSellSuggestion && /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(CrossSellSuggestion, { suggestion: crossSellSuggestion, onDismiss: () => setCrossSellSuggestion("") }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(QuickAccessGrid, { onAddToCart: handleAddToCart }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden lg:flex flex-1 lg:w-1/3 lg:flex-initial lg:max-w-md flex-col gap-4 min-h-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(POSActionsMenu, { onAction: handleActionMenuSelect }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => withAuth(() => setIsAdditionalRegisterModalOpen(true), "pos.access"),
              className: "px-3 py-2 text-sm font-semibold rounded-md bg-slate-700 text-slate-100 hover:bg-slate-600 transition-colors",
              children: "Abrir otra caja"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => withAuth(() => setIsSwitchSessionConfirmOpen(true), "pos.access"),
              className: "px-3 py-2 text-sm font-semibold rounded-md bg-slate-600 text-slate-100 hover:bg-slate-500 transition-colors",
              children: "Cambiar de caja"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CartDisplay, { ...cartDisplayProps }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:hidden fixed bottom-6 left-6 z-20", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => setIsMobileCartOpen(true),
        className: "flex items-center gap-3 px-6 py-4 bg-green-600 text-white font-bold rounded-full shadow-lg transition-transform hover:scale-105 hover:bg-green-500",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(POSIcon, { className: "h-6 w-6" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Ver Carrito (",
            new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(totals.total),
            ")"
          ] })
        ]
      }
    ) }),
    isMobileCartOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:hidden fixed inset-0 bg-slate-900 z-30 flex flex-col animate-slide-in-up", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold", children: "Resumen de Venta" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsMobileCartOpen(false), className: "px-3 py-1.5 text-sm bg-slate-700 rounded-md", children: "× Cerrar" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 p-4 flex-grow min-h-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(POSActionsMenu, { onAction: handleActionMenuSelect }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => withAuth(() => setIsAdditionalRegisterModalOpen(true), "pos.access"),
            className: "w-full px-3 py-2 text-sm font-semibold rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors",
            children: "Abrir otra caja"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => withAuth(() => setIsSwitchSessionConfirmOpen(true), "pos.access"),
            className: "w-full px-3 py-2 text-sm font-semibold rounded-md bg-slate-600 text-white hover:bg-slate-500 transition-colors",
            children: "Cambiar de caja"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-grow min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CartDisplay, { ...cartDisplayProps }) })
      ] })
    ] }),
    fractionSetupItem && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-md bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-widest text-slate-400", children: "Venta por fracciones" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-semibold text-white mt-1", children: fractionSetupItem.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-slate-400 mt-2", children: [
          "Define cuantas unidades menores tiene cada ",
          fractionSetupItem.unitOfMeasure || "presentacion",
          " para poder venderla como paquete o fraccion sin perder el control del inventario."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-sm text-slate-300", children: [
          "Fracciones por ",
          fractionSetupItem.unitOfMeasure || "paquete",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              min: "1",
              step: "1",
              value: fractionUnitsInput,
              onChange: (e) => setFractionUnitsInput(e.target.value),
              className: "mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white",
              placeholder: "Ej. 6"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-sm text-slate-300", children: [
          "Nombre de la fraccion",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: fractionUnitNameInput,
              onChange: (e) => setFractionUnitNameInput(e.target.value),
              className: "mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white",
              placeholder: "pieza, litro, porcion..."
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-sm text-slate-300", children: [
          "Precio por fraccion (opcional)",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              min: "0",
              step: "0.01",
              value: fractionPriceInput,
              onChange: (e) => setFractionPriceInput(e.target.value),
              className: "mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white",
              placeholder: "Dejalo vacio para calcularlo automaticamente"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
            "Si no especificas un precio, usaremos el precio base de $",
            (fractionSetupItem.basePrice ?? fractionSetupItem.price).toFixed(2),
            " dividido entre las fracciones."
          ] })
        ] }),
        fractionPreviewPrice !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-700/60 px-3 py-2 text-sm text-slate-100", children: [
          "Precio estimado: $",
          fractionPreviewPrice.toFixed(2),
          " por ",
          fractionUnitNameInput.trim() || fractionSetupItem.fractionalUnitName || "fraccion"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row justify-end gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: handleCancelFractionSetup,
            disabled: isSavingFractionSetup,
            className: "px-4 py-2 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-50",
            children: "Cancelar"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: handleConfirmFractionSetup,
            disabled: isSavingFractionSetup,
            className: "px-4 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-500 disabled:bg-green-800",
            children: isSavingFractionSetup ? "Guardando..." : "Guardar fracciones"
          }
        )
      ] })
    ] }) }),
    isAdditionalRegisterModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-2xl bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => !isCreatingAdditionalRegister && setIsAdditionalRegisterModalOpen(false),
          className: "absolute top-3 right-3 text-slate-400 hover:text-white",
          "aria-label": "Cerrar",
          children: "×"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-slate-300 py-8", children: "Preparando formulario..." }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenRegisterPage, { onRegisterOpen: handleCreateAdditionalRegister }) }),
      isCreatingAdditionalRegister && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white text-sm font-semibold", children: "Creando caja..." })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}), children: [
      isCheckoutOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        CheckoutModal,
        {
          isOpen: isCheckoutOpen,
          onClose: () => setIsCheckoutOpen(false),
          onConfirm: handleConfirmPayment,
          total: totals.total,
          client: selectedClient,
          loyaltySettings: session.organization.loyaltySettings
        }
      ),
      lastSale && /* @__PURE__ */ jsxRuntimeExports.jsx(
        SaleDetailModal,
        {
          isOpen: !!lastSale,
          onClose: () => setLastSale(null),
          sale: lastSale
        }
      ),
      isCloseRegisterOpen && closeRegisterSummary && /* @__PURE__ */ jsxRuntimeExports.jsx(
        CloseRegisterModal,
        {
          isOpen: isCloseRegisterOpen,
          onClose: () => setIsCloseRegisterOpen(false),
          onConfirm: handleConfirmCloseRegister,
          summary: closeRegisterSummary
        }
      ),
      isDiscountModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        DiscountModal,
        {
          isOpen: isDiscountModalOpen,
          onClose: () => setIsDiscountModalOpen(false),
          onApply: handleApplyDiscount,
          cart,
          initialTab: discountInitialTab
        }
      ),
      isClientModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ClientSearchModal,
        {
          isOpen: isClientModalOpen,
          onClose: () => setIsClientModalOpen(false),
          onSelectClient: (client) => {
            setSelectedClient(client);
            setIsClientModalOpen(false);
          }
        }
      ),
      isReturnModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ReturnModal,
        {
          isOpen: isReturnModalOpen,
          onClose: () => setIsReturnModalOpen(false),
          onFindSale: saleService.findSaleByTicketNumber,
          onProcessReturn: handleProcessReturn
        }
      ),
      isCashMovementOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        CashMovementModal,
        {
          isOpen: isCashMovementOpen,
          onClose: () => setIsCashMovementOpen(false),
          onConfirm: handleCashMovement
        }
      ),
      actionAfterAuth && /* @__PURE__ */ jsxRuntimeExports.jsx(
        AuthorizationModal,
        {
          isOpen: !!actionAfterAuth,
          onClose: () => setActionAfterAuth(null),
          onSuccess: handleAuthSuccess,
          permissionRequired: actionAfterAuth.permission
        }
      ),
      isSellerAuthOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        AuthorizationModal,
        {
          isOpen: isSellerAuthOpen,
          onClose: () => setIsSellerAuthOpen(false),
          onSuccess: handleSellerOverrideSuccess,
          permissionRequired: "pos.access"
        }
      ),
      isCashDrawerOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        CashDrawerModal,
        {
          isOpen: isCashDrawerOpen,
          onClose: () => setIsCashDrawerOpen(false)
        }
      ),
      isProjectHelperOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ProjectHelperModal,
        {
          isOpen: isProjectHelperOpen,
          onClose: () => setIsProjectHelperOpen(false),
          onAddToCart: handleAddToCart
        }
      ),
      itemToEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(
        EditPriceModal,
        {
          isOpen: !!itemToEdit,
          onClose: () => setItemToEdit(null),
          onSave: handleSaveItemPrice,
          item: itemToEdit
        }
      )
    ] }),
    isSwitchSessionConfirmOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: true,
        title: "Cambiar de caja",
        confirmButtonText: "Sí, cambiar",
        onClose: () => setIsSwitchSessionConfirmOpen(false),
        onConfirm: handleConfirmSwitchSession,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-300", children: "Cambiarás a otra caja y esta pantalla volverá al selector. El carrito y cualquier selección actual se limpiarán." })
      }
    ),
    pendingRegisterSwitch && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: true,
        title: "¿Cambiarse a la nueva caja?",
        confirmButtonText: "Usar nueva caja",
        confirmButtonClass: "bg-green-600 hover:bg-green-500",
        onClose: () => setPendingRegisterSwitch(null),
        onConfirm: () => {
          onSessionStart(pendingRegisterSwitch.session, pendingRegisterSwitch.employee);
          setPendingRegisterSwitch(null);
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-300", children: [
          "Se abrió una nueva caja para ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-100", children: pendingRegisterSwitch.employee.name }),
          ". Puedes comenzar a usarla ahora mismo; tu caja actual permanecerá activa y podrás regresar cuando quieras."
        ] })
      }
    )
  ] });
};

export { POSPage as default };
