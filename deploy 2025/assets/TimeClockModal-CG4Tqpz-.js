const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/AuthorizationModal-BKtBOwJR.js","assets/landing-DMNKFuas.js","assets/index-B4F2XZYo.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css"])))=>i.map(i=>d[i]);
import { u as useAuth, e as useNotification, _ as __vitePreload } from './index-B4F2XZYo.js';
import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

const AuthorizationModal = reactExports.lazy(() => __vitePreload(() => import('./AuthorizationModal-BKtBOwJR.js'),true              ?__vite__mapDeps([0,1,2,3,4,5]):void 0));
const TimeClockModal = ({ isOpen, onClose }) => {
  const { employeeService, timeClockService } = useServices();
  const { session } = useAuth();
  const { addNotification } = useNotification();
  const [isVerified, setIsVerified] = reactExports.useState(false);
  const [employees, setEmployees] = reactExports.useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = reactExports.useState("");
  const [currentStatus, setCurrentStatus] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const fetchEmployees = async () => {
      const allEmployees = await employeeService.getAllEmployees();
      setEmployees(allEmployees);
      if (allEmployees.length > 0) {
        setSelectedEmployeeId(allEmployees[0].id);
      }
    };
    if (isVerified) {
      fetchEmployees();
    }
  }, [isVerified, employeeService]);
  reactExports.useEffect(() => {
    const checkStatus = async () => {
      if (selectedEmployeeId) {
        const status = await timeClockService.getEmployeeStatus(selectedEmployeeId);
        setCurrentStatus(status);
      }
    };
    if (isVerified) {
      checkStatus();
    }
  }, [selectedEmployeeId, isVerified, timeClockService]);
  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      await timeClockService.checkIn(selectedEmployeeId);
      const status = await timeClockService.getEmployeeStatus(selectedEmployeeId);
      setCurrentStatus(status);
      addNotification(`${employees.find((e) => e.id === selectedEmployeeId)?.name} ha registrado su entrada.`, "success");
    } catch (error) {
      addNotification("Error al registrar la entrada.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      await timeClockService.checkOut(selectedEmployeeId);
      const status = await timeClockService.getEmployeeStatus(selectedEmployeeId);
      setCurrentStatus(status);
      addNotification(`${employees.find((e) => e.id === selectedEmployeeId)?.name} ha registrado su salida.`, "success");
    } catch (error) {
      addNotification("Error al registrar la salida.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  if (!isOpen) return null;
  if (!isVerified) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      AuthorizationModal,
      {
        isOpen: true,
        onClose,
        onSuccess: () => setIsVerified(true),
        permissionRequired: "timeclock.manage"
      }
    ) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-md m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Checador de Horas" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Empleado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            value: selectedEmployeeId,
            onChange: (e) => setSelectedEmployeeId(e.target.value),
            className: "w-full bg-slate-700 p-2 rounded",
            children: employees.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: e.id, children: e.name }, e.id))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 bg-slate-900/50 rounded-md text-center text-sm", children: currentStatus ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-green-400", children: [
        "Entrada registrada a las ",
        currentStatus.checkInTime.toLocaleTimeString()
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400", children: "Actualmente fuera" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleCheckIn,
            disabled: isLoading || !!currentStatus,
            className: "w-full py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed",
            children: "Registrar Entrada"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleCheckOut,
            disabled: isLoading || !currentStatus,
            className: "w-full py-3 bg-red-600 text-white font-bold rounded-md hover:bg-red-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed",
            children: "Registrar Salida"
          }
        )
      ] })
    ] })
  ] }) });
};

export { TimeClockModal as default };
