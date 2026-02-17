import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { u as useAuth, e as useNotification } from './index-B4F2XZYo.js';
import { f as formatCurrency } from './formatting-BolSclPB.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const RunPayrollModal = ({ isOpen, onClose, onSuccess }) => {
  const { payrollService, employeeService, timeClockService, commissionService, saleService } = useServices();
  const { session } = useAuth();
  const { addNotification } = useNotification();
  const [step, setStep] = reactExports.useState(1);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [period, setPeriod] = reactExports.useState({ start: "", end: "" });
  const [payrollItems, setPayrollItems] = reactExports.useState([]);
  const handleCalculate = async () => {
    if (!period.start || !period.end) {
      addNotification("Por favor, selecciona un período válido.", "warning");
      return;
    }
    setIsLoading(true);
    try {
      const startDate = new Date(period.start);
      const endDate = new Date(period.end);
      endDate.setHours(23, 59, 59, 999);
      const employees = await employeeService.getAllEmployees();
      const allCommissionRules = await commissionService.getCommissionRules();
      const alreadyPaidEmployees = await payrollService.getEmployeesWithPayrollInPeriod(startDate, endDate);
      const items = await Promise.all(
        employees.map(async (emp) => {
          let grossSalary = 0;
          let hoursWorked = 0;
          let minutesWorked = 0;
          let timeEntryIds = [];
          if (emp.salaryType === "por_hora") {
            const { decimalHours, totalMinutes } = await timeClockService.getApprovedHoursForPeriod(emp.id, startDate, endDate);
            hoursWorked = decimalHours;
            minutesWorked = totalMinutes;
            grossSalary = (emp.salaryAmount || 0) * decimalHours;
            timeEntryIds = await timeClockService.getApprovedTimeEntriesForPeriod(emp.id, startDate, endDate);
          } else {
            grossSalary = emp.salaryAmount || 0;
          }
          const salesInPeriod = await saleService.getSalesForEmployeeInPeriod(emp.id, startDate, endDate);
          const totalSalesAmount = salesInPeriod.reduce((sum, s) => sum + s.total, 0);
          const unpaidCommissions = await commissionService.getUnpaidCommissionsForEmployee(emp.id, startDate, endDate);
          const qualifiedCommissions = unpaidCommissions.filter((commission) => {
            const rule = allCommissionRules.find((r) => r.id === commission.commission_rule_id);
            if (!rule) return false;
            if (!rule.quota_amount || rule.quota_period !== "payroll_period") {
              return true;
            }
            return totalSalesAmount >= rule.quota_amount;
          });
          const commissionTotal = qualifiedCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
          return {
            employeeId: emp.id,
            employeeName: emp.name,
            grossSalary,
            bonuses: commissionTotal,
            // Start bonuses with commission total
            deductions: 0,
            netSalary: grossSalary + commissionTotal,
            commissions: qualifiedCommissions,
            commissionTotal,
            salaryType: emp.salaryType,
            hoursWorked: emp.salaryType === "por_hora" ? hoursWorked : void 0,
            minutesWorked: emp.salaryType === "por_hora" ? minutesWorked : void 0,
            hourlyRate: emp.salaryAmount || 0,
            timeEntryIds: emp.salaryType === "por_hora" ? timeEntryIds : void 0
          };
        })
      );
      const filteredItems = items.filter((item) => !alreadyPaidEmployees.has(item.employeeId));
      if (filteredItems.length !== items.length) {
        addNotification("Algunos empleados ya tienen una nómina en este período y fueron omitidos.", "info");
      }
      setPayrollItems(filteredItems.filter((item) => item.netSalary > 0 || item.grossSalary > 0));
      setStep(2);
    } catch (error) {
      addNotification("Error al calcular la nómina.", "error");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleItemChange = (employeeId, field, value) => {
    setPayrollItems((prev) => prev.map((item) => {
      if (item.employeeId === employeeId) {
        const updatedItem = { ...item, [field]: value };
        const bonuses = typeof updatedItem.bonuses === "string" ? parseFloat(updatedItem.bonuses) : updatedItem.bonuses;
        const deductions = typeof updatedItem.deductions === "string" ? parseFloat(updatedItem.deductions) : updatedItem.deductions;
        updatedItem.netSalary = updatedItem.grossSalary + bonuses - deductions;
        return updatedItem;
      }
      return item;
    }));
  };
  const handleHoursChange = (employeeId, value) => {
    setPayrollItems((prev) => prev.map((item) => {
      if (item.employeeId !== employeeId) return item;
      const safeHours = Number.isFinite(value) && value >= 0 ? value : 0;
      const rate = item.hourlyRate || 0;
      const newGross = rate * safeHours;
      const bonuses = typeof item.bonuses === "string" ? parseFloat(item.bonuses) : item.bonuses;
      const deductions = typeof item.deductions === "string" ? parseFloat(item.deductions) : item.deductions;
      return {
        ...item,
        hoursWorked: safeHours,
        minutesWorked: Math.round(safeHours * 60),
        grossSalary: newGross,
        netSalary: newGross + bonuses - deductions
      };
    }));
  };
  const handleConfirmRun = async () => {
    if (!session?.user) return;
    setIsLoading(true);
    const commissionsToPay = {};
    const timeEntriesToPay = {};
    payrollItems.forEach((item) => {
      commissionsToPay[item.employeeId] = item.commissions.map((c) => c.id);
      if (item.timeEntryIds && item.timeEntryIds.length > 0) {
        timeEntriesToPay[item.employeeId] = item.timeEntryIds;
      }
    });
    try {
      await payrollService.runPayroll(
        { start: new Date(period.start), end: new Date(period.end) },
        payrollItems,
        session.user.id,
        session.user.email,
        // Placeholder name
        commissionsToPay,
        timeEntriesToPay
      );
      addNotification("Nómina ejecutada y registrada como gasto exitosamente.", "success");
      onSuccess();
    } catch (error) {
      addNotification("Error al ejecutar la nómina.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const totalNetSalary = payrollItems.reduce((sum, item) => sum + item.netSalary, 0);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-4xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: "Correr Nueva Nómina" }),
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
    step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400", children: "Selecciona el período de pago. El sistema calculará los salarios y comisiones pendientes." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Fecha de Inicio" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: period.start, onChange: (e) => setPeriod((p) => ({ ...p, start: e.target.value })), className: "w-full bg-slate-700 p-2 rounded" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-slate-300 mb-1", children: "Fecha de Fin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: period.end, onChange: (e) => setPeriod((p) => ({ ...p, end: e.target.value })), className: "w-full bg-slate-700 p-2 rounded" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "px-4 py-2 bg-slate-600 rounded", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleCalculate, disabled: isLoading, className: "px-4 py-2 bg-sky-600 rounded disabled:bg-slate-500", children: isLoading ? "Calculando..." : "Calcular Nómina" })
      ] })
    ] }),
    step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-96 overflow-y-auto pr-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-2", children: "Empleado" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-2", children: "Salario Bruto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center py-2", children: "Bonos / Comisiones" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center py-2", children: "Deducciones" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-2", children: "Salario Neto" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: payrollItems.map((item) => {
          const totalMinutesHuman = item.minutesWorked ?? Math.round((item.hoursWorked ?? 0) * 60);
          const hoursPart = Math.floor(totalMinutesHuman / 60);
          const minutesPart = totalMinutesHuman % 60;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-2 font-semibold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: item.employeeName }),
              item.salaryType === "por_hora" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-xs text-slate-400 space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                  "Horas aprobadas: ",
                  hoursPart,
                  "h ",
                  minutesPart,
                  "m (",
                  item.hoursWorked?.toFixed(2) ?? "0",
                  "h) × tarifa: ",
                  formatCurrency(item.hourlyRate || 0, "USD")
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "number",
                      min: "0",
                      step: "0.25",
                      value: item.hoursWorked ?? 0,
                      onChange: (e) => handleHoursChange(item.employeeId, parseFloat(e.target.value) || 0),
                      className: "w-24 bg-slate-700 rounded px-2 py-1 text-right"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500", children: "Ajusta las horas si detectaste un error en reloj." })
                ] })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-xs text-slate-400", children: [
                "Salario fijo registrado: ",
                formatCurrency(item.hourlyRate || item.grossSalary, "USD"),
                " por periodo."
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 text-right font-mono align-top", children: formatCurrency(item.grossSalary, "USD") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: item.bonuses, onChange: (e) => handleItemChange(item.employeeId, "bonuses", parseFloat(e.target.value) || 0), className: "w-24 text-right bg-slate-700 rounded p-1" }),
              item.commissionTotal > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-purple-400 mt-1", children: [
                "Incluye $",
                item.commissionTotal.toFixed(2),
                " de comisiones"
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: item.deductions, onChange: (e) => handleItemChange(item.employeeId, "deductions", parseFloat(e.target.value) || 0), className: "w-24 text-right bg-slate-700 rounded p-1" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 text-right font-mono font-bold", children: formatCurrency(item.netSalary, "USD") })
          ] }, item.employeeId);
        }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right mt-4 p-4 bg-slate-900/50 rounded", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-300", children: "Total a Pagar: " }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-green-400 font-mono", children: formatCurrency(totalNetSalary, "USD") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4 pt-4 mt-4 border-t border-slate-600", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setStep(1), className: "px-4 py-2 bg-slate-600 rounded", children: "Atrás" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleConfirmRun, disabled: isLoading, className: "px-4 py-2 bg-green-600 rounded disabled:bg-slate-500", children: isLoading ? "Procesando..." : "Confirmar y Pagar Nómina" })
      ] })
    ] })
  ] }) });
};

