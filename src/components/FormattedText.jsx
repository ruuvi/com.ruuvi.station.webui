import React from 'react';
import { Text, Box, Heading, ListItem, UnorderedList } from '@chakra-ui/react';

const FormattedText = ({ text, ...props }) => {
    if (!text) return null;

    const unescapePercent = (str) => str.replace(/\{%%\^%\}/g, '%');

    const parseInlineFormatting = (content, keyPrefix = '') => {
        content = unescapePercent(content);
        // [b]...[/b] tags
        const parts = [];
        let remaining = content;
        let partIndex = 0;

        while (remaining.length > 0) {
            const boldStart = remaining.indexOf('[b]');
            
            if (boldStart === -1) {
                // no more bold tags, add remaining text
                if (remaining) {
                    parts.push(remaining);
                }
                break;
            }

            // add text before bold tag
            if (boldStart > 0) {
                parts.push(remaining.substring(0, boldStart));
            }

            // find closing tag
            const boldEnd = remaining.indexOf('[/b]', boldStart);
            if (boldEnd === -1) {
                // no closing tag, treat as regular text
                parts.push(remaining);
                break;
            }

            // extract bold content
            const boldContent = remaining.substring(boldStart + 3, boldEnd);
            parts.push(
                <Text as="span" fontWeight="bold" key={`${keyPrefix}-bold-${partIndex}`}>
                    {boldContent}
                </Text>
            );
            partIndex++;

            remaining = remaining.substring(boldEnd + 4);
        }

        return parts;
    };

    const parseContent = () => {
        const normalizedText = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        
        // split by paragraphs (double newlines)
        const paragraphs = normalizedText.split(/\n\n+/);
        
        const elements = [];
        let elementIndex = 0;

        // helper to detect bullet type: 'primary' (•), 'secondary' (◦), or null
        const getBulletType = (line) => {
            const trimmed = line.replace(/^\t+/, '').trim();
            if (trimmed.startsWith('•')) return 'primary';
            if (trimmed.startsWith('◦')) return 'secondary';
            return null;
        };

        // helper to extract bullet content
        const getBulletContent = (line) => {
            const trimmed = line.replace(/^\t+/, '').trim();
            if (trimmed.startsWith('•') || trimmed.startsWith('◦')) {
                return trimmed.substring(1).trim();
            }
            return trimmed;
        };

        paragraphs.forEach((paragraph, pIndex) => {
            const trimmedParagraph = paragraph.trim();
            if (!trimmedParagraph) return;

            // check if this is a title
            const titleMatch = trimmedParagraph.match(/^\[title\](.*?)\[\/title\]$/);
            if (titleMatch) {
                elements.push(
                    <Heading 
                        as="h3" 
                        size="sm" 
                        mt={elementIndex > 0 ? 4 : 0} 
                        mb={2} 
                        key={`element-${elementIndex}`}
                    >
                        {unescapePercent(titleMatch[1])}
                    </Heading>
                );
                elementIndex++;
                return;
            }

            // check if paragraph contains bullet points
            const lines = trimmedParagraph.split('\n');
            const hasBullets = lines.some(line => getBulletType(line) !== null);

            if (hasBullets) {
                let currentPrimaryList = [];
                let currentSecondaryList = [];
                let nonBulletLines = [];

                const flushSecondaryList = () => {
                    if (currentSecondaryList.length > 0) {
                        // attach secondary list to the last primary item
                        if (currentPrimaryList.length > 0) {
                            const lastItem = currentPrimaryList[currentPrimaryList.length - 1];
                            currentPrimaryList[currentPrimaryList.length - 1] = {
                                ...lastItem,
                                nested: [...currentSecondaryList]
                            };
                        }
                        currentSecondaryList = [];
                    }
                };

                const flushPrimaryList = () => {
                    flushSecondaryList();
                    if (currentPrimaryList.length > 0) {
                        elements.push(
                            <UnorderedList key={`element-${elementIndex}`} mb={2} ml={4}>
                                {currentPrimaryList.map((item, i) => (
                                    <ListItem key={i}>
                                        {parseInlineFormatting(item.content, `${elementIndex}-li-${i}`)}
                                        {item.nested && item.nested.length > 0 && (
                                            <UnorderedList mt={1} ml={4} styleType="circle">
                                                {item.nested.map((nestedItem, j) => (
                                                    <ListItem key={j}>
                                                        {parseInlineFormatting(nestedItem, `${elementIndex}-li-${i}-nested-${j}`)}
                                                    </ListItem>
                                                ))}
                                            </UnorderedList>
                                        )}
                                    </ListItem>
                                ))}
                            </UnorderedList>
                        );
                        elementIndex++;
                        currentPrimaryList = [];
                    }
                };

                const flushNonBulletLines = () => {
                    if (nonBulletLines.length > 0) {
                        elements.push(
                            <Text key={`element-${elementIndex}`} mb={2}>
                                {nonBulletLines.map((l, i) => (
                                    <React.Fragment key={i}>
                                        {parseInlineFormatting(l, `${elementIndex}-${i}`)}
                                        {i < nonBulletLines.length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </Text>
                        );
                        elementIndex++;
                        nonBulletLines = [];
                    }
                };

                lines.forEach((line) => {
                    const bulletType = getBulletType(line);
                    const content = getBulletContent(line);
                    
                    if (bulletType === 'primary') {
                        flushNonBulletLines();
                        flushSecondaryList();
                        currentPrimaryList.push({ content, nested: [] });
                    } else if (bulletType === 'secondary') {
                        flushNonBulletLines();
                        currentSecondaryList.push(content);
                    } else if (content) {
                        flushPrimaryList();
                        nonBulletLines.push(content);
                    }
                });

                flushNonBulletLines();
                flushPrimaryList();
            } else {
                // regular paragraph
                elements.push(
                    <Text key={`element-${elementIndex}`} mb={2}>
                        {lines.map((line, i) => (
                            <React.Fragment key={i}>
                                {parseInlineFormatting(line.trim(), `${elementIndex}-${i}`)}
                                {i < lines.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </Text>
                );
                elementIndex++;
            }
        });

        return elements;
    };

    return (
        <Box {...props}>
            {parseContent()}
        </Box>
    );
};

export default FormattedText;
