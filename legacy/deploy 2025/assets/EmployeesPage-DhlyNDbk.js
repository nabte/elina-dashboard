const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/EmployeeFormModal-BZeLJIVc.js","assets/landing-DMNKFuas.js","assets/MainLayout-C0Ev0ilC.js","assets/index-B4F2XZYo.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css","assets/inventoryCountService-Bo8nZII3.js","assets/SettingsIcon-DbPfflvT.js","assets/ConfirmationModal-D0s46AqS.js"])))=>i.map(i=>d[i]);
import { e as useNotification, u as useAuth, _ as __vitePreload } from './index-B4F2XZYo.js';
import { j as jsxRuntimeExports, b as reactExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const EmployeeTable = ({ employees, isLoading, onEdit, onDelete }) => {
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando empleados..." });
  }
  if (employees.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No se encontraron empleados." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Nombre" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Rol" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Acciones" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: employees.map((employee) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: employee.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 capitalize", children: employee.role }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onEdit(employee), className: "text-sky-400 hover:text-sky-300 font-medium", children: "Editar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onDelete(employee), className: "text-red-400 hover:text-red-300 font-medium", children: "Eliminar" })
      ] }) })
    ] }, employee.id)) })
  ] }) });
};

const EmployeeFormModal = reactExports.lazy(() => __vitePreload(() => import('./EmployeeFormModal-BZeLJIVc.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8]):void 0));
const ConfirmationModal = reactExports.lazy(() => __vitePreload(() => import('./ConfirmationModal-D0s46AqS.js'),true              ?__vite__mapDeps([9,1]):void 0));
const EmployeesPage = ({ onNavigate }) => {
  const { employeeService } = useServices();
  const { addNotification } = useNotification();
  const { requiresPin, hasPermission } = useAuth();
  const [employees, setEmployees] = reactExports.useState(null);
  const isLoading = employees === null;
  const [isFormOpen, setIsFormOpen] = reactExports.useState(false);
  const [editingEmployee, setEditingEmployee] = reactExports.useState(null);
  const [employeeToDelete, setEmployeeToDelete] = reactExports.useState(null);
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "employees.manage";
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey) || hasPermission(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, hasPermission, permissionKey]);
  const fetchEmployees = reactExports.useCallback(async () => {
    try {
      const data = await employeeService.getAllEmployees();
      setEmployees(data);
    } catch (error) {
      addNotification("Error al cargar los empleados.", "error");
      setEmployees([]);
    }
  }, [employeeService, addNotification]);
  reactExports.useEffect(() => {
    if (isUnlocked) {
      fetchEmployees();
    }
  }, [fetchEmployees, isUnlocked]);
  const handleSave = async (data) => {
    try {
      if (editingEmployee) {
        await employeeService.updateEmployee({ ...data, id: editingEmployee.id });
        addNotification("Empleado actualizado.", "success");
      } else {
        await employeeService.addEmployee(data);
        addNotification("Empleado creado.", "success");
      }
      setIsFormOpen(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      addNotification(`Error: ${message}`, "error");
    }
  };
  const handleDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await employeeService.deleteEmployee(employeeToDelete.id);
      addNotification("Empleado eliminado.", "success");
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (error) {
      addNotification("Error al eliminar el empleado.", "error");
    }
  };
  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };
  const handleOpenEdit = (employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col sm:flex-row justify-between items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Gestión de Empleados" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: handleOpenAdd,
          className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500",
          children: "+ Nuevo Empleado"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      EmployeeTable,
      {
        employees: employees || [],
        isLoading,
        onEdit: handleOpenEdit,
        onDelete: setEmployeeToDelete
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}), children: [
      isFormOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        EmployeeFormModal,
        {
          isOpen: isFormOpen,
          onClose: () => setIsFormOpen(false),
          onSubmit: handleSave,
          initialData: editingEmployee
        }
      ),
      employeeToDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ConfirmationModal,
        {
          isOpen: !!employeeToDelete,
          onClose: () => setEmployeeToDelete(null),
          onConfirm: handleDelete,
          title: "Confirmar Eliminación",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            '¿Seguro que quieres eliminar al empleado "',
            employeeToDelete.name,
            '"?'
          ] })
        }
      )
    ] })
  ] });
};

export { EmployeesPage as default };
