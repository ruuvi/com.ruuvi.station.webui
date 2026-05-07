import logger from "../logger";
import { parseToolArguments } from "./shared";
import { toolModules } from "./tools";

export const tools = toolModules.map(tool => tool.definition);

const toolHandlers = toolModules.reduce((handlers, tool) => {
    handlers[tool.name] = tool.handler;
    return handlers;
}, {});

export async function executeToolCall(toolCall) {
    const name = toolCall.function?.name;
    const args = parseToolArguments(toolCall.function?.arguments);
    let result;

    try {
        const handler = toolHandlers[name];
        result = handler ? await handler(args) : { ok: false, error: `Unknown tool: ${name}` };
    } catch (error) {
        result = { ok: false, error: error.message || String(error) };
    }

    logger.log("AI tool call", {
        id: toolCall.id,
        name,
        arguments: args,
        result
    });

    return result;
}
