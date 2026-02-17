import json
import os
import sys

# Paths
SOURCE_V4 = r'h:\DESAL\ELina 26\n8n\Elina V4.json'
OUTPUT_SIM = r'h:\DESAL\ELina 26\n8n\Elina V4 Simulacion ACTUALIZADO.json'

try:
    with open(SOURCE_V4, 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    print(f"Error loading V4 file: {e}")
    sys.exit(1)

nodes = data.get('nodes', [])
connections = data.get('connections', {})

# 1. Update Webhook1
for node in nodes:
    if node['name'] == 'Webhook1':
        node['parameters'] = {
            "path": "elina-simulacion",
            "httpMethod": "POST",
            "responseMode": "onSendMessage",
            "options": {
                "responseHeaders": {
                    "entries": [
                        {"name": "Access-Control-Allow-Origin", "value": "*"},
                        {"name": "Access-Control-Allow-Methods", "value": "GET, POST, OPTIONS"},
                        {"name": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization"}
                    ]
                }
            }
        }

# 2. Add "Detectar Simulación"
detect_sim_node = {
    "parameters": {
        "jsCode": "// Detectar si es simulación y extraer datos\nconst body = $input.item.json.body || $input.item.json;\nconst isSimulation = true;\nconst userId = body.user_id || body.simulationUserId;\nconst messageText = body.message || '';\nconst draftPrompt = body.draft_prompt || '';\nconst contactId = body.contact_id || 'SIM-' + (userId ? userId.slice(0,8) : '000');\n\nreturn [{\n  json: {\n    isSimulation,\n    simulationUserId: userId,\n    messageText,\n    draftPrompt,\n    contactId,\n    body: {\n        user_id: userId,\n        message: messageText,\n        draft_prompt: draftPrompt,\n        contact_id: contactId,\n        instance: 'SIMULATION'\n    }\n  }\n}];"
    },
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [-2250, 8864],
    "id": "sim-detector-id",
    "name": "Detectar Simulación"
}
nodes.append(detect_sim_node)

# 3. Update evolution_instance_name1
for node in nodes:
    if node['name'] == 'evolution_instance_name1':
        node['parameters']['filters']['conditions'] = [
            {"keyName": "id", "condition": "eq", "keyValue": "={{ $('Detectar Simulación').item.json.simulationUserId }}"}
        ]

# 4. Update buscar contacto1 (Standard RPC for simulations)
for node in nodes:
    if node['name'] == 'buscar contacto1':
        node['type'] = 'n8n-nodes-base.httpRequest'
        node['typeVersion'] = 4.1
        node['parameters'] = {
            "method": "POST",
            "url": "https://mytvwfbijlgbihlegmfg.supabase.co/rest/v1/rpc/get_or_create_simulation_contact",
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE"},
                    {"name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE"},
                    {"name": "Prefer", "value": "return=representation"}
                ]
            },
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({ p_user_id: $('Detectar Simulación').item.json.simulationUserId }) }}",
            "options": {}
        }
        node['alwaysOutputData'] = True

# 5. Update Set Fields1 for Simulation
for node in nodes:
    if node['name'] == 'Set Fields1':
        node['parameters']['assignments']['assignments'] = [
            {"id": "sim_user_id", "name": "user.id", "value": "={{ $('Detectar Simulación').item.json.simulationUserId }}", "type": "string"},
            {"id": "sim_msg", "name": "message.content", "value": "={{ $('Detectar Simulación').item.json.messageText }}", "type": "string"},
            {"id": "sim_draft", "name": "message.draft_prompt", "value": "={{ $('Detectar Simulación').item.json.draftPrompt || '' }}", "type": "string"},
            {"id": "sim_chat", "name": "message.chat_id", "value": "={{ $('Detectar Simulación').item.json.contactId }}", "type": "string"},
            {"id": "sim_type", "name": "message.content_type", "value": "text", "type": "string"},
            {"id": "sim_ts", "name": "message.timestamp", "value": "={{ $now }}", "type": "string"},
            {"id": "sim_inst", "name": "instance.name", "value": "SIMULATION", "type": "string"}
        ]

