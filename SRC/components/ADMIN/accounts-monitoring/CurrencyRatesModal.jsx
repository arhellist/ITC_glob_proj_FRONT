import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './CurrencyRatesModal.css';
import courseService from '../../../JS/services/course-service.js';

const CURRENCIES = ['USD', 'USDT'];
const PAGE_SIZE = 30;

const CurrencyRatesModal = ({ isOpen, onClose }) => {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [datasets, setDatasets] = useState(() => ({
    USD: {
      entries: [],
      loading: false,
      offset: 0,
      hasMore: true,
      depositPercent: 0,
      withdrawalPercent: 0,
      initialLoaded: false
    },
    USDT: {
      entries: [],
      loading: false,
      offset: 0,
      hasMore: true,
      depositPercent: 0,
      withdrawalPercent: 0,
      initialLoaded: false
    }
  }));
  const tableRef = useRef(null);
  const chartScrollRef = useRef(null);
  const [filterDate, setFilterDate] = useState('');

  const resetDatasets = useCallback(() => {
    setDatasets({
      USD: {
        entries: [],
        loading: false,
        offset: 0,
        hasMore: true,
        depositPercent: 0,
        withdrawalPercent: 0,
        initialLoaded: false
      },
      USDT: {
        entries: [],
        loading: false,
        offset: 0,
        hasMore: true,
        depositPercent: 0,
        withdrawalPercent: 0,
        initialLoaded: false
      }
    });
  }, []);

  const fetchHistory = useCallback(async (currency, { reset = false } = {}) => {
    setDatasets(prev => {
      const current = prev[currency];
      if (!current) {
        return prev;
      }
      if (current.loading && !reset) {
        return prev;
      }
      return {
        ...prev,
        [currency]: {
          ...current,
          loading: true,
          ...(reset
            ? {
                entries: [],
                offset: 0,
                hasMore: true
              }
            : {})
        }
      };
    });

    try {
      const state = datasets[currency];
      const offset = reset ? 0 : state.offset;

      let dateParams = {};
      if (filterDate) {
        const start = `${filterDate}T00:00:00`;
        const end = `${filterDate}T23:59:59`;
        dateParams = { startDate: start, endDate: end };
      }

      const response = await courseService.getCourseHistory({
        currency,
        limit: PAGE_SIZE,
        offset,
        ...dateParams
      });

      const incoming = Array.isArray(response?.history)
        ? response.history.map(item => ({
            id: item.id,
            time: item.time,
            spot: Number.isFinite(Number(item.spotValue))
              ? Number(item.spotValue)
              : 0
          }))
        : [];

      const depositPercent = Number.isFinite(
        Number(response?.commission?.depositPercent)
      )
        ? Number(response.commission.depositPercent)
        : 0;
      const withdrawalPercent = Number.isFinite(
        Number(response?.commission?.withdrawalPercent)
      )
        ? Number(response.commission.withdrawalPercent)
        : 0;

      setDatasets(prev => {
        const current = prev[currency];
        if (!current) {
          return prev;
        }
        const newEntries = reset
          ? incoming
          : [...current.entries, ...incoming];
        const nextOffset = reset
          ? incoming.length
          : current.offset + incoming.length;
        const hasMore =
          typeof response?.hasMore === 'boolean'
            ? response.hasMore
            : incoming.length === PAGE_SIZE;

        return {
          ...prev,
          [currency]: {
            entries: newEntries,
            loading: false,
            offset: nextOffset,
            hasMore,
            depositPercent,
            withdrawalPercent,
            initialLoaded: true
          }
        };
      });
    } catch (error) {
      console.error('CurrencyRatesModal: ошибка загрузки истории курсов', error);
      setDatasets(prev => {
        const current = prev[currency];
        if (!current) return prev;
        return {
          ...prev,
          [currency]: {
            ...current,
            loading: false,
            hasMore: false,
            initialLoaded: true
          }
        };
      });

      document.dispatchEvent(
        new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text:
              'Ошибка загрузки истории курсов: ' +
              (error?.message || 'Неизвестная ошибка')
          }
        })
      );
    }
  }, [datasets, filterDate]);

  const handleScroll = useCallback(
    event => {
      const currencyState = datasets[selectedCurrency];
      if (!currencyState || currencyState.loading || !currencyState.hasMore) {
        return;
      }

      const target = event.currentTarget;
      if (!target) return;

      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - (scrollTop + clientHeight) < 150) {
        fetchHistory(selectedCurrency);
      }
    },
    [datasets, fetchHistory, selectedCurrency]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const state = datasets[selectedCurrency];
    if (!state?.initialLoaded) {
      fetchHistory(selectedCurrency, { reset: true });
    }

    if (tableRef.current) {
      if (!state || state.offset <= PAGE_SIZE) {
        tableRef.current.scrollTop = 0;
      }
    }
  }, [datasets, fetchHistory, isOpen, selectedCurrency]);

  useEffect(() => {
    if (!isOpen) {
      resetDatasets();
    }
  }, [isOpen, resetDatasets]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    resetDatasets();
  }, [filterDate, isOpen, resetDatasets]);

  const handleCurrencyChange = useCallback(currency => {
    setSelectedCurrency(currency);
  }, []);

  const handleDateChange = useCallback(event => {
    const value = event.target.value;
    setFilterDate(value);
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
    }
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollLeft = 0;
    }
  }, []);

  const clearDateFilter = useCallback(() => {
    setFilterDate('');
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
    }
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollLeft = 0;
    }
  }, []);

  const closeModal = useCallback(() => {
    onClose?.();
    resetDatasets();
    setSelectedCurrency('USD');
  }, [onClose, resetDatasets]);

  const currentDataset = datasets[selectedCurrency];
  const commissionInfo = {
    deposit: currentDataset?.depositPercent || 0,
    withdrawal: currentDataset?.withdrawalPercent || 0
  };

  const entriesWithCalculatedValues = useMemo(() => {
    if (!currentDataset) return [];
    return currentDataset.entries.map(entry => {
      const spot = entry.spot || 0;
      const deposit =
        Math.round(
          (spot * (1 + commissionInfo.deposit / 100)) * 100
        ) / 100;
      const withdrawal =
        Math.round(
          (spot * (1 - commissionInfo.withdrawal / 100)) * 100
        ) / 100;
      return {
        ...entry,
        deposit,
        withdrawal
      };
    });
  }, [currentDataset, commissionInfo.deposit, commissionInfo.withdrawal]);

  const PRICE_STEP = 0.25;
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const BASE_CHART_WIDTH = 800;
  const POINT_SPACING = 30;
  const CHART_HEIGHT = 520;
  const CHART_PADDING = 64;

  const chartData = useMemo(() => {
    const source = entriesWithCalculatedValues.slice().reverse();
    if (source.length === 0) {
      return {
        points: [],
        min: 0,
        max: 0,
        paddedMin: 0,
        paddedMax: 0,
        minTime: null,
        maxTime: null
      };
    }

    const allValues = source.flatMap(item => [
      item.spot,
      item.deposit,
      item.withdrawal
    ]);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    const rawRange = max - min;
    const rangePadding = rawRange === 0
      ? Math.max(1, min === 0 ? 1 : Math.abs(min) * 0.05)
      : rawRange * 0.05;
    const paddedMinRaw = Math.max(0, min - rangePadding);
    const paddedMaxRaw = max + rangePadding;

    const paddedMin = Math.floor(paddedMinRaw / PRICE_STEP) * PRICE_STEP;
    const paddedMax = Math.ceil(paddedMaxRaw / PRICE_STEP) * PRICE_STEP;

    const times = source.map(item => new Date(item.time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      points: source,
      min,
      max,
      paddedMin,
      paddedMax,
      minTime,
      maxTime
    };
  }, [entriesWithCalculatedValues]);

  const chartWidth = useMemo(() => {
    const pointsCount = chartData.points.length;
    if (pointsCount <= 1) {
      return BASE_CHART_WIDTH;
    }
    const dynamicWidth =
      CHART_PADDING * 2 + (pointsCount - 1) * POINT_SPACING;
    return Math.max(BASE_CHART_WIDTH, dynamicWidth);
  }, [chartData.points.length]);

  const getX = useCallback(
    index => {
      const dataset = chartData.points;
      if (dataset.length <= 1) {
        return CHART_PADDING;
      }
      return CHART_PADDING + index * POINT_SPACING;
    },
    [chartData.points]
  );

  const getY = useCallback(
    value => {
      const min = chartData.paddedMin ?? chartData.min;
      const max = chartData.paddedMax ?? chartData.max;

      if (max === min) {
        return CHART_HEIGHT / 2;
      }
      const ratio = (value - min) / (max - min);
      return (
        CHART_HEIGHT -
        CHART_PADDING -
        ratio * (CHART_HEIGHT - CHART_PADDING * 2)
      );
    },
    [chartData.max, chartData.min, chartData.paddedMax, chartData.paddedMin]
  );

  const renderChartPath = useCallback(
    extractor => {
      const dataset = chartData.points;
      if (dataset.length === 0) {
        return '';
      }

      return dataset
        .map((item, index) => {
          const x = getX(index);
          const y = getY(extractor(item));
          return `${index === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');
    },
    [chartData.points, getX, getY]
  );

  const yTicks = useMemo(() => {
    if (chartData.points.length === 0) {
      return [];
    }

    const min = chartData.paddedMin ?? chartData.min;
    const max = chartData.paddedMax ?? chartData.max;

    if (max === min) {
      return [{ value: Number(min.toFixed(2)), y: getY(min) }];
    }

    const ticks = [];
    for (
      let value = min;
      value <= max + PRICE_STEP / 2;
      value += PRICE_STEP
    ) {
      const normalized = Number(value.toFixed(2));
      ticks.push({
        value: normalized,
        y: getY(normalized)
      });
    }

    return ticks.reverse();
  }, [PRICE_STEP, chartData.min, chartData.max, chartData.paddedMin, chartData.paddedMax, chartData.points.length, getY]);

  const xTicks = useMemo(() => {
    const dataset = chartData.points;
    if (
      dataset.length === 0 ||
      chartData.minTime === null ||
      chartData.maxTime === null
    ) {
      return [];
    }

    const ticks = [];

    const startDate = new Date(chartData.minTime);
    startDate.setMinutes(0, 0, 0);
    const startHour = startDate.getHours();
    const offsetHours = startHour % 6;
    if (offsetHours !== 0) {
      startDate.setHours(startDate.getHours() - offsetHours);
    }

    const formatterTime = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const formatterDate = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });

    const endTimestamp = chartData.maxTime;

    for (
      let timestamp = startDate.getTime();
      timestamp <= endTimestamp + SIX_HOURS;
      timestamp += SIX_HOURS
    ) {
      const date = new Date(timestamp);
      const timeLabel = formatterTime.format(date);

      let closestIndex = 0;
      let minDiff = Infinity;

      for (let idx = 0; idx < dataset.length; idx++) {
        const diff = Math.abs(new Date(dataset[idx].time).getTime() - timestamp);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = idx;
        }
      }

      const dateLabel = date.getHours() === 0 ? formatterDate.format(date) : null;

      ticks.push({
        index: closestIndex,
        timeLabel,
        dateLabel,
        timestamp,
        x: getX(closestIndex)
      });
    }

    if (ticks.length === 0) {
      const firstDate = new Date(dataset[0].time);
      ticks.push({
        index: 0,
        timeLabel: formatterTime.format(firstDate),
        dateLabel: formatterDate.format(firstDate),
        timestamp: firstDate.getTime(),
        x: getX(0)
      });
    }

    return ticks;
  }, [SIX_HOURS, chartData.points, chartData.minTime, chartData.maxTime, getX]);

  const formatPrice = useCallback(value => value.toFixed(2), []);

  const [tooltip, setTooltip] = useState(null);

  const hideTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  if (!isOpen) {
    return null;
  }

  const modalEntriesLoading = currentDataset?.loading && currentDataset.entries.length === 0;

  return (
    <div className="currency-modal-overlay">
      <div className="currency-modal">
        <div className="currency-modal__header">
          <h3>История курсов валют</h3>
          <div className="currency-modal__actions">
            <div className="currency-modal__tabs">
              {CURRENCIES.map(currency => (
                <button
                  key={currency}
                  type="button"
                  className={`currency-modal__tab ${selectedCurrency === currency ? 'active' : ''}`}
                  onClick={() => handleCurrencyChange(currency)}
                >
                  {currency}
                </button>
              ))}
            </div>
            <div className="currency-modal__date-filter">
              <label htmlFor="currency-date-filter">Дата:</label>
              <input
                id="currency-date-filter"
                type="date"
                className="currency-modal__date-input"
                value={filterDate}
                onChange={handleDateChange}
              />
              {filterDate && (
                <button
                  type="button"
                  className="currency-modal__date-clear"
                  onClick={clearDateFilter}
                >
                  ×
                </button>
              )}
            </div>
            <button type="button" className="currency-modal__close" onClick={closeModal}>
              ✕
            </button>
          </div>
        </div>

        <div className="currency-modal__content">
          <div className="currency-modal__table" ref={tableRef} onScroll={handleScroll}>
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Spot</th>
                  <th>Депозит</th>
                  <th>Вывод</th>
                </tr>
              </thead>
              <tbody>
                {modalEntriesLoading && (
                  <tr>
                    <td colSpan={4} className="currency-modal__placeholder">
                      Загрузка истории...
                    </td>
                  </tr>
                )}
                {!modalEntriesLoading && entriesWithCalculatedValues.length === 0 && (
                  <tr>
                    <td colSpan={4} className="currency-modal__placeholder">
                      История пока отсутствует
                    </td>
                  </tr>
                )}
                {entriesWithCalculatedValues.map(entry => (
                  <tr key={`${entry.id}-${entry.time}`}>
                    <td>{new Date(entry.time).toLocaleString('ru-RU')}</td>
                    <td>{entry.spot.toFixed(2)}</td>
                    <td>{entry.deposit.toFixed(2)}</td>
                    <td>{entry.withdrawal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentDataset?.loading && currentDataset.entries.length > 0 && (
              <div className="currency-modal__loader">Загружаем еще данные...</div>
            )}
            {!currentDataset?.loading &&
              currentDataset?.entries.length > 0 &&
              !currentDataset?.hasMore && (
                <div className="currency-modal__end">История загружена полностью</div>
              )}
          </div>

          <div className="currency-modal__chart">
            <div className="currency-modal__chart-legend">
              <span className="legend-item spot">Spot</span>
              <span className="legend-item deposit">Депозит</span>
              <span className="legend-item withdrawal">Вывод</span>
            </div>
            <div className="currency-modal__chart-commissions">
              <span>Комиссия депозита: {commissionInfo.deposit.toFixed(2)}%</span>
              <span>Комиссия вывода: {commissionInfo.withdrawal.toFixed(2)}%</span>
            </div>
            <div className="currency-modal__chart-area">
              <div
                className="currency-modal__chart-axis-y"
                style={{ height: `${CHART_HEIGHT}px` }}
              >
                {yTicks.map((tick, idx) => (
                  <div
                    key={`label-${idx}`}
                    className="chart-axis-label-y"
                    style={{
                      top: `calc(${(tick.y / CHART_HEIGHT) * 100}% - 0.65vw)`
                    }}
                  >
                    {formatPrice(tick.value)}
                  </div>
                ))}
              </div>
              {chartData.points.length === 0 || chartData.max === chartData.min ? (
                <div className="currency-modal__chart-empty">
                  Недостаточно данных для построения графика
                </div>
              ) : (
                <div
                  className="currency-modal__chart-scroll"
                  ref={chartScrollRef}
                  onWheel={event => {
                    if (event.shiftKey && chartScrollRef.current) {
                      chartScrollRef.current.scrollLeft += event.deltaY;
                    }
                  }}
                >
                  <svg
                    viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
                    preserveAspectRatio="none"
                    style={{ width: chartWidth, minWidth: chartWidth }}
                    onMouseLeave={hideTooltip}
                  >
                    <defs>
                      <linearGradient id="grid-line" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width={chartWidth} height={CHART_HEIGHT} fill="url(#grid-line)" />

                    {yTicks.map((tick, idx) => (
                      <g key={`y-${idx}`} className="chart-grid-horizontal">
                        <line
                          x1={CHART_PADDING}
                          x2={chartWidth - CHART_PADDING}
                          y1={tick.y}
                          y2={tick.y}
                          stroke="rgba(148, 163, 184, 0.15)"
                          strokeDasharray="4 6"
                        />
                      </g>
                    ))}

                    {xTicks.map((tick, idx) => (
                      <g key={`x-${idx}`} className="chart-grid-vertical">
                        <line
                          x1={tick.x}
                          x2={tick.x}
                          y1={CHART_PADDING}
                          y2={CHART_HEIGHT - CHART_PADDING}
                          stroke="rgba(148, 163, 184, 0.12)"
                          strokeDasharray="4 6"
                        />
                        <text
                          x={tick.x}
                          y={CHART_HEIGHT - CHART_PADDING + 14}
                          textAnchor="middle"
                          className="chart-axis-label"
                        >
                          <tspan x={tick.x} dy="0">
                            {tick.timeLabel.replace(':', '.')}
                          </tspan>
                          {tick.dateLabel && (
                            <tspan x={tick.x} dy="10">
                              {tick.dateLabel}
                            </tspan>
                          )}
                        </text>
                      </g>
                    ))}

                    {['spot', 'deposit', 'withdrawal'].map(series => (
                      <g key={`series-${series}`}>
                        <path
                          d={renderChartPath(item => item[series])}
                          className={`chart-line ${series}`}
                        />
                        {chartData.points.map((item, idx) => {
                          const cx = getX(idx);
                          const cy = getY(item[series]);
                          const label =
                            series === 'spot'
                              ? 'Spot'
                              : series === 'deposit'
                              ? 'Депозит'
                              : 'Вывод';

                          return (
                            <circle
                              key={`${series}-point-${idx}`}
                              cx={cx}
                              cy={cy}
                              r={4}
                              className={`chart-point ${series}`}
                              onMouseEnter={event =>
                                setTooltip({
                                  x: event.clientX,
                                  y: event.clientY,
                                  time: item.time,
                                  label,
                                  value: item[series]
                                })
                              }
                              onMouseLeave={hideTooltip}
                            />
                          );
                        })}
                      </g>
                    ))}
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {tooltip && (
        <div
          className="currency-modal__tooltip"
          style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}
        >
          <div className="tooltip-row">
            <span className="tooltip-label">Время:</span>
            <span>{new Date(tooltip.time).toLocaleString('ru-RU')}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">{tooltip.label}:</span>
            <span>{formatPrice(tooltip.value)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyRatesModal;


