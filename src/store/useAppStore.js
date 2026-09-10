import { create } from "zustand";
import {
  initDB,
  getCustomersFromDB,
  getAllPaymentsFromDB,
  getAllInvoicesFromDB,
  addCustomerToDB,
  updateCustomerInDB,
  deleteCustomerFromDB,
  addPaymentToDB,
  updatePaymentToDB,
  deletePaymentFromDB,
  addInvoiceToDB,
  deleteInvoiceFromDB,
  updateInvoiceToDB,
} from "../services/database";

export const useAppStore = create((set, get) => ({
  isInitialized: false,
  customers: [],
  payments: [],
  invoices: [],

  // بارگیری اولیه کل داده‌ها از دیتابیس لوکال به رم (RAM)
  initializeData: async () => {
    try {
      await initDB();
      const [cList, pList, rawIList] = await Promise.all([
        getCustomersFromDB(),
        getAllPaymentsFromDB(),
        getAllInvoicesFromDB(),
      ]);

      // نرمال‌سازی فاکتورها (مطمئن شدن از اینکه items به صورت آرایه است)
      const iList = (rawIList || []).map((inv) => {
        let parsedItems = inv.items;
        if (typeof inv.items === "string") {
          try {
            parsedItems = JSON.parse(inv.items);
          } catch (e) {
            parsedItems = [];
          }
        }
        return {
          ...inv,
          items: Array.isArray(parsedItems) ? parsedItems : [],
        };
      });

      set({
        customers: cList || [],
        payments: pList || [],
        invoices: iList || [],
        isInitialized: true,
      });
    } catch (err) {
      console.error("خطا در بارگیری اولیه داده‌ها در Store:", err);
      set({ isInitialized: true });
    }
  },

  // ===== مدیریت مشتریان =====
  saveCustomer: async (customerData) => {
    const trimmedName = customerData.name?.trim();
    if (!trimmedName) return false;

    const currentCustomers = get().customers;
    const isDuplicate = currentCustomers.some(
      (c) =>
        String(c.id) !== String(customerData.id) &&
        c.name &&
        c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      return false;
    }

    if (customerData.id) {
      // ویرایش مشتری
      await updateCustomerInDB(customerData).catch((err) =>
        console.error("خطا در به روزرسانی مشتری در دیتابیس:", err)
      );
      set((state) => ({
        customers: state.customers.map((c) =>
          String(c.id) === String(customerData.id) ? { ...c, ...customerData } : c
        ),
      }));
    } else {
      // افزودن مشتری جدید - دریافت شناسه واقعی از دیتابیس
      const realId = await addCustomerToDB(customerData).catch((err) => {
        console.error("خطا در افزودن مشتری در دیتابیس:", err);
        return null;
      });

      const newCustomer = {
        ...customerData,
        id: realId || Date.now(),
      };

      set((state) => ({
        customers: [newCustomer, ...state.customers],
      }));
    }

    return true;
  },

  deleteCustomer: async (id) => {
    // حذف از RAM
    set((state) => ({
      customers: state.customers.filter((c) => String(c.id) !== String(id)),
      payments: state.payments.filter((p) => String(p.customerId) !== String(id)),
      invoices: state.invoices.filter((i) => String(i.customerId) !== String(id)),
    }));

    // حذف از دیتابیس
    await deleteCustomerFromDB(id).catch((err) =>
      console.error("خطا در حذف مشتری از دیتابیس:", err)
    );
  },

  // ===== مدیریت دریافتی‌ها =====
  savePayment: async (paymentData) => {
    if (paymentData.id) {
      await updatePaymentToDB(paymentData).catch((err) =>
        console.error("خطا در به روزرسانی دریافتی:", err)
      );
      set((state) => ({
        payments: state.payments.map((p) =>
          String(p.id) === String(paymentData.id) ? { ...p, ...paymentData } : p
        ),
      }));
    } else {
      const realId = await addPaymentToDB(paymentData).catch((err) => {
        console.error("خطا در افزودن دریافتی در دیتابیس:", err);
        return null;
      });

      const newPayment = {
        ...paymentData,
        id: realId || Date.now(),
      };

      set((state) => ({
        payments: [newPayment, ...state.payments],
      }));
    }
  },

  deletePayment: async (id) => {
    set((state) => ({
      payments: state.payments.filter((p) => String(p.id) !== String(id)),
    }));

    await deletePaymentFromDB(id).catch((err) =>
      console.error("خطا در حذف دریافتی از دیتابیس:", err)
    );
  },

  // ===== مدیریت فاکتورها =====
  saveInvoice: async (invoiceData) => {
    if (invoiceData.id) {
      await updateInvoiceToDB(invoiceData).catch((err) =>
        console.error("خطا در به روزرسانی فاکتور:", err)
      );
      
      let itemsArray = invoiceData.items;
      if (typeof itemsArray === "string") {
        try { itemsArray = JSON.parse(itemsArray); } catch (e) { itemsArray = []; }
      }
      const updatedInvoice = {
        ...invoiceData,
        items: Array.isArray(itemsArray) ? itemsArray : [],
      };
      
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          String(inv.id) === String(invoiceData.id) ? { ...inv, ...updatedInvoice } : inv
        ),
      }));
      return updatedInvoice;
    } else {
      const realId = await addInvoiceToDB(invoiceData).catch((err) => {
        console.error("خطا در افزودن فاکتور در دیتابیس:", err);
        return null;
      });
      let itemsArray = invoiceData.items;
      if (typeof itemsArray === "string") {
        try {
          itemsArray = JSON.parse(itemsArray);
        } catch (e) {
          itemsArray = [];
        }
      }
      const newInvoice = {
        ...invoiceData,
        id: realId || Date.now(),
        items: Array.isArray(itemsArray) ? itemsArray : [],
      };
      set((state) => ({
        invoices: [newInvoice, ...state.invoices],
      }));
      return newInvoice;
    }
  },
  deleteInvoice: async (id) => {
    set((state) => ({
      invoices: state.invoices.filter((inv) => String(inv.id) !== String(id)),
    }));

    await deleteInvoiceFromDB(id).catch((err) =>
      console.error("خطا در حذف فاکتور از دیتابیس:", err)
    );
  },
}));
