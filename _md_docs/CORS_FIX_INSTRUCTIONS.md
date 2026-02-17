# Instructions to Fix CORS and Webhook Issues

We have resolved the CORS issues by updating both the frontend code and the n8n workflow. Please follow these steps to apply the fixes:

## 1. Import Updated n8n Workflow
The workflow file `n8n/Elina V4 Simulacion COMPLETO.json` has been updated to:
- Allow all origins (`Allowed Origins: *`) in the Webhook node.
- Include `Access-Control-Allow-Origin: *` headers in all "Respond to Webhook" nodes (Text, Image, Video, Audio, PDF).

**Action:**
1. Open your n8n instance.
2. Delete or deactivate the old "Elina V4 Simulacion" workflow.
3. Import the updated file: `n8n/Elina V4 Simulacion COMPLETO.json` (located in your project folder).
4. **Activate** the new workflow.

## 2. Reload Frontend
The file `prompt-training.js` was updated to use the production webhook URL (`/webhook/`) instead of the test URL (`/webhook-test/`). The test URL often has different CORS behavior and should not be used for this integration.

**Action:**
1. Make sure your local development server is running (`npm run dev`).
2. **Hard Refresh** your browser (Ctrl+F5 or Cmd+Shift+R) to load the latest JavaScript files.
3. Try the simulation again.

## 3. Verification
- Open the Browser Developer Tools (F12) -> Network tab.
- Send a message in the simulation.
- Look for the request to `.../webhook/elina-simulacion` (NOT `webhook-test`).
- Verify it returns a 200 OK status.