const PayrollDetailModal = ({ isOpen, onClose, payrollId }) => {
  const { payrollService } = useServices();
  const [details, setDetails] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      payrollService.getPayrollWithItems(payrollId).then(setDetails).finally(() => setIsLoading(false));
    }
  }, [isOpen, payrollId, payrollService]);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-3xl m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Cargando detalles..." }) : !details ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "No se encontraron detalles." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: "Detalles de la Nómina" }),
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-slate-400 mb-4", children: [
        "Pagada el: ",
        new Date(details.payroll.paymentDate).toLocaleString()
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-96 overflow-y-auto pr-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-2", children: "Empleado" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-2", children: "Salario Bruto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-2", children: "Bonos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-2", children: "Deducciones" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-2", children: "Salario Neto" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: details.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 font-semibold", children: item.employeeName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 text-right font-mono", children: formatCurrency(item.grossSalary, "USD") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 text-right font-mono text-green-400", children: formatCurrency(item.bonuses, "USD") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 text-right font-mono text-red-400", children: formatCurrency(item.deductions, "USD") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 text-right font-mono font-bold", children: formatCurrency(item.netSalary, "USD") })
        ] }, item.id)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right mt-4 p-4 bg-slate-900/50 rounded", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-300", children: "Total Pagado: " }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-green-400 font-mono", children: formatCurrency(details.payroll.totalAmount, "USD") })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end pt-4 mt-4 border-t border-slate-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "px-4 py-2 bg-slate-600 rounded", children: "Cerrar" }) })
  ] }) });
};

