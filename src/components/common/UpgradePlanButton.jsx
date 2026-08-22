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
            {/* "small" was never a real size — the button shipped with no size
                styles at all. `xs` matches the inherited 12px type; height and
                minW go back to auto so the explicit paddings set the box, and
                lineHeight pins the recipe-base 1.2 that xs would bump to 1rem. */}
            <Button size="xs" height="auto" minWidth="auto" lineHeight="1.2"
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
