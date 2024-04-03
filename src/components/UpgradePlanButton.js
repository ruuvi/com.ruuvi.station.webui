import React from 'react';
import { Button } from '@chakra-ui/react';
import i18next, { t } from 'i18next';


const UpgradePlanButton = () => {
    let url = "https://cloud.ruuvi.com";
    if (i18next.language === 'fi') url += '/fi';
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <Button size="small"
                borderRadius={3}
                marginLeft={2} marginRight={2}
                paddingRight={2} paddingLeft={2} paddingBottom={1} paddingTop={0.5}
                style={{ opacity: 0.75 }}
                onClick={e => e.preventDefault() || window.open(url, '_blank').focus()}>
                {t('upgrade_plan')}
            </Button>
        </a>
    );
};

export default UpgradePlanButton;
