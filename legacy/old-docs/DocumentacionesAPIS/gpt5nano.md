Sample code and API for GPT - 5 Nano

OpenRouter normalizes requests and responses across providers for you.
Create API key
OpenRouter provides an OpenAI - compatible completion API to 300 + models & providers that you can call directly, or using the OpenAI SDK.Additionally, some third-party SDKs are available.

In the examples below, the OpenRouter - specific headers are optional.Setting them allows your app to appear on the OpenRouter leaderboards.

@openrouter/sdk
openai - python
python
typescript
openai - typescript
curl

Copy
import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
    apiKey: "<OPENROUTER_API_KEY>"
});

const stream = await openrouter.chat.send({
    model: "openai/gpt-5-nano",
    messages: [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "What is in this image?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://live.staticflickr.com/3851/14825276609_098cac593d_b.jpg"
                    }
                }
            ]
        }
    ],
    stream: true
});

for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
        process.stdout.write(content);
    }
}
Using third - party SDKs
For information about using third-party SDKs and frameworks with OpenRouter, please see our frameworks documentation.

See the Request docs for all possible fields, and Parameters for explanations of specific sampling parameters.


    typescriptfetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": "Bearer <OPENROUTER_API_KEY>",
            "HTTP-Referer": "<YOUR_SITE_URL>", // Optional. Site URL for rankings on openrouter.ai.
            "X-Title": "<YOUR_SITE_NAME>", // Optional. Site title for rankings on openrouter.ai.
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": "openai/gpt-5-nano",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "What is in this image?"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": "https://live.staticflickr.com/3851/14825276609_098cac593d_b.jpg"
                            }
                        }
                    ]
                }
            ]
        })
    });