# 6. Update Obtener Prompt y Configuración1
for node in nodes:
    if node['name'] == 'Obtener Prompt y Configuración1':
        node['parameters']['filters']['conditions'] = [
            {"keyName": "user_id", "condition": "eq", "keyValue": "={{ $('Detectar Simulación').item.json.simulationUserId }}"}
        ]

# 7. AI Agent Polish
for node in nodes:
    if node['name'] == 'AI Agent':
        if 'parameters' not in node: node['parameters'] = {}
        if 'options' not in node['parameters']: node['parameters']['options'] = {}
        sys_msg = node['parameters']['options'].get('systemMessage', '')
        # Use simple replacement for prompt content
        sys_msg = sys_msg.replace("$('Obtener Prompt y Configuración1').item.json.prompt_content", "$('Set Fields1').item.json.message.draft_prompt || $('Obtener Prompt y Configuración1').item.json.prompt_content")
        sys_msg = sys_msg.replace("$items('Obtener Prompt y Configuración1')[0]?.json?.prompt_content", "$items('Set Fields1')[0]?.json?.message?.draft_prompt || $items('Obtener Prompt y Configuración1')[0]?.json?.prompt_content")
        node['parameters']['options']['systemMessage'] = sys_msg
        
        # Model fix
        if node['parameters'].get('model', {}).get('value') == 'gpt-4.1-mini':
            node['parameters']['model']['value'] = 'gpt-4o-mini'
            node['parameters']['model']['cachedResultName'] = 'gpt-4o-mini'

# 8. Respond to Webhook nodes
for node in nodes:
    if node.get('type') == 'n8n-nodes-evolution-api.evolutionApi':
        node['type'] = 'n8n-nodes-base.respondToWebhook'
        node['typeVersion'] = 1.1
        resp_type = 'text'
        if "audio" in node['name'].lower(): resp_type = 'audio'
        if "pdf" in node['name'].lower(): resp_type = 'document'
        if "imagen" in node['name'].lower(): resp_type = 'image'
        
        node['parameters'] = {
            "respondWith": "json",
            "responseBody": "={{ JSON.stringify({ success: true, response: ($json.messageText || $json.output || $json['mensaje texto '] || $json.caption || $json.content || ''), type: '" + resp_type + "', pdf_url: ($json.media || $json.pdf_url || undefined), quote_id: ($json.quote_id || undefined), simulation: true }) }}",
            "options": {
                "responseHeaders": {
                    "entries": [ {"name": "Access-Control-Allow-Origin", "value": "*"} ]
                }
            }
        }
        if 'credentials' in node: del node['credentials']

# 9. REWIRE CONNECTIONS
# Webhook1 -> Detectar Simulación
if 'Webhook1' in connections:
    connections['Webhook1']['main'] = [[{"node": "Detectar Simulación", "type": "main", "index": 0}]]

# Detectar Simulación -> evolution_instance_name1
connections['Detectar Simulación'] = {"main": [[{"node": "evolution_instance_name1", "type": "main", "index": 0}]]}

# evolution_instance_name1 -> buscar contacto1 (Skip If3 and Check if Ignored)
if 'evolution_instance_name1' in connections:
    connections['evolution_instance_name1']['main'] = [[{"node": "buscar contacto1", "type": "main", "index": 0}]]

# buscar contacto1 -> Set Fields1 (Skip Subscription check/If2)
if 'buscar contacto1' in connections:
    connections['buscar contacto1']['main'] = [[{"node": "Set Fields1", "type": "main", "index": 0}]]

# Set Fields1 -> Obtener Prompt y Configuración1 (Wait, in V4 there are some nodes between)
# Actually, let's connect Set Fields1 to whatever was after Get a row1 (the subscription node)
# or just follow the V4 path but from Set Fields1.
# Usually Set Fields1 goes to history buffer then to DivideporType.
# Let's see what was after Set Fields1 in V4.
if 'Set Fields1' in connections:
    # We'll just leave whatever connection it had, or force it to the main logic path.
    pass

with open(OUTPUT_SIM, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Workflow saved to {OUTPUT_SIM}")
