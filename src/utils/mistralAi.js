import { MAX_TOOL_ROUNDS } from "./mistralAi/constants";
import { streamMistral } from "./mistralAi/client";
import { getSystemPrompt } from "./mistralAi/prompt";
import { normalizeContent } from "./mistralAi/shared";
import { executeToolCall, tools } from "./mistralAi/toolRegistry";

export async function sendMistralChat(apiKey, chatMessages, { onDelta } = {}) {
    const trimmedApiKey = (apiKey || "").trim();
    if (!trimmedApiKey) {
        throw new Error("Mistral API key is missing.");
    }

    const messages = [
        { role: "system", content: getSystemPrompt() },
        ...chatMessages
            .filter(message => ["user", "assistant"].includes(message.role) && message.content)
            .slice(-12)
            .map(message => ({ role: message.role, content: message.content }))
    ];

    let finalContent = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const message = await streamMistral(trimmedApiKey, messages, { onDelta, tools });
        const toolCalls = message.tool_calls || [];

        if (toolCalls.length === 0) {
            const content = normalizeContent(message.content);
            if (!content) {
                throw new Error("Mistral returned an empty message.");
            }
            finalContent = content;
            return finalContent;
        }

        messages.push({
            role: "assistant",
            content: message.content || "",
            tool_calls: toolCalls
        });

        for (const toolCall of toolCalls) {
            const result = await executeToolCall(toolCall);
            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: toolCall.function?.name,
                content: JSON.stringify(result)
            });
        }
    }

    throw new Error("The AI used too many tool calls. Please try a more specific request.");
}
