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
        print(f"Updating Webhook1 at position {node.get('position')}")
        if 'parameters' not in node: node['parameters'] = {}
        node['parameters']['path'] = 'elina-simulacion'
        node['parameters']['httpMethod'] = 'POST'
        node['parameters']['responseMode'] = 'onSendMessage'
        node['parameters']['options'] = {
            'responseHeaders': {
                'entries': [
                    {'name': 'Access-Control-Allow-Origin', 'value': '*'},
                    {'name': 'Access-Control-Allow-Methods', 'value': 'GET, POST, OPTIONS'},
                    {'name': 'Access-Control-Allow-Headers', 'value': 'Content-Type, Authorization'}
                ]
            }
        }
        nodes_found.append('Webhook1')

    # 2. Update Set Fields
    if name == 'Set Fields1':
        print(f"Updating Set Fields1 at position {node.get('position')}")
        if 'parameters' not in node: node['parameters'] = {}
        node['parameters']['assignments'] = {
            'assignments': [
                {"id": "sim_user_id", "name": "user.id", "value": "={{ $node.Webhook1.json.body.user_id }}", "type": "string"},
                {"id": "sim_msg", "name": "message.content", "value": "={{ $node.Webhook1.json.body.message }}", "type": "string"},
                {"id": "sim_draft", "name": "message.draft_prompt", "value": "={{ $node.Webhook1.json.body.draft_prompt || '' }}", "type": "string"},
                {"id": "sim_contact", "name": "message.chat_id", "value": "={{ $node.Webhook1.json.body.contact_id || 'SIM-' + $node.Webhook1.json.body.user_id.slice(0,8) }}", "type": "string"},
                {"id": "sim_type", "name": "message.content_type", "value": "text", "type": "string"},
                {"id": "sim_ts", "name": "message.timestamp", "value": "={{ $now }}", "type": "string"},
                {"id": "sim_instance", "name": "instance.name", "value": "SIMULATION", "type": "string"}
            ]
        }
        node['parameters']['options'] = {}
        nodes_found.append('Set Fields1')

    # 3. Update AI Agent System Message
    if name == 'AI Agent':
        print(f"Updating AI Agent system prompt")
        if 'parameters' not in node: node['parameters'] = {}
        if 'options' not in node['parameters']: node['parameters']['options'] = {}
        sys_msg = node['parameters']['options'].get('systemMessage', '')
        # Ensure we use draft_prompt if available
        if 'prompt_content' in sys_msg:
             node['parameters']['options']['systemMessage'] = sys_msg.replace(
                 "{{ $('Obtener Prompt y Configuración1').item.json.prompt_content }}",
                 "{{ $('Set Fields1').item.json.message.draft_prompt || $('Obtener Prompt y Configuración1').item.json.prompt_content }}"
             ).replace(
                 "{{$items('Obtener Prompt y Configuración1')[0]?.json?.prompt_content}}",
                 "{{$items('Set Fields1')[0]?.json?.message?.draft_prompt || $items('Obtener Prompt y Configuración1')[0]?.json?.prompt_content}}"
             )
        nodes_found.append('AI Agent')

    # 4. Replace Evolution Nodes
    if node.get('type') == 'n8n-nodes-evolution-api.evolutionApi':
        print(f"Replacing Evolution node: {name}")
        node['type'] = 'n8n-nodes-base.respondToWebhook'
        node['typeVersion'] = 1.1
        resp_body = ""
        
        if "audio" in name.lower():
            resp_body = "={{ JSON.stringify({ success: true, response: $json['mensaje texto '] || $json.output || '', type: 'audio', audio_url: $json.media || $json.url_audio }) }}"
        elif "pdf" in name.lower() or "cotización" in name.lower():
            resp_body = "={{ JSON.stringify({ success: true, response: $json.caption || $json.output || '', type: 'document', pdf_url: $json.media || $json.pdf_url, quote_id: $json.quote_id }) }}"
        else:
            # Default text response
            # Note: Many nodes use 'messageText' or 'output'
            resp_body = "={{ JSON.stringify({ success: true, response: $json.messageText || $json.output || $json['mensaje texto '] || '', type: 'text' }) }}"
        
        node['parameters'] = {
            "respondWith": "json",
            "responseBody": resp_body,
            "options": {}
        }
        if 'credentials' in node:
            del node['credentials']
        nodes_found.append(f"Replaced {name}")

# 5. Fix Profile Fetch (Get a row1)
for node in data.get('nodes', []):
    if node.get('name') in ['Get a row1', 'Obtener Perfil de Usuario1']:
        print(f"Fixing Profile Fetch node: {node.get('name')}")
        if 'parameters' not in node: node['parameters'] = {}
        if 'filters' not in node['parameters']: node['parameters']['filters'] = {'conditions': []}
        node['parameters']['filters']['conditions'] = [
            {"keyName": "id", "condition": "eq", "keyValue": "={{ $('Set Fields1').item.json.user.id }}"}
        ]

print(f"Summary of changes: {nodes_found}")

try:
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Successfully created {output_file}")
except Exception as e:
    print(f"Error saving output file: {e}")
