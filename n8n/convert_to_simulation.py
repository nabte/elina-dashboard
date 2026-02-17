import json
import uuid

# Load the original file
try:
    with open('Elina V4.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
except FileNotFoundError:
    print("Elina V4.json not found.")
    exit(1)

# Helper function to find node by name
def find_node_by_name(name):
    for node in data['nodes']:
        if node['name'] == name:
            return node
    return None

# Helper function to find node index by name
def find_node_index_by_name(name):
    for i, node in enumerate(data['nodes']):
        if node['name'] == name:
            return i
    return -1

# 1. Modify Webhook
webhook_node = find_node_by_name('Webhook1')
if webhook_node:
    webhook_node['parameters']['path'] = 'elina-simulacion'
    # Use different webhook ID to avoid conflict if needed, or keep same
    webhook_node['webhookId'] = str(uuid.uuid4())

# 2. Add Detectar Simulación Node
detect_node = {
    "parameters": {
        "jsCode": """// Detectar si es simulación y extraer datos
const body = $input.item.json.body || $input.item.json;
const isSimulation = true;
const userId = body.user_id || body.simulationUserId;
const messageText = body.message || '';
const draftPrompt = body.draft_prompt || '';
const contactId = body.contact_id || 'SIM-' + (userId ? userId.slice(0,8) : '000');

return [{
  json: {
    isSimulation,
    simulationUserId: userId,
    messageText,
    draftPrompt,
    contactId,
    body: {
        user_id: userId,
        message: messageText,
        draft_prompt: draftPrompt,
        contact_id: contactId,
        instance: 'SIMULATION'
    }
  }
}];"""
    },
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [-2250, 8864], # Positioned near Webhook
    "id": str(uuid.uuid4()),
    "name": "Detectar Simulación"
}
data['nodes'].append(detect_node)

# 3. Modify AI Agent to use draft prompt
ai_agent = find_node_by_name('AI Agent')
if ai_agent:
    options = ai_agent['parameters'].get('options', {})
    system_msg = options.get('systemMessage', '')
    # Replace the prompt injection
    # Old: {{ $items("Obtener Prompt y Configuración1")[0].json.prompt_content }}
    # New: {{ $('Detectar Simulación').item.json.draftPrompt || $items("Obtener Prompt y Configuración1")[0].json.prompt_content }}
    
    if '{{ $items("Obtener Prompt y Configuración1")[0].json.prompt_content }}' in system_msg:
        new_prompt = "{{ $('Detectar Simulación').item.json.draftPrompt || $items(\"Obtener Prompt y Configuración1\")[0].json.prompt_content }}"
        system_msg = system_msg.replace(
            '{{ $items("Obtener Prompt y Configuración1")[0].json.prompt_content }}', 
            new_prompt
        )
        options['systemMessage'] = system_msg
        ai_agent['parameters']['options'] = options

# 4. Filter Bypass Wiring
# We need to manipulate 'connections' object.
connections = data['connections']

# Helper to remove connection FROM a node
def remove_connection_from(node_name):
    if node_name in connections:
        del connections[node_name]

# Helper to remove connection TO a node (harder, need to scan all)
def remove_connection_to(target_node_name):
    for source, outputs in list(connections.items()):
        new_outputs = {}
        for output_name, links in outputs.items():
            new_links = [l for l in links if l[0]['node'] != target_node_name]
            if new_links:
                new_outputs[output_name] = new_links
        if new_outputs:
            connections[source] = new_outputs
        else:
            del connections[source]

# Rewire: Webhook1 -> Detectar Simulación -> evolution_instance_name1
remove_connection_from('Webhook1')
connections['Webhook1'] = {
    "main": [[{"node": "Detectar Simulación", "type": "main", "index": 0}]]
}

connections['Detectar Simulación'] = {
    "main": [[{"node": "evolution_instance_name1", "type": "main", "index": 0}]]
}

# Bypass: evolution_instance_name1 -> buscar contacto1 (Skip Get Subscription1, If2)
# Remove Get Subscription1 and If2
remove_connection_from('evolution_instance_name1')
connections['evolution_instance_name1'] = {
    "main": [[{"node": "buscar contacto1", "type": "main", "index": 0}]]
}

# Clean up disconnected filter nodes (optional, but good)
# We just leave them disconnected or remove them.
# Removing 'Get Subscription1' and 'If2' from connections is enough to bypass.

# Bypass: ignorar?1
# Merge5 -> exist? (ignorar?1 was in between?)
# In V4: Merge5 -> ignorar?1 -> Create a row1
# We want: Merge5 -> Create a row1
remove_connection_from('Merge5')
connections['Merge5'] = {
    "main": [[{"node": "Create a row1", "type": "main", "index": 0}]]
}

# 5. Replace Evolution API nodes with Respond to Webhook
evolution_nodes = [
    ('Enviar texto3', 'text'),
    ('Enviar imagem', 'image'),
    ('Enviar Video1', 'video'),
    ('Enviar audio', 'audio'),
    ('Enviar PDF Cotización', 'document')
]

for node_name, msg_type in evolution_nodes:
    node = find_node_by_name(node_name)
    if node:
        # Change type
        node['type'] = 'n8n-nodes-base.respondToWebhook'
        node['typeVersion'] = 1.1
        # Remove credentials
        if 'credentials' in node:
            del node['credentials']
        
        # Set parameters
        response_body = ""
        if msg_type == 'text':
            response_body = "={{ JSON.stringify({ success: true, response: ($json.messageText || $json.output || $json['mensaje texto '] || $json.caption || $json.content || ''), type: 'text', simulation: true }) }}"
        elif msg_type == 'image':
            response_body = "={{ JSON.stringify({ success: true, response: ($json.caption || ''), type: 'image', media_url: ($json.media || $json.media_url || $json.url_imagen), simulation: true }) }}"
        elif msg_type == 'video':
            response_body = "={{ JSON.stringify({ success: true, response: ($json.caption || ''), type: 'video', media_url: ($json.media || $json.urlVideo), simulation: true }) }}"
        elif msg_type == 'document':
            response_body = "={{ JSON.stringify({ success: true, response: 'Documento generada', type: 'document', pdf_url: ($json.media || $json.pdf_url || undefined), quote_id: ($json.quote_id || undefined), simulation: true }) }}"
        elif msg_type == 'audio':
             response_body = "={{ JSON.stringify({ success: true, response: 'Audio enviado', type: 'audio', audio_url: ($json.media || $json.audio_url || undefined), simulation: true }) }}"

        node['parameters'] = {
            "respondWith": "json",
            "responseBody": response_body,
            "options": {
                "responseHeaders": {
                    "entries": [
                        {
                            "name": "Access-Control-Allow-Origin",
                            "value": "*"
                        }
                    ]
                }
            }
        }

# 6. Save
with open('Elina V4 Simulacion Final.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Created Elina V4 Simulacion Final.json with updates.")
