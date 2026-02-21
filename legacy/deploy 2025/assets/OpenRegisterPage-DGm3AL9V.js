import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { u as useAuth } from './index-B4F2XZYo.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const OpenRegisterPage = ({ onRegisterOpen }) => {
  const { employeeService } = useServices();
  const { session } = useAuth();
  const isSolopreneur = session?.organization?.subscriptionTier === "solopreneur";
  const [amount, setAmount] = reactExports.useState("");
  const [sellers, setSellers] = reactExports.useState([]);
  const [selectedSellerId, setSelectedSellerId] = reactExports.useState("");
  const [isLoadingSellers, setIsLoadingSellers] = reactExports.useState(!isSolopreneur);
  reactExports.useEffect(() => {
    if (isSolopreneur) return;
    const fetchSellers = async () => {
      setIsLoadingSellers(true);
      const sellerData = await employeeService.getAllEmployees();
      setSellers(sellerData);
      if (sellerData.length > 0) {
        setSelectedSellerId(sellerData[0].id);
      }
      setIsLoadingSellers(false);
    };
    fetchSellers();
  }, [employeeService, isSolopreneur]);
  const handleSubmit = (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    const selectedSeller = sellers.find((s) => s.id === selectedSellerId);
    if (!isNaN(numericAmount) && numericAmount >= 0 && (selectedSeller || isSolopreneur)) {
      const employee = selectedSeller || { id: session.user.id, name: session.user.email, role: "Admin", accessCode: "" };
      onRegisterOpen(numericAmount, employee);
    }
  };
  const canSubmit = () => {
    const numericAmount = parseFloat(amount);
    const sellerRequirementMet = isSolopreneur || selectedSellerId !== "";
    return !isNaN(numericAmount) && numericAmount >= 0 && sellerRequirementMet && !isLoadingSellers;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-lg p-8 space-y-6 bg-slate-800 rounded-lg shadow-lg border border-slate-700", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold text-slate-100", children: "Abrir Caja" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-slate-400", children: isSolopreneur ? "Ingresa el fondo de caja para iniciar el Punto de Venta." : "Selecciona el empleado y el fondo de caja para iniciar el Punto de Venta." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
      !isSolopreneur && sellers.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "seller-select", className: "block text-sm font-medium text-slate-300 mb-2", children: "Empleado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            id: "seller-select",
            value: selectedSellerId,
            onChange: (e) => setSelectedSellerId(e.target.value),
            className: "w-full px-3 py-3 bg-slate-900 border border-slate-600 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500",
            disabled: isLoadingSellers,
            children: isLoadingSellers ? /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Cargando empleados..." }) : sellers.map((seller) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: seller.id, children: seller.name }, seller.id))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "initial-amount", className: "block text-sm font-medium text-slate-300 mb-2", children: "Fondo de caja inicial" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400", children: "$" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "initial-amount",
              type: "number",
              value: amount,
              onChange: (e) => setAmount(e.target.value),
              placeholder: "0.00",
              className: "w-full pl-7 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-md text-slate-200 text-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "submit",
          disabled: !canSubmit(),
          className: "w-full px-4 py-3 text-lg font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed",
          children: "Abrir Caja e Iniciar POS"
        }
      )
    ] })
  ] }) });
};

export { OpenRegisterPage as default };
