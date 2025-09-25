import "./report-room.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axiosAPI from "../../../JS/auth/http/axios.js";

function ReportRoom() {
  const containerRef = useRef(null);
  const [accounts, setAccounts] = useState([]);

  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedAccountLabel, setSelectedAccountLabel] = useState("-- выберите счет --");

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedMonthLabel, setSelectedMonthLabel] = useState("-- выберите месяц --");

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedYearLabel, setSelectedYearLabel] = useState("-- выберите год --");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [reports, setReports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalItem, setModalItem] = useState(null);

  const months = [
    { v: "january", t: "январь" },
    { v: "february", t: "февраль" },
    { v: "march", t: "март" },
    { v: "april", t: "апрель" },
    { v: "may", t: "май" },
    { v: "june", t: "июнь" },
    { v: "july", t: "июль" },
    { v: "august", t: "август" },
    { v: "september", t: "сентябрь" },
    { v: "october", t: "октябрь" },
    { v: "november", t: "ноябрь" },
    { v: "december", t: "декабрь" },
  ];

  const years = (() => {
    const current = new Date().getFullYear();
    const arr = [];
    for (let y = current; y >= 2019; y--) arr.push(String(y));
    return arr;
  })();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axiosAPI.get("/profile/accounts");
        if (!mounted) return;
        const list = Array.isArray(data?.accounts) ? data.accounts : data;
        setAccounts(Array.isArray(list) ? list : []);
      } catch {
        if (!mounted) return;
        setAccounts([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const listeners = [];
    const add = (el, ev, h) => {
      el.addEventListener(ev, h);
      listeners.push({ el, ev, h });
    };

    const initSelect = (select) => {
      const valueSpan = select.querySelector(".custom-select-value");
      const clickHandler = (e) => {
        const trigger = e.target.closest(".custom-select-trigger");
        if (trigger && select.contains(trigger)) {
          select.classList.toggle("active");
          container.querySelectorAll(".custom-select").forEach((other) => {
            if (other !== select) other.classList.remove("active");
          });
          return;
        }

        const option = e.target.closest(".custom-select-option");
        if (option && select.contains(option)) {
          const options = select.querySelectorAll(".custom-select-option");
          options.forEach((opt) => opt.classList.remove("selected"));
          option.classList.add("selected");
          if (valueSpan) valueSpan.textContent = option.textContent;
          select.classList.remove("active");

          const value = option.getAttribute("data-value");
          const text = option.textContent;
          const id = select.getAttribute("id");

          if (id === "reports-filter-item-account") {
            setSelectedAccount(value);
            setSelectedAccountLabel(text);
          }
          if (id === "reports-filter-item-period") {
            setSelectedMonth(value);
            setSelectedMonthLabel(text);
          }
          if (id === "reports-filter-item-year") {
            setSelectedYear(value);
            setSelectedYearLabel(text);
            // Если выбран год "за все время" — месяц также принудительно ставим "за все время"
            if (value === 'all') {
              setSelectedMonth('all');
              setSelectedMonthLabel('за все время');
            }
          }
        }
      };
      add(select, "click", clickHandler);

      const docHandler = (ev) => {
        if (!select.contains(ev.target)) select.classList.remove("active");
      };
      add(document, "click", docHandler);
    };

    const qs = (s) => container.querySelectorAll(s);
    qs("#reports-filter-item-account").forEach(initSelect);
    qs("#reports-filter-item-period").forEach(initSelect);
    qs("#reports-filter-item-year").forEach(initSelect);

    return () => listeners.forEach(({ el, ev, h }) => el.removeEventListener(ev, h));
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setHasSearched(true);
    try {
      const params = { account: selectedAccount, month: selectedMonth, year: selectedYear };
      console.log("GENERATE REPORT params:", params);
      const { data } = await axiosAPI.get('/profile/reports', { params });
      setReports(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка загрузки отчетов');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item) => {
    setModalItem(item);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setModalItem(null);
  };

  return (
    <div ref={containerRef} className="reports-container flex flex-column">
      <div className="reports-title">сформировать отчет</div>
      <div className="reports-filter flex flex-row">
        <div className="reports-filter-item flex flex-column">
          <label htmlFor="reports-filter-item-account" className="reports-filter-item-title">счет</label>
          <div className="custom-select-wrapper gradient-border bru">
            <div className="custom-select" id="reports-filter-item-account">
              <div className="custom-select-trigger">
                <span className="custom-select-value">{selectedAccountLabel}</span>
                <div className="custom-select-arrow pointer bru">
                  <div className="custom-select-arrow-img img bru"></div>
                </div>
              </div>
              <div className="custom-select-options bru">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="custom-select-option bru"
                    data-value={String(acc.id)}
                  >
                    {acc.id} {acc.product || ""} {(acc.value ?? 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$
                  </div>
                ))}
                <div className="custom-select-option bru" data-value="all">все</div>
              </div>
            </div>
          </div>
        </div>

        <div className="reports-filter-item flex flex-column">
          <label htmlFor="reports-filter-item-period" className="reports-filter-item-title">отчетный месяц</label>
          <div className="custom-select-wrapper gradient-border bru">
            <div className="custom-select" id="reports-filter-item-period">
              <div className="custom-select-trigger">
                <span className="custom-select-value">{selectedMonthLabel}</span>
                <div className="custom-select-arrow pointer bru">
                  <div className="custom-select-arrow-img img bru"></div>
                </div>
              </div>
              <div className="custom-select-options bru">
                <div className="custom-select-option bru" data-value="all">за все время</div>
                {months.map((m) => (
                  <div key={m.v} className="custom-select-option bru" data-value={m.v}>{m.t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="reports-filter-item flex flex-column">
          <label htmlFor="reports-filter-item-year" className="reports-filter-item-title">отчетный год</label>
          <div className="custom-select-wrapper gradient-border bru">
            <div className="custom-select" id="reports-filter-item-year">
              <div className="custom-select-trigger">
                <span className="custom-select-value">{selectedYearLabel}</span>
                <div className="custom-select-arrow pointer bru">
                  <div className="custom-select-arrow-img img bru"></div>
                </div>
              </div>
              <div className="custom-select-options bru">
                <div className="custom-select-option bru" data-value="all">за все время</div>
                {years.map((y) => (
                  <div key={y} className="custom-select-option bru" data-value={y}>{y}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="reports-filter-item-send-button gradient-border bru pointer flex" onClick={handleGenerate}>СФОРМИРОВАТЬ</div>
      </div>

      <div className="reports-table-wraper flex flex-column gradient-border bru-max">
        <div className="reports-table flex flex-column bru-max">
            {loading && (
            <div className="reports-absence-message gradient-border  flex flex-row bru-max">
                <div className="reports-absence-message-text flex flex-column">
                <span className="reports-absence-message-text-title">загрузка...</span>
                </div>
            </div>
            )}

            {!loading && hasSearched && (error || reports.length === 0) && (
            <div className="reports-absence-message gradient-border  flex flex-row bru-max">
                <div className="reports-absence-message-icon bru flex">
                <div className="reports-absence-message-icon-img img"></div>
                </div>
                <div className="reports-absence-message-text flex flex-column">
                <span className="reports-absence-message-text-title">{error || 'нет доступных операций по выбранным фильтрам'}</span>
                <span className="reports-absence-message-text-description">пожалуйста, введите другие параметры или 
                    <a href="" className="gradient-effect-text">свяжитесь с нами,</a> 
                    если считаете, что это ошибка - мы поможем вам разобраться.
                </span>
                </div>
            </div>
            )}

            {!loading && reports.length > 0 && reports.map((r) => (
            <div key={r.id} className="reports-table-item gradient-border flex flex-row bru">
                <div className="reports-table-item-areaviewing  flex-row flex pointer" onClick={() => openModal(r)}>
                <div className="reports-table-item-number flex"><span>№</span><span className="reports-number">{r.number}</span></div>
                <div className="reports-table-item-date flex"><span className="reports-date">{new Date(r.date).toLocaleDateString('ru-RU')}</span></div>
                <div className="reports-table-item-summ flex"><span className="reports-summ">{Number(r.amount || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="dollar">$</span></div>
                </div>
                <div className="reports-table-item-download flex flex-row bru pointer">
                <div className="reports-table-item-download-icon img"></div>
                <span className="reports-download">скачать</span>
                </div>
            </div>
            ))}
        </div>
      </div>
      {showModal && modalItem && typeof document !== 'undefined' && document.querySelector('.root') && createPortal(
        (
          <div className="report-container-modal-window flex flex-column">
            <div className="report-container-modal-window-menu gradient-border flex flex-column bru-max">
              <div className="report-container-modal-window-menu-cancel flex pointer" onClick={closeModal}>
                <div className="report-container-modal-window-menu-cancel-icon img"></div>
              </div>
              <div className="report-container-modal-window-menu-logo flex pointer">
                <div className="report-container-modal-window-menu-logo-icon img"></div>
              </div>
              <h2 className="report-container-modal-window-menu-title">отчет о состоянии инвестиционного счета</h2>
              <div className="report-container-modal-window-menu-table flex flex-column gradient-border bru-max">
                <div className="report-container-modal-window-menu-table-item flex flex-row bru">
                  <div className="report-container-modal-window-menu-table-item-left">счет №</div>
                  <div className="report-container-modal-window-menu-table-item-right">{modalItem.account_id}</div>
                </div>
                <div className="report-container-modal-window-menu-table-item flex flex-row bru">
                  <div className="report-container-modal-window-menu-table-item-left">продукт</div>
                  <div className="report-container-modal-window-menu-table-item-right">{modalItem.product || '—'}</div>
                </div>
                <div className="report-container-modal-window-menu-table-item flex flex-row bru">
                  <div className="report-container-modal-window-menu-table-item-left">отчетная дата</div>
                  <div className="report-container-modal-window-menu-table-item-right"><span className="report-date">{new Date(modalItem.date).toLocaleDateString('ru-RU')}</span></div>
                </div>
                <div className="report-container-modal-window-menu-table-item flex flex-row bru">
                  <div className="report-container-modal-window-menu-table-item-left">сумма на начало отчетного периода</div>
                  <div className="report-container-modal-window-menu-table-item-right"><span className="report-summ-start">{Number(modalItem.start_capital || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="dollar">$</span></div>
                </div>
                <div className="report-container-modal-window-menu-table-item flex flex-row bru">
                  <div className="report-container-modal-window-menu-table-item-left">сумма пополнений в отчетном периоде</div>
                  <div className="report-container-modal-window-menu-table-item-right"><span className="report-summ-deposit">{Number(modalItem.adding_deposit || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="dollar">$</span></div>
                </div>
                <div className="report-container-modal-window-menu-table-item flex flex-row bru">
                  <div className="report-container-modal-window-menu-table-item-left">сумма выводов в отчетном периоде</div>
                  <div className="report-container-modal-window-menu-table-item-right"><span className="report-summ-withdraw">{Number(modalItem.widthdrawling_deposit || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="dollar">$</span></div>
                </div>
                <div className="report-container-modal-window-menu-table-item flex flex-row bru">
                  <div className="report-container-modal-window-menu-table-item-left">результат работы фонда в %</div>
                  <div className="report-container-modal-window-menu-table-item-right"><span className="report-result-fund-percent">{Number(modalItem.percent_profitability || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="percent">%</span></div>
                </div>
                <div className="report-container-modal-window-menu-table-item flex flex-row bru">
                  <div className="report-container-modal-window-menu-table-item-left">результат работы фонда в валюте</div>
                  <div className="report-container-modal-window-menu-table-item-right"><span className="report-result-fund-summ">{Number(modalItem.amount || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="dollar">$</span></div>
                </div>
                <div className="report-container-modal-window-menu-table-item report-result flex flex-row bru">
                  <div className="report-container-modal-window-menu-table-item-left gradient-effect-text">итого:</div>
                  <div className="report-container-modal-window-menu-table-item-right gradient-effect-text"><span className="report-result-summ">{Number(modalItem.end_capital || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="dollar">$</span></div>
                </div>
              </div>
            </div>
          </div>
        ),
        document.querySelector('.root')
      )}
    </div>
  );
}

export default ReportRoom;
