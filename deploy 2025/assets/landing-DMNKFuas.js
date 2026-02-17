function _mergeNamespaces(n, m) {
	for (var i = 0; i < m.length; i++) {
		const e = m[i];
		if (typeof e !== 'string' && !Array.isArray(e)) { for (const k in e) {
			if (k !== 'default' && !(k in n)) {
				const d = Object.getOwnPropertyDescriptor(e, k);
				if (d) {
					Object.defineProperty(n, k, d.get ? d : {
						enumerable: true,
						get: () => e[k]
					});
				}
			}
		} }
	}
	return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: 'Module' }));
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && Object.keys(n).length === 1 ? n['default'] : n;
}

var jsxRuntime = {exports: {}};

var reactJsxRuntime_production = {};

/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var hasRequiredReactJsxRuntime_production;

function requireReactJsxRuntime_production () {
	if (hasRequiredReactJsxRuntime_production) return reactJsxRuntime_production;
	hasRequiredReactJsxRuntime_production = 1;
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
	  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
	function jsxProd(type, config, maybeKey) {
	  var key = null;
	  void 0 !== maybeKey && (key = "" + maybeKey);
	  void 0 !== config.key && (key = "" + config.key);
	  if ("key" in config) {
	    maybeKey = {};
	    for (var propName in config)
	      "key" !== propName && (maybeKey[propName] = config[propName]);
	  } else maybeKey = config;
	  config = maybeKey.ref;
	  return {
	    $$typeof: REACT_ELEMENT_TYPE,
	    type: type,
	    key: key,
	    ref: void 0 !== config ? config : null,
	    props: maybeKey
	  };
	}
	reactJsxRuntime_production.Fragment = REACT_FRAGMENT_TYPE;
	reactJsxRuntime_production.jsx = jsxProd;
	reactJsxRuntime_production.jsxs = jsxProd;
	return reactJsxRuntime_production;
}

var hasRequiredJsxRuntime;

function requireJsxRuntime () {
	if (hasRequiredJsxRuntime) return jsxRuntime.exports;
	hasRequiredJsxRuntime = 1;
	{
	  jsxRuntime.exports = requireReactJsxRuntime_production();
	}
	return jsxRuntime.exports;
}

var jsxRuntimeExports = requireJsxRuntime();

var react = {exports: {}};

var react_production = {};

/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var hasRequiredReact_production;

