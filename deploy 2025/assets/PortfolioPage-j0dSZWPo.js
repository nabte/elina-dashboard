const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/MainLayout-C0Ev0ilC.js","assets/index-B4F2XZYo.js","assets/landing-DMNKFuas.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css","assets/inventoryCountService-Bo8nZII3.js","assets/SettingsIcon-DbPfflvT.js"])))=>i.map(i=>d[i]);
import { e as useNotification, u as useAuth, _ as __vitePreload } from './index-B4F2XZYo.js';
import { b as reactExports, j as jsxRuntimeExports } from './landing-DMNKFuas.js';
import { u as useServices } from './MainLayout-C0Ev0ilC.js';
import { R as ResponsiveContainer, P as PieChart, d as Pie, C as Cell, T as Tooltip, L as Legend, A as AreaChart, e as CartesianGrid, X as XAxis, Y as YAxis, f as Area } from './vendor-DeEp8S9j.js';
import ConfirmationModal from './ConfirmationModal-D0s46AqS.js';
import './supabase-vendor-DZiv2hl9.js';
import './inventoryCountService-Bo8nZII3.js';
import './SettingsIcon-DbPfflvT.js';

var AssetCategory = /* @__PURE__ */ ((AssetCategory2) => {
  AssetCategory2["MARKET"] = "Mercado (Bolsa/Cripto/Fibras)";
  AssetCategory2["FIXED_INCOME"] = "Deuda / Plazo Fijo";
  AssetCategory2["EQUIPMENT"] = "Equipo / Rentas";
  return AssetCategory2;
})(AssetCategory || {});
var AssetType = /* @__PURE__ */ ((AssetType2) => {
  AssetType2["STOCK_US"] = "Acción (EE.UU.)";
  AssetType2["STOCK_MX"] = "Acción (México)";
  AssetType2["CRYPTO"] = "Criptomoneda";
  AssetType2["ETF"] = "ETF";
  AssetType2["FIBRA"] = "FIBRA / REIT";
  AssetType2["DEBT"] = "Deuda / Bonos";
  AssetType2["EQUIPMENT"] = "Equipo / Maquinaria";
  AssetType2["REAL_ESTATE"] = "Bienes Raíces (Físico)";
  return AssetType2;
})(AssetType || {});

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);
const toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
const mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
const hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
};

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Icon = reactExports.forwardRef(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => reactExports.createElement(
    "svg",
    {
      ref,
      ...defaultAttributes,
      width: size,
      height: size,
      stroke: color,
      strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
      className: mergeClasses("lucide", className),
      ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
      ...rest
    },
    [
      ...iconNode.map(([tag, attrs]) => reactExports.createElement(tag, attrs)),
      ...Array.isArray(children) ? children : [children]
    ]
  )
);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const createLucideIcon = (iconName, iconNode) => {
  const Component = reactExports.forwardRef(
    ({ className, ...props }, ref) => reactExports.createElement(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className
      ),
      ...props
    })
  );
  Component.displayName = toPascalCase(iconName);
  return Component;
};

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$u = [
  [
    "path",
    {
      d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
      key: "169zse"
    }
  ]
];
const Activity = createLucideIcon("activity", __iconNode$u);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$t = [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
];
const ArrowDown = createLucideIcon("arrow-down", __iconNode$t);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$s = [
  ["path", { d: "m5 12 7-7 7 7", key: "hav0vg" }],
  ["path", { d: "M12 19V5", key: "x0mq9r" }]
];
const ArrowUp = createLucideIcon("arrow-up", __iconNode$s);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$r = [
  [
    "path",
    {
      d: "m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",
      key: "1yiouv"
    }
  ],
  ["circle", { cx: "12", cy: "8", r: "6", key: "1vp47v" }]
];
const Award = createLucideIcon("award", __iconNode$r);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$q = [
  ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0", key: "vwvbt9" }],
  [
    "path",
    {
      d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
      key: "11g9vi"
    }
  ]
];
const Bell = createLucideIcon("bell", __iconNode$q);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$p = [
  ["path", { d: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", key: "jecpp" }],
  ["rect", { width: "20", height: "14", x: "2", y: "6", rx: "2", key: "i6l2r4" }]
];
const Briefcase = createLucideIcon("briefcase", __iconNode$p);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$o = [
  ["path", { d: "M10 12h4", key: "a56b0p" }],
  ["path", { d: "M10 8h4", key: "1sr2af" }],
  ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3", key: "1rgiei" }],
  [
    "path",
    {
      d: "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2",
      key: "secmi2"
    }
  ],
  ["path", { d: "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16", key: "16ra0t" }]
];
const Building2 = createLucideIcon("building-2", __iconNode$o);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$n = [
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
  ["path", { d: "M3 10h18", key: "8toen8" }]
];
const Calendar = createLucideIcon("calendar", __iconNode$n);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$m = [
  [
    "path",
    {
      d: "M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",
      key: "18u6gg"
    }
  ],
  ["circle", { cx: "12", cy: "13", r: "3", key: "1vg3eu" }]
];
const Camera = createLucideIcon("camera", __iconNode$m);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$l = [
  ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335", key: "yps3ct" }],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }]
];
const CircleCheckBig = createLucideIcon("circle-check-big", __iconNode$l);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$k = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
];
const CircleCheck = createLucideIcon("circle-check", __iconNode$k);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$j = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M8 12h8", key: "1wcyev" }],
  ["path", { d: "M12 8v8", key: "napkw2" }]
];
const CirclePlus = createLucideIcon("circle-plus", __iconNode$j);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$i = [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
];
const Database = createLucideIcon("database", __iconNode$i);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$h = [
  ["line", { x1: "12", x2: "12", y1: "2", y2: "22", key: "7eqyqh" }],
  ["path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", key: "1b0p4s" }]
];
const DollarSign = createLucideIcon("dollar-sign", __iconNode$h);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$g = [
  [
    "path",
    {
      d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
      key: "ct8e1f"
    }
  ],
  ["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242", key: "151rxh" }],
  [
    "path",
    {
      d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
      key: "13bj9a"
    }
  ],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }]
];
const EyeOff = createLucideIcon("eye-off", __iconNode$g);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$f = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Eye = createLucideIcon("eye", __iconNode$f);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$e = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]];
const LoaderCircle = createLucideIcon("loader-circle", __iconNode$e);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$d = [
  [
    "path",
    {
      d: "M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z",
      key: "1piglc"
    }
  ],
  ["path", { d: "M16 10h.01", key: "1m94wz" }],
  ["path", { d: "M2 8v1a2 2 0 0 0 2 2h1", key: "1env43" }]
];
const PiggyBank = createLucideIcon("piggy-bank", __iconNode$d);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$c = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
];
const Plus = createLucideIcon("plus", __iconNode$c);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$b = [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
];
const RefreshCw = createLucideIcon("refresh-cw", __iconNode$b);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$a = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
const Search = createLucideIcon("search", __iconNode$a);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$9 = [
  [
    "path",
    {
      d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
      key: "1s2grr"
    }
  ],
  ["path", { d: "M20 2v4", key: "1rf3ol" }],
  ["path", { d: "M22 4h-4", key: "gwowj6" }],
  ["circle", { cx: "4", cy: "20", r: "2", key: "6kqj1y" }]
];
const Sparkles = createLucideIcon("sparkles", __iconNode$9);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$8 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
];
const Target = createLucideIcon("target", __iconNode$8);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$7 = [
  ["path", { d: "M10 11v6", key: "nco0om" }],
  ["path", { d: "M14 11v6", key: "outv1u" }],
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" }],
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }]
];
const Trash2 = createLucideIcon("trash-2", __iconNode$7);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$6 = [
  ["path", { d: "M16 17h6v-6", key: "t6n2it" }],
  ["path", { d: "m22 17-8.5-8.5-5 5L2 7", key: "x473p" }]
];
const TrendingDown = createLucideIcon("trending-down", __iconNode$6);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$5 = [
  ["path", { d: "M16 7h6v6", key: "box55l" }],
  ["path", { d: "m22 7-8.5 8.5-5-5L2 17", key: "1t1m79" }]
];
const TrendingUp = createLucideIcon("trending-up", __iconNode$5);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$4 = [
  ["path", { d: "M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978", key: "1n3hpd" }],
  ["path", { d: "M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978", key: "rfe1zi" }],
  ["path", { d: "M18 9h1.5a1 1 0 0 0 0-5H18", key: "7xy6bh" }],
  ["path", { d: "M4 22h16", key: "57wxv0" }],
  ["path", { d: "M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z", key: "1mhfuq" }],
  ["path", { d: "M6 9H4.5a1 1 0 0 1 0-5H6", key: "tex48p" }]
];
const Trophy = createLucideIcon("trophy", __iconNode$4);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$3 = [
  [
    "path",
    {
      d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",
      key: "18etb6"
    }
  ],
  ["path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4", key: "xoc0q4" }]
];
const Wallet = createLucideIcon("wallet", __iconNode$3);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$2 = [
  [
    "path",
    {
      d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",
      key: "1ngwbx"
    }
  ]
];
const Wrench = createLucideIcon("wrench", __iconNode$2);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$1 = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
];
const X = createLucideIcon("x", __iconNode$1);

