import json
import os
import sys

input_file = r'h:\DESAL\ELina 26\n8n\Elina V4.json'
output_file = r'h:\DESAL\ELina 26\n8n\Elina V4 Simulacion ACTUALIZADO.json'

try:
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    print(f"Error loading input file: {e}")
    sys.exit(1)

nodes_found = []

for node in data.get('nodes', []):
    name = node.get('name')
    
    # 1. Update Trigger
    if node.get('type') == 'n8n-nodes-base.webhook' and name == 'Webhook1':
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
        nodes_found.append('Webhook1')

    # 2. Update If3 (Bypass "fromMe" check for simulation)
    if name == 'If3':
        node['parameters']['conditions']['conditions'] = [
            {
                "id": "sim_bypass",
                "leftValue": "={{ $json.body.isSimulation || true }}",
                "rightValue": "true",
                "operator": {"type": "boolean", "operation": "true", "singleValue": True}
            }
        ]
        nodes_found.append('If3')

    # 3. Update evolution_instance_name1 (Bypass instance check or use user_id)
    if name == 'evolution_instance_name1':
        # Instead of searching by instance, we'll try to get the profile by user_id if it's a simulation
        node['parameters']['filters']['conditions'] = [
            {
                "keyName": "id",
                "condition": "eq",
                "keyValue": "={{ $json.body.user_id }}"
            }
        ]
        nodes_found.append('evolution_instance_name1')

    # 4. Update Set Fields1
    if name == 'Set Fields1':
        node['parameters'] = {
            "assignments": {
                "assignments": [
                    {"id": "sim_user_id", "name": "user.id", "value": "={{ $items(\"Webhook1\")[0].json.body.user_id }}", "type": "string"},
                    {"id": "sim_msg", "name": "message.content", "value": "={{ $items(\"Webhook1\")[0].json.body.message }}", "type": "string"},
                    {"id": "sim_draft", "name": "message.draft_prompt", "value": "={{ $items(\"Webhook1\")[0].json.body.draft_prompt || '' }}", "type": "string"},
                    {"id": "sim_contact", "name": "message.chat_id", "value": "={{ $items(\"Webhook1\")[0].json.body.contact_id || 'SIM-' + $items(\"Webhook1\")[0].json.body.user_id.slice(0,8) }}", "type": "string"},
                    {"id": "sim_type", "name": "message.content_type", "value": "text", "type": "string"},
                    {"id": "sim_ts", "name": "message.timestamp", "value": "={{ $now }}", "type": "string"},
                    {"id": "sim_instance", "name": "instance.name", "value": "SIMULATION", "type": "string"}
                ]
            }
        }
        nodes_found.append('Set Fields1')

    # 5. Fix models and system prompt in AI Agent
    if name == 'AI Agent':
        if 'parameters' not in node: node['parameters'] = {}
        if 'options' not in node['parameters']: node['parameters']['options'] = {}
        sys_msg = node['parameters']['options'].get('systemMessage', '')
        # Robust replacement
        sys_msg = sys_msg.replace("$('Obtener Prompt y Configuración1').item.json.prompt_content", "$('Set Fields1').item.json.message.draft_prompt || $('Obtener Prompt y Configuración1').item.json.prompt_content")
        sys_msg = sys_msg.replace("$items('Obtener Prompt y Configuración1')[0]?.json?.prompt_content", "$items('Set Fields1')[0]?.json?.message?.draft_prompt || $items('Obtener Prompt y Configuración1')[0]?.json?.prompt_content")
        node['parameters']['options']['systemMessage'] = sys_msg
        nodes_found.append('AI Agent')

    if node.get('type') == '@n8n/n8n-nodes-langchain.lmChatOpenAi':
        if node['parameters'].get('model', {}).get('value') == 'gpt-4.1-mini':
            node['parameters']['model']['value'] = 'gpt-4o-mini'
            node['parameters']['model']['cachedResultName'] = 'gpt-4o-mini'

    # 6. Replace Evolution Nodes with robust responses
    if node.get('type') == 'n8n-nodes-evolution-api.evolutionApi':
        node['type'] = 'n8n-nodes-base.respondToWebhook'
        node['typeVersion'] = 1.1
        resp_body = "={{ JSON.stringify({ success: true, response: ($json.messageText || $json.output || $json['mensaje texto '] || $json.caption || $json.content || ''), type: 'text', pdf_url: ($json.media || $json.pdf_url || undefined), quote_id: ($json.quote_id || undefined) }) }}"
        node['parameters'] = {"respondWith": "json", "responseBody": resp_body}
        if 'credentials' in node: del node['credentials']

# 7. Final checks on Profile/Prompt nodes to ensure they use user_id correctly
for node in data.get('nodes', []):
    if node.get('name') in ['Get a row1', 'Obtener Perfil de Usuario1', 'Obtener Prompt y Configuración1']:
        if 'parameters' not in node: node['parameters'] = {}
        if 'filters' not in node['parameters']: node['parameters']['filters'] = {'conditions': []}
        node['parameters']['filters']['conditions'] = [
            {"keyName": "id" if node.get('name') == 'Obtener Perfil de Usuario1' or node.get('name') == 'Get a row1' else "user_id", 
             "condition": "eq", 
             "keyValue": "={{ $items(\"Webhook1\")[0]?.json?.body?.user_id }}"}
        ]

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Summary of changes: {nodes_found}")
print(f"Workflow saved to {output_file}")