function requireReact_production () {
	if (hasRequiredReact_production) return react_production;
	hasRequiredReact_production = 1;
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
	  REACT_PORTAL_TYPE = Symbol.for("react.portal"),
	  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
	  REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
	  REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
	  REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
	  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
	  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
	  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
	  REACT_MEMO_TYPE = Symbol.for("react.memo"),
	  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
	  REACT_ACTIVITY_TYPE = Symbol.for("react.activity"),
	  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
	function getIteratorFn(maybeIterable) {
	  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
	  maybeIterable =
	    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
	    maybeIterable["@@iterator"];
	  return "function" === typeof maybeIterable ? maybeIterable : null;
	}
	var ReactNoopUpdateQueue = {
	    isMounted: function () {
	      return false;
	    },
	    enqueueForceUpdate: function () {},
	    enqueueReplaceState: function () {},
	    enqueueSetState: function () {}
	  },
	  assign = Object.assign,
	  emptyObject = {};
	function Component(props, context, updater) {
	  this.props = props;
	  this.context = context;
	  this.refs = emptyObject;
	  this.updater = updater || ReactNoopUpdateQueue;
	}
	Component.prototype.isReactComponent = {};
	Component.prototype.setState = function (partialState, callback) {
	  if (
	    "object" !== typeof partialState &&
	    "function" !== typeof partialState &&
	    null != partialState
	  )
	    throw Error(
	      "takes an object of state variables to update or a function which returns an object of state variables."
	    );
	  this.updater.enqueueSetState(this, partialState, callback, "setState");
	};
	Component.prototype.forceUpdate = function (callback) {
	  this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
	};
	function ComponentDummy() {}
	ComponentDummy.prototype = Component.prototype;
	function PureComponent(props, context, updater) {
	  this.props = props;
	  this.context = context;
	  this.refs = emptyObject;
	  this.updater = updater || ReactNoopUpdateQueue;
	}
	var pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
	pureComponentPrototype.constructor = PureComponent;
	assign(pureComponentPrototype, Component.prototype);
	pureComponentPrototype.isPureReactComponent = true;
	var isArrayImpl = Array.isArray;
	function noop() {}
	var ReactSharedInternals = { H: null, A: null, T: null, S: null },
	  hasOwnProperty = Object.prototype.hasOwnProperty;
	function ReactElement(type, key, props) {
	  var refProp = props.ref;
	  return {
	    $$typeof: REACT_ELEMENT_TYPE,
	    type: type,
	    key: key,
	    ref: void 0 !== refProp ? refProp : null,
	    props: props
	  };
	}
	function cloneAndReplaceKey(oldElement, newKey) {
	  return ReactElement(oldElement.type, newKey, oldElement.props);
	}
	function isValidElement(object) {
	  return (
	    "object" === typeof object &&
	    null !== object &&
	    object.$$typeof === REACT_ELEMENT_TYPE
	  );
	}
	function escape(key) {
	  var escaperLookup = { "=": "=0", ":": "=2" };
	  return (
	    "$" +
	    key.replace(/[=:]/g, function (match) {
	      return escaperLookup[match];
	    })
	  );
	}
	var userProvidedKeyEscapeRegex = /\/+/g;
	function getElementKey(element, index) {
	  return "object" === typeof element && null !== element && null != element.key
	    ? escape("" + element.key)
	    : index.toString(36);
	}
	function resolveThenable(thenable) {
	  switch (thenable.status) {
	    case "fulfilled":
	      return thenable.value;
	    case "rejected":
	      throw thenable.reason;
	    default:
	      switch (
	        ("string" === typeof thenable.status
	          ? thenable.then(noop, noop)
	          : ((thenable.status = "pending"),
	            thenable.then(
	              function (fulfilledValue) {
	                "pending" === thenable.status &&
	                  ((thenable.status = "fulfilled"),
	                  (thenable.value = fulfilledValue));
	              },
	              function (error) {
	                "pending" === thenable.status &&
	                  ((thenable.status = "rejected"), (thenable.reason = error));
	              }
	            )),
	        thenable.status)
	      ) {
	        case "fulfilled":
	          return thenable.value;
	        case "rejected":
	          throw thenable.reason;
	      }
	  }
	  throw thenable;
	}
	function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
	  var type = typeof children;
	  if ("undefined" === type || "boolean" === type) children = null;
	  var invokeCallback = false;
	  if (null === children) invokeCallback = true;
	  else
	    switch (type) {
	      case "bigint":
	      case "string":
	      case "number":
	        invokeCallback = true;
	        break;
	      case "object":
	        switch (children.$$typeof) {
	          case REACT_ELEMENT_TYPE:
	          case REACT_PORTAL_TYPE:
	            invokeCallback = true;
	            break;
	          case REACT_LAZY_TYPE:
	            return (
	              (invokeCallback = children._init),
	              mapIntoArray(
	                invokeCallback(children._payload),
	                array,
	                escapedPrefix,
	                nameSoFar,
	                callback
	              )
	            );
	        }
	    }
	  if (invokeCallback)
	    return (
	      (callback = callback(children)),
	      (invokeCallback =
	        "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar),
	      isArrayImpl(callback)
	        ? ((escapedPrefix = ""),
	          null != invokeCallback &&
	            (escapedPrefix =
	              invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"),
	          mapIntoArray(callback, array, escapedPrefix, "", function (c) {
	            return c;
	          }))
	        : null != callback &&
	          (isValidElement(callback) &&
	            (callback = cloneAndReplaceKey(
	              callback,
	              escapedPrefix +
	                (null == callback.key ||
	                (children && children.key === callback.key)
	                  ? ""
	                  : ("" + callback.key).replace(
	                      userProvidedKeyEscapeRegex,
	                      "$&/"
	                    ) + "/") +
	                invokeCallback
	            )),
	          array.push(callback)),
	      1
	    );
	  invokeCallback = 0;
	  var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
	  if (isArrayImpl(children))
	    for (var i = 0; i < children.length; i++)
	      (nameSoFar = children[i]),
	        (type = nextNamePrefix + getElementKey(nameSoFar, i)),
	        (invokeCallback += mapIntoArray(
	          nameSoFar,
	          array,
	          escapedPrefix,
	          type,
	          callback
	        ));
	  else if (((i = getIteratorFn(children)), "function" === typeof i))
	    for (
	      children = i.call(children), i = 0;
	      !(nameSoFar = children.next()).done;

	    )
	      (nameSoFar = nameSoFar.value),
	        (type = nextNamePrefix + getElementKey(nameSoFar, i++)),
	        (invokeCallback += mapIntoArray(
	          nameSoFar,
	          array,
	          escapedPrefix,
	          type,
	          callback
	        ));
	  else if ("object" === type) {
	    if ("function" === typeof children.then)
	      return mapIntoArray(
	        resolveThenable(children),
	        array,
	        escapedPrefix,
	        nameSoFar,
	        callback
	      );
	    array = String(children);
	    throw Error(
	      "Objects are not valid as a React child (found: " +
	        ("[object Object]" === array
	          ? "object with keys {" + Object.keys(children).join(", ") + "}"
	          : array) +
	        "). If you meant to render a collection of children, use an array instead."
	    );
	  }
	  return invokeCallback;
	}
	function mapChildren(children, func, context) {
	  if (null == children) return children;
	  var result = [],
	    count = 0;
	  mapIntoArray(children, result, "", "", function (child) {
	    return func.call(context, child, count++);
	  });
	  return result;
	}
	function lazyInitializer(payload) {
	  if (-1 === payload._status) {
	    var ctor = payload._result;
	    ctor = ctor();
	    ctor.then(
	      function (moduleObject) {
	        if (0 === payload._status || -1 === payload._status)
	          (payload._status = 1), (payload._result = moduleObject);
	      },
	      function (error) {
	        if (0 === payload._status || -1 === payload._status)
	          (payload._status = 2), (payload._result = error);
	      }
	    );
	    -1 === payload._status && ((payload._status = 0), (payload._result = ctor));
	  }
	  if (1 === payload._status) return payload._result.default;
	  throw payload._result;
	}
	var reportGlobalError =
	    "function" === typeof reportError
	      ? reportError
	      : function (error) {
	          if (
	            "object" === typeof window &&
	            "function" === typeof window.ErrorEvent
	          ) {
	            var event = new window.ErrorEvent("error", {
	              bubbles: true,
	              cancelable: true,
	              message:
	                "object" === typeof error &&
	                null !== error &&
	                "string" === typeof error.message
	                  ? String(error.message)
	                  : String(error),
	              error: error
	            });
	            if (!window.dispatchEvent(event)) return;
	          } else if (
	            "object" === typeof process &&
	            "function" === typeof process.emit
	          ) {
	            process.emit("uncaughtException", error);
	            return;
	          }
	          console.error(error);
	        },
	  Children = {
	    map: mapChildren,
	    forEach: function (children, forEachFunc, forEachContext) {
	      mapChildren(
	        children,
	        function () {
	          forEachFunc.apply(this, arguments);
	        },
	        forEachContext
	      );
	    },
	    count: function (children) {
	      var n = 0;
	      mapChildren(children, function () {
	        n++;
	      });
	      return n;
	    },
	    toArray: function (children) {
	      return (
	        mapChildren(children, function (child) {
	          return child;
	        }) || []
	      );
	    },
	    only: function (children) {
	      if (!isValidElement(children))
	        throw Error(
	          "React.Children.only expected to receive a single React element child."
	        );
	      return children;
	    }
	  };
	react_production.Activity = REACT_ACTIVITY_TYPE;
	react_production.Children = Children;
	react_production.Component = Component;
	react_production.Fragment = REACT_FRAGMENT_TYPE;
	react_production.Profiler = REACT_PROFILER_TYPE;
	react_production.PureComponent = PureComponent;
	react_production.StrictMode = REACT_STRICT_MODE_TYPE;
	react_production.Suspense = REACT_SUSPENSE_TYPE;
	react_production.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE =
	  ReactSharedInternals;
	react_production.__COMPILER_RUNTIME = {
	  __proto__: null,
	  c: function (size) {
	    return ReactSharedInternals.H.useMemoCache(size);
	  }
	};
	react_production.cache = function (fn) {
	  return function () {
	    return fn.apply(null, arguments);
	  };
	};
	react_production.cacheSignal = function () {
	  return null;
	};
	react_production.cloneElement = function (element, config, children) {
	  if (null === element || void 0 === element)
	    throw Error(
	      "The argument must be a React element, but you passed " + element + "."
	    );
	  var props = assign({}, element.props),
	    key = element.key;
	  if (null != config)
	    for (propName in (void 0 !== config.key && (key = "" + config.key), config))
	      !hasOwnProperty.call(config, propName) ||
	        "key" === propName ||
	        "__self" === propName ||
	        "__source" === propName ||
	        ("ref" === propName && void 0 === config.ref) ||
	        (props[propName] = config[propName]);
	  var propName = arguments.length - 2;
	  if (1 === propName) props.children = children;
	  else if (1 < propName) {
	    for (var childArray = Array(propName), i = 0; i < propName; i++)
	      childArray[i] = arguments[i + 2];
	    props.children = childArray;
	  }
	  return ReactElement(element.type, key, props);
	};
	react_production.createContext = function (defaultValue) {
	  defaultValue = {
	    $$typeof: REACT_CONTEXT_TYPE,
	    _currentValue: defaultValue,
	    _currentValue2: defaultValue,
	    _threadCount: 0,
	    Provider: null,
	    Consumer: null
	  };
	  defaultValue.Provider = defaultValue;
	  defaultValue.Consumer = {
	    $$typeof: REACT_CONSUMER_TYPE,
	    _context: defaultValue
	  };
	  return defaultValue;
	};
	react_production.createElement = function (type, config, children) {
	  var propName,
	    props = {},
	    key = null;
	  if (null != config)
	    for (propName in (void 0 !== config.key && (key = "" + config.key), config))
	      hasOwnProperty.call(config, propName) &&
	        "key" !== propName &&
	        "__self" !== propName &&
	        "__source" !== propName &&
	        (props[propName] = config[propName]);
	  var childrenLength = arguments.length - 2;
	  if (1 === childrenLength) props.children = children;
	  else if (1 < childrenLength) {
	    for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
	      childArray[i] = arguments[i + 2];
	    props.children = childArray;
	  }
	  if (type && type.defaultProps)
	    for (propName in ((childrenLength = type.defaultProps), childrenLength))
	      void 0 === props[propName] &&
	        (props[propName] = childrenLength[propName]);
	  return ReactElement(type, key, props);
	};
	react_production.createRef = function () {
	  return { current: null };
	};
	react_production.forwardRef = function (render) {
	  return { $$typeof: REACT_FORWARD_REF_TYPE, render: render };
	};
	react_production.isValidElement = isValidElement;
	react_production.lazy = function (ctor) {
	  return {
	    $$typeof: REACT_LAZY_TYPE,
	    _payload: { _status: -1, _result: ctor },
	    _init: lazyInitializer
	  };
	};
	react_production.memo = function (type, compare) {
	  return {
	    $$typeof: REACT_MEMO_TYPE,
	    type: type,
	    compare: void 0 === compare ? null : compare
	  };
	};
	react_production.startTransition = function (scope) {
	  var prevTransition = ReactSharedInternals.T,
	    currentTransition = {};
	  ReactSharedInternals.T = currentTransition;
	  try {
	    var returnValue = scope(),
	      onStartTransitionFinish = ReactSharedInternals.S;
	    null !== onStartTransitionFinish &&
	      onStartTransitionFinish(currentTransition, returnValue);
	    "object" === typeof returnValue &&
	      null !== returnValue &&
	      "function" === typeof returnValue.then &&
	      returnValue.then(noop, reportGlobalError);
	  } catch (error) {
	    reportGlobalError(error);
	  } finally {
	    null !== prevTransition &&
	      null !== currentTransition.types &&
	      (prevTransition.types = currentTransition.types),
	      (ReactSharedInternals.T = prevTransition);
	  }
	};
	react_production.unstable_useCacheRefresh = function () {
	  return ReactSharedInternals.H.useCacheRefresh();
	};
	react_production.use = function (usable) {
	  return ReactSharedInternals.H.use(usable);
	};
	react_production.useActionState = function (action, initialState, permalink) {
	  return ReactSharedInternals.H.useActionState(action, initialState, permalink);
	};
	react_production.useCallback = function (callback, deps) {
	  return ReactSharedInternals.H.useCallback(callback, deps);
	};
	react_production.useContext = function (Context) {
	  return ReactSharedInternals.H.useContext(Context);
	};
	react_production.useDebugValue = function () {};
	react_production.useDeferredValue = function (value, initialValue) {
	  return ReactSharedInternals.H.useDeferredValue(value, initialValue);
	};
	react_production.useEffect = function (create, deps) {
	  return ReactSharedInternals.H.useEffect(create, deps);
	};
	react_production.useEffectEvent = function (callback) {
	  return ReactSharedInternals.H.useEffectEvent(callback);
	};
	react_production.useId = function () {
	  return ReactSharedInternals.H.useId();
	};
	react_production.useImperativeHandle = function (ref, create, deps) {
	  return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
	};
	react_production.useInsertionEffect = function (create, deps) {
	  return ReactSharedInternals.H.useInsertionEffect(create, deps);
	};
	react_production.useLayoutEffect = function (create, deps) {
	  return ReactSharedInternals.H.useLayoutEffect(create, deps);
	};
	react_production.useMemo = function (create, deps) {
	  return ReactSharedInternals.H.useMemo(create, deps);
	};
	react_production.useOptimistic = function (passthrough, reducer) {
	  return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
	};
	react_production.useReducer = function (reducer, initialArg, init) {
	  return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
	};
	react_production.useRef = function (initialValue) {
	  return ReactSharedInternals.H.useRef(initialValue);
	};
	react_production.useState = function (initialState) {
	  return ReactSharedInternals.H.useState(initialState);
	};
	react_production.useSyncExternalStore = function (
	  subscribe,
	  getSnapshot,
	  getServerSnapshot
	) {
	  return ReactSharedInternals.H.useSyncExternalStore(
	    subscribe,
	    getSnapshot,
	    getServerSnapshot
	  );
	};
	react_production.useTransition = function () {
	  return ReactSharedInternals.H.useTransition();
	};
	react_production.version = "19.2.0";
	return react_production;
}

var hasRequiredReact;

function requireReact () {
	if (hasRequiredReact) return react.exports;
	hasRequiredReact = 1;
	{
	  react.exports = requireReact_production();
	}
	return react.exports;
}

var reactExports = requireReact();
const React = /*@__PURE__*/getDefaultExportFromCjs(reactExports);

const React$1 = /*#__PURE__*/_mergeNamespaces({
	__proto__: null,
	default: React
}, [reactExports]);

const ThemeContext = reactExports.createContext(void 0);
const useTheme = () => {
  const context = reactExports.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = reactExports.useState(() => {
    const storedTheme = localStorage.getItem("theme");
    return storedTheme || "dark";
  });
  reactExports.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);
  const toggleTheme = () => {
    setTheme((prevTheme) => prevTheme === "light" ? "dark" : "light");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeContext.Provider, { value: { theme, toggleTheme }, children });
};

