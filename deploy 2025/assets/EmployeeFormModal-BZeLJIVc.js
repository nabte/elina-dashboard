import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const salaryTypes = [
  { key: "fijo", label: "Fijo" },
  { key: "por_hora", label: "Por Hora" }
];
const paymentPeriods = [
  { key: "semanal", label: "Semanal" },
  { key: "quincenal", label: "Quincenal" },
  { key: "mensual", label: "Mensual" }
];
const EmployeeFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { roleService } = useServices();
  const [roles, setRoles] = reactExports.useState([]);
  const [employee, setEmployee] = reactExports.useState({
    name: "",
    role: "",
    accessCode: "",
    salaryType: "fijo",
    salaryAmount: "",
    paymentPeriod: "quincenal",
    rfc: "",
    nss: "",
    bankDetails: ""
  });
  const isEditing = !!initialData;
  reactExports.useEffect(() => {
    const fetchRoles = async () => {
      const fetchedRoles = await roleService.getRoles();
      setRoles(fetchedRoles);
      if (!initialData && fetchedRoles.length > 0) {
        setEmployee((prev) => ({ ...prev, role: fetchedRoles[0].name }));
      }
    };
    if (isOpen) {
      fetchRoles();
    }
  }, [roleService, initialData, isOpen]);
  reactExports.useEffect(() => {
    if (initialData) {
      setEmployee({
        name: initialData.name,
        role: initialData.role,
        accessCode: initialData.accessCode,
        salaryType: initialData.salaryType || "fijo",
        salaryAmount: initialData.salaryAmount?.toString() || "",
        paymentPeriod: initialData.paymentPeriod || "quincenal",
        rfc: initialData.rfc || "",
        nss: initialData.nss || "",
        bankDetails: initialData.bankDetails || ""
      });
    } else {
      setEmployee({
        name: "",
        role: roles.length > 0 ? roles[0].name : "",
        accessCode: "",
        salaryType: "fijo",
        salaryAmount: "",
        paymentPeriod: "quincenal",
        rfc: "",
        nss: "",
        bankDetails: ""
      });
    }
  }, [initialData, isOpen, roles]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmployee((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...employee,
      salaryAmount: parseFloat(employee.salaryAmount) || void 0
    };
    onSubmit(dataToSubmit);
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-2xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: isEditing ? "Editar Empleado" : "Nuevo Empleado" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 max-h-[80vh] overflow-y-auto pr-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-slate-300 mb-1", children: "Nombre Completo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "name", id: "name", value: employee.name, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "accessCode", className: "block text-sm font-medium text-slate-300 mb-1", children: "PIN de Acceso (4 dígitos)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", name: "accessCode", id: "accessCode", value: employee.accessCode, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true, pattern: "\\d{4}", title: "El código debe ser de 4 dígitos." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "role", className: "block text-sm font-medium text-slate-300 mb-1", children: "Rol" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { name: "role", id: "role", value: employee.role, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 capitalize", children: roles.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("option", { disabled: true, children: "Crea un rol en Configuración" }) : roles.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: r.name, children: r.name }, r.id)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-sky-300", children: "Información de Nómina (Opcional)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "salaryType", className: "block text-sm font-medium text-slate-300 mb-1", children: "Tipo de Salario" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { name: "salaryType", id: "salaryType", value: employee.salaryType, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 capitalize", children: salaryTypes.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t.key, children: t.label }, t.key)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "salaryAmount", className: "block text-sm font-medium text-slate-300 mb-1", children: "Monto de Salario" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", name: "salaryAmount", id: "salaryAmount", value: employee.salaryAmount, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", step: "0.01" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "paymentPeriod", className: "block text-sm font-medium text-slate-300 mb-1", children: "Periodo de Pago" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { name: "paymentPeriod", id: "paymentPeriod", value: employee.paymentPeriod, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 capitalize", children: paymentPeriods.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.key, children: p.label }, p.key)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "rfc", className: "block text-sm font-medium text-slate-300 mb-1", children: "RFC" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "rfc", id: "rfc", value: employee.rfc, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "nss", className: "block text-sm font-medium text-slate-300 mb-1", children: "NSS (Seguro Social)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "nss", id: "nss", value: employee.nss, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "bankDetails", className: "block text-sm font-medium text-slate-300 mb-1", children: "Datos Bancarios (CLABE)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "bankDetails", id: "bankDetails", value: employee.bankDetails, onChange: handleChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors", children: "Guardar" })
      ] })
    ] })
  ] }) });
};

export { EmployeeFormModal as default };