const SummaryCard = ({ label, amount, currency, accent }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-4 rounded-lg border border-slate-700 bg-slate-800/70 shadow-sm ${accent ?? ""}`, children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: label }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-semibold text-slate-100 mt-1", children: formatCurrency(amount, currency) })
] });
const PerformanceDashboard = ({ currency = "MXN" }) => {
  const { commissionService } = useServices();
  const { addNotification } = useNotification();
  const today = reactExports.useMemo(() => /* @__PURE__ */ new Date(), []);
  const startOfMonth = reactExports.useMemo(() => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [startDate, setStartDate] = reactExports.useState(startOfMonth.toISOString().split("T")[0]);
  const [endDate, setEndDate] = reactExports.useState(today.toISOString().split("T")[0]);
  const [summary, setSummary] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [detailEmployee, setDetailEmployee] = reactExports.useState(null);
  const [detailEntries, setDetailEntries] = reactExports.useState([]);
  const [isDetailLoading, setIsDetailLoading] = reactExports.useState(false);
  const fetchSummary = reactExports.useCallback(async () => {
    if (!startDate || !endDate) return;
    setIsLoading(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const data = await commissionService.getCommissionPerformanceSummary(start, end);
      setSummary(data);
    } catch (error) {
      console.error(error);
      addNotification("No pudimos cargar los bonos.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, commissionService, addNotification]);
  reactExports.useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);
  const totalPaid = reactExports.useMemo(() => summary.reduce((sum, item) => sum + item.paidTotal, 0), [summary]);
  const totalPending = reactExports.useMemo(() => summary.reduce((sum, item) => sum + item.pendingTotal, 0), [summary]);
  const openDetail = async (entry) => {
    setDetailEmployee(entry);
    setDetailEntries([]);
    setIsDetailLoading(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const history = await commissionService.getCommissionHistory(entry.employeeId, start, end);
      setDetailEntries(history);
    } catch (error) {
      console.error(error);
      addNotification("No pudimos cargar el detalle de bonos.", "error");
    } finally {
      setIsDetailLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row md:items-end gap-4 justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Bonos y Desempeño" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-sm", children: "Consulta bonos ganados y pendientes por periodo." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Fecha inicio" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: startDate, onChange: (e) => setStartDate(e.target.value), className: "bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-slate-400 mb-1", children: "Fecha fin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: endDate, onChange: (e) => setEndDate(e.target.value), className: "bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryCard, { label: "Bonos pagados", amount: totalPaid, currency }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryCard, { label: "Bonos pendientes", amount: totalPending, currency }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryCard, { label: "Total periodo", amount: totalPaid + totalPending, currency })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 border border-slate-700 rounded-lg overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-slate-700 flex justify-between items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-300", children: "Empleados" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: fetchSummary, className: "px-3 py-1.5 text-xs bg-slate-700 text-white rounded-md hover:bg-slate-600", children: "Actualizar" })
      ] }),
      isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-slate-400", children: "Cargando..." }) : summary.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-slate-400", children: "No se registran bonos en este periodo." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase bg-slate-900/40 text-slate-400", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Empleado" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-right", children: "Pagados" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-right", children: "Pendientes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-right", children: "Total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-right", children: "Ventas periodo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Reglas destacadas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Acciones" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: summary.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-slate-700 hover:bg-slate-700/30", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-100", children: entry.employeeName }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500", children: [
              entry.paidCount + entry.pendingCount,
              " bonos"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right text-emerald-300 font-mono", children: formatCurrency(entry.paidTotal, currency) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right text-amber-300 font-mono", children: formatCurrency(entry.pendingTotal, currency) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-semibold font-mono text-slate-100", children: formatCurrency(entry.paidTotal + entry.pendingTotal, currency) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-mono text-slate-200", children: formatCurrency(entry.salesTotal, currency) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
              entry.ruleBreakdown.slice(0, 3).map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-2 py-0.5 text-xs rounded-full bg-slate-700/60 text-slate-200", children: [
                rule.ruleName,
                " · ",
                formatCurrency(rule.total, currency)
              ] }, rule.ruleId)),
              entry.ruleBreakdown.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-500", children: "Sin reglas activas" })
            ] }),
            entry.quotaProgress.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 space-y-1 text-xs", children: entry.quotaProgress.map((progress) => /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: progress.met ? "text-emerald-300" : "text-amber-300", children: [
              "Meta ",
              progress.ruleName,
              ": ",
              formatCurrency(progress.quotaAmount, currency),
              " · Vendió ",
              formatCurrency(progress.achieved, currency),
              " ",
              progress.met ? "(cumplido)" : `(faltan ${formatCurrency(progress.remaining, currency)})`
            ] }, `${entry.employeeId}-${progress.ruleId}`)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => openDetail(entry), className: "text-sky-400 hover:text-sky-300 text-sm font-semibold", children: "Ver detalle" }) })
        ] }, entry.employeeId)) })
      ] }) })
    ] }),
    detailEmployee && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80", onClick: () => setDetailEmployee(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-3xl m-4 rounded-xl border border-slate-700 shadow-2xl", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-slate-700 flex justify-between items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-slate-100", children: detailEmployee.employeeName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-slate-400", children: [
            "Bonos del ",
            startDate,
            " al ",
            endDate
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetailEmployee(null), className: "text-slate-400 hover:text-white", children: "×" })
      ] }),
      isDetailLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-slate-400", children: "Cargando..." }) : detailEntries.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-slate-400", children: "No hay bonos registrados." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-[70vh] overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-slate-700", children: detailEntries.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-100", children: item.ruleName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-400", children: [
            item.ticketNumber ? `Ticket #${item.ticketNumber}` : "Venta",
            " · ",
            item.createdAt.toLocaleString()
          ] }),
          item.productName && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500", children: [
            "Producto: ",
            item.productName
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-semibold px-2 py-1 rounded-full ${item.status === "paid" ? "bg-emerald-900/60 text-emerald-200" : "bg-amber-900/60 text-amber-200"}`, children: item.status === "paid" ? "Pagado" : "Pendiente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-lg", children: formatCurrency(item.amount, currency) })
        ] })
      ] }, item.id)) }) })
    ] }) })
  ] });
};

const PayrollHistoryTable = ({ payrolls, onViewDetails }) => {
  if (payrolls.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No se ha ejecutado ninguna nómina." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Fecha de Pago" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Periodo" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Empleados Pagados" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-right", children: "Monto Total" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Acciones" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: payrolls.map((payroll) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: new Date(payroll.paymentDate).toLocaleDateString() }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: `${new Date(payroll.periodStartDate).toLocaleDateString()} - ${new Date(payroll.periodEndDate).toLocaleDateString()}` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: payroll.employeeCount }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right font-mono font-semibold text-green-300", children: formatCurrency(payroll.totalAmount, "USD") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onViewDetails(payroll), className: "text-sky-400 hover:text-sky-300 font-medium", children: "Ver Detalles" }) })
    ] }, payroll.id)) })
  ] }) });
};
const PayrollPage = ({ onNavigate }) => {
  const { payrollService } = useServices();
  const { addNotification } = useNotification();
  const { requiresPin, session } = useAuth();
  const [payrolls, setPayrolls] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [isRunModalOpen, setIsRunModalOpen] = reactExports.useState(false);
  const [selectedPayroll, setSelectedPayroll] = reactExports.useState(null);
  const [activeTab, setActiveTab] = reactExports.useState("payroll");
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "payroll.manage";
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, permissionKey]);
  const fetchPayrolls = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await payrollService.getPayrolls();
      setPayrolls(data);
    } catch (error) {
      addNotification("Error al cargar el historial de nóminas.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [payrollService, addNotification]);
  reactExports.useEffect(() => {
    if (isUnlocked) {
      fetchPayrolls();
    }
  }, [fetchPayrolls, isUnlocked]);
  const handleRunSuccess = () => {
    setIsRunModalOpen(false);
    fetchPayrolls();
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6 space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Nómina y Bonos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-sm", children: "Consulta pagos anteriores o revisa los bonos ganados por tu equipo." })
        ] }),
        activeTab === "payroll" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setIsRunModalOpen(true),
            className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors flex items-center gap-2 whitespace-nowrap",
            children: "+ Correr Nueva Nómina"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 border-b border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setActiveTab("payroll"),
            className: `px-4 py-2 text-sm font-semibold rounded-t-md ${activeTab === "payroll" ? "bg-slate-800 text-white border border-slate-700 border-b-slate-800" : "text-slate-400 hover:text-white"}`,
            children: "Nómina"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setActiveTab("performance"),
            className: `px-4 py-2 text-sm font-semibold rounded-t-md ${activeTab === "performance" ? "bg-slate-800 text-white border border-slate-700 border-b-slate-800" : "text-slate-400 hover:text-white"}`,
            children: "Bonos y Desempeño"
          }
        )
      ] })
    ] }),
    activeTab === "payroll" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-400", children: "Cargando historial..." }) : /* @__PURE__ */ jsxRuntimeExports.jsx(PayrollHistoryTable, { payrolls, onViewDetails: setSelectedPayroll }),
      isRunModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        RunPayrollModal,
        {
          isOpen: isRunModalOpen,
          onClose: () => setIsRunModalOpen(false),
          onSuccess: handleRunSuccess
        }
      ),
      selectedPayroll && /* @__PURE__ */ jsxRuntimeExports.jsx(
        PayrollDetailModal,
        {
          isOpen: !!selectedPayroll,
          onClose: () => setSelectedPayroll(null),
          payrollId: selectedPayroll.id
        }
      )
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(PerformanceDashboard, { currency: session?.organization?.currency || "MXN" })
  ] });
};

export { PayrollPage as default };