const translations = {
  es: {
    logout: "Cerrar Sesión",
    // Nav
    navDashboard: "Dashboard",
    navPOS: "Punto de Venta",
    navReports: "Reportes",
    navManagement: "Gestión",
    navFinances: "Finanzas",
    navSettings: "Configuración",
    // Nav Dropdowns
    navReportsSales: "Ventas",
    navReportsCashier: "Caja Registradora",
    navReportsInventory: "Conteos de Inventario",
    navManagementInventory: "Productos",
    navManagementClients: "Clientes",
    navManagementEmployees: "Empleados",
    navManagementMarketing: "Marketing",
    navManagementQuotes: "Cotizaciones",
    navSettingsAddons: "Add-ons",
    // Settings Tabs
    settingsTabProfile: "Perfil de la Empresa",
    settingsTabSubscription: "Suscripción",
    settingsTabReceipt: "Ticket de Venta",
    settingsTabLoyalty: "Programa de Lealtad",
    // Subscription Page
    subscriptionTitle: "Suscripción y Facturación",
    subscriptionCurrentPlan: "Tu Plan Actual",
    subscriptionManageBilling: "Administrar Facturación",
    subscriptionChangePlan: "Cambiar de Plan",
    subscriptionConfirmTitle: "Confirmar Cambio de Plan",
    // Landing Page
    landingNavBlog: "Blog",
    landingNavLogin: "Iniciar Sesión",
    landingNavSignup: "Registrarse Gratis"
  },
  en: {
    logout: "Logout",
    // Nav
    navDashboard: "Dashboard",
    navPOS: "POS",
    navReports: "Reports",
    navManagement: "Management",
    navFinances: "Finances",
    navSettings: "Settings",
    // Nav Dropdowns
    navReportsSales: "Sales",
    navReportsCashier: "Cash Register",
    navReportsInventory: "Inventory Counts",
    navManagementInventory: "Products",
    navManagementClients: "Clients",
    navManagementEmployees: "Employees",
    navManagementMarketing: "Marketing",
    navManagementQuotes: "Quotes",
    navSettingsAddons: "Add-ons",
    // Settings Tabs
    settingsTabProfile: "Company Profile",
    settingsTabSubscription: "Subscription",
    settingsTabReceipt: "Sales Receipt",
    settingsTabLoyalty: "Loyalty Program",
    // Subscription Page
    subscriptionTitle: "Subscription & Billing",
    subscriptionCurrentPlan: "Your Current Plan",
    subscriptionManageBilling: "Manage Billing",
    subscriptionChangePlan: "Change Plan",
    subscriptionConfirmTitle: "Confirm Plan Change",
    // Landing Page
    landingNavBlog: "Blog",
    landingNavLogin: "Login",
    landingNavSignup: "Sign Up Free"
  }
};

