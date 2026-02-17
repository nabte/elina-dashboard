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
        print(f"Updating Webhook1")
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

    # 2. Update Set Fields
    if name == 'Set Fields1':
        print(f"Updating Set Fields1")
        # Ensure we don't use pairing for simulation inputs
        node['parameters'] = {
            "assignments": {
                "assignments": [
                    {"id": "sim_user_id", "name": "user.id", "value": "={{ $json.body.user_id }}", "type": "string"},
                    {"id": "sim_msg", "name": "message.content", "value": "={{ $json.body.message }}", "type": "string"},
                    {"id": "sim_draft", "name": "message.draft_prompt", "value": "={{ $json.body.draft_prompt || '' }}", "type": "string"},
                    {"id": "sim_contact", "name": "message.chat_id", "value": "={{ $json.body.contact_id || 'SIM-' + $json.body.user_id.slice(0,8) }}", "type": "string"},
                    {"id": "sim_type", "name": "message.content_type", "value": "text", "type": "string"},
                    {"id": "sim_ts", "name": "message.timestamp", "value": "={{ $now }}", "type": "string"},
                    {"id": "sim_instance", "name": "instance.name", "value": "SIMULATION", "type": "string"}
                ]
            }
        }
        nodes_found.append('Set Fields1')

    # 3. Update AI Agent
    if name == 'AI Agent':
        print(f"Updating AI Agent")
        if 'parameters' not in node: node['parameters'] = {}
        if 'options' not in node['parameters']: node['parameters']['options'] = {}
        
        sys_msg = node['parameters']['options'].get('systemMessage', '')
        # Fix dynamic references
        sys_msg = sys_msg.replace(
            "{{ $('Obtener Prompt y Configuración1').item.json.prompt_content }}",
            "{{ $('Set Fields1').item.json.message.draft_prompt || $('Obtener Prompt y Configuración1').item.json.prompt_content }}"
        ).replace(
            "{{$items('Obtener Prompt y Configuración1')[0]?.json?.prompt_content}}",
            "{{$items('Set Fields1')[0]?.json?.message?.draft_prompt || $items('Obtener Prompt y Configuración1')[0]?.json?.prompt_content}}"
        )
        node['parameters']['options']['systemMessage'] = sys_msg
        nodes_found.append('AI Agent')

    # 4. Fix Models (gpt-4.1-mini -> gpt-4o-mini)
    if node.get('type') == '@n8n/n8n-nodes-langchain.lmChatOpenAi':
        val = node['parameters'].get('model', {}).get('value')
        if val == 'gpt-4.1-mini':
            print(f"Fixing model typo in {name}")
            node['parameters']['model']['value'] = 'gpt-4o-mini'
            node['parameters']['model']['cachedResultName'] = 'gpt-4o-mini'

    # 5. Replace Evolution Nodes
    if node.get('type') == 'n8n-nodes-evolution-api.evolutionApi':
        print(f"Replacing Evolution node: {name}")
        node['type'] = 'n8n-nodes-base.respondToWebhook'
        node['typeVersion'] = 1.1
        
        # Use more robust expressions that don't depend on strict pairing
        resp_body = ""
        if "audio" in name.lower():
            resp_body = "={{ JSON.stringify({ success: true, response: $items(\"que escribir como audio1\")[0]?.json['mensaje texto '] || 'Audio generado', type: 'audio', audio_url: $json.media || $json.url_audio }) }}"
        elif "pdf" in name.lower() or "cotización" in name.lower():
            resp_body = "={{ JSON.stringify({ success: true, response: $items(\"Preparar después de Cotización\")[0]?.json.output || 'Cotización generada', type: 'document', pdf_url: $json.media || $json.pdf_url, quote_id: $json.quote_id }) }}"
        else:
            resp_body = "={{ JSON.stringify({ success: true, response: $json.messageText || $json.output || $json['mensaje texto '] || '', type: 'text' }) }}"
            
        node['parameters'] = {
            "respondWith": "json",
            "responseBody": resp_body,
            "options": {}
        }
        if 'credentials' in node:
            del node['credentials']
        nodes_found.append(f"Replaced {name}")

    # 6. Fix "create-quote" typo
    if name == 'Crear Cotización':
        if 'jsonBody' in node['parameters']:
            node['parameters']['jsonBody'] = node['parameters']['jsonBody'].replace('=={', '={{')

# 7. Fix Profile Fetch
for node in data.get('nodes', []):
    if node.get('name') in ['Get a row1', 'Obtener Perfil de Usuario1']:
        node['parameters']['filters']['conditions'] = [
            {"keyName": "id", "condition": "eq", "keyValue": "={{ $items(\"Set Fields1\")[0]?.json?.user?.id }}"}
        ]

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Summary of changes: {nodes_found}")
print(f"Updated simulation workflow saved to {output_file}")
