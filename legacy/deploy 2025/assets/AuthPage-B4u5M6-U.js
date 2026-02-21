import { b as reactExports, j as jsxRuntimeExports, L as Logo } from './landing-DMNKFuas.js';
import { u as useAuth, s as supabase } from './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const AuthPage = ({ onBackToLanding, initialView }) => {
  const [view, setView] = reactExports.useState(initialView || "login");
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const { signIn, authError } = useAuth();
  reactExports.useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);
  const displayError = authError || error;
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (view === "login") {
        await signIn(email, password);
      } else {
        const { data, error: error2 } = await supabase.auth.signUp({ email, password });
        if (error2) throw error2;
        if (data.user) {
          setView("signup_success");
        } else {
          throw new Error("No se pudo completar el registro. Por favor, intente de nuevo.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };
  const handlePasswordResetRequest = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error: error2 } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
        // Redirect back to the app
      });
      if (error2) throw error2;
      setView("reset_sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 transition-colors duration-300", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, { className: "h-12 w-auto" }) }) }),
    view === "signup_success" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center animate-fade-in", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-slate-800 dark:text-slate-100", children: "¡Revisa tu email para continuar!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-slate-500 dark:text-slate-400", children: [
        "Hemos enviado un enlace de confirmación a ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: email }),
        ". Haz clic en el enlace para activar tu cuenta e iniciar sesión."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setView("login"), className: "mt-6 text-sm text-sky-600 dark:text-sky-400 hover:underline", children: "← Volver a Iniciar Sesión" })
    ] }) : view === "reset_sent" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-slate-800 dark:text-slate-100", children: "Revisa tu Email" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-slate-500 dark:text-slate-400", children: [
        "Si existe una cuenta para ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: email }),
        ", hemos enviado un enlace para restablecer tu contraseña."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setView("login"), className: "mt-6 text-sm text-sky-600 dark:text-sky-400 hover:underline", children: "← Volver a Iniciar Sesión" })
    ] }) : view === "reset_request" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-500 dark:text-slate-400", children: "Ingresa tu email para restablecer tu contraseña." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handlePasswordResetRequest, className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1", children: "Email" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", id: "email", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100", required: true, autoFocus: true })
        ] }),
        displayError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-500 dark:text-red-400 text-sm", children: displayError }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "w-full px-4 py-3 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors disabled:bg-slate-500", children: isLoading ? "Enviando..." : "Enviar Enlace de Recuperación" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setView("login"), className: "text-sm text-sky-600 dark:text-sky-400 hover:underline", children: "¿Recuerdas tu contraseña? Inicia sesión" }) })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-slate-500 dark:text-slate-400", children: view === "login" ? "Inicia sesión para continuar" : "Crea una nueva cuenta" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleAuthSubmit, className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1", children: "Email" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", id: "email", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100", required: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1", children: "Contraseña" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", id: "password", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100", required: true })
        ] }),
        view === "login" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setView("reset_request"), className: "text-xs text-sky-600 dark:text-sky-400 hover:underline", children: "¿Olvidaste tu contraseña?" }) }),
        displayError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-500 dark:text-red-400 text-sm", children: displayError }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isLoading, className: "w-full px-4 py-3 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors disabled:bg-slate-500", children: isLoading ? "Cargando..." : view === "login" ? "Iniciar Sesión" : "Registrarse" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setView(view === "login" ? "signup" : "login"), className: "text-sm text-sky-600 dark:text-sky-400 hover:underline", children: view === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center mt-4 border-t border-slate-200 dark:border-slate-700 pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onBackToLanding, className: "text-sm text-slate-500 dark:text-slate-400 hover:underline", children: "← Volver a la página principal" }) })
  ] }) });
};

export { AuthPage as default };
