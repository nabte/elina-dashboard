const __vite__mapDeps = (i, m = __vite__mapDeps, d = (m.f || (m.f = ["assets/CategoryManagerModal-CyXVRuUP.js", "assets/landing-DMNKFuas.js", "assets/MainLayout-C0Ev0ilC.js", "assets/index-B4F2XZYo.js", "assets/vendor-DeEp8S9j.js", "assets/supabase-vendor-DZiv2hl9.js", "assets/index-k1dWmxkk.css", "assets/inventoryCountService-Bo8nZII3.js", "assets/SettingsIcon-DbPfflvT.js"]))) => i.map(i => d[i]);
import { u as useAuth, _ as __vitePreload } from './index-B4F2XZYo.js';
import { b as reactExports, j as jsxRuntimeExports, c as React } from './landing-DMNKFuas.js';
import { u as useServices, b as usePersistentState } from './MainLayout-C0Ev0ilC.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const CategoryManagerModal = reactExports.lazy(() => __vitePreload(() => import('./CategoryManagerModal-CyXVRuUP.js'), true ? __vite__mapDeps([0, 1, 2, 3, 4, 5, 6, 7, 8]) : void 0));
const unitOfMeasureOptions = ["pieza", "caja", "bolsa", "metro", "kg", "lt", "servicio", "horas"];
const fractionalUnitOptions = ["pieza", "caja", "bolsa", "metro", "kg", "lt"];
const createEmptyProductFormState = () => ({
  id: "",
  name: "",
  categoryId: "",
  price: "",
  costPrice: "",
  stock: "",
  unitOfMeasure: "pieza",
  description: "",
  isSupply: false,
  strictComboOnly: false,
  fractionalEnabled: false,
  fractionalUnitName: "",
  fractionalUnitsPerPackage: "",
  fractionalPrice: "",
  fractionalPackagesInStock: "",
  fractionalPiecesRemainder: ""
});
const mapProductToFormState = (product) => ({
  id: product.id,
  name: product.name,
  categoryId: product.categoryId || "",
  price: product.price?.toString() || "",
  costPrice: product.costPrice?.toString() || "",
  stock: product.stock !== void 0 ? product.stock.toString() : "",
  unitOfMeasure: product.unitOfMeasure || "pieza",
  description: product.description || "",
  isSupply: product.isSupply || false,
  strictComboOnly: product.strictComboOnly || false,
  fractionalEnabled: product.fractionalEnabled || false,
  fractionalUnitName: product.fractionalUnitName || "",
  fractionalUnitsPerPackage: product.fractionalUnitsPerPackage?.toString() || "",
  fractionalPrice: product.fractionalPrice?.toString() || "",
  fractionalPackagesInStock: product.fractionalEnabled && product.fractionalUnitsPerPackage && product.stock !== void 0 ? Math.floor((product.stock || 0) / product.fractionalUnitsPerPackage).toString() : "",
  fractionalPiecesRemainder: product.fractionalEnabled && product.fractionalUnitsPerPackage && product.stock !== void 0 ? ((product.stock || 0) % product.fractionalUnitsPerPackage).toString() : ""
});
const createEmptyRecipeComponent = () => ({
  componentProductId: "",
  componentProductName: "",
  quantity: "1",
  unit: "",
  extraCost: "0",
  includeInventory: true
});
const ProductFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { session } = useAuth();
  const { inventoryService, priceListService, subSkuService } = useServices();
  const minimumProfitMargin = session?.organization?.minimumProfitMargin || 0;
  const multiPriceEnabled = !!session?.organization?.multiPriceEnabled;
  const persistenceKey = initialData ? `editing-product-${initialData.id}` : "new-product";
  const [productFormState, setProductFormState] = usePersistentState(persistenceKey, null);
  const derivedInitialProductState = reactExports.useMemo(
    () => initialData ? mapProductToFormState(initialData) : createEmptyProductFormState(),
    [initialData]
  );
  const product = productFormState ?? derivedInitialProductState;
  const [allCategories, setAllCategories] = reactExports.useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = reactExports.useState(false);
  const [imageFile, setImageFile] = reactExports.useState(null);
  const [imagePreview, setImagePreview] = reactExports.useState(null);
  const [priceLists, setPriceLists] = reactExports.useState([]);
  const [priceListValues, setPriceListValues] = reactExports.useState({});
  const [priceListDirty, setPriceListDirty] = reactExports.useState({});
  const [isLoadingPriceLists, setIsLoadingPriceLists] = reactExports.useState(false);
  const [recipeEnabled, setRecipeEnabled] = reactExports.useState(false);
  const [recipeName, setRecipeName] = reactExports.useState("");
  const [recipeYield, setRecipeYield] = reactExports.useState("1");
  const [recipeComponents, setRecipeComponents] = reactExports.useState([]);
  const [existingRecipeId, setExistingRecipeId] = reactExports.useState(void 0);
  const [isRecipeLoading, setIsRecipeLoading] = reactExports.useState(false);
  const isEditing = !!initialData;
  const fetchCategories = async () => {
    const cats = await inventoryService.getUniqueCategories();
    setAllCategories(cats);
  };
  reactExports.useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, inventoryService]);
  reactExports.useEffect(() => {
    if (isOpen && initialData?.id) {
      setIsRecipeLoading(true);
      inventoryService.getProductRecipe(initialData.id).then((recipe) => {
        if (recipe) {
          setExistingRecipeId(recipe.id);
          setRecipeEnabled(true);
          setRecipeName(recipe.name || "");
          setRecipeYield((recipe.yieldQuantity || 1).toString());
          setRecipeComponents(
            recipe.components.map((component) => ({
              id: component.id,
              componentProductId: component.componentProductId,
              componentProductName: component.componentProductName || "",
              quantity: (component.quantity || 0).toString(),
              unit: component.unit || "",
              extraCost: (component.extraCost || 0).toString(),
              includeInventory: component.includeInventory ?? true
            }))
          );
        } else {
          setExistingRecipeId(void 0);
          setRecipeEnabled(false);
          setRecipeComponents([]);
          setRecipeName("");
          setRecipeYield("1");
        }
      }).finally(() => setIsRecipeLoading(false));
    } else if (!isOpen) {
      setExistingRecipeId(void 0);
      setRecipeEnabled(false);
      setRecipeComponents([]);
      setRecipeName("");
      setRecipeYield("1");
    }
  }, [isOpen, initialData, inventoryService]);
  const { parentCategories, childCategories } = reactExports.useMemo(() => {
    const parents = allCategories.filter((c) => !c.parent_id);
    const children = allCategories.filter((c) => c.parent_id);
    return { parentCategories: parents, childCategories: children };
  }, [allCategories]);
  const currentProfitMargin = reactExports.useMemo(() => {
    const price = parseFloat(product.price);
    const cost = parseFloat(product.costPrice);
    if (!price || price <= 0 || !cost || cost <= 0) {
      return null;
    }
    return (price - cost) / price * 100;
  }, [product.price, product.costPrice]);
  const fractionalProfitMargin = reactExports.useMemo(() => {
    if (!product.fractionalEnabled) return null;
    const fractionalPrice = parseFloat(product.fractionalPrice) || 0;
    const cost = parseFloat(product.costPrice) || 0;
    if (!fractionalPrice || fractionalPrice <= 0 || !cost || cost <= 0) {
      return null;
    }
    const unitsPerPackage = parseFloat(product.fractionalUnitsPerPackage) || 1;
    const costPerFraction = cost / unitsPerPackage;
    return (fractionalPrice - costPerFraction) / fractionalPrice * 100;
  }, [product.fractionalEnabled, product.fractionalPrice, product.costPrice, product.fractionalUnitsPerPackage]);
  reactExports.useEffect(() => {
    setImageFile(null);
    setImagePreview(initialData ? initialData.imageUrl || null : null);
  }, [initialData, isOpen]);
  reactExports.useEffect(() => {
    if (!isOpen) return;
    if (productFormState === null) {
      setProductFormState(derivedInitialProductState);
      return;
    }
    if (initialData && productFormState.id !== initialData.id) {
      setProductFormState(derivedInitialProductState);
    }
  }, [initialData, derivedInitialProductState, isOpen, productFormState, setProductFormState]);
  reactExports.useEffect(() => {
    if (!isOpen && productFormState !== null) {
      setProductFormState(null);
      setImageFile(null);
      setImagePreview(null);
      setRecipeEnabled(false);
      setRecipeName("");
      setRecipeYield("1");
      setRecipeComponents([]);
      setExistingRecipeId(void 0);
    }
  }, [isOpen, productFormState, setProductFormState]);
  reactExports.useEffect(() => {
    if (!product.fractionalEnabled) return;
    const units = parseFloat(product.fractionalUnitsPerPackage) || 0;
    if (units <= 0) return;
    const base = parseFloat(product.price) || 0;
    if (!base) return;
    const computed = (base / units).toFixed(2);
    setProductFormState((prev) => {
      const baseState = prev ?? derivedInitialProductState;
      const currentFractional = parseFloat(baseState.fractionalPrice) || 0;
      const computedNum = parseFloat(computed);
      if (!baseState.fractionalPrice || Math.abs(currentFractional - computedNum) < 0.01) {
        if (baseState.fractionalPrice === computed) return prev;
        return { ...baseState, fractionalPrice: computed };
      }
      return prev;
    });
  }, [product.fractionalEnabled, product.fractionalUnitsPerPackage, product.price]);
  reactExports.useEffect(() => {
    if (!product.fractionalEnabled) return;
    const units = parseFloat(product.fractionalUnitsPerPackage) || 0;
    if (units <= 0) return;
    const packages = parseFloat(product.fractionalPackagesInStock) || 0;
    setProductFormState((prev) => {
      const baseState = prev ?? derivedInitialProductState;
      if (baseState.stock === packages.toString()) return prev;
      return { ...baseState, stock: packages.toString() };
    });
  }, [product.fractionalEnabled, product.fractionalPackagesInStock]);
  reactExports.useEffect(() => {
    if (product.fractionalEnabled) return;
    setProductFormState((prev) => {
      if (!prev) return prev;
      if (!prev.fractionalUnitName && !prev.fractionalUnitsPerPackage && !prev.fractionalPackagesInStock && !prev.fractionalPiecesRemainder) {
        return prev;
      }
      return {
        ...prev,
        fractionalUnitName: "",
        fractionalUnitsPerPackage: "",
        fractionalPrice: "",
        fractionalPackagesInStock: "",
        fractionalPiecesRemainder: ""
      };
    });
  }, [product.fractionalEnabled]);
  reactExports.useEffect(() => {
    if (!product.fractionalEnabled) return;
    if (["pieza", "servicio", "horas"].includes(product.unitOfMeasure)) {
      setProductFormState((prev) => prev ? { ...prev, fractionalEnabled: false } : prev);
    }
  }, [product.unitOfMeasure, product.fractionalEnabled]);
  reactExports.useEffect(() => {
    if (!isOpen || !multiPriceEnabled) {
      setPriceLists([]);
      setPriceListValues({});
      setPriceListDirty({});
      return;
    }
    let isActive = true;
    const loadPriceLists = async () => {
      setIsLoadingPriceLists(true);
      try {
        const lists = await priceListService.getPriceLists();
        if (!isActive) return;
        let existingEntries = {};
        if (initialData?.id) {
          if (initialData.priceVariants && initialData.priceVariants.length > 0) {
            existingEntries = initialData.priceVariants.reduce((acc, variant) => {
              acc[variant.priceListId] = variant.price;
              return acc;
            }, {});
          } else {
            const fetched = await priceListService.getEntriesForProduct(initialData.id);
            existingEntries = fetched.reduce((acc, entry) => {
              acc[entry.priceListId] = entry.price;
              return acc;
            }, {});
          }
        }
        const nextValues = {};
        const nextDirty = {};
        lists.forEach((list) => {
          if (existingEntries[list.id] !== void 0) {
            nextValues[list.id] = existingEntries[list.id].toString();
            nextDirty[list.id] = true;
          } else {
            nextValues[list.id] = product.price || "";
            nextDirty[list.id] = false;
          }
        });
        setPriceLists(lists);
        setPriceListValues(nextValues);
        setPriceListDirty(nextDirty);
      } catch (error) {
        console.error("Error loading price lists", error);
      } finally {
        if (isActive) setIsLoadingPriceLists(false);
      }
    };
    loadPriceLists();
    return () => {
      isActive = false;
    };
  }, [isOpen, multiPriceEnabled, priceListService, initialData, product.price]);
  reactExports.useEffect(() => {
    if (!isOpen || !multiPriceEnabled || priceLists.length === 0) return;
    setPriceListValues((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      priceLists.forEach((list) => {
        if (!priceListDirty[list.id]) {
          if (next[list.id] !== product.price) {
            next[list.id] = product.price;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [product.price, multiPriceEnabled, priceLists, priceListDirty, isOpen]);
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const checked = e.target.checked;
    setProductFormState((prev) => {
      const baseState = prev ?? derivedInitialProductState;
      return {
        ...baseState,
        [name]: type === "checkbox" ? checked : value
      };
    });
  };
  const handlePriceListValueChange = (priceListId, value) => {
    setPriceListValues((prev) => ({ ...prev, [priceListId]: value }));
    setPriceListDirty((prev) => ({ ...prev, [priceListId]: true }));
  };
  const handleCopyBasePrice = (priceListId) => {
    setPriceListValues((prev) => ({ ...prev, [priceListId]: product.price || "" }));
    setPriceListDirty((prev) => ({ ...prev, [priceListId]: true }));
  };
  const handleAddRecipeComponent = () => {
    setRecipeComponents((prev) => [...prev, createEmptyRecipeComponent()]);
  };
  const handleRecipeComponentChange = (index, field, value) => {
    setRecipeComponents((prev) => prev.map((component, idx) => {
      if (idx !== index) return component;
      return {
        ...component,
        [field]: value
      };
    }));
  };
  const handleRemoveRecipeComponent = (index) => {
    setRecipeComponents((prev) => prev.filter((_, idx) => idx !== index));
  };
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      fractionalPackagesInStock,
      fractionalPiecesRemainder,
      fractionalUnitsPerPackage,
      fractionalPrice: fractionalPriceState,
      ...restProduct
    } = product;
    let computedPrice = parseFloat(product.price) || 0;
    const unitsPerPackage = parseFloat(product.fractionalUnitsPerPackage) || 0;
    const fractionalPrice = product.fractionalEnabled ? product.fractionalPrice ? parseFloat(product.fractionalPrice) : unitsPerPackage > 0 ? computedPrice / unitsPerPackage : 0 : void 0;
    const packagesCount = parseFloat(product.fractionalPackagesInStock) || 0;
    const piecesRemainder = parseFloat(product.fractionalPiecesRemainder) || 0;
    const totalStock = product.fractionalEnabled && unitsPerPackage > 0 ? packagesCount * unitsPerPackage + piecesRemainder : parseFloat(product.stock) || 0;
    const productData = {
      ...restProduct,
      price: computedPrice,
      costPrice: parseFloat(product.costPrice) || 0,
      stock: product.unitOfMeasure === "servicio" || product.unitOfMeasure === "horas" ? void 0 : totalStock,
      fractionalUnitsPerPackage: unitsPerPackage > 0 ? unitsPerPackage : void 0,
      fractionalPrice,
      strictComboOnly: product.strictComboOnly || false
    };
    const priceListPayload = multiPriceEnabled ? priceLists.map((list) => {
      const value = priceListValues[list.id];
      if (value === void 0 || value === "") return null;
      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) return null;
      return { priceListId: list.id, price: numericValue };
    }).filter((entry) => entry !== null) : void 0;
    let recipePayload = null;
    const resolvedProductId = (productData.id || product.id || "").trim();
    if (recipeEnabled && resolvedProductId) {
      const normalizedComponents = recipeComponents.filter((component) => component.componentProductId.trim() && (parseFloat(component.quantity) || 0) > 0).map((component) => ({
        id: component.id,
        componentProductId: component.componentProductId.trim(),
        componentProductName: component.componentProductName?.trim() || void 0,
        quantity: parseFloat(component.quantity) || 0,
        unit: component.unit?.trim() || void 0,
        extraCost: component.extraCost ? parseFloat(component.extraCost) || 0 : 0,
        includeInventory: component.includeInventory
      }));
      if (normalizedComponents.length > 0) {
        recipePayload = {
          id: existingRecipeId,
          productId: resolvedProductId,
          name: recipeName.trim() || void 0,
          yieldQuantity: parseFloat(recipeYield) > 0 ? parseFloat(recipeYield) : 1,
          components: normalizedComponents
        };
      }
    }
    onSubmit({ productData, imageFile, priceListValues: priceListPayload, recipe: recipePayload });
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
    children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "bg-slate-800 w-full max-w-3xl max-h-[90vh] m-4 p-4 rounded-xl shadow-2xl border border-slate-700 flex flex-col", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between mb-3 flex-shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-bold text-slate-100", children: isEditing ? "Editar Producto" : "Nuevo Producto" }),
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
          ]
        }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", {
          id: "product-form", onSubmit: handleSubmit, className: "flex flex-col flex-1 overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-3 overflow-y-auto flex-1 pr-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "w-1/4 flex flex-col items-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-slate-300 mb-1", children: "Imagen del Producto" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-20 h-20 bg-slate-700 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600", children: imagePreview ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: imagePreview, alt: "Vista previa", className: "w-full h-full object-cover rounded-lg" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-500 text-sm", children: "Sin imagen" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", id: "imageUpload", accept: "image/*", onChange: handleImageChange, className: "hidden" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "imageUpload", className: "mt-1 px-3 py-1 bg-slate-600 text-slate-200 text-xs font-semibold rounded-md hover:bg-slate-500 cursor-pointer", children: "Subir Imagen" })
                ]
              }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex-1 space-y-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "id", className: "block text-xs font-medium text-slate-300 mb-1", children: "SKU / ID" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "id", id: "id", value: product.id, onChange: handleChange, disabled: isEditing, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 disabled:opacity-50", required: true })
                    ]
                  }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "name", className: "block text-xs font-medium text-slate-300 mb-1", children: "Nombre" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "name", id: "name", value: product.name, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
                    ]
                  })
                  ]
                }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-1 md:grid-cols-2 gap-3 items-end", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "categoryId", className: "block text-xs font-medium text-slate-300 mb-1", children: "Categoría" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("select", {
                      name: "categoryId", id: "categoryId", value: product.categoryId, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Sin Categoría" }),
                        parentCategories.map((parent) => /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, {
                          children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: parent.id, className: "font-bold", children: parent.name }),
                            childCategories.filter((child) => child.parent_id === parent.id).map((child) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", {
                              value: child.id, children: [
                                "   ",
                                child.name
                              ]
                            }, child.id))
                          ]
                        }, parent.id))
                      ]
                    })
                    ]
                  }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setIsCategoryModalOpen(true), className: "px-3 py-2 bg-slate-600 text-sm font-semibold rounded-md hover:bg-slate-500 whitespace-nowrap", children: "+ Administrar" })
                  ]
                }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-1 md:grid-cols-2 gap-3 items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "costPrice", className: "block text-xs font-medium text-slate-300 mb-1", children: "Precio de Costo" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", name: "costPrice", id: "costPrice", value: product.costPrice, onChange: handleChange, step: "0.01", className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
                    ]
                  }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "price", className: "block text-xs font-medium text-slate-300 mb-1", children: "Precio de Venta" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", name: "price", id: "price", value: product.price, onChange: handleChange, step: "0.01", className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
                    ]
                  })
                  ]
                }),
                  multiPriceEnabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "bg-slate-900/40 border border-slate-700 rounded-lg p-3 space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-200", children: "Listas de precios adicionales" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500", children: "Configura las listas desde Ajustes > Reglas de negocio." })
                        ]
                      }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                        className: "text-xs text-slate-400", children: [
                          priceLists.length,
                          " listas activas"
                        ]
                      })
                      ]
                    }),
                      isLoadingPriceLists ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Cargando listas..." }) : priceLists.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400", children: "Aún no hay listas configuradas. Activa la función en Ajustes." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "space-y-3", children: priceLists.map((list) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          className: "grid grid-cols-1 md:grid-cols-3 gap-3 items-end border border-slate-700 rounded-md p-3 bg-slate-800/40", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                            children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-100", children: list.name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                              className: "text-xs text-slate-500", children: [
                                "Margen base ",
                                list.defaultMarginSource === "cost" ? "sobre costo" : "sobre lista",
                                " ",
                                list.defaultMarginPercent,
                                "%"
                              ]
                            })
                            ]
                          }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                            className: "md:col-span-2 flex flex-col md:flex-row gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                              className: "flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Precio" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "input",
                                {
                                  type: "number",
                                  step: "0.01",
                                  value: priceListValues[list.id] ?? "",
                                  onChange: (e) => handlePriceListValueChange(list.id, e.target.value),
                                  className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
                                }
                              )
                              ]
                            }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "button",
                              {
                                type: "button",
                                onClick: () => handleCopyBasePrice(list.id),
                                className: "self-end px-3 py-2 text-xs bg-slate-600 text-slate-200 rounded-md hover:bg-slate-500 whitespace-nowrap",
                                children: "Copiar base"
                              }
                            )
                            ]
                          })
                          ]
                        }, list.id))
                      })
                    ]
                  }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "bg-slate-900/40 border border-slate-700 rounded-lg p-4 space-y-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-200", children: "Receta / Combo" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: "Descuenta automáticamente los componentes al vender este producto." })
                          ]
                        }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
                          className: "flex items-center gap-2 text-sm text-slate-300", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "input",
                            {
                              type: "checkbox",
                              className: "form-checkbox bg-slate-700",
                              checked: recipeEnabled,
                              onChange: (e) => setRecipeEnabled(e.target.checked)
                            }
                          ),
                            "Activar receta"
                          ]
                        })
                        ]
                      }),
                        recipeEnabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          className: "space-y-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                            className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                              children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-slate-400 mb-1", children: "Nombre de la receta (opcional)" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "input",
                                {
                                  type: "text",
                                  value: recipeName,
                                  onChange: (e) => setRecipeName(e.target.value),
                                  className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
                                }
                              )
                              ]
                            }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                              children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-slate-400 mb-1", children: "Cantidad producida" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "input",
                                {
                                  type: "number",
                                  min: "1",
                                  step: "0.01",
                                  value: recipeYield,
                                  onChange: (e) => setRecipeYield(e.target.value),
                                  className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
                                }
                              ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-500 mt-1", children: "Ej. 10 si una receta produce 10 unidades." })
                              ]
                            })
                            ]
                          }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                            className: "border border-slate-700 rounded-lg divide-y divide-slate-700", children: isRecipeLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400 p-4", children: "Cargando receta..." }) : recipeComponents.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-400 p-4", children: "Agrega los insumos que se restarán del inventario." }) : recipeComponents.map((component, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                              className: "p-4 grid grid-cols-1 md:grid-cols-6 gap-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                                className: "md:col-span-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-slate-400 mb-1", children: "Producto (SKU)" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "input",
                                  {
                                    type: "text",
                                    value: component.componentProductId,
                                    onChange: (e) => handleRecipeComponentChange(index, "componentProductId", e.target.value),
                                    className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2",
                                    placeholder: "Ej. SKU-123"
                                  }
                                )
                                ]
                              }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                                children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-slate-400 mb-1", children: "Cantidad" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "input",
                                  {
                                    type: "number",
                                    step: "0.01",
                                    min: "0",
                                    value: component.quantity,
                                    onChange: (e) => handleRecipeComponentChange(index, "quantity", e.target.value),
                                    className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-right"
                                  }
                                )
                                ]
                              }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                                children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-slate-400 mb-1", children: "Unidad" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "input",
                                  {
                                    type: "text",
                                    value: component.unit,
                                    onChange: (e) => handleRecipeComponentChange(index, "unit", e.target.value),
                                    className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2",
                                    placeholder: "pz, kg..."
                                  }
                                )
                                ]
                              }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                                children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-slate-400 mb-1", children: "Costo extra" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "input",
                                  {
                                    type: "number",
                                    step: "0.01",
                                    value: component.extraCost,
                                    onChange: (e) => handleRecipeComponentChange(index, "extraCost", e.target.value),
                                    className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-right"
                                  }
                                )
                                ]
                              }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                                className: "flex flex-col justify-between text-sm text-slate-300", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
                                  className: "flex items-center gap-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    "input",
                                    {
                                      type: "checkbox",
                                      className: "form-checkbox bg-slate-700",
                                      checked: component.includeInventory,
                                      onChange: (e) => handleRecipeComponentChange(index, "includeInventory", e.target.checked)
                                    }
                                  ),
                                    "Descontar inventario"
                                  ]
                                }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () => handleRemoveRecipeComponent(index),
                                    className: "text-xs text-red-400 hover:text-red-300 text-left",
                                    children: "Quitar"
                                  }
                                )
                                ]
                              })
                              ]
                            }, `recipe-component-${index}`))
                          }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "button",
                            {
                              type: "button",
                              onClick: handleAddRecipeComponent,
                              className: "px-3 py-2 text-sm bg-slate-700 text-white rounded-md hover:bg-slate-600",
                              children: "+ Agregar componente"
                            }
                          )
                          ]
                        })
                      ]
                    })
                  })
                ]
              })
              ]
            }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "grid grid-cols-1 md:grid-cols-2 gap-4 items-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "unitOfMeasure", className: "block text-xs font-medium text-slate-300 mb-1", children: "Unidad de Medida" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("select", { name: "unitOfMeasure", id: "unitOfMeasure", value: product.unitOfMeasure, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 capitalize", children: unitOfMeasureOptions.map((unit) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: unit, children: unit }, unit)) })
                ]
              }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "stock", className: "block text-xs font-medium text-slate-300 mb-1", children: "Stock" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "number",
                    name: "stock",
                    id: "stock",
                    value: product.stock,
                    placeholder: "0",
                    onChange: handleChange,
                    className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 disabled:bg-slate-800 disabled:placeholder-slate-500 disabled:cursor-not-allowed",
                    disabled: product.unitOfMeasure === "servicio" || product.unitOfMeasure === "horas" || product.fractionalEnabled,
                    readOnly: product.fractionalEnabled
                  }
                ),
                  product.fractionalEnabled && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-1", children: "El stock se calcula automáticamente desde los paquetes y fracciones definidas abajo." })
                ]
              })
              ]
            }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "border border-slate-700 rounded-lg p-3 bg-slate-900/40 space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
                className: "flex items-center gap-2 text-sm text-slate-200", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    name: "fractionalEnabled",
                    checked: product.fractionalEnabled,
                    onChange: handleChange,
                    className: "form-checkbox bg-slate-600",
                    disabled: ["pieza", "servicio", "horas"].includes(product.unitOfMeasure)
                  }
                ),
                  "¿Este producto se puede vender en fracciones?",
                  ["pieza", "servicio", "horas"].includes(product.unitOfMeasure) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-amber-300", children: "(solo aplica para cajas, bolsas, litros, etc.)" })
                ]
              }),
                product.fractionalEnabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "grid grid-cols-1 md:grid-cols-3 gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "¿Cómo se venderá la fracción?" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "select",
                        {
                          name: "fractionalUnitName",
                          value: product.fractionalUnitName,
                          onChange: handleChange,
                          className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 capitalize",
                          children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecciona unidad..." }),
                            fractionalUnitOptions.map((unit) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: unit, children: unit }, unit))
                          ]
                        }
                      )
                      ]
                    }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Unidades por paquete" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "number",
                          step: "0.01",
                          min: "1",
                          name: "fractionalUnitsPerPackage",
                          value: product.fractionalUnitsPerPackage,
                          onChange: handleChange,
                          className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2"
                        }
                      )
                      ]
                    }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Precio por fracción" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "number",
                          step: "0.01",
                          name: "fractionalPrice",
                          value: product.fractionalPrice,
                          onChange: handleChange,
                          placeholder: "Calculado automáticamente",
                          className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
                        }
                      ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                        className: "text-[10px] text-slate-500 mt-1", children: [
                          "Sugerido: $",
                          ((parseFloat(product.price) || 0) / (parseFloat(product.fractionalUnitsPerPackage) || 1)).toFixed(2),
                          fractionalProfitMargin !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                            className: `ml-2 ${fractionalProfitMargin < minimumProfitMargin ? "text-amber-400" : "text-green-400"}`, children: [
                              "(Margen: ",
                              fractionalProfitMargin.toFixed(1),
                              "%)"
                            ]
                          })
                        ]
                      })
                      ]
                    })
                    ]
                  }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "grid grid-cols-1 md:grid-cols-3 gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Cajas / paquetes en stock" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "number",
                          name: "fractionalPackagesInStock",
                          value: product.fractionalPackagesInStock,
                          onChange: handleChange,
                          className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2"
                        }
                      )
                      ]
                    }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
                        className: "block text-xs text-slate-400 mb-1", children: [
                          product.fractionalUnitName || "Fracciones",
                          " adicionales"
                        ]
                      }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "number",
                          name: "fractionalPiecesRemainder",
                          value: product.fractionalPiecesRemainder,
                          onChange: handleChange,
                          className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2"
                        }
                      )
                      ]
                    }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "flex flex-col justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                        className: "text-xs text-slate-400", children: [
                          "Total actual: ",
                          (() => {
                            const units = parseFloat(product.fractionalUnitsPerPackage) || 0;
                            const packages = parseFloat(product.fractionalPackagesInStock) || 0;
                            const remainder = parseFloat(product.fractionalPiecesRemainder) || 0;
                            if (!units) return `${product.stock || "0"} unidades`;
                            const totalPieces = packages * units + remainder;
                            return `${packages} ${product.unitOfMeasure}(s) + ${remainder} ${product.fractionalUnitName || "fracciones"} (${totalPieces} piezas totales)`;
                          })()
                        ]
                      })
                    })
                    ]
                  })
                  ]
                })
              ]
            }),
              (currentProfitMargin !== null || parseFloat(product.price) === 0 && parseFloat(product.costPrice) > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: `p-2 rounded-md text-sm text-center font-semibold ${currentProfitMargin === null || currentProfitMargin < minimumProfitMargin ? "bg-amber-900/50 text-amber-300" : "bg-green-900/50 text-green-300"}`, children: [
                  currentProfitMargin !== null ? `Margen de Ganancia: ${currentProfitMargin.toFixed(1)}%` : "El precio de venta es 0.",
                  currentProfitMargin !== null && currentProfitMargin < minimumProfitMargin && ` (Mínimo: ${minimumProfitMargin}%)`
                ]
              }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "pt-2 space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
                  className: "flex items-center gap-2 cursor-pointer", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", name: "isSupply", checked: product.isSupply, onChange: handleChange, className: "form-checkbox bg-slate-600" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-slate-300", children: "Este artículo es un insumo/ingrediente (no se vende directamente)" })
                  ]
                }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
                  className: "flex items-center gap-2 cursor-pointer", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", name: "strictComboOnly", checked: product.strictComboOnly, onChange: handleChange, className: "form-checkbox bg-slate-600" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                    className: "text-sm text-slate-300", children: [
                      "Vender en combo estricto",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-500 ml-1", children: "(solo se puede vender a través de combos, no aparece en búsqueda normal)" })
                    ]
                  })
                  ]
                })
                ]
              })
            ]
          }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "flex-shrink-0 pt-4 border-t border-slate-700 mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex justify-end gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors", children: "Cancelar" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors", children: "Guardar" })
              ]
            })
          })
          ]
        })
        ]
      })
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, {
      fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}), children: isCategoryModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        CategoryManagerModal,
        {
          isOpen: isCategoryModalOpen,
          onClose: () => setIsCategoryModalOpen(false),
          onCategoriesUpdated: fetchCategories
        }
      )
    })
    ]
  });
};

export { ProductFormModal as default };
