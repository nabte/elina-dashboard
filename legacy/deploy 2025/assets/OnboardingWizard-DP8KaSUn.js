import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useAuth } from './index-B4F2XZYo.js';
import './vendor-DeEp8S9j.js';
import './supabase-vendor-DZiv2hl9.js';

const OnboardingWizard = () => {
  const { session, updateOrganizationData } = useAuth();
  const [step, setStep] = reactExports.useState(1);
  const [formData, setFormData] = reactExports.useState({
    name: session?.organization?.name || "",
    businessType: "",
    goals: "",
    challenges: "",
    adminPin: ""
  });
  const [confirmPin, setConfirmPin] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleNext = () => {
    setStep((prev) => prev + 1);
  };
  const handleBack = () => {
    setStep((prev) => prev - 1);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.adminPin.length < 4) {
      alert("El PIN de Administrador debe tener al menos 4 caracteres.");
      return;
    }
    if (formData.adminPin !== confirmPin) {
      alert("Los PINs no coinciden.");
      return;
    }
    setIsLoading(true);
    try {
      await updateOrganizationData({
        name: formData.name,
        businessType: formData.businessType,
        goals: formData.goals,
        challenges: formData.challenges,
        adminPin: formData.adminPin,
        onboardingCompleted: true
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to complete onboarding", error);
      alert("Hubo un error al guardar tu información. Por favor, intenta de nuevo.");
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-900 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-2xl p-8 space-y-6 bg-slate-800 rounded-lg shadow-lg border border-slate-700", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold text-slate-100", children: "¡Bienvenido!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-slate-400", children: "Vamos a configurar tu negocio en unos simples pasos." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-slate-700 rounded-full h-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-sky-500 h-2.5 rounded-full", style: { width: `${step / 4 * 100}%` } }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
      step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-fade-in", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-white mb-4", children: "Paso 1: Información Básica" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-slate-300 mb-2", children: "Nombre de tu Negocio" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              name: "name",
              id: "name",
              value: formData.name,
              onChange: handleChange,
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "businessType", className: "block text-sm font-medium text-slate-300 mb-2", children: "Tipo de Negocio" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              name: "businessType",
              id: "businessType",
              value: formData.businessType,
              onChange: handleChange,
              placeholder: "Ej: Ferretería, Cafetería, Consultoría",
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
              required: true
            }
          )
        ] })
      ] }),
      step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-fade-in", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-white mb-4", children: "Paso 2: Cuéntanos más (para la IA)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "goals", className: "block text-sm font-medium text-slate-300 mb-2", children: "¿Cuál es tu principal meta para los próximos 6 meses?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              name: "goals",
              id: "goals",
              rows: 3,
              value: formData.goals,
              onChange: handleChange,
              placeholder: "Ej: Aumentar mis ventas, controlar mejor mi inventario, atraer más clientes...",
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "challenges", className: "block text-sm font-medium text-slate-300 mb-2", children: "¿Cuál es tu mayor desafío actualmente?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              name: "challenges",
              id: "challenges",
              rows: 3,
              value: formData.challenges,
              onChange: handleChange,
              placeholder: "Ej: La competencia local, la falta de tiempo para administrar, el manejo de proveedores...",
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
            }
          )
        ] })
      ] }),
      step === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-fade-in", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-white mb-4", children: "Paso 3: Crea tu PIN de Administrador" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 mb-4 text-sm", children: "Este PIN se usará para autorizar acciones importantes en tu cuenta, como descuentos o gestión de empleados. ¡Guárdalo en un lugar seguro!" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "adminPin", className: "block text-sm font-medium text-slate-300 mb-2", children: "PIN de Administrador (letras y/o números)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "password",
              name: "adminPin",
              id: "adminPin",
              value: formData.adminPin,
              onChange: handleChange,
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
              minLength: 4,
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "confirmPin", className: "block text-sm font-medium text-slate-300 mb-2", children: "Confirmar PIN" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "password",
              name: "confirmPin",
              id: "confirmPin",
              value: confirmPin,
              onChange: (e) => setConfirmPin(e.target.value),
              className: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2",
              required: true
            }
          )
        ] }),
        confirmPin && formData.adminPin !== confirmPin && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm", children: "Los PINs no coinciden." })
      ] }),
      step === 4 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-fade-in text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-white mb-4", children: "¡Todo Listo!" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-300 mb-6", children: "Has completado la configuración inicial. La información que proporcionaste ayudará a nuestra IA a darte consejos más personalizados." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400", children: "Haz clic en finalizar para empezar a usar la plataforma." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between pt-4", children: [
        step > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: handleBack,
            className: "px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors",
            children: "Atrás"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto", children: [
          step < 4 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: handleNext,
              className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors",
              children: "Siguiente"
            }
          ),
          step === 4 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "submit",
              disabled: isLoading,
              className: "px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 transition-colors disabled:bg-slate-500",
              children: isLoading ? "Finalizando..." : "Finalizar y Entrar"
            }
          )
        ] })
      ] })
    ] })
  ] }) });
};

export { OnboardingWizard as default };