const I18nContext = reactExports.createContext(void 0);
const useI18n = () => {
  const context = reactExports.useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};
const I18nProvider = ({ children }) => {
  const [language, setLanguage] = reactExports.useState("es");
  reactExports.useEffect(() => {
    const browserLang = navigator.language.split("-")[0];
    if (browserLang === "en") {
      setLanguage("en");
    } else {
      setLanguage("es");
    }
  }, []);
  const t = (key) => {
    return translations[language][key] || key;
  };
  const value = {
    language,
    setLanguage,
    t
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(I18nContext.Provider, { value, children });
};

const Logo = ({ className = "h-8 w-auto" }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx(
    "svg",
    {
      className: `${className} text-sky-500`,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "path",
        {
          d: "M4 18C4 18 4 17 4 16C4 13.2386 6.23858 11 9 11H15M4 6V18M15 11L19 7M15 11L12 14",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }
      )
    }
  ),
  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xl font-bold text-slate-800 dark:text-slate-100", children: "Ryze" })
] });

const MoonIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" }) });

const SunIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: "1.5", stroke: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" }) });

const ThemeToggle = ({ className = "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-full transition-colors" }) => {
  const { theme, toggleTheme } = useTheme();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      onClick: toggleTheme,
      className,
      "aria-label": "Toggle theme",
      children: theme === "light" ? /* @__PURE__ */ jsxRuntimeExports.jsx(MoonIcon, { className: "h-5 w-5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(SunIcon, { className: "h-5 w-5" })
    }
  );
};

