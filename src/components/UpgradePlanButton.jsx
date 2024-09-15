import React from 'react';
import { Button } from '@chakra-ui/react';
import i18next, { t } from 'i18next';

const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "12px",
}

const UpgradePlanButton = () => {
    let url = "https://cloud.ruuvi.com";
    if (i18next.language === 'fi') url += '/fi';
    let padding = 0.5;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', ...detailedSubText }}>
            <Button size="small"
                borderRadius={3}
                paddingRight={2} paddingLeft={2} paddingBottom={1} paddingTop={0.5}
                style={{ opacity: 0.75 }}
                _hover={{ opacity: "1 !important" }}
                onClick={e => e.preventDefault() || window.open(url, '_blank').focus()}>
                <div style={{ padding }}>
                    {t('upgrade_plan')}
                </div>
            </Button>
        </a>
    );
};

export default UpgradePlanButton;