/**
 * @license lucide-react v0.555.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode = [
  [
    "path",
    {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
      key: "1xq2db"
    }
  ]
];
const Zap = createLucideIcon("zap", __iconNode);

const RANKS = [
  { limit: 0, title: "Novato", color: "text-slate-400" },
  { limit: 1e4, title: "Ahorrador", color: "text-blue-400" },
  { limit: 5e4, title: "Inversionista", color: "text-sky-400" },
  { limit: 2e5, title: "Lobo de Wall St.", color: "text-purple-400" },
  { limit: 1e6, title: "Ballena 🐋", color: "text-amber-400" }
];
const SummaryCards = ({ summary, isLoading, privacyMode }) => {
  const formatCurrency = (val) => {
    if (privacyMode) return "****";
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };
  const plColor = summary.totalPL >= 0 ? "text-green-400" : "text-red-400";
  const PLIcon = summary.totalPL >= 0 ? TrendingUp : TrendingDown;
  const currentRank = RANKS.slice().reverse().find((r) => summary.totalValue >= r.limit) || RANKS[0];
  const nextRank = RANKS.find((r) => r.limit > summary.totalValue);
  let progress = 100;
  if (nextRank) {
    const prevLimit = RANKS[RANKS.indexOf(nextRank) - 1]?.limit || 0;
    const range = nextRank.limit - prevLimit;
    const current = summary.totalValue - prevLimit;
    progress = Math.min(100, Math.max(0, current / range * 100));
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2 bg-slate-900 p-6 rounded-xl shadow-[0_0_15px_rgba(14,165,233,0.15)] border border-sky-500/30 relative overflow-hidden group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Wallet, { size: 80, className: "text-sky-500" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -bottom-10 -left-10 w-32 h-32 bg-sky-500/20 rounded-full blur-3xl" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sky-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 14, className: "mr-1" }),
            " Patrimonio Total"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-4xl font-black tracking-tight mt-2 ${isLoading ? "animate-pulse text-slate-600" : "text-white"}`, children: isLoading ? "Calculando..." : formatCurrency(summary.totalValue) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-end z-10", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 ${currentRank.color}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Award, { size: 14 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold uppercase", children: currentRank.title })
          ] }),
          nextRank && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 w-32 text-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-slate-800 rounded-full h-1.5 mb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-gradient-to-r from-sky-500 to-cyan-500 h-1.5 rounded-full transition-all duration-1000", style: { width: `${progress}%` } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500", children: privacyMode ? "Meta Oculta" : `Prox: ${formatCurrency(nextRank.limit)}` })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 hover:border-slate-600 transition-colors", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-slate-400 text-xs font-bold uppercase tracking-widest", children: "Capital Invertido" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { size: 20, className: "text-slate-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-3xl font-black ${isLoading ? "animate-pulse text-slate-600" : "text-white"}`, children: isLoading ? "---" : formatCurrency(summary.totalInvested) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `bg-slate-800 p-6 rounded-xl shadow-lg border ${summary.totalPL >= 0 ? "border-green-500/30" : "border-red-500/30"} hover:border-opacity-50 transition-colors`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-slate-400 text-xs font-bold uppercase tracking-widest", children: "Ganancia / Pérdida" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PLIcon, { size: 20, className: plColor }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-3xl font-black ${plColor}`, children: isLoading ? "---" : formatCurrency(summary.totalPL) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-xs font-bold mt-1 ${plColor}`, children: isLoading ? "" : `${summary.totalPLPercent >= 0 ? "+" : ""}${summary.totalPLPercent.toFixed(2)}%` })
        ] })
      ] })
    ] })
  ] });
};

const AssetList = ({ assets, onDelete, onAnalyze, onOpenAction, privacyMode }) => {
  const formatCurrency = (val) => {
    if (val === void 0) return "---";
    if (privacyMode) return "****";
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };
  const categories = [AssetCategory.MARKET, AssetCategory.FIXED_INCOME, AssetCategory.EQUIPMENT];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-8", children: categories.map((cat) => {
    const catAssets = assets.filter((a) => a.category === cat);
    if (catAssets.length === 0) return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center space-x-2", children: [
        cat === AssetCategory.MARKET && /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { size: 18, className: "text-sky-400" }),
        cat === AssetCategory.FIXED_INCOME && /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { size: 18, className: "text-cyan-400" }),
        cat === AssetCategory.EQUIPMENT && /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 18, className: "text-amber-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-white uppercase tracking-wider text-sm", children: cat })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto custom-scrollbar", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-left text-slate-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-slate-900 text-slate-500 text-[10px] uppercase font-bold tracking-widest", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-4", children: "Activo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-4", children: "Datos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-4", children: "Costo Base" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-4", children: cat === AssetCategory.MARKET ? "Precio Actual" : cat === AssetCategory.EQUIPMENT ? "Val. Actual" : "Rendimiento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-4", children: "Valor Total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-4", children: cat === AssetCategory.EQUIPMENT ? "ROI / Net" : "P/L Total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-4 text-right", children: "Acciones" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-slate-800", children: catAssets.map((asset) => {
          const isProfit = (asset.profitAndLoss || 0) >= 0;
          if (cat === AssetCategory.EQUIPMENT) {
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-slate-800/50 transition-colors group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-white text-sm", children: asset.symbol }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-amber-500 uppercase mt-1", children: [
                  "Depreciación: ",
                  asset.depreciationRate,
                  "%/año"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-slate-300 flex items-center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-16 text-[10px] uppercase text-slate-500", children: "Usos:" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono font-bold", children: asset.usageCount || 0 })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-slate-300 flex items-center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-16 text-[10px] uppercase text-slate-500", children: "Ingreso:" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-green-400", children: [
                    "+",
                    formatCurrency(asset.totalRevenue || 0)
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-slate-300 flex items-center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-16 text-[10px] uppercase text-slate-500", children: "Mant.:" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-red-400", children: [
                    "-",
                    formatCurrency(asset.maintenanceCost || 0)
                  ] })
                ] })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-slate-400 font-mono text-sm", children: formatCurrency(asset.buyPrice * asset.quantity) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-mono text-sm text-slate-400", children: formatCurrency(asset.currentValue) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-bold text-white font-mono text-sm", children: formatCurrency(asset.currentValue) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-bold font-mono text-sm ${(asset.netRoi || 0) >= 0 ? "text-green-400" : "text-red-400"}`, children: [
                  (asset.netRoi || 0) >= 0 ? "+" : "",
                  formatCurrency(asset.netRoi)
                ] }),
                asset.breakEvenCount && asset.breakEvenCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-500 mt-1", children: [
                  "Faltan ",
                  asset.breakEvenCount,
                  " usos para recuperar"
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-green-500 mt-1 font-bold", children: "¡Rentable! 🚀" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end space-x-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    onClick: () => onOpenAction && onOpenAction(asset, "USAGE"),
                    className: "p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-slate-900 rounded transition-colors flex items-center text-xs font-bold",
                    title: "Registrar Uso/Producción",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Briefcase, { size: 14, className: "mr-1" }),
                      " Uso"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => onOpenAction && onOpenAction(asset, "MAINTENANCE"),
                    className: "p-2 bg-slate-800 hover:bg-amber-500 text-slate-400 hover:text-slate-900 rounded transition-colors",
                    title: "Registrar Mantenimiento",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { size: 14 })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => onDelete(asset.id),
                    className: "p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14 })
                  }
                )
              ] }) })
            ] }, asset.id);
          }
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-slate-800/50 transition-colors group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-white group-hover:text-sky-400 transition-colors", children: asset.symbol }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-slate-500 uppercase", children: asset.type })
                ] }),
                cat === AssetCategory.MARKET && onAnalyze && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => onAnalyze(asset),
                    className: "ml-2 p-1.5 bg-slate-800 hover:bg-sky-500/20 hover:text-sky-400 rounded-lg text-slate-500 transition-all opacity-0 group-hover:opacity-100",
                    title: "Analizar IA",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 12 })
                  }
                )
              ] }),
              asset.yieldRate ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-sky-500/10 text-sky-400 mt-1 border border-sky-500/20", children: [
                asset.yieldRate,
                "% Yield"
              ] }) : cat === AssetCategory.MARKET && asset.type === AssetType.FIBRA ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => onAnalyze && onAnalyze(asset), className: "text-[10px] text-sky-500 hover:text-sky-300 hover:underline mt-1 flex items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 10, className: "mr-1" }),
                " Buscar Div."
              ] }) : null
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-mono text-sm", children: privacyMode ? "****" : asset.quantity }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-slate-400 font-mono text-sm", children: formatCurrency(asset.buyPrice * asset.quantity) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-mono text-sm", children: cat === AssetCategory.FIXED_INCOME ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-green-400 text-xs", children: [
              "+",
              formatCurrency(asset.estimatedAnnualIncome),
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-600", children: "/año" })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-cyan-300", children: formatCurrency(asset.currentPrice) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 font-bold text-white font-mono text-sm", children: formatCurrency(asset.currentValue) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center ${isProfit ? "text-green-400" : "text-red-400"}`, children: [
              isProfit ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { size: 14, className: "mr-1" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { size: 14, className: "mr-1" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-sm font-mono", children: formatCurrency(asset.profitAndLoss) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => onDelete(asset.id),
                className: "text-slate-600 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded",
                title: "Eliminar",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 16 })
              }
            ) })
          ] }, asset.id);
        }) })
      ] }) })
    ] }, cat);
  }) });
};

const COLORS = ["#10b981", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1", "#d946ef"];
const PortfolioCharts = ({ data, totalValue }) => {
  const allocationData = data.filter((item) => (item.currentValue || 0) > 0).map((item) => ({
    name: item.symbol,
    value: item.currentValue || 0
  }));
  const generateMockHistory = () => {
    if (totalValue === 0) return [];
    const history = [];
    let currentValue = totalValue * 0.8;
    const days = 365;
    const step = 7;
    for (let i = days; i >= 0; i -= step) {
      const date = /* @__PURE__ */ new Date();
      date.setDate(date.getDate() - i);
      const volatility = totalValue * 0.02;
      const change = (Math.random() - 0.45) * volatility;
      currentValue += change;
      if (currentValue < 0) currentValue = 0;
      history.push({
        date: date.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }),
        fullDate: date.toLocaleDateString("es-MX"),
        value: currentValue
      });
    }
    history[history.length - 1].value = totalValue;
    return history;
  };
  const historyData = generateMockHistory();
  if (totalValue === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-900 p-6 rounded-xl border border-slate-800 h-80 flex items-center justify-center text-slate-600 font-mono uppercase tracking-widest", children: "Sin Datos" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-900 p-6 rounded-xl border border-slate-800 h-80 flex items-center justify-center text-slate-600 font-mono uppercase tracking-widest", children: "Sin Datos" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 hover:border-slate-700 transition-all", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white font-bold mb-4 uppercase tracking-widest text-xs text-emerald-400", children: "Distribución" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-64 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PieChart, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Pie,
          {
            data: allocationData,
            cx: "50%",
            cy: "50%",
            innerRadius: 60,
            outerRadius: 80,
            paddingAngle: 5,
            dataKey: "value",
            stroke: "none",
            children: allocationData.map((entry, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${index}`))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Tooltip,
          {
            formatter: (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value),
            contentStyle: { backgroundColor: "#020617", borderColor: "#334155", color: "#fff", borderRadius: "8px" },
            itemStyle: { color: "#10b981" }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Legend, { verticalAlign: "bottom", height: 36 })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 hover:border-slate-700 transition-all", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white font-bold uppercase tracking-widest text-xs text-emerald-400", children: "Tendencia Anual" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800", children: "SIMULACIÓN" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-64 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AreaChart, { data: historyData, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("defs", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", { id: "colorValue", x1: "0", y1: "0", x2: "0", y2: "1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "5%", stopColor: "#10b981", stopOpacity: 0.3 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "95%", stopColor: "#10b981", stopOpacity: 0 })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1e293b", vertical: false }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "date", stroke: "#475569", tick: { fontSize: 10 }, minTickGap: 30, axisLine: false, tickLine: false }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { hide: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Tooltip,
          {
            contentStyle: { backgroundColor: "#020617", borderColor: "#334155", color: "#fff", borderRadius: "8px" },
            formatter: (value) => [new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value), "Valor"],
            labelFormatter: (label, payload) => payload[0]?.payload?.fullDate || label
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Area, { type: "monotone", dataKey: "value", stroke: "#10b981", strokeWidth: 2, fillOpacity: 1, fill: "url(#colorValue)" })
      ] }) }) })
    ] })
  ] });
};

const GoalsPanel = ({ goals, totalPortfolioValue, onAddGoal, onDeleteGoal, onAddFunds, privacyMode }) => {
  const [isAdding, setIsAdding] = reactExports.useState(false);
  const [newGoalTitle, setNewGoalTitle] = reactExports.useState("");
  const [newGoalTarget, setNewGoalTarget] = reactExports.useState("");
  const [isLinkedToTotal, setIsLinkedToTotal] = reactExports.useState(false);
  const [isSaving, setIsSaving] = reactExports.useState(false);
  const [fundingGoalId, setFundingGoalId] = reactExports.useState(null);
  const [fundAmount, setFundAmount] = reactExports.useState("");
  const formatCurrency = (val) => {
    if (privacyMode) return "****";
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(val);
  };
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newGoalTitle || !newGoalTarget) return;
    setIsSaving(true);
    try {
      await onAddGoal({
        title: newGoalTitle,
        targetAmount: parseFloat(newGoalTarget),
        linkedToTotal: isLinkedToTotal,
        currentSaved: isLinkedToTotal ? 0 : 0,
        deadline: void 0
      });
      setNewGoalTitle("");
      setNewGoalTarget("");
      setIsLinkedToTotal(false);
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding goal:", error);
    } finally {
      setIsSaving(false);
    }
  };
  const handleFundingSubmit = async (e) => {
    e.preventDefault();
    if (fundingGoalId && fundAmount) {
      try {
        await onAddFunds(fundingGoalId, parseFloat(fundAmount));
        setFundingGoalId(null);
        setFundAmount("");
      } catch (error) {
        console.error("Error adding funds:", error);
      }
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg mb-8 relative overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 right-0 p-6 opacity-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { size: 100, className: "text-emerald-500" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-4 relative z-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { size: 14, className: "mr-2" }),
        " Metas & Misiones"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setIsAdding(!isAdding),
          className: "text-xs bg-slate-800 hover:bg-emerald-500 hover:text-slate-900 text-emerald-400 px-3 py-1 rounded border border-emerald-500/30 transition-all font-bold",
          children: isAdding ? "Cancelar" : "+ Nueva Misión"
        }
      )
    ] }),
    isAdding && /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleAdd, className: "mb-6 bg-slate-800/80 backdrop-blur p-4 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-2 relative z-20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "Nombre de la Meta (ej. Lente 24mm)",
            value: newGoalTitle,
            onChange: (e) => setNewGoalTitle(e.target.value),
            className: "bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none",
            autoFocus: true,
            required: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            step: "any",
            placeholder: "Monto Objetivo ($)",
            value: newGoalTarget,
            onChange: (e) => setNewGoalTarget(e.target.value),
            className: "bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none",
            required: true,
            min: "0"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex space-x-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: `flex items-center space-x-2 cursor-pointer p-2 rounded-lg border ${!isLinkedToTotal ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400" : "border-transparent text-slate-500 hover:bg-slate-700"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", className: "hidden", checked: !isLinkedToTotal, onChange: () => setIsLinkedToTotal(false) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(PiggyBank, { size: 16 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold", children: "Ahorro Manual" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: `flex items-center space-x-2 cursor-pointer p-2 rounded-lg border ${isLinkedToTotal ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "border-transparent text-slate-500 hover:bg-slate-700"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", className: "hidden", checked: isLinkedToTotal, onChange: () => setIsLinkedToTotal(true) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { size: 16 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold", children: "Patrimonio Total" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: isSaving, className: "w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded px-6 py-2 text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50", children: isSaving ? "Guardando..." : "Crear Misión" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-500 mt-2 ml-1", children: isLinkedToTotal ? "Esta meta se completará automáticamente cuando el valor total de tu portafolio alcance el objetivo." : "Esta meta requiere que agregues fondos manualmente (+ Agregar Dinero) a medida que ahorras." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10", children: [
      goals.length === 0 && !isAdding && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-full text-center py-8 border-2 border-dashed border-slate-800 rounded-xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { size: 32, className: "mx-auto text-slate-700 mb-2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500 text-sm italic", children: "No hay misiones activas." })
      ] }),
      goals.map((goal) => {
        const current = goal.linkedToTotal ? totalPortfolioValue : goal.currentSaved || 0;
        const percent = Math.min(100, current / goal.targetAmount * 100);
        const isComplete = percent >= 100;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `group relative p-5 rounded-xl border transition-all duration-300 ${isComplete ? "bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "bg-slate-800 border-slate-700 hover:border-slate-600"}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start mb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-2 rounded-lg mr-3 ${goal.linkedToTotal ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"}`, children: goal.linkedToTotal ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(PiggyBank, { size: 16 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: `font-bold text-sm ${isComplete ? "text-emerald-400" : "text-white"}`, children: goal.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-500 font-mono uppercase", children: goal.linkedToTotal ? "Auto: Patrimonio" : "Manual: Ahorro" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onDeleteGoal(goal.id), className: "text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14 }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-end mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-lg font-black tracking-tight ${isComplete ? "text-emerald-400" : "text-white"}`, children: formatCurrency(current) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-mono text-slate-500 mb-1", children: [
              "/ ",
              formatCurrency(goal.targetAmount)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-slate-950 rounded-full h-2 overflow-hidden mb-3 border border-slate-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `h-full rounded-full transition-all duration-1000 relative overflow-hidden ${isComplete ? "bg-emerald-500" : goal.linkedToTotal ? "bg-emerald-600" : "bg-cyan-500"}`,
              style: { width: `${percent}%` },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center min-h-[24px]", children: [
            isComplete ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-emerald-400 flex items-center font-bold animate-pulse", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 14, className: "mr-1" }),
              " ¡Completado!"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] font-bold text-slate-500", children: [
              percent.toFixed(1),
              "%"
            ] }),
            !goal.linkedToTotal && !isComplete && (fundingGoalId === goal.id ? /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleFundingSubmit, className: "flex items-center animate-in fade-in slide-in-from-right-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  step: "any",
                  autoFocus: true,
                  className: "w-16 bg-slate-950 border border-cyan-500/50 rounded px-1 py-0.5 text-xs text-white outline-none mr-1",
                  placeholder: "$",
                  value: fundAmount,
                  onChange: (e) => setFundAmount(e.target.value),
                  onBlur: () => !fundAmount && setFundingGoalId(null),
                  min: "0"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "bg-cyan-500 text-slate-900 rounded-full p-0.5 hover:scale-110 transition-transform", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 14 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setFundingGoalId(null);
                    setFundAmount("");
                  },
                  className: "ml-1 text-slate-500 hover:text-slate-300",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 12 })
                }
              )
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => setFundingGoalId(goal.id),
                className: "flex items-center text-[10px] bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-900 text-cyan-400 px-2 py-1 rounded border border-cyan-500/30 transition-all font-bold",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CirclePlus, { size: 12, className: "mr-1" }),
                  " Agregar"
                ]
              }
            ))
          ] })
        ] }, goal.id);
      })
    ] })
  ] });
};

const NotificationsPanel = ({ portfolio }) => {
  const alerts = [];
  const marketAssets = portfolio.filter((a) => a.category === AssetCategory.MARKET);
  marketAssets.forEach((asset) => {
    const buyPriceAdjusted = asset.currency === "USD" ? asset.buyPrice * 20 : asset.buyPrice;
    if (asset.currentPrice && asset.currentPrice < buyPriceAdjusted * 0.97) {
      const discount = (buyPriceAdjusted - asset.currentPrice) / buyPriceAdjusted * 100;
      alerts.push({
        id: `disc-${asset.id}`,
        type: "OPPORTUNITY",
        title: "Oportunidad de Compra",
        message: `${asset.symbol} está un ${discount.toFixed(1)}% abajo de tu costo promedio.`,
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { size: 18, className: "text-emerald-400" })
      });
    }
  });
  const equipment = portfolio.filter((a) => a.category === AssetCategory.EQUIPMENT);
  equipment.forEach((eq) => {
    if (eq.breakEvenCount !== void 0 && eq.breakEvenCount <= 0 && (eq.netRoi || 0) > 0) {
      alerts.push({
        id: `roi-${eq.id}`,
        type: "SUCCESS",
        title: "¡Equipo Rentable!",
        message: `${eq.symbol} ya se pagó solo y está generando ganancias puras.`,
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 18, className: "text-emerald-400" })
      });
    }
  });
  if (alerts.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-8 space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { size: 14, className: "mr-2" }),
      " Alertas & Oportunidades"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: alerts.map((alert) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900/80 border border-emerald-500/20 p-3 rounded-lg flex items-start space-x-3 shadow-[0_0_10px_rgba(16,185,129,0.05)] animate-in slide-in-from-top-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-800 p-2 rounded-full", children: alert.icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-bold text-emerald-100 text-sm", children: alert.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: alert.message })
      ] })
    ] }, alert.id)) })
  ] });
};

const POPULAR_TICKERS = [
  // US Stocks
  { symbol: "AAPL", name: "Apple Inc.", type: "US Stock" },
  { symbol: "NVDA", name: "NVIDIA Corp", type: "US Stock" },
  { symbol: "TSLA", name: "Tesla Inc", type: "US Stock" },
  { symbol: "MSFT", name: "Microsoft", type: "US Stock" },
  { symbol: "AMZN", name: "Amazon", type: "US Stock" },
  { symbol: "GOOGL", name: "Alphabet (Google)", type: "US Stock" },
  { symbol: "META", name: "Meta Platforms", type: "US Stock" },
  // MX Stocks
  { symbol: "WALMEX.MX", name: "Walmart de México", type: "MX Stock" },
  { symbol: "BIMBOA.MX", name: "Grupo Bimbo", type: "MX Stock" },
  { symbol: "CEMEXCPO.MX", name: "Cemex", type: "MX Stock" },
  { symbol: "AMXB.MX", name: "América Móvil", type: "MX Stock" },
  { symbol: "GFNORTEO.MX", name: "Grupo Financiero Banorte", type: "MX Stock" },
  { symbol: "FEMSAUBD.MX", name: "Fomento Económico Mexicano", type: "MX Stock" },
  // FIBRAs (Mexico)
  { symbol: "FIBRAPL14.MX", name: "Fibra Prologis", type: "FIBRA" },
  { symbol: "FUNO11.MX", name: "Fibra Uno", type: "FIBRA" },
  { symbol: "DANHOS13.MX", name: "Fibra Danhos", type: "FIBRA" },
  { symbol: "FIBRAMQ12.MX", name: "Fibra Macquarie", type: "FIBRA" },
  { symbol: "TERRA13.MX", name: "Terrafina", type: "FIBRA" },
  { symbol: "FMTY14.MX", name: "Fibra Monterrey", type: "FIBRA" },
  { symbol: "FIBRAUP18.MX", name: "Fibra Upsite", type: "FIBRA" },
  { symbol: "FSHOP13.MX", name: "Fibra Shop", type: "FIBRA" },
  // REITs (US)
  { symbol: "O", name: "Realty Income (Monthly Div)", type: "US REIT" },
  { symbol: "PLD", name: "Prologis Inc", type: "US REIT" },
  { symbol: "AMT", name: "American Tower", type: "US REIT" },
  { symbol: "VICS", name: "Vici Properties", type: "US REIT" },
  { symbol: "VNQ", name: "Vanguard Real Estate ETF", type: "US REIT" },
  // Crypto
  { symbol: "BTC", name: "Bitcoin", type: "Crypto" },
  { symbol: "ETH", name: "Ethereum", type: "Crypto" },
  { symbol: "SOL", name: "Solana", type: "Crypto" },
  { symbol: "ADA", name: "Cardano", type: "Crypto" },
  { symbol: "XRP", name: "Ripple", type: "Crypto" },
  { symbol: "DOT", name: "Polkadot", type: "Crypto" },
  // ETFs
  { symbol: "SPY", name: "S&P 500 ETF", type: "ETF" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", type: "ETF" },
  { symbol: "VOO", name: "Vanguard S&P 500", type: "ETF" },
  { symbol: "IVVPESO.MX", name: "S&P 500 (Peso Trac)", type: "ETF MX" }
];
const TickerSearch = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const [query, setQuery] = reactExports.useState(value);
  const [filtered, setFiltered] = reactExports.useState(POPULAR_TICKERS);
  const wrapperRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    setQuery(value);
  }, [value]);
  reactExports.useEffect(() => {
    const lower = query.toLowerCase();
    setFiltered(
      POPULAR_TICKERS.filter(
        (t) => t.symbol.toLowerCase().includes(lower) || t.name.toLowerCase().includes(lower)
      )
    );
  }, [query]);
  reactExports.useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", ref: wrapperRef, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          className: "w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-mono transition-all group-hover:border-slate-600",
          placeholder: "Escribe cualquier ticker (ej. O, FUNO11.MX)",
          value: query,
          onChange: (e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          },
          onFocus: () => setIsOpen(true)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors", size: 18 })
    ] }),
    isOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "absolute z-50 w-full bg-slate-800 border border-slate-700 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-2xl custom-scrollbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "p-2 text-xs bg-slate-900 text-emerald-300 border-b border-slate-700 flex items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { size: 12, className: "mr-2" }),
        "Puedes escribir cualquier ticker, aunque no esté en la lista."
      ] }),
      filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "li",
        {
          className: "p-3 hover:bg-slate-700 cursor-pointer flex justify-between items-center border-l-4 border-emerald-500",
          onClick: () => {
            onChange(query.toUpperCase());
            setQuery(query.toUpperCase());
            setIsOpen(false);
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-bold text-white", children: [
              'Usar "',
              query.toUpperCase(),
              '"'
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-400 ml-2 block", children: "Buscar este activo personalizado" })
          ] })
        }
      ) : filtered.map((ticker) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "li",
        {
          className: "p-3 hover:bg-slate-700 cursor-pointer flex justify-between items-center border-l-4 border-transparent hover:border-emerald-500 transition-all",
          onClick: () => {
            onChange(ticker.symbol);
            setQuery(ticker.symbol);
            setIsOpen(false);
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-white font-mono", children: ticker.symbol }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-400 ml-2", children: ticker.name })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] px-2 py-1 rounded font-bold uppercase ${ticker.type.includes("FIBRA") || ticker.type.includes("REIT") ? "bg-emerald-900 text-emerald-200" : ticker.type.includes("Crypto") ? "bg-amber-900 text-amber-200" : "bg-cyan-900 text-cyan-200"}`, children: ticker.type })
          ]
        },
        ticker.symbol
      ))
    ] })
  ] });
};

