import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { e as useNotification, u as useAuth } from './index-B4F2XZYo.js';
import { D as DateRangePickerModal } from './DateRangePickerModal-C8t1skse.js';
import AuthorizationModal from './AuthorizationModal-BKtBOwJR.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const TimeClockManagerPage = ({ onNavigate }) => {
  const { timeClockService } = useServices();
  const { addNotification } = useNotification();
  const { requiresPin } = useAuth();
  const [entries, setEntries] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const getDefaultDateRange = () => {
    const today = /* @__PURE__ */ new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: firstDayOfMonth,
      end: today
    };
  };
  const [dateRange, setDateRange] = reactExports.useState(getDefaultDateRange());
  const [isPickerOpen, setIsPickerOpen] = reactExports.useState(false);
  const [editingEntry, setEditingEntry] = reactExports.useState(null);
  const [editForm, setEditForm] = reactExports.useState({
    checkIn: "",
    checkOut: "",
    status: "approved",
    notes: ""
  });
  const [isUnlocked, setIsUnlocked] = reactExports.useState(false);
  const permissionKey = "timeclock.manage";
  reactExports.useEffect(() => {
    if (!requiresPin(permissionKey)) {
      setIsUnlocked(true);
    }
  }, [requiresPin, permissionKey]);
  const fetchEntries = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const closedCount = await timeClockService.autoCloseStaleEntries();
      if (closedCount > 0) {
        addNotification(`${closedCount} registro(s) de entrada abiertos por más de 24h han sido cerrados automáticamente. Por favor, revísalos.`, "warning");
      }
      const data = await timeClockService.getTimeEntries({ startDate: dateRange.start, endDate: dateRange.end });
      const entryIds = data.map((e) => e.id);
      const paidEntryIds = await timeClockService.getPaidEntryIds(entryIds);
      const entriesWithPaidStatus = data.map((entry) => ({
        ...entry,
        isPaid: paidEntryIds.has(entry.id)
      }));
      setEntries(entriesWithPaidStatus);
    } catch (error) {
      addNotification("Error al cargar los registros.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [timeClockService, addNotification, dateRange]);
  reactExports.useEffect(() => {
    if (isUnlocked) {
      fetchEntries();
    }
  }, [fetchEntries, isUnlocked]);
  const handleUpdateStatus = async (entryId, status) => {
    try {
      await timeClockService.updateEntryStatus(entryId, status);
      addNotification(`Registro ${status === "approved" ? "aprobado" : "rechazado"}.`, "success");
      fetchEntries();
    } catch (error) {
      addNotification("Error al actualizar el registro.", "error");
    }
  };
  const formatDuration = (minutes) => {
    if (minutes === void 0 || minutes === null) return "N/A";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };
  const statusStyles = {
    pending: "bg-amber-800 text-amber-200",
    approved: "bg-green-800 text-green-200",
    rejected: "bg-red-800 text-red-200"
  };
  const getStatusDisplay = (entry) => {
    if (entry.isPaid) {
      return { text: "Pagado", style: "bg-blue-800 text-blue-200" };
    }
    return { text: entry.status, style: statusStyles[entry.status] };
  };
  const editTotalMinutes = reactExports.useMemo(() => {
    if (!editForm.checkIn || !editForm.checkOut) return null;
    const start = new Date(editForm.checkIn);
    const end = new Date(editForm.checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
    return Math.ceil((end.getTime() - start.getTime()) / (1e3 * 60));
  }, [editForm.checkIn, editForm.checkOut]);
  const openEditModal = (entry) => {
    if (!entry.checkOutTime) {
      addNotification("Este registro a��n no tiene hora de salida para ajustar.", "warning");
      return;
    }
    const toInputValue = (date) => {
      const pad = (n) => `${n}`.padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };
    setEditingEntry(entry);
    setEditForm({
      checkIn: toInputValue(entry.checkInTime),
      checkOut: toInputValue(entry.checkOutTime),
      status: entry.status,
      notes: entry.managerNotes || ""
    });
  };
  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    if (!editForm.checkIn || !editForm.checkOut) {
      addNotification("Debes indicar las horas de entrada y salida.", "warning");
      return;
    }
    const start = new Date(editForm.checkIn);
    const end = new Date(editForm.checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      addNotification("La hora de salida debe ser posterior a la hora de entrada.", "warning");
      return;
    }
    try {
      await timeClockService.adjustEntry(editingEntry.id, {
        checkInTime: start,
        checkOutTime: end,
        status: editForm.status,
        managerNotes: editForm.notes
      });
      addNotification("Registro actualizado.", "success");
      setEditingEntry(null);
      fetchEntries();
    } catch (error) {
      console.error(error);
      addNotification("No se pudo actualizar el registro. Intenta de nuevo.", "error");
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col sm:flex-row justify-between items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Aprobación de Horas" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsPickerOpen(true), className: "px-4 py-2 bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-500 text-sm", children: `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}` })
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Cargando..." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Empleado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Entrada" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3", children: "Salida" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Duración" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Estado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-center", children: "Acciones" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: entries.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: entry.employeeName }),
          entry.managerNotes && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-400", children: entry.managerNotes })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: entry.checkInTime.toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: entry.checkOutTime?.toLocaleString() || "Aún activo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center font-mono", children: formatDuration(entry.totalMinutes) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: (() => {
          const statusDisplay = getStatusDisplay(entry);
          return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 py-1 text-xs font-semibold rounded-full ${statusDisplay.style}`, children: statusDisplay.text });
        })() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap justify-center gap-2", children: [
          entry.status === "pending" && entry.checkOutTime && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleUpdateStatus(entry.id, "approved"), className: "px-2 py-1 text-xs bg-green-600 rounded", children: "Aprobar" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleUpdateStatus(entry.id, "rejected"), className: "px-2 py-1 text-xs bg-red-600 rounded", children: "Rechazar" })
          ] }),
          entry.checkOutTime && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => openEditModal(entry), className: "px-2 py-1 text-xs bg-slate-600 rounded", children: "Ajustar" })
        ] }) })
      ] }, entry.id)) })
    ] }) }),
    isPickerOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      DateRangePickerModal,
      {
        isOpen: isPickerOpen,
        onClose: () => setIsPickerOpen(false),
        onApply: (start, end) => setDateRange({ start, end })
      }
    ),
    editingEntry && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-lg font-semibold text-slate-100", children: [
          "Ajustar horas · ",
          editingEntry.employeeName
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setEditingEntry(null),
            className: "text-slate-400 hover:text-slate-200 transition-colors",
            "aria-label": "Cerrar",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "h-6 w-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-sm text-slate-300 flex flex-col gap-1", children: [
          "Hora de entrada",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "datetime-local",
              value: editForm.checkIn,
              onChange: (e) => setEditForm((prev) => ({ ...prev, checkIn: e.target.value })),
              className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-sm text-slate-300 flex flex-col gap-1", children: [
          "Hora de salida",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "datetime-local",
              value: editForm.checkOut,
              onChange: (e) => setEditForm((prev) => ({ ...prev, checkOut: e.target.value })),
              className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-sm text-slate-300 flex flex-col gap-1", children: [
          "Estado",
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: editForm.status,
              onChange: (e) => setEditForm((prev) => ({ ...prev, status: e.target.value })),
              className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-slate-100",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "approved", children: "Aprobado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "rejected", children: "Rechazado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pending", children: "Pendiente" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-sm text-slate-300 flex flex-col gap-1", children: [
          "Notas del manager",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              rows: 3,
              value: editForm.notes,
              onChange: (e) => setEditForm((prev) => ({ ...prev, notes: e.target.value })),
              className: "w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-slate-100",
              placeholder: "Motivo de ajuste o comentario para la nómina"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-slate-400", children: [
          "Duración calculada: ",
          editTotalMinutes ? `${Math.floor(editTotalMinutes / 60)}h ${editTotalMinutes % 60}m` : "N/A"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditingEntry(null), className: "px-4 py-2 bg-slate-700 rounded-md text-slate-200 hover:bg-slate-600", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleSaveEdit, className: "px-4 py-2 bg-emerald-600 rounded-md text-white hover:bg-emerald-500", children: "Guardar ajuste" })
      ] })
    ] }) })
  ] });
};

export { TimeClockManagerPage as default };
