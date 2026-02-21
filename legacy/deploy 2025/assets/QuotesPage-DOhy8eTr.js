import { j as jsxRuntimeExports, b as reactExports } from './landing-DMNKFuas.js';
import { u as useServices, b as usePersistentState, e as generateQuoteTerms } from './MainLayout-C0Ev0ilC.js';
import { u as useAuth, e as useNotification } from './index-B4F2XZYo.js';
import { f as formatCurrency, a as formatDate } from './formatting-BolSclPB.js';
import ClientSearchModal from './ClientSearchModal-CYGLdqnM.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import { P as PlusIcon } from './PlusIcon-Dp3X8gCD.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './ClientFormModal-CFrRxKaq.js';

const statusStyles = {
  "Borrador": "bg-slate-600 text-slate-200",
  "Enviada": "bg-sky-800 text-sky-200",
  "Aceptada": "bg-green-800 text-green-200",
  "Rechazada": "bg-red-800 text-red-200"
};
const QuotesTable = ({ quotes, isLoading, onEdit, onPrint }) => {
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando cotizaciones..." });
  }
  if (quotes.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No se han creado cotizaciones." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Folio" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Cliente" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Fecha" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Total" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Estado" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Acciones" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: quotes.map((quote) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "tr",
      {
        className: "border-b border-slate-700 hover:bg-slate-700/50",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-mono font-semibold text-slate-100", children: quote.id }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: quote.clientName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: new Date(quote.date).toLocaleDateString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-mono font-semibold text-green-300", children: formatCurrency(quote.total, "USD") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[quote.status]}`, children: quote.status }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onEdit(quote), className: "text-sky-400 hover:text-sky-300 font-medium", children: quote.status === "Borrador" ? "Editar" : "Ver" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onPrint(quote), className: "text-green-400 hover:text-green-300 font-medium", children: "Descargar" })
          ] }) })
        ]
      },
      quote.id
    )) })
  ] }) });
};

const createEmptyQuoteFormState = () => ({
  client: null,
  items: [],
  terms: "",
  status: "Borrador",
  productQuery: ""
});
const mapQuoteToFormState = (quote) => ({
  client: { id: quote.clientId, name: quote.clientName },
  items: quote.items.map((item) => ({ ...item })),
  terms: quote.terms,
  status: quote.status,
  productQuery: ""
});
const QuoteEditor = ({ onCancel, onSuccess, initialQuote }) => {
  const { quoteService, clientService, inventoryService } = useServices();
  const { session } = useAuth();
  const { addNotification } = useNotification();
  const persistenceKey = initialQuote ? `editing-quote-${initialQuote.id}` : "new-quote";
  const [quoteFormState, setQuoteFormState] = usePersistentState(persistenceKey, null);
  const derivedInitialQuoteState = reactExports.useMemo(
    () => initialQuote ? mapQuoteToFormState(initialQuote) : createEmptyQuoteFormState(),
    [initialQuote]
  );
  const formState = quoteFormState ?? derivedInitialQuoteState;
  const updateFormState = (updater) => {
    setQuoteFormState((prev) => updater(prev ?? derivedInitialQuoteState));
  };
  const [isClientModalOpen, setIsClientModalOpen] = reactExports.useState(false);
  const [productResults, setProductResults] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [isAILoading, setIsAILoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (quoteFormState === null) {
      setQuoteFormState(derivedInitialQuoteState);
    }
  }, [quoteFormState, derivedInitialQuoteState, setQuoteFormState]);
  const total = reactExports.useMemo(() => formState.items.reduce((sum, item) => sum + item.price * item.quantity, 0), [formState.items]);
  reactExports.useEffect(() => {
    const handler = setTimeout(async () => {
      if (formState.productQuery.length > 1) {
        const products = await inventoryService.searchInventory(formState.productQuery);
        setProductResults(products);
      } else {
        setProductResults([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [formState.productQuery, inventoryService]);
  const handleAddProduct = (product) => {
    setProductResults([]);
    if (formState.items.some((item) => item.id === product.id)) return;
    const newItem = {
      id: product.id,
      description: product.name,
      quantity: 1,
      price: product.price,
      isCustom: false
    };
    updateFormState((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      productQuery: ""
    }));
  };
  const handleAddCustomItem = () => {
    const newItem = {
      id: `custom-${Date.now()}`,
      description: "",
      quantity: 1,
      price: 0,
      isCustom: true
    };
    updateFormState((prev) => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };
  const handleItemChange = (itemId, field, value) => {
    updateFormState((prev) => ({
      ...prev,
      items: prev.items.map(
        (item) => item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };
  const handleRemoveItem = (itemId) => {
    updateFormState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId)
    }));
  };
  const handleSelectClient = (selectedClient) => {
    updateFormState((prev) => ({
      ...prev,
      client: selectedClient
    }));
    setIsClientModalOpen(false);
  };
  const handleGenerateTerms = async () => {
    setIsAILoading(true);
    try {
      const businessType = session?.organization?.businessType || "un negocio";
      const generatedTerms = await generateQuoteTerms(businessType);
      updateFormState((prev) => ({ ...prev, terms: generatedTerms }));
    } catch {
      addNotification("Error al generar los términos con IA.", "error");
    } finally {
      setIsAILoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.client?.name || formState.items.length === 0) {
      addNotification("Debe seleccionar un cliente y añadir al menos un producto/servicio.", "error");
      return;
    }
    setIsLoading(true);
    const validityDate = /* @__PURE__ */ new Date();
    validityDate.setDate(validityDate.getDate() + 15);
    const quoteData = {
      id: initialQuote?.id,
      clientId: formState.client?.id,
      clientName: formState.client.name,
      items: formState.items,
      subtotal: total,
      total,
      terms: formState.terms,
      status: formState.status,
      validUntil: validityDate
    };
    try {
      await quoteService.saveQuote(quoteData);
      addNotification(`Cotización ${initialQuote ? "actualizada" : "creada"} exitosamente.`, "success");
      setQuoteFormState(null);
      setProductResults([]);
      onSuccess();
    } catch (error) {
      addNotification("Error al guardar la cotización.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancel = () => {
    setQuoteFormState(null);
    setProductResults([]);
    onCancel();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100 mb-4", children: initialQuote ? `Editando Cotización ${initialQuote.id}` : "Crear Nueva Cotización" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 bg-slate-700/50 rounded-md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-2", children: "Cliente" }),
        formState.client?.id ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-sky-300", children: formState.client.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => updateFormState((prev) => ({ ...prev, client: null })), className: "text-slate-400 hover:text-red-400 text-xs", children: "Cambiar" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: formState.client?.name || "", onChange: (e) => updateFormState((prev) => ({ ...prev, client: { ...prev.client || {}, name: e.target.value } })), placeholder: "Escribe el nombre del nuevo cliente", className: "flex-grow bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "self-center", children: "ó" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setIsClientModalOpen(true), className: "px-3 py-2 bg-slate-600 text-sm font-semibold rounded hover:bg-slate-500", children: "Buscar Cliente" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300", children: "Producto o Servicio" }),
        formState.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 gap-3 items-center bg-slate-700/50 p-2 rounded-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: item.description, onChange: (e) => handleItemChange(item.id, "description", e.target.value), disabled: !item.isCustom, className: "w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm disabled:bg-slate-700 disabled:border-transparent" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: item.quantity, onChange: (e) => handleItemChange(item.id, "quantity", Number(e.target.value)), className: "w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: item.price, onChange: (e) => handleItemChange(item.id, "price", Number(e.target.value)), className: "w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-1 text-right font-mono text-sm", children: [
            "$",
            (item.quantity * item.price).toFixed(2)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-1 flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => handleRemoveItem(item.id), className: "text-red-400 hover:text-red-300", children: "×" }) })
        ] }, item.id)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-grow", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: formState.productQuery,
                onChange: (e) => updateFormState((prev) => ({ ...prev, productQuery: e.target.value })),
                placeholder: "Buscar producto de inventario...",
                className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm"
              }
            ),
            productResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto", children: productResults.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { onClick: () => handleAddProduct(p), className: "px-4 py-2 cursor-pointer hover:bg-sky-700/50 text-sm", children: p.name }, p.id)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleAddCustomItem, className: "px-3 py-2 bg-slate-600 text-sm font-semibold rounded hover:bg-slate-500", children: "Añadir Partida Manual" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "terms", className: "block text-sm font-medium text-slate-300 mb-2", children: "Términos y Condiciones" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              id: "terms",
              value: formState.terms,
              onChange: (e) => updateFormState((prev) => ({ ...prev, terms: e.target.value })),
              rows: 5,
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleGenerateTerms, disabled: isAILoading, className: "mt-2 px-3 py-1 text-xs bg-purple-600 font-semibold rounded hover:bg-purple-500 disabled:bg-slate-500", children: isAILoading ? "Generando..." : "Generar con IA" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "status", className: "block text-sm font-medium text-slate-300 mb-2", children: "Estado" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                id: "status",
                value: formState.status,
                onChange: (e) => updateFormState((prev) => ({ ...prev, status: e.target.value })),
                className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Borrador" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Enviada" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Aceptada" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Rechazada" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right p-4 bg-slate-900/50 rounded-md", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-300 font-semibold", children: "Total: " }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold font-mono text-green-400", children: formatCurrency(total, session?.organization?.currency || "USD") })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4 border-t border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleCancel, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-500", children: isLoading ? "Guardando..." : "Guardar Cotización" })
      ] })
    ] }),
    isClientModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(ClientSearchModal, { isOpen: isClientModalOpen, onClose: () => setIsClientModalOpen(false), onSelectClient: handleSelectClient })
  ] });
};

const QuotePrintPreview = ({ quote, onClose }) => {
  const { session } = useAuth();
  const organization = session?.organization;
  const handleDownloadPdf = () => {
    const input = document.querySelector(".print-content");
    if (!input) return;
    html2canvas(input, {
      scale: 2,
      // Higher resolution
      useCORS: true
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jspdf.jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / pdfWidth;
      const calculatedPdfHeight = imgHeight / ratio;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, calculatedPdfHeight);
      pdf.save(`Cotizacion-${quote.id}.pdf`);
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 bg-slate-900 z-50 overflow-y-auto print-container", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 p-4 flex justify-between items-center sticky top-0 no-print", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-white", children: "Vista Previa de Cotización" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500", children: "Cerrar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleDownloadPdf, className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500", children: "Descargar PDF" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 sm:p-8 md:p-12", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto bg-white text-gray-800 p-8 rounded-lg shadow-2xl print-content", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex justify-between items-start pb-6 border-b-2 border-gray-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm", children: [
          organization?.logoUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: organization.logoUrl, alt: "Logo", className: "max-h-20 mb-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold text-gray-900", children: organization?.name || "Mi Negocio" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: organization?.address }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: organization?.phone }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: organization?.companyEmail })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold uppercase text-gray-500", children: "Cotización" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-semibold text-gray-600 mt-2", children: [
            "Folio: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-900", children: quote.id })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-500", children: [
            "Fecha: ",
            formatDate(quote.date)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-500", children: [
            "Válido hasta: ",
            formatDate(quote.validUntil)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mt-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-gray-600", children: "COTIZACIÓN PARA:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold text-lg text-gray-900", children: quote.clientName })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "mt-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-left", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-gray-100 text-gray-600 uppercase text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-3 font-semibold", children: "Producto / Servicio" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-3 font-semibold text-center", children: "Cant." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-3 font-semibold text-right", children: "Precio Unit." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-3 font-semibold text-right", children: "Importe" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: quote.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-gray-100", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-gray-800 font-medium", children: item.description }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-center text-gray-800", children: item.quantity }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-right text-gray-800", children: formatCurrency(item.price, organization?.currency) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-right font-medium text-gray-800", children: formatCurrency(item.price * item.quantity, organization?.currency) })
        ] }, item.id)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "flex justify-end mt-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full max-w-xs space-y-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between font-bold text-lg text-gray-900 border-t-2 border-gray-200 pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Total" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatCurrency(quote.total, organization?.currency) })
      ] }) }) }),
      quote.terms && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mt-8 pt-6 border-t-2 border-gray-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-gray-600 mb-2", children: "Términos y Condiciones" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-700 whitespace-pre-wrap", children: quote.terms })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "mt-12 text-center text-xs text-gray-500", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Gracias por su preferencia." }) })
    ] }) })
  ] });
};

const QuotesPage = ({ userRole, onNavigate }) => {
  const { quoteService } = useServices();
  const { addNotification } = useNotification();
  const { requiresPin } = useAuth();
  const [quotes, setQuotes] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [view, setView] = reactExports.useState("list");
  const [editingQuote, setEditingQuote] = reactExports.useState(null);
  const [quoteToPrint, setQuoteToPrint] = reactExports.useState(null);
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "clients.manage";
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, permissionKey]);
  const fetchQuotes = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await quoteService.getQuotes();
      setQuotes(data);
    } catch (error) {
      addNotification("No se pudieron cargar las cotizaciones.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [quoteService, addNotification]);
  reactExports.useEffect(() => {
    if (view === "list" && isUnlocked) {
      fetchQuotes();
    }
  }, [view, fetchQuotes, isUnlocked]);
  const handleNewQuote = () => {
    setEditingQuote(null);
    setView("editor");
  };
  const handleEditQuote = (quote) => {
    setEditingQuote(quote);
    setView("editor");
  };
  const handleSaveSuccess = () => {
    setView("list");
    fetchQuotes();
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
  if (quoteToPrint) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(QuotePrintPreview, { quote: quoteToPrint, onClose: () => setQuoteToPrint(null) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    view === "list" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col sm:flex-row justify-between items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Gestión de Cotizaciones" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: handleNewQuote,
            className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors flex items-center gap-2 whitespace-nowrap",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(PlusIcon, { className: "h-5 w-5" }),
              "Nueva Cotización"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        QuotesTable,
        {
          quotes,
          isLoading,
          onEdit: handleEditQuote,
          onPrint: setQuoteToPrint
        }
      )
    ] }),
    view === "editor" && /* @__PURE__ */ jsxRuntimeExports.jsx(
      QuoteEditor,
      {
        onCancel: () => setView("list"),
        onSuccess: handleSaveSuccess,
        initialQuote: editingQuote
      }
    )
  ] });
};

export { QuotesPage as default };
