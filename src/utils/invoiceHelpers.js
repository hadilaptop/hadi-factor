// src/utils/invoiceHelpers.js

export const toPersianDigits = (str) => {
    if (str === undefined || str === null) return '';
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.toString().replace(/\d/g, x => persianDigits[x]);
};

export const toEnglishDigits = (str) => {
    if (str === undefined || str === null) return '';
    return str.toString()
        .replace(/[۰-۹]/g, x => '۰۱۲۳۴۵۶۷۸۹'.indexOf(x))
        .replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x));
};

export const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "۰";
    let str = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return toPersianDigits(str);
};

export const parseNumber = (str) => {
    if (!str) return 0;
    let engStr = toEnglishDigits(str).replace(/,/g, '').replace(/،/g, '');
    return parseInt(engStr) || 0;
};

export const numberToPersianWords = (amount) => {
    if (amount === 0) return "صفر ریال";

    const units = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
    const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
    const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
    const hundreds = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];

    function convertChunk(num) {
        if (num === 0) return "";
        let result = "";
        let h = Math.floor(num / 100);
        let r = num % 100;
        if (h > 0) result += hundreds[h];
        if (r >= 10 && r <= 19) {
            if (h > 0) result += " و ";
            result += teens[r - 10];
        } else {
            let t = Math.floor(r / 10);
            let u = r % 10;
            if (t > 0) {
                if (h > 0) result += " و ";
                result += tens[t];
            }
            if (u > 0) {
                if (h > 0 || t > 0) result += " و ";
                result += units[u];
            }
        }
        return result;
    }

    let parts = [];
    let billions = Math.floor(amount / 1000000000);
    let remaining = amount % 1000000000;
    let millions = Math.floor(remaining / 1000000);
    remaining = remaining % 1000000;
    let thousands = Math.floor(remaining / 1000);
    let rest = remaining % 1000;

    if (billions > 0) parts.push(convertChunk(billions) + " میلیارد");
    if (millions > 0) parts.push(convertChunk(millions) + " میلیون");
    if (thousands > 0) parts.push(convertChunk(thousands) + " هزار");
    if (rest > 0) parts.push(convertChunk(rest));

    return (parts.length === 1 ? parts[0] : parts.join(" و ")) + " ریال";
};

export const getCurrentPersianDate = () => {
    const today = new Date();
    const persianDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(today);
    return toPersianDigits(persianDate.replace(/\//g, '/'));
};

export const getCustomerCode = (customer, customers = []) => {
    if (!customer) return "1001";
    if (customer.code) return String(customer.code);
    const numId = Number(customer.id);
    if (!isNaN(numId) && numId > 0) {
        if (numId >= 1001 && numId < 1000000) {
            return String(numId);
        }
        if (numId < 1000) {
            return String(1000 + numId);
        }
    }
    const idx = (customers || []).findIndex((c) => String(c.id) === String(customer.id));
    if (idx !== -1) {
        return String(1001 + idx);
    }
    return "1001";
};

export const getAutoInvoiceNumber = (customerCode, invoiceType, invoices = [], customerId = null) => {
    const code = customerCode || "1001";
    
    let targetInvoices = [];
    if (customerId) {
        targetInvoices = (invoices || []).filter(inv => {
            if (String(inv.customerId) !== String(customerId)) return false;
            const t1 = (inv.type === "فاکتور" || !inv.type) ? "فاکتور فروش" : inv.type;
            const t2 = invoiceType === "فاکتور" ? "فاکتور فروش" : invoiceType;
            return t1 === t2;
        });
    }

    let maxSeq = 100;
    targetInvoices.forEach(inv => {
        if (!inv || !inv.number) return;
        const engStr = toEnglishDigits(inv.number);
        const matches = engStr.match(/(\d+)\s*$/);
        if (matches && matches[1]) {
            const num = parseInt(matches[1], 10);
            if (!isNaN(num) && num > maxSeq && num < 1000000) {
                maxSeq = num;
            }
        }
    });

    const nextSeq = maxSeq + 1;
    const isProforma = invoiceType === "پیش فاکتور";
    const numString = isProforma 
        ? `${code}/b/${nextSeq}` 
        : `${code}/${nextSeq}`;
    
    return toPersianDigits(numString);
};