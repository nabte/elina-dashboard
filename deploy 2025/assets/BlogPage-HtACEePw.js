import { b as reactExports, j as jsxRuntimeExports, p as platformSettingsService } from './landing-DMNKFuas.js';
import { L as LoadingSpinner } from './LoadingSpinner-Ca-1SL1h.js';

const BlogPage = () => {
  const [posts, setPosts] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      const fetchedPosts = await platformSettingsService.getBlogPosts();
      setPosts(fetchedPosts);
      setIsLoading(false);
    };
    fetchPosts();
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center mb-16", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-purple-500", children: "Blog de Ryze" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 max-w-2xl mx-auto text-lg text-slate-500 dark:text-slate-400", children: "Consejos, estrategias e ideas para dueños de negocios que quieren crecer de forma inteligente." })
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-8 lg:grid-cols-3 md:grid-cols-2", children: posts.map((post) => /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "flex flex-col overflow-hidden rounded-lg shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-transform duration-300 hover:-translate-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { className: "h-48 w-full object-cover", src: post.imageUrl, alt: post.title }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col justify-between p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: "#", className: "mt-2 block", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-slate-900 dark:text-slate-100 hover:text-sky-500 dark:hover:text-sky-400 transition-colors", children: post.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-base text-slate-500 dark:text-slate-400", children: post.excerpt })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 flex items-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-slate-500 dark:text-slate-400", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Por ",
            post.author
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-1", children: "·" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("time", { dateTime: new Date(post.publishedDate).toISOString(), children: new Date(post.publishedDate).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) })
        ] }) })
      ] })
    ] }, post.id)) }),
    posts.length === 0 && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-slate-500 py-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "No hay artículos en el blog por el momento. ¡Vuelve pronto!" }) })
  ] });
};

export { BlogPage as default };
