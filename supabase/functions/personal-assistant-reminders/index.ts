
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Personal Assistant Reminders Function Started")

serve(async (req) => {
    try {
        const url = new URL(req.url)
        const force = url.searchParams.get('force') === 'true'

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const now = new Date()
        const today = now.toISOString().split('T')[0]
        const hours = now.getHours()

        console.log(`>>> [ASSISTANT] Running reminders at ${now.toISOString()} (force=${force}, hour=${hours})`)

        // 0. Get Master Profile for Sending (ElinaHead)
        const { data: masterProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('evolution_instance_name', 'ElinaHead')
            .maybeSingle()

        // Get all active users with contact_phone configured
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .not('contact_phone', 'is', null)
            .not('contact_phone', 'eq', '')

        if (profilesError) {
            console.error('!!! [ERROR] Failed to fetch profiles:', profilesError)
            return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 })
        }

        if (!profiles || profiles.length === 0) {
            return new Response(JSON.stringify({ message: 'No users configured', processed: 0 }), { status: 200 })
        }

        let successCount = 0
        let failCount = 0

        for (const profile of profiles) {
            try {
                // 1. Get today's confirmed appointments
                const { data: todayMeetings } = await supabase
                    .from('meetings')
                    .select(`
                        id,
                        start_time,
                        summary,
                        status,
                        contacts(full_name, phone_number),
                        products(product_name)
                    `)
                    .eq('user_id', profile.id)
                    .gte('start_time', `${today}T00:00:00`)
                    .lte('start_time', `${today}T23:59:59`)
                    .in('status', ['confirmed', 'pending'])
                    .order('start_time', { ascending: true })

                // 1.5 Get User Settings for Reminder Preferences
                const { data: userSettings } = await supabase
                    .from('user_settings')
                    .select('reminder_preferences')
                    .eq('user_id', profile.id)
                    .maybeSingle()

                let prefs = userSettings?.reminder_preferences

                interface Rule { value: number; unit: string; ms: number; label: string; }
                let rules: Rule[] = []

                const convertToMs = (val: number, unit: string) => {
                    if (unit === 'hours') return val * 60 * 60 * 1000;
                    if (unit === 'days') return val * 24 * 60 * 60 * 1000;
                    if (unit === 'weeks') return val * 7 * 24 * 60 * 60 * 1000;
                    return 0;
                }

                if (Array.isArray(prefs)) {
                    rules = prefs.map((p: any) => ({
                        value: p.value,
                        unit: p.unit,
                        ms: convertToMs(p.value, p.unit),
                        label: `${p.value} ${p.unit}`
                    }))
                } else if (typeof prefs === 'object' && prefs !== null) {
                    if (prefs['2h']) rules.push({ value: 2, unit: 'hours', ms: 7200000, label: '2 horas' });
                    if (prefs['24h']) rules.push({ value: 1, unit: 'days', ms: 86400000, label: '24 horas' });
                    if (prefs['48h']) rules.push({ value: 2, unit: 'days', ms: 172800000, label: '48 horas' });
                } else {
                    rules = [
                        { value: 2, unit: 'hours', ms: 7200000, label: '2 horas' },
                        { value: 1, unit: 'days', ms: 86400000, label: '1 día' },
                        { value: 2, unit: 'days', ms: 172800000, label: '2 días' }
                    ]
                }

                // 2. DEADLINE REMINDERS
                const nowTime = now.getTime()
                const maxMs = rules.reduce((max, r) => Math.max(max, r.ms), 0) || 48 * 60 * 60 * 1000;
                const buffer = force ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

                const { data: upcomingTasks } = await supabase
                    .from('personal_tasks')
                    .select('*')
                    .eq('user_id', profile.id)
                    .eq('status', 'pending')
                    .gte('due_date', new Date(nowTime).toISOString())
                    .lte('due_date', new Date(nowTime + maxMs + buffer).toISOString())

                const taskAlerts: Record<string, any[]> = {}
                const taskPriorityMap: Record<string, number> = {}

                if (upcomingTasks) {
                    upcomingTasks.forEach((t: any) => {
                        const dueDate = new Date(t.due_date).getTime()
                        const diff = dueDate - nowTime

                        rules.forEach(rule => {
                            const tolerance = force ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
                            let match = false;

                            if (rule.ms < 60 * 60 * 1000) {
                                if (diff > 0 && diff <= rule.ms + tolerance) match = true;
                            } else {
                                if (Math.abs(diff - rule.ms) <= tolerance) match = true;
                            }

                            if (match) {
                                const currentPriority = taskPriorityMap[t.id];
                                if (currentPriority === undefined || rule.ms < currentPriority) {
                                    taskPriorityMap[t.id] = rule.ms;
                                }
                            }
                        });
                    })

                    upcomingTasks.forEach((t: any) => {
                        const winningMs = taskPriorityMap[t.id];
                        if (winningMs !== undefined) {
                            const winningRule = rules.find(r => r.ms === winningMs);
                            if (winningRule) {
                                const key = winningRule.label;
                                if (!taskAlerts[key]) taskAlerts[key] = [];
                                taskAlerts[key].push(t);
                            }
                        }
                    })
                }

                // 2.5 Get pending tasks (today)
                const { data: pendingTasks } = await supabase
                    .from('personal_tasks')
                    .select('*')
                    .eq('user_id', profile.id)
                    .eq('status', 'pending')
                    .lte('due_date', `${today}T23:59:59`)
                    .order('due_date', { ascending: true })

                // --- LOGIC: Summary vs Specific Alert ---
                // Summary only in morning. Alerts anytime.
                // Force ensures we check tasks with big tolerance, but formatting should respect time of day
                const isSummaryWindow = (hours >= 6 && hours <= 10);
                const hasAlerts = Object.values(taskAlerts).some(arr => arr.length > 0);

                // If force is true, we ALWAYS process, even if no alerts found (though finding alerts is likely with force)
                // But if not force, we need alerts or summary window
                if (!hasAlerts && !isSummaryWindow && !force) {
                    continue; // Nothing to do
                }

                // Skip profile if no info at all (deduplication for empty profiles)
                if (!todayMeetings?.length && !pendingTasks?.length && !hasAlerts) {
                    continue;
                }

                let message = "";
                if (isSummaryWindow) {
                    message = `Buenos días! 🌅\n\n`;

                    if (todayMeetings && todayMeetings.length > 0) {
                        message += `📅 *Citas de hoy (${todayMeetings.length}):*\n`;
                        todayMeetings.forEach((m: any) => {
                            const time = new Date(m.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: profile.timezone || 'America/Mexico_City' });
                            const clientName = m.contacts?.full_name || 'Cliente';
                            const serviceName = m.products?.product_name || m.summary || 'Cita';
                            message += `• ${time} - ${serviceName} con ${clientName}\n`;
                        });
                        message += `\n`;
                    }

                    if (pendingTasks && pendingTasks.length > 0) {
                        message += `✅ *Tareas de hoy/pendientes (${pendingTasks.length}):*\n`;
                        pendingTasks.forEach((t: any) => {
                            const dueDate = new Date(t.due_date);
                            const prefix = dueDate < now ? '⚠️' : '•';
                            const timeStr = dueDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: profile.timezone || 'America/Mexico_City' });
                            message += `${prefix} ${t.title} (${timeStr})\n`;
                        });
                        message += `\n`;
                    }
                } else {
                    // ALERT ONLY MODE (Outside morning window)
                    message = `🔔 *Recordatorio:* 🔔\n\n`;
                }

                // Always add Alerts section (Countdown reminders)
                if (hasAlerts) {
                    const sortedRules = rules.sort((a, b) => a.ms - b.ms);
                    sortedRules.forEach(rule => {
                        const tasks = taskAlerts[rule.label];
                        if (tasks && tasks.length > 0) {
                            let niceLabel = rule.label
                                .replace(/\bdays\b/gi, 'días').replace(/\bday\b/gi, 'día')
                                .replace(/\bhours\b/gi, 'horas').replace(/\bhour\b/gi, 'hora')
                                .replace(/\bweeks\b/gi, 'semanas').replace(/\bweek\b/gi, 'semana');

                            message += `⏰ *Vence en ${niceLabel}:*\n`;
                            tasks.forEach(t => {
                                const timeStr = new Date(t.due_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: profile.timezone || 'America/Mexico_City' });
                                message += `• ${t.title} (${timeStr})\n`;
                            });
                            message += `\n`;
                        }
                    });
                }

                message += `_Responde con "gracias" para seguir recibiendo recordatorios diarios._`

                // --- SENDING ---
                // Decide which instance to use (Master Override)
                let senderInstance = profile.evolution_instance_name;
                let senderApiKey = profile.evolution_api_key;
                let senderUrl = profile.evolution_api_url || Deno.env.get('EVOLUTION_API_URL') || 'https://evolutionapi-evolution-api.mcjhhb.easypanel.host';

                if (masterProfile) {
                    console.log(`>>> Using Master Instance (ElinaHead) for send`);
                    senderInstance = masterProfile.evolution_instance_name;
                    senderApiKey = masterProfile.evolution_api_key;
                    senderUrl = masterProfile.evolution_api_url || senderUrl;
                }

                const sendUrl = `${senderUrl}/message/sendText/${senderInstance}`;
                const cleanPhone = profile.contact_phone.replace('+', '').trim();
                // Special handle for MX numbers (often need to remove the '1' prefix for cellphones if sent from some APIs)
                // But for WhatsApp, 521 and 52 are valid. Let's try to normalize to 52 for consistency if master is 52.
                let targetPhone = cleanPhone;
                if (targetPhone.startsWith('521')) targetPhone = '52' + targetPhone.substring(3);

                const response = await fetch(sendUrl, {
                    method: 'POST',
                    headers: { 'apikey': senderApiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ number: targetPhone, text: message, delay: 1000, linkPreview: false })
                });

                if (response.ok) {
                    console.log(`+++ Sent to ${targetPhone} via ${senderInstance}`);
                    successCount++;
                } else {
                    const err = await response.text();
                    console.error(`!!! Failed to send to ${targetPhone}:`, err);
                    failCount++;
                }

            } catch (err) {
                console.error(`!!! Exception for user ${profile.id}:`, err);
                failCount++;
            }
        }

        return new Response(JSON.stringify({ success: true, sent: successCount, failed: failCount }), { status: 200 })

    } catch (error: any) {
        console.error('!!! FATAL:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