const AddAssetModal = ({ isOpen, onClose, onAdd }) => {
  const { addNotification } = useNotification();
  const { session } = useAuth();
  const currency = session?.organization?.currency || "MXN";
  const [category, setCategory] = reactExports.useState(AssetCategory.MARKET);
  const [symbol, setSymbol] = reactExports.useState("");
  const [name, setName] = reactExports.useState("");
  const [quantity, setQuantity] = reactExports.useState("");
  const [buyPrice, setBuyPrice] = reactExports.useState("");
  const [purchaseDate, setPurchaseDate] = reactExports.useState((/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
  const [marketSubType, setMarketSubType] = reactExports.useState(AssetType.STOCK_MX);
  const [yieldRate, setYieldRate] = reactExports.useState("");
  const [paymentFreq, setPaymentFreq] = reactExports.useState("Monthly");
  const [depreciationRate, setDepreciationRate] = reactExports.useState("10");
  const [usagePrice, setUsagePrice] = reactExports.useState("");
  const [isFetchingDetails, setIsFetchingDetails] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (isOpen) {
      setCategory(AssetCategory.MARKET);
      setSymbol("");
      setName("");
      setQuantity("");
      setBuyPrice("");
      setYieldRate("");
      setUsagePrice("");
      setIsFetchingDetails(false);
    }
  }, [isOpen]);
  reactExports.useEffect(() => {
    if (category === AssetCategory.MARKET) {
      const s = symbol.toUpperCase();
      if (s.includes("FIBRA") || s === "O" || s === "AMT" || s.includes("FUNO")) {
        setMarketSubType(AssetType.FIBRA);
      } else if (["BTC", "ETH", "SOL", "ADA", "XRP"].includes(s)) {
        setMarketSubType(AssetType.CRYPTO);
      } else if (s.endsWith(".MX")) {
        setMarketSubType(AssetType.STOCK_MX);
      } else {
        setMarketSubType(AssetType.STOCK_US);
      }
    }
  }, [symbol, category]);
  const handleAutoDetect = async () => {
    if (!symbol) return;
    setIsFetchingDetails(true);
    try {
      const { fetchAssetDetails } = await __vitePreload(async () => { const { fetchAssetDetails } = await import('./MainLayout-C0Ev0ilC.js').then(n => n.p);return { fetchAssetDetails }},true              ?__vite__mapDeps([0,1,2,3,4,5,6,7]):void 0);
      const details = await fetchAssetDetails(symbol);
      if (details) {
        setYieldRate(details.yieldRate?.toString() || "");
        setPaymentFreq(details.frequency || "Monthly");
      }
    } catch (e) {
      console.error(e);
      addNotification("No se pudieron obtener detalles automáticos. Puedes ingresarlos manualmente.", "info");
    } finally {
      setIsFetchingDetails(false);
    }
  };
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symbol || !quantity || !buyPrice) {
      addNotification("Por favor completa todos los campos requeridos.", "error");
      return;
    }
    let finalType = marketSubType;
    if (category === AssetCategory.FIXED_INCOME) finalType = AssetType.DEBT;
    if (category === AssetCategory.EQUIPMENT) finalType = AssetType.EQUIPMENT;
    const newAsset = {
      symbol: symbol.toUpperCase(),
      name: name || symbol.toUpperCase(),
      category,
      type: finalType,
      quantity: parseFloat(quantity),
      buyPrice: parseFloat(buyPrice),
      currency,
      purchaseDate,
      yieldRate: yieldRate ? parseFloat(yieldRate) : void 0,
      paymentFrequency: category === AssetCategory.FIXED_INCOME || finalType === AssetType.FIBRA ? paymentFreq : void 0,
      depreciationRate: category === AssetCategory.EQUIPMENT ? parseFloat(depreciationRate) : void 0,
      usagePrice: category === AssetCategory.EQUIPMENT && usagePrice ? parseFloat(usagePrice) : void 0,
      usageCount: 0,
      accumulatedRevenue: 0,
      maintenanceCost: 0
    };
    try {
      await onAdd(newAsset);
      onClose();
    } catch (error) {
      console.error("Error adding asset:", error);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-900 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-xl font-bold text-white flex items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 24, className: "mr-2 text-sky-400" }),
        "Agregar Activo al Portafolio"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "text-slate-400 hover:text-white transition-transform hover:rotate-90", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 24 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider", children: "Categoría" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setCategory(AssetCategory.MARKET),
              className: `p-4 rounded-xl border-2 transition-all ${category === AssetCategory.MARKET ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { size: 24, className: "mx-auto mb-2" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-bold", children: "Mercado" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setCategory(AssetCategory.FIXED_INCOME),
              className: `p-4 rounded-xl border-2 transition-all ${category === AssetCategory.FIXED_INCOME ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { size: 24, className: "mx-auto mb-2" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-bold", children: "Deuda" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setCategory(AssetCategory.EQUIPMENT),
              className: `p-4 rounded-xl border-2 transition-all ${category === AssetCategory.EQUIPMENT ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { size: 24, className: "mx-auto mb-2" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-bold", children: "Equipo" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider", children: category === AssetCategory.EQUIPMENT ? "Nombre del Equipo" : "Ticker / Símbolo" }),
        category === AssetCategory.EQUIPMENT ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: symbol,
            onChange: (e) => setSymbol(e.target.value),
            placeholder: "ej. Cámara Canon R5",
            className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase",
            required: true
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(TickerSearch, { value: symbol, onChange: setSymbol })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider", children: "Nombre (Opcional)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: name,
            onChange: (e) => setName(e.target.value),
            placeholder: "Nombre descriptivo",
            className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          }
        )
      ] }),
      category === AssetCategory.MARKET && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider", children: "Tipo de Activo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: marketSubType,
            onChange: (e) => setMarketSubType(e.target.value),
            className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: AssetType.STOCK_US, children: "Acción (EE.UU.)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: AssetType.STOCK_MX, children: "Acción (México)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: AssetType.CRYPTO, children: "Criptomoneda" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: AssetType.ETF, children: "ETF" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: AssetType.FIBRA, children: "FIBRA / REIT" })
            ]
          }
        ),
        (marketSubType === AssetType.FIBRA || marketSubType === AssetType.ETF) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex items-center space-x-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: handleAutoDetect,
            disabled: isFetchingDetails || !symbol,
            className: "text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 px-3 py-1 rounded border border-sky-500/30 disabled:opacity-50 flex items-center",
            children: isFetchingDetails ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "mr-1 animate-spin" }),
              "Buscando..."
            ] }) : "🔍 Buscar Yield Automático"
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider", children: "Cantidad" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              step: "any",
              value: quantity,
              onChange: (e) => setQuantity(e.target.value),
              placeholder: "0",
              className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500",
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider", children: [
            "Precio de Compra (",
            currency,
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              step: "any",
              value: buyPrice,
              onChange: (e) => setBuyPrice(e.target.value),
              placeholder: "0.00",
              className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500",
              required: true
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider", children: "Fecha de Compra" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "date",
            value: purchaseDate,
            onChange: (e) => setPurchaseDate(e.target.value),
            className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500",
            required: true
          }
        )
      ] }),
      (category === AssetCategory.FIXED_INCOME || marketSubType === AssetType.FIBRA) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider", children: "Yield Rate (%)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              step: "any",
              value: yieldRate,
              onChange: (e) => setYieldRate(e.target.value),
              placeholder: "0.00",
              className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider", children: "Frecuencia de Pago" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: paymentFreq,
              onChange: (e) => setPaymentFreq(e.target.value),
              className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Monthly", children: "Mensual" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Quarterly", children: "Trimestral" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Annually", children: "Anual" })
              ]
            }
          )
        ] })
      ] }),
      category === AssetCategory.EQUIPMENT && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-amber-400 mb-2 tracking-wider", children: "Depreciación Anual (%)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "number",
                step: "any",
                value: depreciationRate,
                onChange: (e) => setDepreciationRate(e.target.value),
                placeholder: "10",
                className: "w-full bg-slate-950 border border-amber-500/30 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-xs font-bold uppercase text-amber-400 mb-2 tracking-wider", children: [
              "Precio por Uso (",
              currency,
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "number",
                step: "any",
                value: usagePrice,
                onChange: (e) => setUsagePrice(e.target.value),
                placeholder: "0.00",
                className: "w-full bg-slate-950 border border-amber-500/30 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-amber-400/70", children: "💡 El sistema calculará automáticamente el ROI basado en usos registrados y costos de mantenimiento." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end space-x-3 pt-4 border-t border-slate-800", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors",
            children: "Cancelar"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            className: "px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-sky-500/20",
            children: "Agregar Activo"
          }
        )
      ] })
    ] })
  ] }) });
};

const ActionModal = ({ isOpen, onClose, actionType, asset, onSave }) => {
  const [amount, setAmount] = reactExports.useState("");
  const [date, setDate] = reactExports.useState((/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
  const [notes, setNotes] = reactExports.useState("");
  const [isSaving, setIsSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (isOpen && asset) {
      if (actionType === "USAGE") {
        setAmount(asset.usagePrice?.toString() || "");
      } else {
        setAmount("");
      }
      setNotes("");
      setDate((/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
    }
  }, [isOpen, asset, actionType]);
  if (!isOpen || !asset || !actionType) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setIsSaving(true);
    try {
      await onSave(parseFloat(amount), date, notes);
      onClose();
    } catch (error) {
      console.error("Error saving action:", error);
    } finally {
      setIsSaving(false);
    }
  };
  const isUsage = actionType === "USAGE";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `bg-slate-900 rounded-2xl w-full max-w-md border ${isUsage ? "border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]" : "border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]"} overflow-hidden`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-slate-800 flex justify-between items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: `text-lg font-bold flex items-center ${isUsage ? "text-emerald-400" : "text-amber-400"}`, children: [
        isUsage ? /* @__PURE__ */ jsxRuntimeExports.jsx(Briefcase, { size: 20, className: "mr-2" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { size: 20, className: "mr-2" }),
        isUsage ? "Registrar Producción/Uso" : "Registrar Mantenimiento"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "text-slate-400 hover:text-white transition-transform hover:rotate-90", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 24 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-800 p-3 rounded-lg text-sm text-slate-300 mb-4", children: [
        "Activo: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-white", children: asset.symbol })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider", children: isUsage ? "Ingreso Generado ($)" : "Costo del Servicio ($)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute left-3 top-3 text-slate-500", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { size: 16 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              step: "any",
              value: amount,
              onChange: (e) => setAmount(e.target.value),
              className: `w-full bg-slate-950 border rounded-lg p-3 pl-9 text-white focus:outline-none focus:ring-2 ${isUsage ? "border-emerald-500/30 focus:ring-emerald-500" : "border-amber-500/30 focus:ring-amber-500"}`,
              required: true,
              min: "0"
            }
          )
        ] }),
        isUsage && asset.usagePrice && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-slate-500 mt-1", children: [
          "Precio sugerido por uso: $",
          asset.usagePrice.toFixed(2),
          " (Editable)"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider", children: "Fecha" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute left-3 top-3 text-slate-500", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 16 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              value: date,
              onChange: (e) => setDate(e.target.value),
              className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-9 text-white focus:outline-none focus:ring-2 focus:ring-slate-500",
              required: true
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider", children: "Nota (Opcional)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: isUsage ? "ej. Grabación Boda Civil" : "ej. Limpieza de sensor",
            value: notes,
            onChange: (e) => setNotes(e.target.value),
            className: "w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "submit",
          disabled: isSaving || !amount || parseFloat(amount) <= 0,
          className: `w-full py-3 rounded-xl text-slate-950 font-bold uppercase tracking-widest mt-4 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isUsage ? "bg-emerald-500 hover:bg-emerald-400" : "bg-amber-500 hover:bg-amber-400"}`,
          children: isSaving ? "Guardando..." : `Guardar ${isUsage ? "Ingreso" : "Gasto"}`
        }
      )
    ] })
  ] }) });
};

const PortfolioPage = () => {
  const { portfolioService, geminiPortfolioService } = useServices();
  const { addNotification } = useNotification();
  const { session } = useAuth();
  session?.organization?.currency || "MXN";
  const [assets, setAssets] = reactExports.useState([]);
  const [goals, setGoals] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [isRefreshing, setIsRefreshing] = reactExports.useState(false);
  const [privacyMode, setPrivacyMode] = reactExports.useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = reactExports.useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = reactExports.useState(false);
  const [actionModalType, setActionModalType] = reactExports.useState(null);
  const [selectedAsset, setSelectedAsset] = reactExports.useState(null);
  const [deleteAssetId, setDeleteAssetId] = reactExports.useState(null);
  const fetchData = reactExports.useCallback(async () => {
    try {
      const [assetsData, goalsData] = await Promise.all([
        portfolioService.getAssets(),
        portfolioService.getGoals()
      ]);
      setAssets(assetsData);
      setGoals(goalsData);
    } catch (error) {
      console.error("Error fetching portfolio data:", error);
      addNotification("Error al cargar el portafolio.", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [portfolioService, addNotification]);
  reactExports.useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handleRefreshMarketData = reactExports.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const marketAssets = assets.filter((a) => a.category === AssetCategory.MARKET);
      const symbols = marketAssets.map((a) => a.symbol);
      if (symbols.length > 0) {
        const { fetchMarketPrices } = await __vitePreload(async () => { const { fetchMarketPrices } = await import('./MainLayout-C0Ev0ilC.js').then(n => n.p);return { fetchMarketPrices }},true              ?__vite__mapDeps([0,1,2,3,4,5,6,7]):void 0);
        const marketData = await fetchMarketPrices(marketAssets);
        for (const data of marketData) {
          await portfolioService.saveMarketData({
            symbol: data.symbol,
            currentPriceMXN: data.currentPriceMXN,
            lastUpdated: data.lastUpdated,
            change24hPercent: data.change24hPercent
          });
        }
        const updatedAssets = await portfolioService.getAssets();
        setAssets(updatedAssets);
        addNotification("Precios de mercado actualizados.", "success");
      } else {
        addNotification("No hay activos de mercado para actualizar.", "info");
      }
    } catch (error) {
      console.error("Error refreshing market data:", error);
      addNotification("Error al actualizar precios de mercado.", "error");
    } finally {
      setIsRefreshing(false);
    }
  }, [assets, portfolioService, addNotification]);
  const portfolioItems = reactExports.useMemo(() => {
    return assets.map((asset) => {
      const baseCost = asset.buyPrice * asset.quantity;
      let currentPrice;
      let currentValue;
      let profitAndLoss;
      let profitAndLossPercent;
      let estimatedAnnualIncome;
      if (asset.category === AssetCategory.MARKET) {
        currentPrice = asset.buyPrice;
        currentValue = currentPrice * asset.quantity;
        profitAndLoss = currentValue - baseCost;
        profitAndLossPercent = baseCost > 0 ? profitAndLoss / baseCost * 100 : 0;
        if (asset.yieldRate && asset.quantity) {
          estimatedAnnualIncome = currentValue * asset.yieldRate / 100;
        }
      } else if (asset.category === AssetCategory.FIXED_INCOME) {
        currentValue = baseCost;
        profitAndLoss = 0;
        profitAndLossPercent = 0;
        if (asset.yieldRate) {
          estimatedAnnualIncome = baseCost * asset.yieldRate / 100;
        }
      } else if (asset.category === AssetCategory.EQUIPMENT) {
        const yearsOwned = ((/* @__PURE__ */ new Date()).getTime() - new Date(asset.purchaseDate).getTime()) / (1e3 * 60 * 60 * 24 * 365);
        const depreciationFactor = asset.depreciationRate ? Math.pow(1 - asset.depreciationRate / 100, yearsOwned) : 1;
        const depreciatedValue = baseCost * depreciationFactor;
        const totalRevenue = asset.accumulatedRevenue || 0;
        const maintenanceCost = asset.maintenanceCost || 0;
        const netRoi = totalRevenue - maintenanceCost;
        currentValue = depreciatedValue;
        profitAndLoss = netRoi;
        profitAndLossPercent = baseCost > 0 ? netRoi / baseCost * 100 : 0;
        const usagePrice = asset.usagePrice || 0;
        const breakEvenCount = usagePrice > 0 ? Math.ceil(baseCost / usagePrice) : 0;
        const remainingToBreakEven = Math.max(0, breakEvenCount - (asset.usageCount || 0));
        return {
          ...asset,
          currentPrice: depreciatedValue / asset.quantity,
          currentValue: depreciatedValue,
          profitAndLoss: netRoi,
          profitAndLossPercent,
          totalRevenue,
          netRoi,
          breakEvenCount: remainingToBreakEven
        };
      } else {
        currentValue = baseCost;
        profitAndLoss = 0;
        profitAndLossPercent = 0;
      }
      return {
        ...asset,
        currentPrice,
        currentValue,
        profitAndLoss,
        profitAndLossPercent,
        estimatedAnnualIncome
      };
    });
  }, [assets]);
  const summary = reactExports.useMemo(() => {
    const totalValue = portfolioItems.reduce((sum, item) => sum + (item.currentValue || 0), 0);
    const totalInvested = portfolioItems.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
    const totalPL = totalValue - totalInvested;
    const totalPLPercent = totalInvested > 0 ? totalPL / totalInvested * 100 : 0;
    const estimatedAnnualPassiveIncome = portfolioItems.reduce((sum, item) => sum + (item.estimatedAnnualIncome || 0), 0);
    return {
      totalValue,
      totalInvested,
      totalPL,
      totalPLPercent,
      estimatedAnnualPassiveIncome
    };
  }, [portfolioItems]);
  const handleAddAsset = reactExports.useCallback(async (assetData) => {
    try {
      await portfolioService.saveAsset(assetData);
      addNotification("Activo agregado correctamente.", "success");
      await fetchData();
    } catch (error) {
      console.error("Error adding asset:", error);
      addNotification("Error al agregar el activo.", "error");
    }
  }, [portfolioService, addNotification, fetchData]);
  const handleDeleteAsset = reactExports.useCallback(async () => {
    if (!deleteAssetId) return;
    try {
      await portfolioService.deleteAsset(deleteAssetId);
      addNotification("Activo eliminado correctamente.", "success");
      setDeleteAssetId(null);
      await fetchData();
    } catch (error) {
      console.error("Error deleting asset:", error);
      addNotification("Error al eliminar el activo.", "error");
    }
  }, [deleteAssetId, portfolioService, addNotification, fetchData]);
  const handleOpenAction = reactExports.useCallback((asset, type) => {
    setSelectedAsset(asset);
    setActionModalType(type);
    setIsActionModalOpen(true);
  }, []);
  const handleSaveAction = reactExports.useCallback(async (amount, date, notes) => {
    if (!selectedAsset) return;
    try {
      await portfolioService.addTransaction({
        assetId: selectedAsset.id,
        date,
        type: actionModalType === "USAGE" ? "INCOME" : "EXPENSE",
        amount,
        note: notes
      });
      const asset = assets.find((a) => a.id === selectedAsset.id);
      if (asset) {
        const updatedAsset = {
          ...asset,
          usageCount: actionModalType === "USAGE" ? (asset.usageCount || 0) + 1 : asset.usageCount,
          accumulatedRevenue: actionModalType === "USAGE" ? (asset.accumulatedRevenue || 0) + amount : asset.accumulatedRevenue,
          maintenanceCost: actionModalType === "MAINTENANCE" ? (asset.maintenanceCost || 0) + amount : asset.maintenanceCost
        };
        await portfolioService.saveAsset(updatedAsset);
      }
      addNotification(
        actionModalType === "USAGE" ? "Uso registrado correctamente." : "Mantenimiento registrado correctamente.",
        "success"
      );
      await fetchData();
    } catch (error) {
      console.error("Error saving action:", error);
      addNotification("Error al guardar la acción.", "error");
    }
  }, [selectedAsset, actionModalType, assets, portfolioService, addNotification, fetchData]);
  const handleAddGoal = reactExports.useCallback(async (goalData) => {
    try {
      await portfolioService.saveGoal(goalData);
      addNotification("Meta agregada correctamente.", "success");
      await fetchData();
    } catch (error) {
      console.error("Error adding goal:", error);
      addNotification("Error al agregar la meta.", "error");
    }
  }, [portfolioService, addNotification, fetchData]);
  const handleDeleteGoal = reactExports.useCallback(async (id) => {
    try {
      await portfolioService.deleteGoal(id);
      addNotification("Meta eliminada correctamente.", "success");
      await fetchData();
    } catch (error) {
      console.error("Error deleting goal:", error);
      addNotification("Error al eliminar la meta.", "error");
    }
  }, [portfolioService, addNotification, fetchData]);
  const handleAddFunds = reactExports.useCallback(async (id, amount) => {
    try {
      const goal = goals.find((g) => g.id === id);
      if (goal) {
        await portfolioService.saveGoal({
          ...goal,
          currentSaved: (goal.currentSaved || 0) + amount
        });
        addNotification("Fondos agregados correctamente.", "success");
        await fetchData();
      }
    } catch (error) {
      console.error("Error adding funds:", error);
      addNotification("Error al agregar fondos.", "error");
    }
  }, [goals, portfolioService, addNotification, fetchData]);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-64", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-slate-400", children: "Cargando portafolio..." }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 pb-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold text-white", children: "Portafolio de Inversiones" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-sm mt-1", children: "Gestiona tus activos, equipos y metas de inversión" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setPrivacyMode(!privacyMode),
            className: "px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2",
            title: privacyMode ? "Mostrar valores" : "Ocultar valores",
            children: [
              privacyMode ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { size: 18 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 18 }),
              privacyMode ? "Mostrar" : "Ocultar"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: handleRefreshMarketData,
            disabled: isRefreshing,
            className: "px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 18, className: isRefreshing ? "animate-spin" : "" }),
              "Actualizar Precios"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setIsAddModalOpen(true),
            className: "px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors flex items-center gap-2",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 18 }),
              "Agregar Activo"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryCards, { summary, isLoading, privacyMode }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(NotificationsPanel, { portfolio: portfolioItems }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      GoalsPanel,
      {
        goals,
        totalPortfolioValue: summary.totalValue,
        onAddGoal: handleAddGoal,
        onDeleteGoal: handleDeleteGoal,
        onAddFunds: handleAddFunds,
        privacyMode
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PortfolioCharts, { data: portfolioItems, totalValue: summary.totalValue }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AssetList,
      {
        assets: portfolioItems,
        onDelete: (id) => setDeleteAssetId(id),
        onOpenAction: handleOpenAction,
        privacyMode
      }
    ),
    isAddModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      AddAssetModal,
      {
        isOpen: isAddModalOpen,
        onClose: () => setIsAddModalOpen(false),
        onAdd: handleAddAsset
      }
    ),
    isActionModalOpen && selectedAsset && actionModalType && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ActionModal,
      {
        isOpen: isActionModalOpen,
        onClose: () => {
          setIsActionModalOpen(false);
          setSelectedAsset(null);
          setActionModalType(null);
        },
        actionType: actionModalType,
        asset: selectedAsset,
        onSave: handleSaveAction
      }
    ),
    deleteAssetId && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmationModal,
      {
        isOpen: !!deleteAssetId,
        onClose: () => setDeleteAssetId(null),
        onConfirm: handleDeleteAsset,
        title: "Confirmar Eliminación",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "¿Seguro que quieres eliminar este activo? Esta acción no se puede deshacer." })
      }
    )
  ] });
};

export { PortfolioPage as default };
