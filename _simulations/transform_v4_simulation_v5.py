import json
import os
import sys

# Paths
SOURCE_V4 = r'h:\DESAL\ELina 26\n8n\Elina V4.json'
SIM_COMPLETO = r'h:\DESAL\ELina%2026\n8n\Elina%20V4%20Simulacion%20COMPLETO.json'.replace('%20', ' ')
OUTPUT_SIM = r'h:\DESAL\ELina 26\n8n\Elina V4 Simulacion ACTUALIZADO.json'

try:
    with open(SOURCE_V4, 'r', encoding='utf-8') as f:
        v4_data = json.load(f)
except Exception as e:
    print(f"Error loading V4 file: {e}")
    sys.exit(1)

# --- 1. Modify Webhook1 ---
for node in v4_data['nodes']:
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

# --- 2. Create and Inject "Detectar Simulación" Node ---
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
v4_data['nodes'].append(detect_sim_node)

# --- 3. Modify evolution_instance_name1 to look by userId ---
for node in v4_data['nodes']:
    if node['name'] == 'evolution_instance_name1':
        node['parameters']['filters']['conditions'] = [
            {"keyName": "id", "condition": "eq", "keyValue": "={{ $json.simulationUserId }}"}
        ]

# --- 4. Modify buscar contacto1 to use RPC or virtual logic ---
# For simulation, we want to skip real contact search or mock it.
# We'll use the rpc logic from COMPLETO.json if possible, or just a mock code node.
# Let's replace the node 'buscar contacto1' with a simulation-friendly one.
for node in v4_data['nodes']:
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
            "jsonBody": "={{ JSON.stringify({ p_user_id: $json.simulationUserId }) }}",
            "options": {}
        }

# --- 5. Modify Obtener Prompt y Configuración1 ---
for node in v4_data['nodes']:
    if node['name'] == 'Obtener Prompt y Configuración1':
        node['parameters']['filters']['conditions'] = [
            {"keyName": "user_id", "condition": "eq", "keyValue": "={{ $('Detectar Simulación').item.json.simulationUserId }}"}
        ]

# --- 6. Rewire Connections ---
connections = v4_data.get('connections', {})

# Remove old Webhook1 connections
if 'Webhook1' in connections:
    connections['Webhook1']['main'] = [[{"node": "Detectar Simulación", "type": "main", "index": 0}]]

# Connect Detectar Simulación to evolution_instance_name1
connections['Detectar Simulación'] = {"main": [[{"node": "evolution_instance_name1", "type": "main", "index": 0}]]}

# Bypass: Connect evolution_instance_name1 directly to buscar contacto1
if 'evolution_instance_name1' in connections:
    connections['evolution_instance_name1']['main'] = [[{"node": "buscar contacto1", "type": "main", "index": 0}]]

# Bypass: Connect buscar contacto1 directly to Merge (which leads to Obtener Prompt) 
# Note: In V4, buscar contacto1 leads to Merge.
if 'buscar contacto1' in connections:
    # Instead of subscription check, go to Merge
    connections['buscar contacto1']['main'] = [[{"node": "Merge", "type": "main", "index": 0}]]

# --- 7. Final Output Nodes Conversion ---
for node in v4_data['nodes']:
    if node.get('type') == 'n8n-nodes-evolution-api.evolutionApi':
        node['type'] = 'n8n-nodes-base.respondToWebhook'
        node['typeVersion'] = 1.1
        
        # Standardize simulation response
        resp_type = 'text'
        if "audio" in node['name'].lower(): resp_type = 'audio'
        if "pdf" in node['name'].lower(): resp_type = 'document'
        if "imagen" in node['name'].lower(): resp_type = 'image'
        
        node['parameters'] = {
            "respondWith": "json",
            "responseBody": "={{ JSON.stringify({ success: true, response: ($json.messageText || $json.output || $json['mensaje texto '] || $json.caption || $json.content || ''), type: '" + resp_type + "', pdf_url: ($json.media || $json.pdf_url || undefined), quote_id: ($json.quote_id || undefined), simulation: true }) }}",
            "options": {
                "responseHeaders": {
                    "entries": [
                        {"name": "Access-Control-Allow-Origin", "value": "*"}
                    ]
                }
            }
        }
        if 'credentials' in node: del node['credentials']

# --- 8. AI Agent System Prompt Correction ---
for node in v4_data['nodes']:
    if node['name'] == 'AI Agent':
        if 'parameters' not in node: node['parameters'] = {}
        if 'options' not in node['parameters']: node['parameters']['options'] = {}
        sys_msg = node['parameters']['options'].get('systemMessage', '')
        # Direct replacement using indices to be safe
        sys_msg = sys_msg.replace("$('Obtener Prompt y Configuración1').item.json.prompt_content", "$('Detectar Simulación').item.json.draftPrompt || $('Obtener Prompt y Configuración1').item.json.prompt_content")
        sys_msg = sys_msg.replace("$items('Obtener Prompt y Configuración1')[0]?.json?.prompt_content", "$items('Detectar Simulación')[0]?.json?.draftPrompt || $items('Obtener Prompt y Configuración1')[0]?.json?.prompt_content")
        node['parameters']['options']['systemMessage'] = sys_msg
        
        # Fix model typo
        if node['parameters'].get('model', {}).get('value') == 'gpt-4.1-mini':
            node['parameters']['model']['value'] = 'gpt-4o-mini'
            node['parameters']['model']['cachedResultName'] = 'gpt-4o-mini'

# Save
with open(OUTPUT_SIM, 'w', encoding='utf-8') as f:
    json.dump(v4_data, f, indent=2, ensure_ascii=False)

print(f"Workflow saved to {OUTPUT_SIM}")