const LanguageSwitcher = () => {
  const { language, setLanguage } = useI18n();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center text-sm font-semibold border border-slate-300 dark:border-slate-600 rounded-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => setLanguage("es"),
        className: `px-3 py-1 rounded-full transition-colors ${language === "es" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`,
        children: "ES"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => setLanguage("en"),
        className: `px-3 py-1 rounded-full transition-colors ${language === "en" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`,
        children: "EN"
      }
    )
  ] });
};

const ALL_FEATURES = [
  { key: "pos", label: "Punto de Venta (POS)" },
  { key: "inventory_management", label: "Gestión de Inventario" },
  { key: "reporting", label: "Reportes Básicos" },
  { key: "client_management", label: "Gestión de Clientes" },
  { key: "ai_assistant", label: "Asistente de IA (limitado)" },
  { key: "employee_management", label: "Gestión de Empleados" },
  { key: "multi_user", label: "Múltiples Usuarios" },
  { key: "facturacion_cfdi", label: "Facturación CFDI 4.0" },
  { key: "priority_support", label: "Soporte Prioritario" }
];
const MOCK_PLANS = [
  {
    id: "gratuito",
    name: "Gratuito",
    description: "Ideal para empezar y probar las funciones básicas.",
    priceMXN: 0,
    priceUSD: 0,
    priceMXNAnnual: 0,
    priceUSDAnnual: 0,
    isFeatured: false,
    features: ["pos", "inventory_management", "reporting", "client_management"]
  },
  {
    id: "solopreneur",
    name: "Solopreneur",
    description: "Perfecto para freelancers y negocios de una sola persona.",
    priceMXN: 299,
    priceUSD: 15,
    priceMXNAnnual: 2990,
    priceUSDAnnual: 150,
    stripeProductIdMXN: "price_1P5q8zR..._solomxn",
    // Example ID
    stripeProductIdUSD: "price_1P5q8zR..._solousd",
    // Example ID
    isFeatured: false,
    features: ["pos", "inventory_management", "reporting", "client_management", "ai_assistant"]
  },
  {
    id: "pyme",
    name: "PyME",
    description: "Para negocios que buscan control total de su operación y equipo.",
    priceMXN: 799,
    priceUSD: 40,
    priceMXNAnnual: 7990,
    priceUSDAnnual: 400,
    stripeProductIdMXN: "price_1P5q8zR..._crecmxn",
    // Example ID
    stripeProductIdUSD: "price_1P5q8zR..._crecusd",
    // Example ID
    isFeatured: true,
    features: ["pos", "inventory_management", "reporting", "client_management", "ai_assistant", "employee_management", "multi_user"]
  },
  {
    id: "empresarial",
    name: "Empresarial",
    description: "Soluciones a medida y soporte dedicado para tu empresa.",
    priceMXN: 1499,
    priceUSD: 75,
    priceMXNAnnual: 14990,
    priceUSDAnnual: 750,
    stripeProductIdMXN: "price_1P5q8zR..._empmxn",
    // Example ID
    stripeProductIdUSD: "price_1P5q8zR..._empusd",
    // Example ID
    isFeatured: false,
    features: ["pos", "inventory_management", "reporting", "client_management", "ai_assistant", "employee_management", "multi_user", "facturacion_cfdi", "priority_support"]
  }
];
const MOCK_BLOG_POSTS = [
  {
    id: "1",
    title: "5 Estrategias para Reducir Pérdidas en tu Inventario",
    excerpt: "Descubre cómo una gestión de inventario inteligente puede aumentar tu rentabilidad y evitar que pierdas dinero.",
    imageUrl: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
    author: "Equipo Ryze",
    publishedDate: /* @__PURE__ */ new Date("2024-07-15"),
    content: ""
  },
  {
    id: "2",
    title: "Cómo la IA Puede Ser tu Mejor Aliado de Negocios",
    excerpt: "La inteligencia artificial ya no es solo para grandes empresas. Aprende a usarla para tomar mejores decisiones.",
    imageUrl: "https://images.unsplash.com/photo-1620712943543-285f7267a84a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
    author: "Equipo Ryze",
    publishedDate: /* @__PURE__ */ new Date("2024-07-10"),
    content: ""
  }
];
const platformSettingsService = {
  getPlans: async () => {
    return Promise.resolve(MOCK_PLANS);
  },
  getBlogPosts: async () => {
    return Promise.resolve(MOCK_BLOG_POSTS);
  },
  getLandingPageContent: async () => {
    return Promise.resolve({
      heroImageUrl: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=2070&auto=format&fit=crop",
      howItWorksVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
      // Example URL
    });
  },
  getActiveAnnouncementsForTier: async (tier) => {
    const allAnnouncements = [
      { id: "1", message: "¡Oferta de verano! 20% de descuento en el plan Crecimiento por tiempo limitado.", type: "promo", targetTiers: ["solopreneur", "gratuito"], isActive: true }
    ];
    return allAnnouncements.filter((a) => a.isActive && (a.targetTiers === "all" || a.targetTiers.includes(tier)));
  }
};

