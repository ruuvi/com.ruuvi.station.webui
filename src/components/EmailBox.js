import React from 'react';
import { Box, IconButton, Tooltip } from '@chakra-ui/react';
import { MdClear } from 'react-icons/md';

export const EmailBox = (props) => {
    return (
        <Box className='box' height="40px" display="flex" alignItems="center" justifyContent="space-between">
            <Tooltip label={props.email} placement="top">
                <Box as="span" fontSize={14} mt={-0.6} alignItems="center" display="inline-block" maxWidth="100%" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" fontFamily="mulish">
                    {props.email}
                </Box>
            </Tooltip>
            <IconButton variant="ghost" color={"primary"} mr={-3} icon={<MdClear size="13" />} onClick={props.onRemove} />
        </Box>
    );
};
