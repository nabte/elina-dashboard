import json
import os

input_file = r'h:\DESAL\ELina 26\n8n\Elina V4.json'
output_file = r'h:\DESAL\ELina 26\n8n\Elina V4 Simulacion ACTUALIZADO.json'

with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. Update Trigger
for node in data.get('nodes', []):
    if node.get('type') == 'n8n-nodes-base.webhook' and node.get('name') == 'Webhook1':
        node['parameters']['path'] = 'elina-simulacion'
        node['parameters']['options'] = {'responseHeaders': {'entries': [{'name': 'Access-Control-Allow-Origin', 'value': '*'}]}}

# 2. Update Set Fields (Simplify for simulation)
# We want to support: { user_id, message, draft_prompt, contact_id (optional) }
for node in data.get('nodes', []):
    if node.get('name') == 'Set Fields1':
        # Modify assignments to handle simulation body
        node['parameters']['assignments']['assignments'] = [
            {"id": "sim_user_id", "name": "user.id", "value": "={{ $node.Webhook1.json.body.user_id }}", "type": "string"},
            {"id": "sim_msg", "name": "message.content", "value": "={{ $node.Webhook1.json.body.message }}", "type": "string"},
            {"id": "sim_draft", "name": "message.draft_prompt", "value": "={{ $node.Webhook1.json.body.draft_prompt || '' }}", "type": "string"},
            {"id": "sim_contact", "name": "message.chat_id", "value": "={{ $node.Webhook1.json.body.contact_id || 'SIM-' + $node.Webhook1.json.body.user_id.slice(0,8) }}", "type": "string"},
            {"id": "sim_type", "name": "message.content_type", "value": "text", "type": "string"},
            {"id": "sim_ts", "name": "message.timestamp", "value": "={{ $now }}", "type": "string"},
            {"id": "sim_instance", "name": "instance.name", "value": "SIMULATION", "type": "string"}
        ]

# 3. Update AI Agent System Message to use draft_prompt
for node in data.get('nodes', []):
    if node.get('name') == 'AI Agent':
        # Replace the part that uses prompt_content
        sys_msg = node['parameters'].get('options', {}).get('systemMessage', '')
        if '{{ $(\'Obtener Prompt y Configuración1\').item.json.prompt_content }}' in sys_msg:
             node['parameters']['options']['systemMessage'] = sys_msg.replace(
                 '{{ $(\'Obtener Prompt y Configuración1\').item.json.prompt_content }}',
                 '{{ $(\'Set Fields1\').item.json.message.draft_prompt || $(\'Obtener Prompt y Configuración1\').item.json.prompt_content }}'
             )

# 4. Replace Evolution Send Nodes with Response Nodes
# We'll create response nodes or modify existing ones.
# Actually, it's easier to just find the names/ids and replace their type and parameters.

evo_node_mapping = {
    # Node Name -> New Parameters for Respond to Webhook
    "Enviar audio": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ success: true, response: $json['mensaje texto '], type: 'audio', audio_url: $json.media }) }}"
    },
    "Enviar PDF Cotización": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ success: true, response: $json.caption, type: 'document', pdf_url: $json.media, quote_id: $json.quote_id }) }}"
    },
    "Enviar texto4": { # Lo siento no puedo leer...
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ success: false, response: 'Error: Tipo de archivo no soportado' }) }}"
    }
}

# Generic replacement for any other evolutionApi node
for node in data.get('nodes', []):
    if node.get('type') == 'n8n-nodes-evolution-api.evolutionApi':
        name = node.get('name')
        node['type'] = 'n8n-nodes-base.respondToWebhook'
        node['typeVersion'] = 1.1
        if name in evo_node_mapping:
            node['parameters'] = evo_node_mapping[name]
        else:
            # Default response
            node['parameters'] = {
                "respondWith": "json",
                "responseBody": "={{ JSON.stringify({ success: true, response: $json.messageText || $json.output || '', type: 'text' }) }}"
            }
        # Clear credentials
        if 'credentials' in node:
            del node['credentials']

# 5. Fix Profile Fetch (Get a row1 / Obtener Perfil de Usuario1)
for node in data.get('nodes', []):
    if node.get('name') in ['Get a row1', 'Obtener Perfil de Usuario1', 'Obtener Perfil de Usuario']:
        if node.get('type') == 'n8n-nodes-base.supabase':
            node['parameters']['filters']['conditions'] = [
                {"keyName": "id", "condition": "eq", "keyValue": "={{ $('Set Fields1').item.json.user.id }}"}
            ]

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Successfully created {output_file}")