const HeroSection = ({ onNavigateToAuth }) => {
  const [content, setContent] = reactExports.useState(null);
  reactExports.useEffect(() => {
    platformSettingsService.getLandingPageContent().then(setContent);
  }, []);
  const heroStyle = content?.heroImageUrl ? { backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.7), rgba(2, 6, 23, 0.7)), url(${content.heroImageUrl})` } : {};
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "hero", className: "relative pt-32 pb-20 sm:pt-48 sm:pb-32 text-center overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-slate-900 -z-10" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "absolute inset-0 bg-cover bg-center animate-background-pan -z-10 opacity-30",
        style: heroStyle
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-slide-in-up", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl", children: [
        "La herramienta financiera que impulsa a los ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sky-400", children: "negocios de México" }),
        "."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 max-w-3xl mx-auto text-lg text-slate-200", children: "Toma el control de tus finanzas, simplifica tu operación y crece con confianza. Ryze es el aliado que entiende los retos reales de tu negocio." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onNavigateToAuth, className: "px-8 py-4 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 text-lg transform hover:scale-105 transition-transform shadow-lg shadow-sky-500/20", children: "Comienza gratis y toma el control" }) })
    ] })
  ] });
};

const features = [
  {
    name: "Vende sin fricción",
    description: "Un Punto de Venta rápido e intuitivo que te permite enfocarte en el cliente, no en el sistema. Funciona en cualquier dispositivo.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" }) })
  },
  {
    name: "Dile adiós al stock fantasma",
    description: "Controla tu inventario en tiempo real. Recibe alertas inteligentes y optimiza tus compras para nunca perder una venta ni malgastar dinero.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" }) })
  },
  {
    name: "Reportes que entiendes",
    description: "Nuestros reportes visuales te muestran qué funciona y qué no. Obtén la visión de un analista de negocios sin tener que contratar uno.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" }) })
  },
  {
    name: "Nómina y Checador Integrados",
    description: "Calcula, gestiona y registra el pago de tus empleados de forma sencilla. El sistema genera un gasto automático para mantener tu contabilidad al día.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" }) })
  }
];
const FeaturesSection = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { id: "features", className: "py-16 sm:py-24 bg-slate-50 dark:bg-slate-800/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl", children: "La gestión de tu negocio, simplificada." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-lg text-slate-500 dark:text-slate-400", children: "Herramientas poderosas diseñadas para ser increíblemente fáciles de usar." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4", children: features.map((feature, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-slide-in-up", style: { "--animation-delay": `${index * 100}ms` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-12 w-12 rounded-md bg-sky-500 text-white", children: feature.icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-5 text-lg font-semibold text-slate-900 dark:text-white", children: feature.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-base text-slate-500 dark:text-slate-400", children: feature.description })
    ] }, feature.name)) })
  ] }) });
};

const AIAnalystSection = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { id: "ai-analyst", className: "py-16 sm:py-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-slide-in-up", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl", children: "Tu Analista de Negocios, 24/7." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-lg text-slate-500 dark:text-slate-400", children: "Contratar un gerente o un analista de datos es un lujo que pocos pequeños negocios pueden permitirse. Requiere tiempo, un sueldo elevado y la esperanza de que entiendan tu negocio a profundidad." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-4 text-lg text-slate-500 dark:text-slate-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-sky-500", children: "Ryze democratiza la inteligencia de negocios." }),
        " Nuestra IA se convierte en ese experto que trabaja para ti sin descanso, analizando tus ventas, inventario y clientes para darte recomendaciones claras y accionables que impulsan tu crecimiento."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 lg:mt-0 flex justify-center animate-slide-in-up", style: { "--animation-delay": "200ms" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-48 h-48", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-sky-500 rounded-full blur-2xl opacity-40" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", className: "relative w-full h-full text-sky-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M5 12h14M12 5l7 7-7 7" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M12 19V5", opacity: "0.4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M19 12H5", opacity: "0.4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M7 17L17 7", opacity: "0.4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M7 7l10 10", opacity: "0.4" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-8 bg-slate-800 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-12 w-12 text-white", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M13 10V3L4 14h7v7l9-11h-7z" }) }) })
    ] }) })
  ] }) }) });
};

const HowItWorksSection = ({ videoUrl }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { id: "how-it-works", className: "py-16 sm:py-24", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl", children: "Mira lo fácil que es" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-lg text-slate-500 dark:text-slate-400", children: "En menos de 5 minutos puedes tener tu negocio funcionando en nuestra plataforma." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 max-w-4xl mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "aspect-video bg-slate-200 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xl", children: videoUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "iframe",
      {
        className: "w-full h-full",
        src: videoUrl,
        title: "YouTube video player",
        frameBorder: "0",
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        allowFullScreen: true
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Video no disponible." }) }) }) })
  ] }) });
};

const testimonials = [
  {
    quote: "Ryze transformó la gestión de mi ferretería. El control de inventario y los reportes de ventas son increíblemente fáciles de usar.",
    name: "Carlos Rivas",
    role: "Dueño, Ferretería El Martillo"
  },
  {
    quote: "¡La función de asistente con IA es genial! Me ayuda a crear descripciones para mis servicios y a encontrar nuevas ideas de marketing.",
    name: "Ana Solís",
    role: "Consultora Independiente"
  },
  {
    quote: "Finalmente tengo todos mis datos en un solo lugar. El POS es rápido, y el programa de lealtad ha sido un éxito con mis clientes.",
    name: "Luisa Fernández",
    role: "Propietaria, Café Aromas"
  }
];
const TestimonialsSection = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { id: "testimonials", className: "py-16 sm:py-24 bg-slate-50 dark:bg-slate-800/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl", children: "¿Qué dicen nuestros clientes?" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 grid gap-8 md:grid-cols-3", children: testimonials.map((testimonial, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("blockquote", { className: "p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg animate-slide-in-up", style: { "--animation-delay": `${index * 150}ms` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-base text-slate-600 dark:text-slate-300", children: [
        '"',
        testimonial.quote,
        '"'
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "mt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-900 dark:text-white", children: testimonial.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: testimonial.role })
      ] })
    ] }, index)) })
  ] }) });
};

const faqs = [
  {
    question: "¿Necesito instalar algún software?",
    answer: "No. Nuestra plataforma es 100% basada en la nube. Puedes acceder desde cualquier navegador en tu computadora, tablet o smartphone."
  },
  {
    question: "¿Mis datos están seguros?",
    answer: "Absolutamente. Utilizamos encriptación de grado bancario y las mejores prácticas de seguridad para proteger toda tu información."
  },
  {
    question: "¿Puedo cancelar mi plan en cualquier momento?",
    answer: "Sí, puedes cancelar tu suscripción en cualquier momento sin penalizaciones. Seguirás teniendo acceso hasta el final de tu ciclo de facturación."
  },
  {
    question: "¿Ofrecen soporte técnico?",
    answer: "¡Por supuesto! Todos nuestros planes de pago incluyen soporte por email, y los planes superiores tienen acceso a soporte prioritario."
  }
];
const FAQSection = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { id: "faq", className: "py-16 sm:py-24", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl", children: "Preguntas Frecuentes" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 space-y-8", children: faqs.map((faq, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-slide-in-up", style: { "--animation-delay": `${index * 100}ms` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: faq.question }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-base text-slate-500 dark:text-slate-400", children: faq.answer })
    ] }, index)) })
  ] }) });
};

const PricingSection = ({ onNavigateToAuth }) => {
  const [plans, setPlans] = reactExports.useState([]);
  const [currency, setCurrency] = reactExports.useState("MXN");
  const [billingCycle, setBillingCycle] = reactExports.useState("monthly");
  reactExports.useEffect(() => {
    platformSettingsService.getPlans().then(setPlans);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { id: "pricing", className: "py-16 sm:py-24 bg-slate-50 dark:bg-slate-800/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl", children: "Un plan para cada etapa de tu negocio" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-lg text-slate-500 dark:text-slate-400", children: "Precios transparentes y sin sorpresas. Escala a tu propio ritmo." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 flex justify-center items-center gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center p-1 bg-slate-200 dark:bg-slate-700 rounded-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setBillingCycle("monthly"), className: `px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${billingCycle === "monthly" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500"}`, children: "Mensual" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setBillingCycle("annual"), className: `relative px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${billingCycle === "annual" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500"}`, children: [
          "Anual",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -top-2 -right-2 transform translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full", children: "AHORRA" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center p-1 bg-slate-200 dark:bg-slate-700 rounded-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCurrency("MXN"), className: `px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${currency === "MXN" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500"}`, children: "MXN" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCurrency("USD"), className: `px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${currency === "USD" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500"}`, children: "USD" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4", children: plans.map((plan, index) => {
      const price = currency === "MXN" ? billingCycle === "monthly" ? plan.priceMXN : plan.priceMXNAnnual : billingCycle === "monthly" ? plan.priceUSD : plan.priceUSDAnnual;
      const periodText = billingCycle === "monthly" ? "/mes" : "/año";
      let monthlyEquivalentText = null;
      if (billingCycle === "annual" && price > 0) {
        const monthlyEquivalent = price / 12;
        monthlyEquivalentText = `(equivale a $${monthlyEquivalent.toFixed(0)}/mes)`;
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border flex flex-col animate-slide-in-up ${plan.isFeatured ? "border-sky-500 scale-105" : "border-slate-200 dark:border-slate-700"}`, style: { "--animation-delay": `${index * 100}ms` }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white capitalize", children: plan.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-slate-500 dark:text-slate-400 flex-grow", children: plan.description }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-4xl font-extrabold text-slate-900 dark:text-white", children: [
            "$",
            price
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-medium text-slate-500 dark:text-slate-400", children: periodText }),
          monthlyEquivalentText && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs text-slate-400 mt-1", children: monthlyEquivalentText })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onNavigateToAuth, className: `mt-6 w-full px-4 py-2 font-semibold rounded-lg ${plan.isFeatured ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-slate-100 dark:bg-slate-700 text-sky-600 dark:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`, children: plan.id === "gratuito" ? "Empieza Gratis" : "Elige este Plan" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300", children: ALL_FEATURES.map((feature) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: `flex-shrink-0 h-5 w-5 ${plan.features.includes(feature.key) ? "text-green-500" : "text-slate-400 dark:text-slate-600"}`, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: plan.features.includes(feature.key) ? /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `ml-3 ${!plan.features.includes(feature.key) && "line-through text-slate-400 dark:text-slate-500"}`, children: feature.label })
        ] }, feature.key)) })
      ] }, plan.id);
    }) })
  ] }) });
};

