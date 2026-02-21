import { b as reactExports, j as jsxRuntimeExports, L as Logo } from './landing-DMNKFuas.js';
import { s as supabase } from './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const ResetPasswordPage = ({ onResetSuccess }) => {
  const [password, setPassword] = reactExports.useState("");
  const [confirmPassword, setConfirmPassword] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const [success, setSuccess] = reactExports.useState(false);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const { error: error2 } = await supabase.auth.updateUser({ password });
      if (error2) throw error2;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
    } finally {
      setIsLoading(false);
    }
  };
  if (success) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-md p-8 text-center bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-slate-900 dark:text-slate-100", children: "¡Éxito!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-slate-600 dark:text-slate-300", children: "Tu contraseña ha sido actualizada correctamente." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onResetSuccess, className: "mt-6 w-full px-4 py-3 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700", children: "Continuar a Iniciar Sesión" })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, { className: "h-12 w-auto" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-slate-500 dark:text-slate-400", children: "Establece tu nueva contraseña" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1", children: "Nueva Contraseña" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", id: "password", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md px-3 py-2", required: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "confirmPassword", className: "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1", children: "Confirmar Nueva Contraseña" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", id: "confirmPassword", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: "w-full bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md px-3 py-2", required: true })
      ] }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-500 dark:text-red-400 text-sm", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "w-full px-4 py-3 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors disabled:bg-slate-500", children: isLoading ? "Actualizando..." : "Actualizar Contraseña" })
    ] })
  ] }) });
};

export { ResetPasswordPage as default };
