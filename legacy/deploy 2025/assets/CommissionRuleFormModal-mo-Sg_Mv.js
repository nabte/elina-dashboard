import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { e as useNotification } from './index-B4F2XZYo.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const CommissionRuleFormModal = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { commissionService, roleService, employeeService, inventoryService } = useServices();
  const { addNotification } = useNotification();
  const [rule, setRule] = reactExports.useState({
    name: "",
    type: "percentage_sale",
    value: 0,
    applies_to_type: "all_employees",
    applies_to_id: "",
    target_type: "all_products",
    target_id: ""
  });
  const [roles, setRoles] = reactExports.useState([]);
  const [employees, setEmployees] = reactExports.useState([]);
  const [products, setProducts] = reactExports.useState([]);
  const [categories, setCategories] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (initialData) {
      setRule(initialData);
    } else {
      setRule({ name: "", type: "percentage_sale", value: 0, applies_to_type: "all_employees", applies_to_id: "", target_type: "all_products", target_id: "" });
    }
    const fetchData = async () => {
      setRoles(await roleService.getRoles());
      setEmployees(await employeeService.getAllEmployees());
      setProducts(await inventoryService.searchInventory(""));
      setCategories(await inventoryService.getUniqueCategories());
    };
    if (isOpen) {
      fetchData();
    }
  }, [initialData, isOpen, roleService, employeeService, inventoryService]);
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const isNumberField = name === "value" || name === "quota_amount";
    setRule((prev) => {
      const val = type === "number" && isNumberField ? parseFloat(value) || 0 : value;
      const newState = { ...prev, [name]: val };
      if (name === "applies_to_type") newState.applies_to_id = "";
      if (name === "target_type") newState.target_id = "";
      return newState;
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { ...rule };
      if (!payload.quota_period) {
        delete payload.quota_amount;
      }
      if (payload.applies_to_id === "") payload.applies_to_id = void 0;
      if (payload.target_id === "") payload.target_id = void 0;
      await commissionService.saveCommissionRule(payload);
      onSuccess();
    } catch (error) {
      addNotification("Error al guardar la regla.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-2xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: initialData ? "Editar Regla" : "Nueva Regla de Comisión" }),
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
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { name: "name", value: rule.name || "", onChange: handleChange, placeholder: "Nombre de la regla (ej. 'Comisión Pinturas')", className: "w-full bg-slate-700 p-2 rounded", required: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { name: "type", value: rule.type, onChange: handleChange, className: "w-full bg-slate-700 p-2 rounded", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "percentage_sale", children: "% de Venta" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "percentage_profit", children: "% de Ganancia" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fixed_amount_per_item", children: "Monto Fijo / Unidad" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { name: "value", type: "number", value: rule.value || "", onChange: handleChange, placeholder: "Valor (ej: 5 para 5% o 10 para $10)", className: "w-full bg-slate-700 p-2 rounded", required: true, step: "0.01" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { name: "applies_to_type", value: rule.applies_to_type, onChange: handleChange, className: "w-full bg-slate-700 p-2 rounded", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all_employees", children: "Todos los Empleados" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "role", children: "Por Rol" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "employee", children: "Empleado Específico" })
        ] }),
        rule.applies_to_type === "role" && /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { name: "applies_to_id", value: rule.applies_to_id || "", onChange: handleChange, className: "w-full bg-slate-700 p-2 rounded", required: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecciona un rol..." }),
          roles.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: r.name, children: r.name }, r.id))
        ] }),
        rule.applies_to_type === "employee" && /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { name: "applies_to_id", value: rule.applies_to_id || "", onChange: handleChange, className: "w-full bg-slate-700 p-2 rounded", required: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecciona un empleado..." }),
          employees.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: e.id, children: e.name }, e.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { name: "target_type", value: rule.target_type, onChange: handleChange, className: "w-full bg-slate-700 p-2 rounded", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all_products", children: "Todos los Productos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "category", children: "Por Categoría" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "product", children: "Producto Específico" })
        ] }),
        rule.target_type === "category" && /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { name: "target_id", value: rule.target_id || "", onChange: handleChange, className: "w-full bg-slate-700 p-2 rounded", required: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecciona una categoría..." }),
          categories.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.name, children: c.name }, c.id))
        ] }),
        rule.target_type === "product" && /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { name: "target_id", value: rule.target_id || "", onChange: handleChange, className: "w-full bg-slate-700 p-2 rounded", required: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecciona un producto..." }),
          products.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.name }, p.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: !!rule.quota_period,
              onChange: (e) => {
                setRule((prev) => {
                  if (e.target.checked) {
                    return { ...prev, quota_period: "payroll_period", quota_amount: prev.quota_amount || 0 };
                  } else {
                    const { quota_amount, quota_period, ...rest } = prev;
                    return rest;
                  }
                });
              },
              className: "form-checkbox h-5 w-5 bg-slate-600 text-sky-500 rounded"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-slate-200", children: "Requerir cuota de venta mínima para aplicar esta regla" })
        ] }),
        rule.quota_period && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4 mt-2 pl-8", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm text-slate-400 block mb-1", children: "Monto de la Cuota ($)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                name: "quota_amount",
                type: "number",
                value: rule.quota_amount || "",
                onChange: handleChange,
                placeholder: "Ej: 5000",
                className: "w-full bg-slate-900 border border-slate-600 p-2 rounded",
                required: true,
                step: "0.01"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm text-slate-400 block mb-1", children: "Período de la Cuota" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: "Durante el período de nómina",
                readOnly: true,
                className: "w-full bg-slate-900 border-transparent p-2 rounded"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 rounded", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "px-4 py-2 bg-sky-600 rounded disabled:bg-slate-500", children: isLoading ? "Guardando..." : "Guardar Regla" })
      ] })
    ] })
  ] }) });
};

export { CommissionRuleFormModal as default };
