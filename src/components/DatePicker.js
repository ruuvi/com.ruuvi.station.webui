import React, { useState } from 'react';

import { DayPicker } from 'react-day-picker';
import { enGB, fi, sv, de, fr, pl } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import i18next, { t } from 'i18next';

const css = `
  .my-selected:not([disabled]) { 
    background: #35AD9FB3;
  }
  .my-selected:hover:not([disabled]) { 
    color: #35AD9F;
  }
  .my-today { 
    font-weight: bold;
  }
  .rdp-day_range_middle {
    background: #35AD9F33 !important;
  }
  .rdp-day_range_start {
    border-top-right-radius: 100% !important;
    border-bottom-right-radius: 100% !important;
  }
  .rdp-day_range_end {
    border-top-left-radius: 100% !important;
    border-bottom-left-radius: 100% !important;
  }
`;

function ddmm(ts) {
  return ts.getDate() + "." + (ts.getMonth() + 1) + "." + (ts.getFullYear())
}

export default function DatePicker(props) {
  let local = enGB;
  let lng = i18next.language
  if (lng === "sv") local = sv
  if (lng === "fi") local = fi
  if (lng === "de") local = de
  if (lng === "fr") local = fr
  if (lng === "pl") local = pl
  const defaultSelected = {
    from: null,
    to: null
  };
  const [range, setRange] = useState(defaultSelected);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const setBgStyle = () => {
    let cells = window.document.querySelectorAll('.rdp-cell')
    for (let i = 0; i < cells.length; i++) {
      cells[i].style.backgroundColor = '';
    };
    let startNodes = window.document.querySelectorAll('.rdp-day_range_start');
    for (let i = 0; i < startNodes.length; i++) {
      let child = startNodes[i];
      child.parentNode.style.backgroundColor = '#35AD9F33';
      child.parentNode.style.borderTopLeftRadius = '50%';
      child.parentNode.style.borderBottomLeftRadius = '50%';
    }
    let endNodes = window.document.querySelectorAll('.rdp-day_range_end');
    for (let i = 0; i < endNodes.length; i++) {
      let child = endNodes[i];
      child.parentNode.style.backgroundColor = '#35AD9F33';
      child.parentNode.style.borderTopRightRadius = '50%';
      child.parentNode.style.borderBottomRightRadius = '50%';
    }
    setCurrentMonth(currentMonth)
  }

  let footerProps = {
    style: {
      textAlign: "left",
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
        mode="range"
        locale={local}
        selected={range}
        modifiersClassNames={{
          selected: 'my-selected',
          today: 'my-today'
        }}
        footer={footer}
        onSelect={val => {
          setRange(val)
          props.onChange(val)
          //setBgStyle()
        }}
        defaultMonth={new Date()}
        disabled={d => d.getTime() > new Date().getTime()}
      />
    </>
  );
}