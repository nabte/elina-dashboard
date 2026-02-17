import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useAuth } from './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const AuthorizationModal = ({
  isOpen,
  onClose,
  onSuccess,
  permissionRequired,
  isForSessionStart = false
}) => {
  const { checkPinPermission } = useAuth();
  const [accessCode, setAccessCode] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const inputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setAccessCode("");
      setError(null);
    }
  }, [isOpen]);
  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { employee, isAuthorized } = await checkPinPermission(accessCode, permissionRequired);
      if (isAuthorized && employee) {
        onSuccess(employee);
      } else {
        setError("PIN incorrecto o sin permisos suficientes.");
        setAccessCode("");
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    } catch (err) {
      setError("Ocurrió un error al verificar la autorización.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!isLoading && accessCode) {
      handleConfirm();
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 w-full max-w-sm m-4 p-8 rounded-xl shadow-2xl border border-slate-700", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-center text-white flex-1", children: "Autorización Requerida" }),
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
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-400 mb-6", children: isForSessionStart ? "Ingresa tu PIN de empleado para iniciar." : "Se requiere un PIN con los permisos adecuados para continuar." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleFormSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "access-code", className: "sr-only", children: "PIN de Acceso" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: inputRef,
            id: "access-code",
            type: "password",
            value: accessCode,
            onChange: (e) => setAccessCode(e.target.value),
            placeholder: "****",
            className: "w-full text-center px-4 py-3 bg-slate-900 border border-slate-600 rounded-md text-slate-100 text-3xl tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500"
          }
        )
      ] }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm text-center", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "w-full px-4 py-3 font-semibold text-slate-200 bg-slate-600/80 rounded-md hover:bg-slate-600 transition-colors",
            children: "Cancelar"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            disabled: isLoading || !accessCode,
            className: `w-full px-4 py-3 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed`,
            children: isLoading ? "Verificando..." : "Autorizar"
          }
        )
      ] })
    ] })
  ] }) });
};

export { AuthorizationModal as default };
