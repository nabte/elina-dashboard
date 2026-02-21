import { j as jsxRuntimeExports, b as reactExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { u as useAuth, e as useNotification } from './index-B4F2XZYo.js';
import ConfirmationModal from './ConfirmationModal-D0s46AqS.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const ExpenseTable = ({ expenses, isLoading, onEdit, onDelete, currency }) => {
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 text-slate-400", children: "Cargando gastos..." });
  }
  if (expenses.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center p-8 bg-slate-800 rounded-lg border border-slate-700 text-slate-400", children: "No se han registrado gastos." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-slate-800 rounded-lg border border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs text-slate-400 uppercase bg-slate-900/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Fecha" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Descripción" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3", children: "Registrado por" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-right", children: "Monto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-6 py-3 text-center", children: "Acciones" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: expenses.map((expense) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-slate-700 hover:bg-slate-700/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: new Date(expense.date).toLocaleDateString() }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-semibold", children: expense.description }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: expense.employeeName }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4 text-right font-mono text-red-400", children: [
        "- ",
        new Intl.NumberFormat("en-US", { style: "currency", currency }).format(expense.amount)
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onEdit(expense), className: "text-sky-400 hover:text-sky-300 font-medium", children: "Editar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onDelete(expense), className: "text-red-400 hover:text-red-300 font-medium", children: "Eliminar" })
      ] }) })
    ] }, expense.id)) })
  ] }) });
};

const paymentMethodOptions = [
  { key: "efectivo_caja", label: "Efectivo de Caja" },
  { key: "tarjeta_empresa", label: "Tarjeta de la Empresa" },
  { key: "transferencia", label: "Transferencia Bancaria" },
  { key: "otro", label: "Otro" }
];
const ExpenseFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [expense, setExpense] = reactExports.useState({
    date: /* @__PURE__ */ new Date(),
    description: "",
    amount: "",
    paymentMethod: "efectivo_caja"
  });
  const isEditing = !!initialData;
  reactExports.useEffect(() => {
    if (initialData) {
      setExpense({
        date: new Date(initialData.date),
        description: initialData.description,
        amount: initialData.amount.toString(),
        paymentMethod: initialData.paymentMethod || "efectivo_caja"
      });
    } else {
      setExpense({ date: /* @__PURE__ */ new Date(), description: "", amount: "", paymentMethod: "efectivo_caja" });
    }
  }, [initialData, isOpen]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setExpense((prev) => ({ ...prev, [name]: value }));
  };
  const handleDateChange = (e) => {
    const date = new Date(e.target.value);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    setExpense((prev) => ({ ...prev, date }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(expense.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("El monto debe ser un número positivo.");
      return;
    }
    onSubmit({ ...expense, amount: numericAmount });
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-lg m-4 p-6 rounded-xl shadow-2xl border border-slate-700", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-100", children: isEditing ? "Editar Gasto" : "Nuevo Gasto" }),
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "description", className: "block text-sm font-medium text-slate-300 mb-1", children: "Descripción" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", name: "description", id: "description", value: expense.description, onChange: handleChange, placeholder: "Ej: Comida, Transporte, Papelería", className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "amount", className: "block text-sm font-medium text-slate-300 mb-1", children: "Monto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", name: "amount", id: "amount", value: expense.amount, onChange: handleChange, min: "0.01", step: "0.01", className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "date", className: "block text-sm font-medium text-slate-300 mb-1", children: "Fecha" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", name: "date", id: "date", value: expense.date.toISOString().split("T")[0], onChange: handleDateChange, className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2", required: true })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "paymentMethod", className: "block text-sm font-medium text-slate-300 mb-1", children: "Método de Pago" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            name: "paymentMethod",
            id: "paymentMethod",
            value: expense.paymentMethod,
            onChange: handleChange,
            className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
            children: paymentMethodOptions.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: opt.key, children: opt.label }, opt.key))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors", children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors", children: "Guardar" })
      ] })
    ] })
  ] }) });
};

const ExpensesPage = ({ subscriptionTier }) => {
  const { expenseService } = useServices();
  const { session } = useAuth();
  const { addNotification } = useNotification();
  const [expenses, setExpenses] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [isFormOpen, setIsFormOpen] = reactExports.useState(false);
  const [editingExpense, setEditingExpense] = reactExports.useState(null);
  const [expenseToDelete, setExpenseToDelete] = reactExports.useState(null);
  const fetchExpenses = reactExports.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await expenseService.getAllExpenses();
      setExpenses(data);
    } catch (error) {
      addNotification("Error al cargar los gastos.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [expenseService, addNotification]);
  reactExports.useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);
  const handleSave = async (data) => {
    if (!session) return;
    try {
      const employeeId = session.user.id;
      const employeeName = session.user.email;
      if (editingExpense) {
        await expenseService.updateExpense({ ...data, id: editingExpense.id, employeeId, employeeName });
        addNotification("Gasto actualizado.", "success");
      } else {
        await expenseService.addExpense({ ...data, employeeId, employeeName });
        addNotification("Gasto registrado.", "success");
      }
      setIsFormOpen(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (error) {
      addNotification("Error al guardar el gasto.", "error");
    }
  };
  const handleDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await expenseService.deleteExpense(expenseToDelete.id);
      addNotification("Gasto eliminado.", "success");
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (error) {
      addNotification("Error al eliminar el gasto.", "error");
    }
  };
  const currency = session?.organization?.currency || "USD";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col sm:flex-row justify-between items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-100", children: "Registro de Gastos" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            setEditingExpense(null);
            setIsFormOpen(true);
          },
          className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors",
          children: "+ Nuevo Gasto"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ExpenseTable,
      {
        expenses,
        isLoading,
        onEdit: (exp) => {
          setEditingExpense(exp);
          setIsFormOpen(true);
        },
        onDelete: setExpenseToDelete,
        currency
      }
    ),
    isFormOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ExpenseFormModal,
      {
        isOpen: isFormOpen,
        onClose: () => setIsFormOpen(false),
        onSubmit: handleSave,
        initialData: editingExpense
      }
    ),
    expenseToDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: !!expenseToDelete,
        onClose: () => setExpenseToDelete(null),
        onConfirm: handleDelete,
        title: "Confirmar Eliminación",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          '¿Seguro que quieres eliminar el gasto: "',
          expenseToDelete.description,
          '"?'
        ] })
      }
    )
  ] });
};

export { ExpensesPage as default };
