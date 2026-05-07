import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    HStack,
    Spinner,
    Text,
    Textarea,
    VStack,
    useColorModeValue,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import RDialog from "./RDialog";
import Store from "../Store";
import { sendMistralChat } from "../utils/mistralAi";

const userMessageStyle = {
    alignSelf: "flex-end",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: "10px 12px",
    maxWidth: "85%",
    whiteSpace: "pre-wrap",
    fontFamily: "mulish",
    fontSize: 14,
};

const assistantMessageStyle = {
    alignSelf: "flex-start",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: "10px 12px",
    maxWidth: "85%",
    fontFamily: "mulish",
    fontSize: 14,
};

const markdownStyle = {
    "& > :first-of-type": { marginTop: 0 },
    "& > :last-child": { marginBottom: 0 },
    "& p": { margin: "0 0 8px" },
    "& ul, & ol": { margin: "0 0 8px", paddingLeft: "20px" },
    "& li": { margin: "2px 0" },
    "& a": { textDecoration: "underline" },
    "& table": {
        borderCollapse: "collapse",
        display: "block",
        margin: "0 0 8px",
        overflowX: "auto",
        width: "100%",
    },
    "& th, & td": {
        border: "1px solid currentColor",
        padding: "4px 6px",
    },
    "& blockquote": {
        borderLeft: "3px solid currentColor",
        margin: "0 0 8px",
        opacity: 0.85,
        paddingLeft: "10px",
    },
    "& code": {
        background: "rgba(0, 0, 0, 0.12)",
        borderRadius: "4px",
        fontFamily: "monospace",
        fontSize: "0.92em",
        padding: "1px 4px",
    },
    "& pre": {
        background: "rgba(0, 0, 0, 0.12)",
        borderRadius: "8px",
        margin: "0 0 8px",
        overflowX: "auto",
        padding: "8px",
    },
    "& pre code": {
        background: "transparent",
        padding: 0,
        whiteSpace: "pre",
    },
};

export default function AiChatModal({ open, onClose }) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState(() => [
        { role: "assistant", content: t("ai_chat_welcome") }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const scrollRef = useRef(null);
    const userBg = useColorModeValue("#35AD9F", "#35AD9F");
    const assistantBg = useColorModeValue("#edf2f2", "#003434");
    const userColor = "white";
    const assistantColor = useColorModeValue("#1b4847", "white");

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading, error]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const nextMessages = [...messages, { role: "user", content: text }];
        setMessages(nextMessages);
        setInput("");
        setError("");
        setLoading(true);

        try {
            const apiKey = Store.getMistralApiKey();
            const answer = await sendMistralChat(apiKey, nextMessages, {
                onDelta: (_chunk, accumulated) => {
                    setMessages(current => {
                        const last = current[current.length - 1];
                        if (last?.role === "assistant" && last.streaming) {
                            const updated = current.slice(0, -1);
                            updated.push({ ...last, content: accumulated });
                            return updated;
                        }
                        return [...current, { role: "assistant", content: accumulated, streaming: true }];
                    });
                }
            });
            setMessages(current => {
                const last = current[current.length - 1];
                if (last?.role === "assistant" && last.streaming) {
                    const updated = current.slice(0, -1);
                    updated.push({ role: "assistant", content: answer });
                    return updated;
                }
                return [...current, { role: "assistant", content: answer }];
            });
        } catch (err) {
            setMessages(current => current.filter(message => !message.streaming));
            setError(err.message || t("something_went_wrong"));
        } finally {
            setLoading(false);
        }
    };

    const keyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
        }
    };

    return (
        <RDialog title={t("ai_chat_title")} isOpen={open} onClose={onClose} size="2xl">
            <VStack align="stretch" spacing="3">
                <Text fontFamily="mulish" fontSize="13px" opacity={0.75}>
                    {t("ai_chat_description")}
                </Text>
                <Box
                    ref={scrollRef}
                    borderWidth="1px"
                    borderRadius="lg"
                    p="3"
                    height={{ base: "55vh", md: "460px" }}
                    overflowY="auto"
                >
                    <VStack align="stretch" spacing="3">
                        {messages.map((message, index) => (
                            <Box
                                key={`${message.role}-${index}`}
                                style={message.role === "user" ? userMessageStyle : assistantMessageStyle}
                                bg={message.role === "user" ? userBg : assistantBg}
                                color={message.role === "user" ? userColor : assistantColor}
                                sx={message.role === "assistant" ? markdownStyle : undefined}
                            >
                                {message.role === "assistant" ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                                ) : (
                                    message.content
                                )}
                            </Box>
                        ))}
                        {loading && (
                            <HStack alignSelf="flex-start" style={assistantMessageStyle} bg={assistantBg} color={assistantColor}>
                                <Spinner size="sm" />
                                <Text>{t("ai_chat_thinking")}</Text>
                            </HStack>
                        )}
                    </VStack>
                </Box>
                {error && (
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        {error}
                    </Alert>
                )}
                <HStack alignItems="end">
                    <Textarea
                        value={input}
                        placeholder={t("ai_chat_placeholder")}
                        onChange={event => setInput(event.target.value)}
                        onKeyDown={keyDown}
                        rows={2}
                    />
                    <Button onClick={send} isLoading={loading} disabled={!input.trim()}>
                        {t("send")}
                    </Button>
                </HStack>
            </VStack>
        </RDialog>
    );
}
