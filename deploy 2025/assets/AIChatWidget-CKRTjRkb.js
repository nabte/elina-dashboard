import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';

const AIChatWidget = ({ history, onSendMessage, onClose, isLoading }) => {
  const [input, setInput] = reactExports.useState("");
  const messagesEndRef = reactExports.useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  reactExports.useEffect(scrollToBottom, [history, isLoading]);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };
  const renderMessageContent = (content) => {
    const formatted = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { dangerouslySetInnerHTML: { __html: formatted } });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed bottom-6 right-6 z-40 w-full max-w-sm h-auto max-h-[70vh] bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl flex flex-col animate-slide-in-up", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 border-b border-slate-700 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5 text-sky-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 01-1.414 1.414L12 6.414l-2.293 2.293a1 1 0 01-1.414-1.414L10 4.293m0 0a1 1 0 011.414 0L12 5.707l2.293-2.293a1 1 0 011.414 1.414L13.414 7l2.293 2.293a1 1 0 01-1.414 1.414L12 8.414l-2.293 2.293a1 1 0 01-1.414-1.414L10 7.000z" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-slate-100", children: "Asistente IA" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "text-slate-400 hover:text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M6 18L18 6M6 6l12 12" }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-grow p-4 overflow-y-auto space-y-4", children: [
      history.map((msg, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex ${msg.role === "user" ? "justify-end" : "justify-start"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `max-w-[85%] p-3 rounded-lg text-sm ${msg.role === "user" ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-200"}`, children: renderMessageContent(msg.content) }) }, index)),
      isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-start", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-slate-700 text-slate-200 text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-sky-400" }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: messagesEndRef })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "p-3 border-t border-slate-700 flex gap-2 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: input,
          onChange: (e) => setInput(e.target.value),
          placeholder: "Haz una pregunta...",
          className: "flex-grow bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500",
          disabled: isLoading
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md text-sm disabled:bg-slate-500", disabled: isLoading || !input.trim(), children: "Enviar" })
    ] })
  ] });
};

export { AIChatWidget as default };
