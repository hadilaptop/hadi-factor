import React, { useState, useMemo } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  formatNumber,
  toPersianDigits,
  getCurrentPersianDate,
} from "../utils/invoiceHelpers";
import "../styles/customer-statement.css";
import "../styles/customer-ledger.css";
import { useAppStore } from "../store/useAppStore";
import JalaliDatePickerModal from "./JalaliDatePickerModal";

export default function CustomerStatement({ customer, onBack }) {
  const allPayments = useAppStore((state) => state.payments);
  const allInvoices = useAppStore((state) => state.invoices);
  const savePayment = useAppStore((state) => state.savePayment);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [datePickerTarget, setDatePickerTarget] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [expandedItems, setExpandedItems] = useState({});
  const [showDateModal, setShowDateModal] = useState(false);

  const payments = useMemo(() => {
    if (!customer?.id) return [];
    return allPayments.filter(
      (p) => String(p.customerId) === String(customer.id),
    );
  }, [allPayments, customer]);

  const invoices = useMemo(() => {
    if (!customer?.id) return [];
    return allInvoices.filter(
      (inv) => String(inv.customerId) === String(customer.id),
    );
  }, [allInvoices, customer]);

  const { statementTransactions, startBalance, endBalance, isFiltered } =
    useMemo(() => {
      const pItems = payments.map((p) => ({
        id: `p-${p.id}`,
        originalId: p.id,
        kind: "payment",
        type: `دریافتی (${p.method || "نقدی"})`,
        method: p.method || "نقدی",
        date: p.date || "",
        rawDate: p.createdAt || p.date || "",
        amount: Number(p.amount || 0),
      }));
      
      const iItems = invoices
        .filter((inv) => inv.type !== "پیش فاکتور")
        .map((inv) => {
          let parsedItems = inv.items;
          if (typeof inv.items === "string") {
            try {
              parsedItems = JSON.parse(inv.items);
            } catch (e) {
              parsedItems = [];
            }
          }
          return {
            id: `i-${inv.id}`,
            originalId: inv.id,
            kind: "invoice",
            type: inv.type || "فاکتور",
            number: inv.number,
            date: inv.date || "",
            rawDate: inv.createdAt || inv.date || "",
            amount: Number(inv.amount || 0),
            items: parsedItems || [],
          };
        });
        
      const padDate = (d) => {
        if (!d) return "";
        let parts = d.split("/");
        if (parts.length === 3) {
          return (
            parts[0] +
            "/" +
            parts[1].padStart(2, "0") +
            "/" +
            parts[2].padStart(2, "0")
          );
        }
        return d;
      };
      
      const allChronological = [...pItems, ...iItems].sort((a, b) => {
        const aDate = padDate(a.date);
        const bDate = padDate(b.date);
        if (aDate && bDate && aDate !== bDate) {
          return aDate.localeCompare(bDate);
        }
        return (a.rawDate || "").localeCompare(b.rawDate || "");
      });
      
      const processedAll = allChronological.reduce((acc, item) => {
        const lastBalance = acc.length > 0 ? acc[acc.length - 1].balanceAfter : 0;
        let newBalance = lastBalance;
        if (item.kind === "invoice") {
          newBalance += item.amount;
        } else if (item.kind === "payment") {
          newBalance -= item.amount;
        }
        acc.push({
          ...item,
          balanceAfter: newBalance,
        });
        return acc;
      }, []);
      
      let filtered = processedAll;
      let sBalance = 0;
      const hasFilter = startDate || endDate;
      
      if (hasFilter) {
        if (startDate) {
          const beforeStart = processedAll.filter(
            (item) => item.date < startDate,
          );
          sBalance =
            beforeStart.length > 0
              ? beforeStart[beforeStart.length - 1].balanceAfter
              : 0;
        }
        filtered = processedAll.filter((item) => {
          if (startDate && item.date < startDate) return false;
          if (endDate && item.date > endDate) return false;
          return true;
        });
      } else {
        sBalance = 0;
      }
      
      const eBalance =
        filtered.length > 0
          ? filtered[filtered.length - 1].balanceAfter
          : sBalance;
          
      if (sortOrder === "desc") {
        filtered = [...filtered].reverse();
      }
      
      return {
        statementTransactions: filtered,
        startBalance: sBalance,
        endBalance: eBalance,
        isFiltered: hasFilter,
      };
    }, [payments, invoices, startDate, endDate, sortOrder]);

  const toggleExpand = (id) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isAnyExpanded = Object.keys(expandedItems).length > 0;

  const toggleAllExpanded = () => {
    if (isAnyExpanded) {
      setExpandedItems({});
    } else {
      const all = {};
      statementTransactions.forEach((t) => {
        if (t.kind === "invoice") all[t.id] = true;
      });
      setExpandedItems(all);
    }
  };

  const expandAll = () => {
    const allIds = {};
    statementTransactions
      .filter((t) => t.kind === "invoice")
      .forEach((t) => {
        allIds[t.id] = true;
      });
    setExpandedItems(allIds);
  };

  const collapseAll = () => {
    setExpandedItems({});
  };

  const handleRegisterSettlement = async () => {
    if (window.confirm("آیا از ثبت تسویه حساب تا این تاریخ اطمینان دارید؟")) {
      const currentBalance =
        statementTransactions.length > 0
          ? statementTransactions[statementTransactions.length - 1].balanceAfter
          : 0;
      if (currentBalance === 0) {
        alert("حساب در حال حاضر صفر است و نیازی به تسویه ندارد.");
        return;
      }
      const settlementPayment = {
        customerId: customer.id,
        date: getCurrentPersianDate(),
        amount: currentBalance,
        method: "تسویه حساب",
        note: "تسویه حساب سیستمی",
        createdAt: new Date().toISOString(),
      };
      await savePayment(settlementPayment);
    }
  };

  return (
    <div className="statement-page-wrapper">
      <div className="statement-page">
        <div className="ledger-top-header no-print">
          <div className="ledger-top-header-info">
            <h2 className="ledger-main-title">{customer?.name}</h2>
            <span className="ledger-subtitle">صورت حساب</span>
          </div>
          <div className="ledger-header-buttons">
            <button
              className="statement-print-btn hide-on-mobile"
              onClick={() => window.print()}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="statement-print-icon"
              >
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span className="print-text">چاپ / PDF</span>
            </button>
            <button
              className="ledger-header-btn"
              onClick={onBack}
              title="بازگشت"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 10 4 15 9 20"></polyline>
                <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="statement-filter-bar">
          <div className="ledger-filter-bar no-print">
            <div className="ledger-tabs">
              <button
                className={`ledger-tab-btn filter-btn-inner ${startDate || endDate ? "active" : ""}`}
                onClick={() => {
                  setTempStartDate(startDate || getCurrentPersianDate());
                  setTempEndDate(endDate || getCurrentPersianDate());
                  setShowDateModal(true);
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                تاریخ
              </button>

              <button className="ledger-tab-btn expand-all-btn" onClick={toggleAllExpanded}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`expand-icon ${isAnyExpanded ? "expanded" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <button className="ledger-tab-btn settlement-btn" onClick={handleRegisterSettlement}>
                ثبت تسویه حساب
              </button>
            </div>
            <button
              className="ledger-sort-btn"
              onClick={() =>
                setSortOrder(sortOrder === "desc" ? "asc" : "desc")
              }
              title={
                sortOrder === "desc"
                  ? "مرتب‌سازی: جدید به قدیم"
                  : "مرتب‌سازی: قدیم به جدید"
              }
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m7 15 5 5 5-5" />
                <path d="m7 9 5-5 5 5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="st-main-container" dir="ltr">
          <TransformWrapper
            initialScale={typeof window !== "undefined" && window.innerWidth < 1000 ? Math.max((window.innerWidth - 30) / 950, 0.1) : 1}
            initialPositionX={typeof window !== "undefined" && window.innerWidth < 1000 ? 15 : 0}
            initialPositionY={10} 
            minScale={typeof window !== "undefined" && window.innerWidth < 1000 ? Math.max((window.innerWidth - 30) / 1050, 0.1) : 0.1}
            maxScale={4}
            centerOnInit={false}
            centerZoomedOut={false}
            limitToBounds={true}
            smooth={true}
            wheel={{ step: 0.1, smoothStep: 0.01 }}
            pinch={{ step: 5 }}
            panning={{ velocityDisabled: false }}
            doubleClick={{ mode: "reset", animationTime: 250 }}
            wrapperStyle={{ width: "100%", height: "100%" }}
            onInit={(ref) => {
              if (typeof window !== "undefined" && ref.instance && ref.instance.wrapperComponent) {
                const wrapperW = ref.instance.wrapperComponent.offsetWidth;
                const cardW = 950;
                const padding = 500;
                
                let idealScale = 1;
                if (window.innerWidth < 1000) {
                   idealScale = Math.max((wrapperW - 30) / cardW, 0.1);
                }
                
                const x = (wrapperW - cardW * idealScale) / 2 - (padding * idealScale);
                const y = 10 - (padding * idealScale); 
                
                ref.setTransform(x, y, idealScale, 0);
              }
            }}
          >
            <TransformComponent 
              wrapperClass="statement-zoom-wrapper" 
              contentClass="statement-zoom-content" 
              wrapperStyle={{ width: "100%", height: "100%" }} 
              contentStyle={{ width: "max-content", height: "max-content", transformOrigin: "0 0" }}
            >
              <div style={{ padding: "500px" }}>
                <div className="statement-card" id="statement-print-area" dir="rtl">
                  <div className="statement-inner">
                    <div className="statement-customer-header">
                      صورت حساب {customer?.name}
                      {isFiltered && (
                        <div className="statement-customer-subheader">
                          {startDate && `از تاریخ: ${toPersianDigits(startDate)}`}
                          {startDate && endDate && " - "}
                          {endDate && `تا تاریخ: ${toPersianDigits(endDate)}`}
                        </div>
                      )}
                    </div>

                    <div className="statement-table-wrapper">
                      <div className="statement-table">
                        <div className="statement-table-header">
                          <div className="st-col st-date">تاریخ</div>
                          <div className="st-col st-desc">شرح</div>
                          <div className="st-col st-debt">بدهکار</div>
                          <div className="st-col st-credit">بستانکار</div>
                          <div className="st-col st-balance">مانده</div>
                        </div>

                        {isFiltered && startBalance !== 0 && (
                          <div className="statement-table-row start-balance-row">
                            <div className="st-col st-date">-</div>
                            <div className="st-col st-desc">مانده از قبل</div>
                            <div className="st-col st-debt"></div>
                            <div className="st-col st-credit"></div>
                            <div className={`st-col st-balance ${startBalance > 0 ? "text-debt" : startBalance < 0 ? "text-credit" : ""}`}>
                              {startBalance !== 0 ? toPersianDigits(formatNumber(Math.abs(startBalance))) : "0"}
                            </div>
                          </div>
                        )}

                        {statementTransactions.map((item) => (
                          <React.Fragment key={item.id}>
                            <div
                              className={`statement-table-row ${item.method === "تسویه حساب" ? "settlement-row" : ""} ${item.kind === "invoice" ? "invoice-row-clickable cursor-pointer" : "cursor-default"}`}
                              onClick={item.kind === "invoice" ? () => toggleExpand(item.id) : undefined}
                            >
                              <div className="st-col st-date">{toPersianDigits(item.date)}</div>
                              <div className="st-col st-desc">
                                {item.kind === "invoice" ? (
                                  <div className="st-invoice-desc">
                                    <span>فاکتور فروش شماره <span dir="ltr" style={{ display: "inline-block" }}>{toPersianDigits(item.number)}</span></span>
                                  </div>
                                ) : (
                                  <span className="text-credit">دریافتی ({item.method})</span>
                                )}
                              </div>
                              <div className="st-col st-debt">
                                {item.kind === "invoice" ? toPersianDigits(formatNumber(item.amount)) : ""}
                              </div>
                              <div className="st-col st-credit">
                                {item.kind === "payment" ? toPersianDigits(formatNumber(item.amount)) : ""}
                              </div>
                              <div className={`st-col st-balance ${item.balanceAfter > 0 ? "text-debt" : item.balanceAfter < 0 ? "text-credit" : ""}`}>
                                {item.balanceAfter !== 0 ? toPersianDigits(formatNumber(Math.abs(item.balanceAfter))) : "0"}
                              </div>
                            </div>

                            {item.kind === "invoice" && expandedItems[item.id] && item.items && item.items.length > 0 && (
                              <div className="st-invoice-items">
                                <div className="st-items-header">
                                  <div className="st-item-name">نام کالا</div>
                                  <div className="st-item-qty">تعداد</div>
                                  <div className="st-item-price">فی</div>
                                  <div className="st-item-total">جمع</div>
                                </div>
                                {item.items.map((it, idx) => (
                                  <div className="st-item-row" key={idx}>
                                    <div className="st-item-name">{toPersianDigits(it.desc)}</div>
                                    <div className="st-item-qty">{toPersianDigits(it.quantity)}</div>
                                    <div className="st-item-price">{toPersianDigits(formatNumber(it.unitPrice))}</div>
                                    <div className="st-item-total">{toPersianDigits(formatNumber(Number(it.quantity) * Number(it.unitPrice)))}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </React.Fragment>
                        ))}

                        <div className="statement-table-row final-balance-row">
                          <div className="st-col final-balance-label">مانده نهایی:</div>
                          <div className={`st-col st-balance final-balance-value ${endBalance > 0 ? "text-debt" : endBalance < 0 ? "text-credit" : ""}`}>
                            {endBalance !== 0 ? toPersianDigits(formatNumber(Math.abs(endBalance))) : "0"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>

        {showDateModal && (
          <div
            className="custom-alert-overlay no-print"
            onClick={() => setShowDateModal(false)}
          >
            <div
              className="custom-alert-box"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="alert-title">فیلتر تاریخ</h3>

              <div className="alert-group alert-group-15">
                <label className="alert-label">از تاریخ:</label>
                <div className="st-date-relative">
                  <input
                    type="text"
                    placeholder="انتخاب کنید..."
                    value={tempStartDate}
                    readOnly
                    className="statement-date-input"
                    onClick={() => setDatePickerTarget("start")}
                  />
                  <button
                    type="button"
                    className="st-calendar-trigger-btn"
                    onClick={() => setDatePickerTarget("start")}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="alert-group alert-group-25">
                <label className="alert-label">تا تاریخ:</label>
                <div className="st-date-relative">
                  <input
                    type="text"
                    placeholder="انتخاب کنید..."
                    value={tempEndDate}
                    readOnly
                    className="statement-date-input"
                    onClick={() => setDatePickerTarget("end")}
                  />
                  <button
                    type="button"
                    className="st-calendar-trigger-btn"
                    onClick={() => setDatePickerTarget("end")}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="alert-actions">
                <button
                  className="ledger-action-btn alert-btn alert-btn-primary"
                  onClick={() => {
                    setStartDate(tempStartDate);
                    setEndDate(tempEndDate);
                    setShowDateModal(false);
                  }}
                >
                  تایید
                </button>
                {(tempStartDate || tempEndDate) && (
                  <button
                    className="ledger-action-btn alert-btn-secondary"
                    onClick={() => {
                      setTempStartDate("");
                      setTempEndDate("");
                    }}
                  >
                    حذف فیلتر
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        <JalaliDatePickerModal
          isOpen={datePickerTarget !== null}
          initialDate={
            datePickerTarget === "start"
              ? tempStartDate
              : datePickerTarget === "end"
                ? tempEndDate
                : ""
          }
          onSelectDate={(formattedDate) => {
            if (datePickerTarget === "start") setTempStartDate(formattedDate);
            else if (datePickerTarget === "end") setTempEndDate(formattedDate);
            setDatePickerTarget(null);
          }}
          onClose={() => setDatePickerTarget(null)}
        />
      </div>
    </div>
  );
}