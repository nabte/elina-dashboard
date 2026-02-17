import"./auth-CBpGm6GX.js";let u=!1;document.addEventListener("auth:ready",async({detail:a})=>{if(!a||!a.session){window.location.href="/";return}if(u)return;const{data:t,error:l}=await window.auth.sb.from("profiles").select("role").eq("id",a.session.user.id).single();if(l||!t||t.role!=="superadmin"){alert("Acceso denegado. No tienes permisos de superadministrador."),window.location.href="/dashboard.html";return}u=!0,document.getElementById("loader").classList.add("hidden"),document.getElementById("app-container").classList.remove("hidden"),m()});function m(){b(),c(),p()}function p(){var a;document.getElementById("plans-container").addEventListener("submit",t=>{t.target.classList.contains("plan-form")&&(t.preventDefault(),g(t.target))}),(a=document.getElementById("mobile-menu-btn"))==null||a.addEventListener("click",()=>{const t=document.getElementById("main-sidebar");t==null||t.classList.toggle("hidden")}),document.getElementById("user-search").addEventListener("input",t=>{const l=t.target.value.toLowerCase();document.querySelectorAll("#users-table-body tr").forEach(e=>{const n=e.dataset.email.toLowerCase();e.style.display=n.includes(l)?"":"none"})}),document.getElementById("users-table-body").addEventListener("click",t=>{if(t.target.closest(".change-plan-btn")){const l=t.target.closest(".change-plan-btn");f(l.dataset.userId,l.dataset.userEmail,l.dataset.currentPlan)}if(t.target.closest(".impersonate-btn")){const l=t.target.closest(".impersonate-btn");t.stopPropagation(),y(l.dataset.userId)}}),document.getElementById("cancel-change-plan-btn").addEventListener("click",()=>{document.getElementById("change-plan-modal").classList.add("hidden")}),document.getElementById("confirm-change-plan-btn").addEventListener("click",v)}async function b(){const a=document.getElementById("plans-container"),{data:t,error:l}=await window.auth.sb.from("plans").select("*");if(l){a.innerHTML='<p class="text-red-400">Error al cargar planes.</p>';return}a.innerHTML=t.map(e=>{var n,s,r,o,i,d;return`
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
                    <label class="block text-sm font-medium text-slate-400">Límite de Plantillas</label>
                    <input type="number" value="${e.templates_limit||0}" class="limit-templates mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Seguimientos Activos</label>
                    <select class="features-follow-ups mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                        <option value="true" ${(n=e.features)!=null&&n.follow_ups?"selected":""}>Sí</option>
                        <option value="false" ${(s=e.features)!=null&&s.follow_ups?"":"selected"}>No</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Diseñador IA Activo</label>
                    <select class="features-designer-ai mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                        <option value="true" ${(r=e.features)!=null&&r.designer_ai?"selected":""}>Sí</option>
                        <option value="false" ${(o=e.features)!=null&&o.designer_ai?"":"selected"}>No</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400">Multi-Usuario (Plan Business)</label>
                    <select class="features-multi-user mt-1 w-full bg-slate-700 border-slate-600 rounded p-2">
                        <option value="true" ${(i=e.features)!=null&&i.multi_user?"selected":""}>Sí</option>
                        <option value="false" ${(d=e.features)!=null&&d.multi_user?"":"selected"}>No</option>
                    </select>
                </div>
            </div>
            <button type="submit" class="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500">Guardar Cambios</button>
        </form>
    `}).join("")}async function g(a){const t=a.dataset.planId,l={stripe_product_id:a.querySelector(".stripe-product-id").value.trim()||null,bulk_sends_limit:parseInt(a.querySelector(".limit-bulk-sends").value)||0,ai_enhancements_limit:parseInt(a.querySelector(".limit-ai-enhancements").value)||0,image_generations_limit:parseInt(a.querySelector(".limit-image-generations").value)||0,templates_limit:parseInt(a.querySelector(".limit-templates").value)||0,features:{follow_ups:a.querySelector(".features-follow-ups").value==="true",designer_ai:a.querySelector(".features-designer-ai").value==="true",multi_user:a.querySelector(".features-multi-user").value==="true"}},{error:e}=await window.auth.sb.from("plans").update(l).eq("id",t);alert(e?`Error al guardar el plan ${t}: ${e.message}`:`Plan ${t} actualizado con éxito.`)}async function c(){const a=document.getElementById("users-table-body"),t=document.getElementById("users-loader"),{data:l,error:e}=await window.auth.sb.rpc("get_all_admin_users");if(e){console.error("Error al cargar usuarios:",e),t&&(t.querySelector("td").textContent=`Error al cargar usuarios: ${e.message}`);return}t&&(t.style.display="none"),a.innerHTML=l.map(n=>{const s={plan_id:n.plan_id||"free_trial",status:n.status||"inactive"};return`
            <tr data-email="${n.email}">
                <td class="p-4">${n.email}</td>
                <td class="p-4"><span class="font-semibold">${s.plan_id}</span></td>
                <td class="p-4"><span class="px-2 py-1 text-xs rounded-full ${s.status==="active"||s.status==="trialing"?"bg-green-500/20 text-green-300":"bg-red-500/20 text-red-300"}">${s.status}</span></td>
                <td class="p-4">
                    <button class="change-plan-btn bg-slate-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-slate-500"
                            data-user-id="${n.id}"
                            data-user-email="${n.email}"
                            data-current-plan="${s.plan_id}">
                        Cambiar Plan
                    </button>
                    <button class="impersonate-btn bg-amber-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-amber-500 ml-2"
                            data-user-id="${n.id}"
                            title="Iniciar sesión como este usuario">
                        Suplantar
                    </button>
                </td>
            </tr>
        `}).join(""),lucide.createIcons()}async function f(a,t,l){document.getElementById("modal-user-id").value=a,document.getElementById("modal-user-email").textContent=t;const e=document.getElementById("modal-plan-select"),{data:n,error:s}=await window.auth.sb.from("plans").select("id, name");s?(console.error("Error cargando planes para el modal:",s),e.innerHTML='<option value="">Error al cargar</option>'):e.innerHTML=n.map(r=>`<option value="${r.id}">${r.name}</option>`).join(""),e.value=l,document.getElementById("modal-override-payment").checked=!1,document.getElementById("change-plan-modal").classList.remove("hidden")}async function v(){const a=document.getElementById("modal-user-id").value,t=document.getElementById("modal-plan-select").value;if(!document.getElementById("modal-override-payment").checked){alert('Funcionalidad de pago con Stripe aún no implementada. Marca la casilla "Forzar cambio" para asignar el plan manually.');return}const e=document.getElementById("confirm-change-plan-btn");e.disabled=!0,e.textContent="Guardando...";try{let n="active",s;if(t==="free_trial"){n="trialing";const o=new Date;o.setDate(o.getDate()+7),s=o.toISOString()}else s=new Date().toISOString();const{error:r}=await window.auth.sb.from("subscriptions").upsert({user_id:a,plan_id:t,status:n,trial_ends_at:s,stripe_subscription_id:null},{onConflict:"user_id"});if(r)throw r;alert("Plan del usuario actualizado con éxito."),document.getElementById("change-plan-modal").classList.add("hidden"),c()}catch(n){alert(`Error al cambiar el plan: ${n.message}`)}finally{e.disabled=!1,e.textContent="Guardar Cambio"}}async function y(a){var t,l;if(!(!a||!confirm("¿Estás seguro de que quieres iniciar sesión como este usuario? Tu sesión actual de superadmin se guardará.")))try{const{data:{session:e},error:n}=await window.auth.sb.auth.getSession();if(n)throw n;if(!(e!=null&&e.access_token)||!(e!=null&&e.refresh_token))throw new Error("No se pudo recuperar la sesión del superadmin.");localStorage.setItem("superadmin_session_tokens",JSON.stringify({access_token:e.access_token,refresh_token:e.refresh_token}));const{data:s,error:r}=await window.auth.sb.functions.invoke("impersonate-user",{body:{userId:a}});if(r)throw r;if(!((t=s==null?void 0:s.session)!=null&&t.access_token)||!((l=s==null?void 0:s.session)!=null&&l.refresh_token))throw new Error("La función de suplantación no devolvió credenciales válidas.");await window.auth.sb.auth.setSession({access_token:s.session.access_token,refresh_token:s.session.refresh_token}),localStorage.setItem("impersonated_user_info",JSON.stringify({id:s.targetUserId,email:s.targetUserEmail})),window.location.href="/dashboard.html"}catch(e){alert(`Error al suplantar usuario: ${e.message}`)}}