const CTASection = ({ onNavigateToAuth }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "bg-sky-600 dark:bg-sky-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-extrabold text-white sm:text-4xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block", children: "¿Listo para transformar tu negocio?" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-lg leading-6 text-sky-100", children: "Únete a cientos de negocios que ya están simplificando su operación y vendiendo más." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: onNavigateToAuth,
        className: "mt-8 w-full inline-flex items-center justify-center px-6 py-4 border border-transparent rounded-md shadow-sm text-base font-bold text-sky-600 bg-white hover:bg-sky-50 sm:w-auto transition-transform transform hover:scale-105",
        children: "Empieza Gratis Ahora"
      }
    )
  ] }) });
};

const ROISection = () => {
  const rois = [
    {
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" }) }),
      value: "+15%",
      title: "Aumento de Ventas",
      description: "Con venta cruzada inteligente y un POS ágil que te ayuda a no perder oportunidades."
    },
    {
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M17 13l-5 5m0 0l-5-5m5 5V6" }) }),
      value: "-20%",
      title: "Reducción de Pérdidas",
      description: "Con alertas de stock y control de inventario preciso que evita el exceso o la falta de mercancía."
    },
    {
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
      value: "5+ hrs",
      title: "Ahorro de Tiempo Semanal",
      description: "Automatizando reportes, gestión de clientes y tareas repetitivas para que te enfoques en crecer."
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { id: "roi", className: "py-16 sm:py-24 bg-white dark:bg-slate-900", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl", children: "Una inversión que se paga sola." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-lg text-slate-500 dark:text-slate-400", children: "Ryze no es un gasto, es una herramienta diseñada para generar un retorno de inversión tangible en tu negocio." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 grid gap-8 md:grid-cols-3", children: rois.map((item, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-center animate-slide-in-up", style: { "--animation-delay": `${index * 150}ms` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-16 w-16 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-500 mx-auto", children: item.icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 text-5xl font-bold text-slate-900 dark:text-white", children: item.value }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200", children: item.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-base text-slate-500 dark:text-slate-400", children: item.description })
    ] }, index)) })
  ] }) });
};

