import React from 'react';
import { MdInfo } from 'react-icons/md';
import { IconButton } from '@chakra-ui/react';
import { addNewlines, uppercaseFirst } from '../TextHelper';
import notify from '../utils/notify';
import i18next from 'i18next';

const ZoomInfo = () => {
    const detailedSubText = {
        fontFamily: "mulish",
        fontSize: "14px",
    }

    const zoomInfo = () => {
        notify.info(addNewlines(i18next.t("zoom_info")))
    };

    return (
        <span>
            <span style={detailedSubText}>{`${uppercaseFirst('zoom')}`}</span>
            <IconButton ml="-8px" variant="ghost" onClick={zoomInfo}>
                <MdInfo size="16" className="buttonSideIcon" />
            </IconButton>
        </span>
    );
};

export default ZoomInfo;