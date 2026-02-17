import"./auth-COsaJi3Q.js";let _=!1,m=[],p=null,f=null;document.addEventListener("auth:ready",async({detail:a})=>{if(!a||!a.session){window.location.href="/";return}if(_)return;const{data:n,error:o}=await window.auth.sb.from("profiles").select("role").eq("id",a.session.user.id).single();if(o||!n||n.role!=="superadmin"){alert("Acceso denegado. No tienes permisos de superadministrador."),window.location.href="/dashboard.html";return}_=!0,document.getElementById("loader").classList.add("hidden"),document.getElementById("app-container").classList.remove("hidden"),B()});function B(){var a;k(),E(),A(),S(),(a=window.lucide)!=null&&a.createIcons&&window.lucide.createIcons()}function S(){var s;document.getElementById("plans-container").addEventListener("submit",t=>{t.target.classList.contains("plan-form")&&(t.preventDefault(),$(t.target))}),(s=document.getElementById("mobile-menu-btn"))==null||s.addEventListener("click",()=>{const t=document.getElementById("main-sidebar");t==null||t.classList.toggle("hidden")}),document.getElementById("user-search").addEventListener("input",t=>{const l=t.target.value.toLowerCase();document.querySelectorAll("#users-table-body tr").forEach(r=>{const d=r.dataset.email.toLowerCase();r.style.display=d.includes(l)?"":"none"})}),document.getElementById("users-table-body").addEventListener("click",t=>{if(t.target.closest(".change-plan-btn")){const l=t.target.closest(".change-plan-btn");L(l.dataset.userId,l.dataset.userEmail,l.dataset.currentPlan)}if(t.target.closest(".impersonate-btn")){const l=t.target.closest(".impersonate-btn");t.stopPropagation(),q(l.dataset.userId)}}),document.getElementById("cancel-change-plan-btn").addEventListener("click",()=>{document.getElementById("change-plan-modal").classList.add("hidden")}),document.getElementById("confirm-change-plan-btn").addEventListener("click",P);const a=document.getElementById("prompts-form"),n=document.getElementById("prompts-user-select");a&&n&&(a.addEventListener("submit",C),a.addEventListener("input",y),n.addEventListener("change",async t=>{p=t.target.value||null,await w(p)}));const o=document.getElementById("escalations-form"),e=document.getElementById("escalations-user-select");o&&e&&(o.addEventListener("submit",M),e.addEventListener("change",async t=>{f=t.target.value||null,await x(f)}))}async function k(){const a=document.getElementById("plans-container"),{data:n,error:o}=await window.auth.sb.from("plans").select("*");if(o){a.innerHTML='<p class="text-red-400">Error al cargar planes.</p>';return}a.innerHTML=n.map(e=>{var s,t,l,r,d,i,u,c,b,g;return`
        <form class="plan-form bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4" data-plan-id="${e.id}">
            <h3 class="text-2xl font-bold text-cyan-400">${e.name} (${e.id})</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label class="block text-sm font-medium text-slate-400">Stripe Product ID</label>
                    <input type="text" value="${e.stripe_product_id||""}" class="stripe-product-id mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Límite Envíos Masivos/mes</label>
                    <input type="number" value="${e.bulk_sends_limit||0}" class="limit-bulk-sends mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Límite Mejoras IA/mes</label>
                    <input type="number" value="${e.ai_enhancements_limit||0}" class="limit-ai-enhancements mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Límite Imágenes IA/mes</label>
                    <input type="number" value="${e.image_generations_limit||0}" class="limit-image-generations mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Límite Videos IA/mes</label>
                    <input type="number" value="${e.video_generations_limit||0}" class="limit-video-generations mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Video IA Activo</label>
                    <select class="features-video-ai mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                        <option value="true" ${(s=e.features)!=null&&s.video_ai?"selected":""}>Sí</option>
                        <option value="false" ${(t=e.features)!=null&&t.video_ai?"":"selected"}>No</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Límite Videos IA/mes</label>
                    <input type="number" value="${e.video_generations_limit||0}" class="limit-video-generations mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Video IA Activo</label>
                    <select class="features-video-ai mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                        <option value="true" ${(l=e.features)!=null&&l.video_ai?"selected":""}>Sí</option>
                        <option value="false" ${(r=e.features)!=null&&r.video_ai?"":"selected"}>No</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Límite de Plantillas</label>
                    <input type="number" value="${e.templates_limit||0}" class="limit-templates mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Seguimientos Activos</label>
                    <select class="features-follow-ups mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                        <option value="true" ${(d=e.features)!=null&&d.follow_ups?"selected":""}>Sí</option>
                        <option value="false" ${(i=e.features)!=null&&i.follow_ups?"":"selected"}>No</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Diseñador IA Activo</label>
                    <select class="features-designer-ai mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                        <option value="true" ${(u=e.features)!=null&&u.designer_ai?"selected":""}>Sí</option>
                        <option value="false" ${(c=e.features)!=null&&c.designer_ai?"":"selected"}>No</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Multi-Usuario (Plan Business)</label>
                    <select class="features-multi-user mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                        <option value="true" ${(b=e.features)!=null&&b.multi_user?"selected":""}>Sí</option>
                        <option value="false" ${(g=e.features)!=null&&g.multi_user?"":"selected"}>No</option>
                    </select>
                </div>
            </div>
            <button type="submit" class="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500">Guardar Cambios</button>
        </form>
    `}).join("")}async function $(a){const n=a.dataset.planId,o={stripe_product_id:a.querySelector(".stripe-product-id").value.trim()||null,bulk_sends_limit:parseInt(a.querySelector(".limit-bulk-sends").value)||0,ai_enhancements_limit:parseInt(a.querySelector(".limit-ai-enhancements").value)||0,image_generations_limit:parseInt(a.querySelector(".limit-image-generations").value)||0,video_generations_limit:parseInt(a.querySelector(".limit-video-generations").value)||0,templates_limit:parseInt(a.querySelector(".limit-templates").value)||0,features:{follow_ups:a.querySelector(".features-follow-ups").value==="true",designer_ai:a.querySelector(".features-designer-ai").value==="true",video_ai:a.querySelector(".features-video-ai").value==="true",multi_user:a.querySelector(".features-multi-user").value==="true"}},{error:e}=await window.auth.sb.from("plans").update(o).eq("id",n);alert(e?`Error al guardar el plan ${n}: ${e.message}`:`Plan ${n} actualizado con éxito.`)}async function E(){const a=document.getElementById("users-table-body"),n=document.getElementById("users-loader"),{data:o,error:e}=await window.auth.sb.rpc("get_all_admin_users");if(e){console.error("Error al cargar usuarios:",e),n&&(n.querySelector("td").textContent=`Error al cargar usuarios: ${e.message}`);return}return n&&(n.style.display="none"),m=o??[],T(),a.innerHTML=m.map(s=>{const t={plan_id:s.plan_id||"free_trial",status:s.status||"inactive"};return`
            <tr data-email="${s.email}">
                <td class="p-4">${s.email}</td>
                <td class="p-4"><span class="font-semibold">${t.plan_id}</span></td>
                <td class="p-4"><span class="px-2 py-1 text-xs rounded-full ${t.status==="active"||t.status==="trialing"?"bg-green-500/20 text-green-300":"bg-red-500/20 text-red-300"}">${t.status}</span></td>
                <td class="p-4">
                    <button class="change-plan-btn bg-slate-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-slate-500"
                            data-user-id="${s.id}"
                            data-user-email="${s.email}"
                            data-current-plan="${t.plan_id}">
                        Cambiar Plan
                    </button>
                    <button class="impersonate-btn bg-amber-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-amber-500 ml-2"
                            data-user-id="${s.id}"
                            title="Iniciar sesión como este usuario">
                        Suplantar
                    </button>
                </td>
            </tr>
        `}).join(""),lucide.createIcons(),m}async function L(a,n,o){document.getElementById("modal-user-id").value=a,document.getElementById("modal-user-email").textContent=n;const e=document.getElementById("modal-plan-select"),{data:s,error:t}=await window.auth.sb.from("plans").select("id, name");t?(console.error("Error cargando planes para el modal:",t),e.innerHTML='<option value="">Error al cargar</option>'):e.innerHTML=s.map(l=>`<option value="${l.id}">${l.name}</option>`).join(""),e.value=o,document.getElementById("modal-override-payment").checked=!1,document.getElementById("change-plan-modal").classList.remove("hidden")}async function P(){const a=document.getElementById("modal-user-id").value,n=document.getElementById("modal-plan-select").value;if(!document.getElementById("modal-override-payment").checked){alert('Funcionalidad de pago con Stripe aún no implementada. Marca la casilla "Forzar cambio" para asignar el plan manually.');return}const e=document.getElementById("confirm-change-plan-btn");e.disabled=!0,e.textContent="Guardando...";try{if(n==="business"){const{error:s}=await window.auth.sb.rpc("create_business_team_for_user",{p_user_id:a});if(s)throw new Error(`Error al crear el equipo y asignar el plan: ${s.message}`)}else{let s="active",t;if(n==="free_trial"){s="trialing";const r=new Date;r.setDate(r.getDate()+7),t=r.toISOString()}else t=new Date().toISOString();const{error:l}=await window.auth.sb.from("subscriptions").upsert({user_id:a,plan_id:n,status:s,trial_ends_at:t,stripe_subscription_id:null},{onConflict:"user_id"});if(l)throw l}alert("Plan del usuario actualizado con éxito."),document.getElementById("change-plan-modal").classList.add("hidden"),E()}catch(s){alert(`Error al cambiar el plan: ${s.message}`)}finally{e.disabled=!1,e.textContent="Guardar Cambio"}}async function q(a){var n,o;if(!(!a||!confirm("¿Estás seguro de que quieres iniciar sesión como este usuario? Tu sesión actual de superadmin se guardará.")))try{const{data:{session:e},error:s}=await window.auth.sb.auth.getSession();if(s)throw s;if(!(e!=null&&e.access_token)||!(e!=null&&e.refresh_token))throw new Error("No se pudo recuperar la sesión del superadmin.");localStorage.setItem("superadmin_session_tokens",JSON.stringify({access_token:e.access_token,refresh_token:e.refresh_token}));const{data:t,error:l}=await window.auth.invokeFunction("impersonate-user",{body:{userId:a}});if(l)throw l;if(!((n=t==null?void 0:t.session)!=null&&n.access_token)||!((o=t==null?void 0:t.session)!=null&&o.refresh_token))throw new Error("La función de suplantación no devolvió credenciales válidas.");await window.auth.sb.auth.setSession({access_token:t.session.access_token,refresh_token:t.session.refresh_token}),localStorage.setItem("impersonated_user_info",JSON.stringify({id:t.targetUserId,email:t.targetUserEmail})),window.location.href="/dashboard.html"}catch(e){alert(`Error al suplantar usuario: ${e.message}`)}}function A(){y()}function T(){const a=document.getElementById("prompts-user-select"),n=document.getElementById("escalations-user-select"),o=m.length>0,e=o?['<option value="">Selecciona un usuario...</option>',...m.map(s=>`<option value="${s.id}">${s.email}</option>`)].join(""):'<option value="">No hay usuarios disponibles</option>';if(a){const s=a.value;a.innerHTML=e,s&&m.some(t=>t.id===s)?a.value=s:o&&(a.value=m[0].id),p=a.value||null,w(p)}if(n){const s=n.value;n.innerHTML=e,s&&m.some(t=>t.id===s)?n.value=s:o&&(n.value=m[0].id),f=n.value||null,x(f)}}function I(){var l,r,d,i,u,c;const a=((l=document.getElementById("promo-title"))==null?void 0:l.value.trim())??"",n=((r=document.getElementById("promo-copy"))==null?void 0:r.value.trim())??"",o=((d=document.getElementById("promo-objections"))==null?void 0:d.value.trim())??"",e=((i=document.getElementById("promo-hooks"))==null?void 0:i.value.trim())??"",s=((u=document.getElementById("promo-expiry"))==null?void 0:u.value)||null,t=((c=document.getElementById("promo-is-active"))==null?void 0:c.checked)??!0;return{title:a,is_active:t,prompt:{promotion:n||null,objections:o||null,hooks:e||null,expiry:s}}}function y(){const a=document.getElementById("promo-json");if(!a)return;const n=I();a.value=JSON.stringify(n,null,2)}function v(a){const n=document.getElementById("prompts-form");n&&n.querySelectorAll("input, textarea, button").forEach(o=>{o.disabled=a})}async function w(a){var u,c,b,g,h;const n=document.getElementById("promo-title"),o=document.getElementById("promo-copy"),e=document.getElementById("promo-objections"),s=document.getElementById("promo-hooks"),t=document.getElementById("promo-expiry"),l=document.getElementById("promo-is-active");if(!a||!n){v(!0),n&&(n.value=""),o&&(o.value=""),e&&(e.value=""),s&&(s.value=""),t&&(t.value=""),l&&(l.checked=!0),y();return}v(!0);const{data:r,error:d}=await window.auth.sb.from("sales_prompts_active").select("*").eq("user_id",a).limit(1);d&&(console.error("Error al cargar contexto de ventas:",d),(u=window.showToast)==null||u.call(window,"Error al cargar contexto de ventas","error"));const i=(r==null?void 0:r[0])??null;n.value=(i==null?void 0:i.title)??"",o.value=((c=i==null?void 0:i.prompt)==null?void 0:c.promotion)??"",e.value=((b=i==null?void 0:i.prompt)==null?void 0:b.objections)??"",s.value=((g=i==null?void 0:i.prompt)==null?void 0:g.hooks)??"",t.value=((h=i==null?void 0:i.prompt)==null?void 0:h.expiry)??"",l&&(l.checked=(i==null?void 0:i.is_active)??!0),v(!1),y()}async function C(a){var o,e,s;if(a.preventDefault(),!p){(o=window.showToast)==null||o.call(window,"Selecciona un usuario primero","error");return}const n=I();try{v(!0),await window.auth.sb.from("sales_prompts").update({is_active:!1}).eq("user_id",p);const{error:t}=await window.auth.sb.from("sales_prompts").insert({user_id:p,title:n.title||"Contexto sin título",prompt:n.prompt,is_active:n.is_active});if(t){console.error("Error guardando contexto:",t),(e=window.showToast)==null||e.call(window,`Error: ${t.message}`,"error");return}((s=window.showToast)==null?void 0:s.call(window,"Contexto actualizado","success"))??alert("Contexto actualizado"),await w(p)}finally{v(!1)}}function j(a){return a?a.split(",").map(n=>n.trim()).filter(Boolean):[]}async function x(a){var l;const n=document.getElementById("escalation-phone"),o=document.getElementById("escalation-email"),e=document.getElementById("escalation-labels");if(!a||!n){n&&(n.value=""),o&&(o.value=""),e&&(e.value="");return}const{data:s,error:t}=await window.auth.sb.from("escalation_settings").select("*").eq("user_id",a).single();t&&t.code!=="PGRST116"&&(console.error("Error al cargar alertas:",t),(l=window.showToast)==null||l.call(window,"Error al cargar alertas","error")),n.value=(s==null?void 0:s.notify_phone)??"",o.value=(s==null?void 0:s.notify_email)??"",e.value=Array.isArray(s==null?void 0:s.alert_labels)?s.alert_labels.join(","):""}async function M(a){var l,r,d,i,u,c;if(a.preventDefault(),!f){(l=window.showToast)==null||l.call(window,"Selecciona un usuario primero","error");return}const n=((r=document.getElementById("escalation-phone"))==null?void 0:r.value.trim())||null,o=((d=document.getElementById("escalation-email"))==null?void 0:d.value.trim())||null,e=((i=document.getElementById("escalation-labels"))==null?void 0:i.value)??"",s=j(e),{error:t}=await window.auth.sb.from("escalation_settings").upsert({user_id:f,notify_phone:n,notify_email:o,alert_labels:s});if(t){console.error("Error guardando alertas:",t),(u=window.showToast)==null||u.call(window,`Error: ${t.message}`,"error");return}((c=window.showToast)==null?void 0:c.call(window,"Alertas actualizadas","success"))??alert("Alertas actualizadas")}
