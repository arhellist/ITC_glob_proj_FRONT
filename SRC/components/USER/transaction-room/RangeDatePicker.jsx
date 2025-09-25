import { useState } from "react";
import './RangeDatePicker.css';

function startOfDay(d) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function formatDateLocal(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDateString(yyyyMmDd) {
  if (!yyyyMmDd) return null;
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getDaysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  // Add leading empty days
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null);
  }

  // Add days of the month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}

function RangeDatePicker({ startDate, endDate, onChange }) {
  const [viewDate, setViewDate] = useState(new Date());

  const applyChange = (newStart, newEnd) => {
    onChange?.(newStart, newEnd);
  };

  const handleInputChange = (which, value) => {
    const parsed = value ? startOfDay(parseLocalDateString(value)) : null;
    if (which === 'start') applyChange(parsed, endDate);
    else applyChange(startDate, parsed);
  };

  const handleDayClick = (day) => {
    if (!day) return;

    if (!startDate || (startDate && endDate)) {
      // First click or reset
      applyChange(day, null);
    } else if (day < startDate) {
      // Clicked before start date, make it the new start
      applyChange(day, endDate);
    } else {
      // Clicked after start date, make it the end
      applyChange(startDate, day);
    }
  };

  const isSameDay = (d1, d2) => {
    return d1 && d2 && d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const isInRange = (day) => {
    if (!day || !startDate || !endDate) return false;
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);
    const current = startOfDay(day);
    return current >= start && current <= end;
  };

  const days = getDaysInMonth(viewDate);

  return (
    <div className="date-range-picker-custom gradient-border">
      <div className="date-inputs flex flex-row">
        <div className="flex flex-column">
          <label className="transactions-filter-item-title">Начальная дата</label>
          <input
            type="date"
            value={formatDateLocal(startDate)}
            onChange={(e)=>handleInputChange('start', e.target.value)}
            className="bru"
          />
        </div>
        <div className="flex flex-column">
          <label className="transactions-filter-item-title">Конечная дата</label>
          <input
            type="date"
            value={formatDateLocal(endDate)}
            onChange={(e)=>handleInputChange('end', e.target.value)}
            className="bru"
          />
        </div>
      </div>
      <div className="calendar-header flex flex-row">
        <button onClick={()=>setViewDate(addMonths(viewDate, -1))} className="bru pointer">&lt;</button>
        <span className="current-month">
          {viewDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={()=>setViewDate(addMonths(viewDate, 1))} className="bru pointer">&gt;</button>
      </div>
      <div className="calendar-grid">
        {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map(day => (
          <div key={day} className="day-label">{day}</div>
        ))}
        {days.map((day, index) => {
          const isStart = isSameDay(day, startDate);
          const isEnd = isSameDay(day, endDate);
          const inRange = isInRange(day);
          const sameDay = isStart && isEnd;

          let className = 'calendar-day';
          if (!day) className += ' empty';
          else className += ' active';
          
          if (sameDay) className += ' same-day';
          else if (isStart) className += ' selected-start';
          else if (isEnd) className += ' selected-end';
          else if (inRange) className += ' in-range';

          return (
            <div
              key={index}
              className={className}
              onClick={() => handleDayClick(day)}
            >
              {day ? day.getDate() : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RangeDatePicker;