import "./transaction-room.css";
import { useEffect, useRef, useState } from "react";
import axiosAPI from "../../../JS/auth/http/axios.js";
import RangeDatePicker from "./RangeDatePicker.jsx";
// DateRangePicker временно не используем из-за отсутствия стилей в проекте

function TransactionRoom() {
  const containerRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState({ total: 0, transactions: [] });
  const [hasSearched, setHasSearched] = useState(false);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const formatDateRange = (from, to) => {
    if (!from || !to) return "свободный период";
    const fromStr = from.toLocaleDateString("ru-RU");
    const toStr = to.toLocaleDateString("ru-RU");
    return `${fromStr} - ${toStr}`;
  };

  const closeCalendarModal = () => {
    setShowCalendarModal(false);
  };

  const handleCalendarChange = (start, end) => {
    setDateFrom(start);
    setDateTo(end);
    console.log('range picked', start, end);
    
    // Закрываем модалку если выбраны обе даты
    if (start && end) {
      closeCalendarModal();
    }
  };

  const typeToRu = (type) => {
    switch (type) {
      case "deposit":
        return "пополнение";
      case "profitability":
        return "начисления доходности";
      case "withdrawal":
        return "вывод";
      case "transfer_out":
        return "перевод исходящий";
      case "transfer_in":
        return "перевод входящий";
      case "debiting":
        return "списание";
      default:
        return type;
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await axiosAPI.get("/profile/accounts");
        if (!isMounted) return;
        const list = Array.isArray(data?.accounts) ? data.accounts : data;
        setAccounts(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("Ошибка загрузки счетов:", e);
        if (!isMounted) return;
        setAccounts([]);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const listeners = [];

    const addListener = (el, event, handler) => {
      el.addEventListener(event, handler);
      listeners.push({ el, event, handler });
    };

    const rulesSelect = (rootSelect) => {
      rootSelect.forEach((select) => {
        const valueSpan = select.querySelector(".custom-select-value");

        // Делегирование кликов на триггер и опции
        const selectClickHandler = (event) => {
          const trigger = event.target.closest(".custom-select-trigger");
          if (trigger && select.contains(trigger)) {
            select.classList.toggle("active");
            rootSelect.forEach((otherSelect) => {
              if (otherSelect !== select)
                otherSelect.classList.remove("active");
            });

            return;
          }

          const option = event.target.closest(".custom-select-option");
          if (option && select.contains(option)) {
            const options = select.querySelectorAll(".custom-select-option");
            options.forEach((opt) => opt.classList.remove("selected"));
            option.classList.add("selected");
            if (valueSpan) valueSpan.textContent = option.textContent;
            select.classList.remove("active");
            const value = option.getAttribute("data-value");
            select.dispatchEvent(
              new CustomEvent("change", {
                detail: { value, text: option.textContent },
              })
            );
            // Сохраняем выбор в состояние
            const id = select.getAttribute("id");
            console.log("Select clicked:", id, "value:", value);
            if (id === "transactions-filter-item-account")
              setSelectedAccount(value);
            if (id === "transactions-filter-item-period") {
              console.log("Setting period to:", value);
              setSelectedPeriod(value);
              
              // Показываем модалку календаря только для "free"
              if (value === "free") {
                setShowCalendarModal(true);
              } else {
                // Закрываем модалку и сбрасываем даты при выборе другого периода
                setShowCalendarModal(false);
                setDateFrom(null);
                setDateTo(null);
              }
            }
            if (id === "transactions-filter-item-transaction")
              setSelectedType(value);
          }
        };
        addListener(select, "click", selectClickHandler);

        const docHandler = (event) => {
          if (!select.contains(event.target)) {
            select.classList.remove("active");
          }
        };
        addListener(document, "click", docHandler);
      });
    };

    const qAll = (sel) => container.querySelectorAll(sel);
    const customSelects = qAll("#transactions-filter-item-account");
    const customSelectsPeriod = qAll("#transactions-filter-item-period");
    const customSelectsTransaction = qAll(
      "#transactions-filter-item-transaction"
    );

    rulesSelect(customSelects);
    rulesSelect(customSelectsPeriod);
    rulesSelect(customSelectsTransaction);

    const accordionHandler = (e) => {
      const header = e.target.closest(".transactions-table-item-result");
      if (!header || !container.contains(header)) return;
      const groupId = header.getAttribute("data-group");
      const group = container.querySelector(`#${groupId}`);
      if (!group) return;
      if (group.classList.contains("collapsed")) {
        container
          .querySelectorAll(".transactions-table-group")
          .forEach((otherGroup) => {
            if (otherGroup !== group) {
              otherGroup.classList.remove("expanded");
              otherGroup.classList.add("collapsed");
            }
          });
        group.classList.remove("collapsed");
        group.classList.add("expanded");
      } else {
        group.classList.remove("expanded");
        group.classList.add("collapsed");
      }
    };
    addListener(container, "click", accordionHandler);

    return () => {
      listeners.forEach(({ el, event, handler }) => {
        el.removeEventListener(event, handler);
      });
    };
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError("");
    setHasSearched(true);
    try {
      const params = {
        account: selectedAccount,
        period: selectedPeriod,
        type: selectedType,
        ...(selectedPeriod === 'free' && dateFrom && dateTo && {
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0]
        })
      };
      const { data } = await axiosAPI.get("/profile/transactions", { params });
      setResult({
        total: data?.total || 0,
        transactions: Array.isArray(data?.transactions)
          ? data.transactions
          : [],
      });
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Ошибка загрузки транзакций"
      );
      setResult({ total: 0, transactions: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="transactions-container flex flex-column">
      <div className="transactions-title">история изменения баланса</div>
      <div className="transactions-filter flex flex-row">
        <div className="transactions-filter-item flex flex-column">
          <label
            htmlFor="transactions-filter-item-account"
            className="transactions-filter-item-title"
          >
            счет
          </label>
          <div className="custom-select-wrapper gradient-border bru">
            <div
              className="custom-select"
              id="transactions-filter-item-account"
            >
              <div className="custom-select-trigger">
                <span className="custom-select-value">-- выберите счет --</span>
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
                    {acc.id} {acc.product || ""}{" "}
                    {(acc.value ?? 0).toLocaleString("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    $
                  </div>
                ))}
                <div className="custom-select-option bru" data-value="all">
                  все
                        </div>
                    </div>
                    </div>
                </div>
            </div>
            
        <div className="transactions-filter-item flex flex-column">
          <label
            htmlFor="transactions-filter-item-period"
            className="transactions-filter-item-title"
          >
            период
          </label>
          <div
            className="custom-select-wrapper gradient-border bru"
            style={{ position: "relative" }}
          >
            <div className="custom-select" id="transactions-filter-item-period">
              <div className="custom-select-trigger">
                <span className="custom-select-value">
                  {selectedPeriod === "free" && dateFrom && dateTo 
                    ? formatDateRange(dateFrom, dateTo)
                    : "-- выберите период --"
                  }
                </span>
                <div className="custom-select-arrow pointer bru">
                  <div className="custom-select-arrow-img img bru"></div>
                </div>
              </div>
              <div className="custom-select-options bru">
                <div className="custom-select-option bru" data-value="week">
                  неделя
                </div>
                <div className="custom-select-option bru" data-value="month">
                  месяц
                </div>
                <div className="custom-select-option bru" data-value="year">
                  год
                </div>
                <div className="custom-select-option bru" data-value="all">
                  за все время
                </div>
                <div className="custom-select-option bru" data-value="free">
                  свободный период
        </div>
                        </div>
                    </div>
            {selectedPeriod === "free" && (
              <div
                className="custom-select-options bru gradient-border"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  zIndex: 2000,
                }}
              >

                    </div>
            )}
                </div>
            </div>
            
        <div className="transactions-filter-item flex flex-column">
          <label
            htmlFor="transactions-filter-item-transaction"
            className="transactions-filter-item-title"
          >
            тип транзакций
          </label>
          <div className="custom-select-wrapper gradient-border bru">
            <div
              className="custom-select"
              id="transactions-filter-item-transaction"
            >
              <div className="custom-select-trigger">
                <span className="custom-select-value">
                  -- выберите тип транзакции --
                </span>
                <div className="custom-select-arrow pointer bru">
                  <div className="custom-select-arrow-img img bru"></div>
                </div>
              </div>
              <div className="custom-select-options bru">
                <div className="custom-select-option bru" data-value="deposit">
                  пополнения
                </div>
                <div
                  className="custom-select-option bru"
                  data-value="profitability"
                >
                  начисления доходности
                </div>
                <div
                  className="custom-select-option bru"
                  data-value="withdrawal"
                >
                  выводы
                </div>
                <div className="custom-select-option bru" data-value="transfer">
                  переводы
        </div>
                <div className="custom-select-option bru" data-value="all">
                  все
                        </div>
                    </div>
                    </div>
                </div>
            </div>
            
        <div
          className="transactions-filter-item-send-button gradient-border bru pointer flex"
          onClick={fetchTransactions}
        >
          отправить
        </div>
        </div>

      {console.log("Current selectedPeriod:", selectedPeriod)}

      <div className="transactions-table flex flex-column gradient-border bru-max">
        {showCalendarModal && (
          <div className="calendar-modal-window gradient-border">
            <div 
              className="calendar-modal-window-filter"
              onClick={closeCalendarModal}
            ></div>
            <RangeDatePicker
              startDate={dateFrom}
              endDate={dateTo}
              onChange={handleCalendarChange}
            />
          </div>
        )}
        {loading && (
          <div className="transactions-absence-message gradient-border  flex flex-row bru-max">
            <div className="transactions-absence-message-text flex flex-column">
              <span className="transactions-absence-message-text-title">
                загрузка...
              </span>
            </div>
    </div>
        )}
        {!loading &&
          hasSearched &&
          (error || (result.transactions || []).length === 0) && (
            <div className="transactions-absence-message gradient-border  flex flex-row bru-max">
              <div className="transactions-absence-message-icon bru flex">
                <div className="transactions-absence-message-icon-img img"></div>
            </div>
              <div className="transactions-absence-message-text flex flex-column">
                <span className="transactions-absence-message-text-title">
                  {error || "нет доступных операций по выбранным фильтрам"}
                </span>
                <span className="transactions-absence-message-text-description">
                  пожалуйста, введите другие параметры или
                  <a href="" className="gradient-effect-text">
                    свяжитесь с нами,
                  </a>
                    если считаете, что это ошибка - мы поможем вам разобраться.
                </span>
            </div>
        </div>
          )}

        {!loading && (result.transactions || []).length > 0 && (
          <>
            <div
              className="transactions-table-item-result gradient-border flex flex-row bru pointer"
              data-group="group1"
            >
              <div className="transactions-table-item-result-icon flex pointer bru ">
                <div className="transactions-table-item-result-icon-img img"></div>
              </div>
              <span className="transactions-table-item-result-title">
                баланс по запросу:
              </span>
              <span className="transactions-table-item-result-summ">
                {Number(result.total || 0).toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <span className="dollar">$</span>
              </span>
            </div>
            <div
              className="transactions-table-group flex flex-column collapsed"
              id="group1"
            >
              {result.transactions.map((t) => (
                <div
                  key={`${t.type}-${t.id}`}
                  className="transactions-table-item gradient-border flex flex-row bru"
                >
                  <div className="transactions-table-item-number flex">
                    <span>№</span>
                    <span className="transactions-number">{t.id}</span>
        </div>
                  <div className="transactions-table-item-type flex">
                    <span className="transactions-type">
                      {typeToRu(t.type)}
                    </span>
            </div>
                  <div className="transactions-table-item-date flex">
                    <span className="transactions-date">
                      {new Date(t.date).toLocaleDateString("ru-RU")}
                    </span>
            </div>
                  <div className="transactions-table-item-summ flex">
                    <span className="transactions-summ">
                      {Number(t.amount || 0).toLocaleString("ru-RU", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="dollar">$</span>
            </div>
        </div>
              ))}
            </div>
          </>
        )}
    </div>
</div>
  );
}

export default TransactionRoom;
