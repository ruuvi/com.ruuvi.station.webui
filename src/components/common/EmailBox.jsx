import React from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { Tooltip } from '../ui/tooltip';
import { MdClear } from 'react-icons/md';

export const EmailBox = (props) => {
    return (
        <Box className='box' height="40px" display="flex" alignItems="center" justifyContent="space-between">
            <Tooltip label={props.email} placement="top">
                <Box as="span" fontSize={14} mt={-0.6} alignItems="center" display="inline-block" maxWidth="100%" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" fontFamily="mulish">
                    {props.email}
                </Box>
            </Tooltip>
            <IconButton aria-label="remove" variant="ghost" color={"primary"} mr={-3} onClick={props.onRemove}><MdClear size="13" /></IconButton>
        </Box>
    );
};
