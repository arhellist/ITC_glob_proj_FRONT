import React from 'react';
import { createPortal } from 'react-dom';
import './ReportModal.css';

const ReportModal = ({ reportData, onClose }) => {
  if (!reportData) return null;

  const { monthName, year, accounts } = reportData;

  // Закрытие модального окна
  const handleClose = (e) => {
    if (e.target === e.currentTarget || e.target.closest('.report-container-modal-window-menu-cancel')) {
      onClose();
    }
  };

  return createPortal(
    <div className="report-modal-overlay flex" onClick={handleClose}>
      {accounts && accounts.map((account, idx) => (
        <div 
          key={idx} 
          className="report-container-modal-window-menu gradient-border flex flex-column bru-max"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="report-container-modal-window-menu-cancel flex pointer" 
            onClick={onClose}
          >
            <div className="report-container-modal-window-menu-cancel-icon img"></div>
          </div>
          
          <div className="report-container-modal-window-menu-logo flex pointer">
            <div className="report-container-modal-window-menu-logo-icon img"></div>
          </div>
          
          <h2 className="report-container-modal-window-menu-title">
            отчет о состоянии инвестиционного счета
          </h2>
          
          <div className="report-container-modal-window-menu-table flex flex-column gradient-border bru-max">
            <div className="report-container-modal-window-menu-table-item flex flex-row bru">
              <div className="report-container-modal-window-menu-table-item-left">счет №</div>
              <div className="report-container-modal-window-menu-table-item-right">{account.accountId}</div>
            </div>
            
            <div className="report-container-modal-window-menu-table-item flex flex-row bru">
              <div className="report-container-modal-window-menu-table-item-left">продукт</div>
              <div className="report-container-modal-window-menu-table-item-right">{account.product || '—'}</div>
            </div>
            
            <div className="report-container-modal-window-menu-table-item flex flex-row bru">
              <div className="report-container-modal-window-menu-table-item-left">отчетная дата</div>
              <div className="report-container-modal-window-menu-table-item-right">
                <span className="report-date">{monthName} {year}</span>
              </div>
            </div>
            
            <div className="report-container-modal-window-menu-table-item flex flex-row bru">
              <div className="report-container-modal-window-menu-table-item-left">
                сумма на начало отчетного периода
              </div>
              <div className="report-container-modal-window-menu-table-item-right">
                <span className="report-summ-start">
                  {Number(account.startCapital || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="dollar">$</span>
              </div>
            </div>
            
            <div className="report-container-modal-window-menu-table-item flex flex-row bru">
              <div className="report-container-modal-window-menu-table-item-left">
                сумма пополнений в отчетном периоде
              </div>
              <div className="report-container-modal-window-menu-table-item-right">
                <span className="report-summ-deposit">
                  {Number(account.addingDeposit || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="dollar">$</span>
              </div>
            </div>
            
            <div className="report-container-modal-window-menu-table-item flex flex-row bru">
              <div className="report-container-modal-window-menu-table-item-left">
                сумма выводов в отчетном периоде
              </div>
              <div className="report-container-modal-window-menu-table-item-right">
                <span className="report-summ-withdraw">
                  {Number(account.widthdrawlingDeposit || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="dollar">$</span>
              </div>
            </div>
            
            <div className="report-container-modal-window-menu-table-item flex flex-row bru">
              <div className="report-container-modal-window-menu-table-item-left">
                результат работы фонда в %
              </div>
              <div className="report-container-modal-window-menu-table-item-right">
                <span className="report-result-fund-percent">
                  {Number(account.percentProfitability || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="percent">%</span>
              </div>
            </div>
            
            <div className="report-container-modal-window-menu-table-item flex flex-row bru">
              <div className="report-container-modal-window-menu-table-item-left">
                результат работы фонда в валюте
              </div>
              <div className="report-container-modal-window-menu-table-item-right">
                <span className="report-result-fund-summ">
                  {Number(account.profitabilityValue || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="dollar">$</span>
              </div>
            </div>
            
            <div className="report-container-modal-window-menu-table-item report-result flex flex-row bru">
              <div className="report-container-modal-window-menu-table-item-left gradient-effect-text">
                итого:
              </div>
              <div className="report-container-modal-window-menu-table-item-right gradient-effect-text">
                <span className="report-result-summ">
                  {Number(account.endCapital || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="dollar">$</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>,
    document.querySelector('.root') || document.body
  );
};

export default ReportModal;

