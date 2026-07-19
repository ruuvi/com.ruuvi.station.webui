import React, { useEffect, useState } from 'react';

import { DayPicker } from 'react-day-picker';
import { enGB } from 'date-fns/locale/en-GB';
import 'react-day-picker/style.css';
import i18next, { t } from 'i18next';

// Loaded on demand so only the active locale ships to the client
const localeLoaders = {
  sv: () => import('date-fns/locale/sv').then(m => m.sv),
  fi: () => import('date-fns/locale/fi').then(m => m.fi),
  de: () => import('date-fns/locale/de').then(m => m.de),
  fr: () => import('date-fns/locale/fr').then(m => m.fr),
  pl: () => import('date-fns/locale/pl').then(m => m.pl),
};

// react-day-picker v10 puts modifier classes (my-selected) on the grid cell,
// not the day button, so button styling goes through .rdp-day_button
const css = `
  .rdp-root {
    --rdp-accent-color: #35AD9FB3;
    --rdp-range_middle-background-color: #35AD9F33;
    --rdp-today-color: currentColor;
  }
  .rdp-day_button:hover:not(:disabled):not(.my-selected *) {
    background: #5e8d88a0;
  }
  .my-selected:hover .rdp-day_button {
    color: #35AD9F;
  }
  .my-today {
    font-weight: bold;
  }
`;

function ddmm(ts) {
  return ts.getDate() + "." + (ts.getMonth() + 1) + "." + (ts.getFullYear())
}

export default function DatePicker(props) {
  const lng = i18next.language
  const [locale, setLocale] = useState(enGB);
  useEffect(() => {
    let active = true;
    const load = localeLoaders[lng];
    if (load) load().then(l => { if (active) setLocale(l) });
    else setLocale(enGB);
    return () => { active = false };
  }, [lng]);
  const defaultSelected = {
    from: null,
    to: null
  };
  const [range, setRange] = useState(defaultSelected);

  let footerProps = {
    style: {
      textAlign: "left",
      paddingLeft: 8,
    }
  }
  let footer = <p {...footerProps}>{t("pick_first_day")}</p>;
  if (range?.from) {
    if (!range.to) {
      footer = <p {...footerProps}>{t("pick_second_day")}</p>;
    } else if (range.to) {
      footer = (
        <p {...footerProps}>
          {ddmm(range.from)}–{ddmm(range.to)}
        </p>
      );
    }
  }

  return (
    <>
      <style>{css}</style>
      <DayPicker
      style={{paddingLeft: "3px"}}
        mode="range"
        locale={locale}
        selected={range}
        modifiersClassNames={{
          selected: 'my-selected',
          today: 'my-today'
        }}
        footer={footer}
        onSelect={val => {
          setRange(val)
          props.onChange(val)
        }}
        defaultMonth={new Date()}
        disabled={d => d.getTime() > new Date().getTime()}
      />
    </>
  );
}