import { j as jsxRuntimeExports, b as reactExports } from './landing-DMNKFuas.js';

const CloseIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z", clipRule: "evenodd" }) });

const InfoIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z", clipRule: "evenodd" }) });

const CrossSellSuggestion = ({ suggestion, onDismiss }) => {
  const [exiting, setExiting] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 8e3);
    return () => clearTimeout(timer);
  }, [suggestion]);
  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  };
  const animationClass = exiting ? "animate-toast-out" : "animate-toast-in";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `z-20 ${animationClass}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-purple-800/90 backdrop-blur-sm border border-purple-600 rounded-lg shadow-lg p-3 flex items-center justify-between gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoIcon, { className: "h-5 w-5 text-purple-300 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-purple-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Sugerencia:" }),
        " ",
        suggestion
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleDismiss, className: "text-purple-300 hover:text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { className: "h-5 w-5" }) })
  ] }) });
};

export { CrossSellSuggestion as default };