const CFDIAddonSection = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { id: "addon-cfdi", className: "py-16 sm:py-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative p-8 md:p-12 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -top-10 -right-10 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -bottom-16 -left-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold text-sky-400 uppercase tracking-wider", children: "Complemento Opcional" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-3xl font-extrabold text-white sm:text-4xl", children: "Facturación CFDI 4.0, sin complicaciones." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-4 max-w-2xl mx-auto text-lg text-slate-300", children: [
        "En Ryze, sabemos que cada negocio es único. No todos necesitan facturar desde el inicio. Para cuidar tu cartera, ofrecemos la facturación como un complemento que activas ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-white", children: "justo cuando lo necesites" }),
        "."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-8 flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-block p-6 bg-slate-900/50 border border-slate-700 rounded-lg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-4xl font-bold text-white", children: [
          "$175 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xl font-medium text-slate-400", children: "MXN / mes" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-base text-sky-300 font-semibold", children: "100 Timbres Fiscales Incluidos" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 text-sm text-slate-400", children: "Disponible para los planes Solopreneur y PyME." })
    ] })
  ] }) }) });
};

const LandingPage = ({ onNavigate }) => {
  const [content, setContent] = reactExports.useState(null);
  const { t } = useI18n();
  reactExports.useEffect(() => {
    platformSettingsService.getLandingPageContent().then(setContent);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center h-16", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, { className: "h-8 w-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LanguageSwitcher, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onNavigate("blog"), className: "text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400", children: t("landingNavBlog") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onNavigate("auth", "login"), className: "text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400", children: t("landingNavLogin") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onNavigate("auth", "signup"), className: "px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 text-sm", children: t("landingNavSignup") })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(HeroSection, { onNavigateToAuth: () => onNavigate("auth", "signup") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FeaturesSection, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AIAnalystSection, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(HowItWorksSection, { videoUrl: content?.howItWorksVideoUrl }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TestimonialsSection, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ROISection, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PricingSection, { onNavigateToAuth: () => onNavigate("auth", "signup") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CFDIAddonSection, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FAQSection, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CTASection, { onNavigateToAuth: () => onNavigate("auth", "signup") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto py-6 px-4 text-center text-sm text-slate-500 dark:text-slate-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " Ryze. Todos los derechos reservados."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 space-x-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onNavigate("terms"), className: "hover:underline", children: "Términos y Condiciones" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onNavigate("privacy"), className: "hover:underline", children: "Política de Privacidad" })
      ] })
    ] }) })
  ] });
};

const LandingPage$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: LandingPage
}, Symbol.toStringTag, { value: 'Module' }));

export { ALL_FEATURES as A, I18nProvider as I, Logo as L, React$1 as R, ThemeProvider as T, getDefaultExportFromNamespaceIfNotNamed as a, reactExports as b, React as c, LanguageSwitcher as d, ThemeToggle as e, LandingPage$1 as f, getDefaultExportFromCjs as g, jsxRuntimeExports as j, platformSettingsService as p, requireReact as r, useI18n as u };
