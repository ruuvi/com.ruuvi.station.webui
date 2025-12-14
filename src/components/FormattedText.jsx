import React from 'react';
import { Text, Box, Heading, ListItem, UnorderedList, Link } from '@chakra-ui/react';

const FormattedText = ({ text, ...props }) => {
    if (!text) return null;

    const unescapePercent = (str) => str.replace(/\{%%\^%\}/g, '%');

    const parseInlineFormatting = (content, keyPrefix = '') => {
        content = unescapePercent(content);
        // Parse [b]...[/b] and [link url=...]...[/link] tags
        const parts = [];
        let remaining = content;
        let partIndex = 0;

        // Regex patterns for inline tags
        const boldRegex = /\[b\](.*?)\[\/b\]/;
        const linkRegex = /\[link url=([^\]]+)\](.*?)\[\/link\]/;

        while (remaining.length > 0) {
            const boldMatch = remaining.match(boldRegex);
            const linkMatch = remaining.match(linkRegex);

            // Find the earliest match
            let earliestMatch = null;
            let matchType = null;

            if (boldMatch && linkMatch) {
                if (boldMatch.index <= linkMatch.index) {
                    earliestMatch = boldMatch;
                    matchType = 'bold';
                } else {
                    earliestMatch = linkMatch;
                    matchType = 'link';
                }
            } else if (boldMatch) {
                earliestMatch = boldMatch;
                matchType = 'bold';
            } else if (linkMatch) {
                earliestMatch = linkMatch;
                matchType = 'link';
            }

            if (!earliestMatch) {
                // No more tags, add remaining text
                if (remaining) {
                    parts.push(remaining);
                }
                break;
            }

            // Add text before the tag
            if (earliestMatch.index > 0) {
                parts.push(remaining.substring(0, earliestMatch.index));
            }

            if (matchType === 'bold') {
                parts.push(
                    <Text as="span" fontWeight="bold" key={`${keyPrefix}-bold-${partIndex}`}>
                        {earliestMatch[1]}
                    </Text>
                );
                remaining = remaining.substring(earliestMatch.index + earliestMatch[0].length);
            } else if (matchType === 'link') {
                const url = earliestMatch[1];
                const linkText = earliestMatch[2];
                parts.push(
                    <Link 
                        href={url} 
                        isExternal 
                        color="primary" 
                        textDecoration="underline"
                        key={`${keyPrefix}-link-${partIndex}`}
                    >
                        {linkText}
                    </Link>
                );
                remaining = remaining.substring(earliestMatch.index + earliestMatch[0].length);
            }

            partIndex++;
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

            const hasListTags = /\[li2?\]/.test(trimmedParagraph);

            if (hasListTags) {
                const liRegex = /\[li\](.*?)\[\/li\]|\[li2\](.*?)\[\/li2\]/g;
                let match;
                let currentPrimaryList = [];
                let currentSecondaryList = [];

                while ((match = liRegex.exec(trimmedParagraph)) !== null) {
                    if (match[1] !== undefined) {
                        // [li] tag - primary item
                        if (currentSecondaryList.length > 0) {
                            // Attach secondary list to last primary item
                            if (currentPrimaryList.length > 0) {
                                const lastItem = currentPrimaryList[currentPrimaryList.length - 1];
                                currentPrimaryList[currentPrimaryList.length - 1] = {
                                    ...lastItem,
                                    nested: [...currentSecondaryList]
                                };
                            }
                            currentSecondaryList = [];
                        }
                        currentPrimaryList.push({ content: match[1], nested: [] });
                    } else if (match[2] !== undefined) {
                        // [li2] tag - secondary item
                        currentSecondaryList.push(match[2]);
                    }
                }

                if (currentSecondaryList.length > 0 && currentPrimaryList.length > 0) {
                    const lastItem = currentPrimaryList[currentPrimaryList.length - 1];
                    currentPrimaryList[currentPrimaryList.length - 1] = {
                        ...lastItem,
                        nested: [...currentSecondaryList]
                    };
                }

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
                }
            } else {
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
