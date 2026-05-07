import { MISTRAL_API_URL, MISTRAL_MODEL } from "./constants";

export async function streamMistral(apiKey, messages, options = {}) {
    const { onDelta, tools = [] } = typeof options === "function" ? { onDelta: options } : options;
    const response = await fetch(MISTRAL_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream"
        },
        body: JSON.stringify({
            model: MISTRAL_MODEL,
            messages,
            tools,
            tool_choice: "auto",
            temperature: 0.2,
            stream: true
        })
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Mistral API error (${response.status}): ${body || response.statusText}`);
    }
    if (!response.body) {
        throw new Error("Mistral streaming response has no body.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    const toolCallsByIndex = new Map();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let separatorIndex;
            while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
                const rawEvent = buffer.slice(0, separatorIndex);
                buffer = buffer.slice(separatorIndex + 2);
                const dataLine = rawEvent
                    .split("\n")
                    .map(line => line.startsWith("data:") ? line.slice(5).trimStart() : null)
                    .filter(Boolean)
                    .join("");
                if (!dataLine || dataLine === "[DONE]") continue;

                let payload;
                try {
                    payload = JSON.parse(dataLine);
                } catch {
                    continue;
                }

                const delta = payload.choices?.[0]?.delta;
                if (!delta) continue;

                if (typeof delta.content === "string" && delta.content) {
                    content += delta.content;
                    if (onDelta) onDelta(delta.content, content);
                }

                if (Array.isArray(delta.tool_calls)) {
                    for (const part of delta.tool_calls) {
                        const index = part.index ?? 0;
                        const existing = toolCallsByIndex.get(index) || {
                            id: "",
                            type: "function",
                            function: { name: "", arguments: "" }
                        };
                        if (part.id) existing.id = part.id;
                        if (part.type) existing.type = part.type;
                        if (part.function?.name) existing.function.name = part.function.name;
                        if (typeof part.function?.arguments === "string") {
                            existing.function.arguments += part.function.arguments;
                        }
                        toolCallsByIndex.set(index, existing);
                    }
                }
            }
        }
    } finally {
        reader.releaseLock?.();
    }

    const toolCalls = [...toolCallsByIndex.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, value]) => value);

    return { content, tool_calls: toolCalls };
}
