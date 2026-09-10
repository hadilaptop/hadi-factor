import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

// ==========================================
// ۱. دیتابیس بومی (برای اجرا روی موبایل - SQLite)
// ==========================================
class NativeDatabase {
    constructor() {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
        this.db = null;
        this.isInitialized = false;
        this.dbName = 'my_invoice_db';
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            const isConn = await this.sqlite.isConnection(this.dbName);
            if (isConn.result) {
                this.db = await this.sqlite.retrieveConnection(this.dbName);
            } else {
                this.db = await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
            }
            await this.db.open();

            const createTableQuery = `
              CREATE TABLE IF NOT EXISTS customers (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  address TEXT,
                  phone TEXT,
                  economicCode TEXT,
                  avatar TEXT
              );
              CREATE TABLE IF NOT EXISTS payments (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  customerId INTEGER NOT NULL,
                  date TEXT NOT NULL,
                  amount REAL NOT NULL,
                  method TEXT NOT NULL,
                  bankName TEXT,
                  checkDate TEXT,
                  checkNumber TEXT,
                  note TEXT,
                  attachment TEXT,
                  createdAt TEXT
              );
              CREATE TABLE IF NOT EXISTS invoices (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  customerId INTEGER NOT NULL,
                  customerName TEXT,
                  number TEXT,
                  type TEXT NOT NULL,
                  date TEXT NOT NULL,
                  amount REAL NOT NULL,
                  note TEXT,
                  items TEXT,
                  createdAt TEXT
              );
            `;
            await this.db.execute(createTableQuery);

            try {
                await this.db.execute("ALTER TABLE payments ADD COLUMN bankName TEXT;");
            } catch (e) {}

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error("خطا در راه‌اندازی دیتابیس بومی (موبایل):", error);
            return false;
        }
    }

    async ensureInit() {
        if (!this.isInitialized || !this.db) {
            await this.initialize();
        }
    }

    async getCustomerById(id) {
        await this.ensureInit();
        try {
            if (!this.db || !id) return null;
            const result = await this.db.query("SELECT * FROM customers WHERE id = ?", [id]);
            return result.values && result.values.length > 0 ? result.values[0] : null;
        } catch (error) {
            return null;
        }
    }

    async getCustomers() {
        await this.ensureInit();
        try {
            if (!this.db) return [];
            const result = await this.db.query("SELECT id, name, address, phone, economicCode FROM customers ORDER BY id DESC");
            return result.values || [];
        } catch (error) {
            return [];
        }
    }

    async addCustomer(customer) {
        await this.ensureInit();
        try {
            if (!customer || !customer.name) return null;
            const query = `INSERT INTO customers (name, address, phone, economicCode, avatar) VALUES (?, ?, ?, ?, ?)`;
            const values = [
                customer.name,
                customer.address || '',
                customer.phone || '',
                customer.economicCode || '',
                customer.avatar || ''
            ];
            const result = await this.db.run(query, values);
            return result.changes.lastId;
        } catch (error) {
            return null;
        }
    }

    async updateCustomer(customer) {
        await this.ensureInit();
        try {
            if (!customer || !customer.id) return false;
            const query = `
                UPDATE customers 
                SET name = ?, address = ?, phone = ?, economicCode = ?, avatar = ?
                WHERE id = ?
            `;
            const values = [customer.name, customer.address, customer.phone, customer.economicCode, customer.avatar, customer.id];
            await this.db.run(query, values);
            return true;
        } catch (error) {
            return false;
        }
    }

    async deleteCustomer(id) {
        await this.ensureInit();
        try {
            if (!this.db || !id) return false;
            const query = `DELETE FROM customers WHERE id = ?`;
            await this.db.run(query, [id]);
            return true;
        } catch (error) {
            return false;
        }
    }

    async getPaymentsByCustomerId(customerId) {
        await this.ensureInit();
        try {
            if (!this.db) return [];
            const result = await this.db.query("SELECT * FROM payments WHERE customerId = ? ORDER BY id DESC", [customerId]);
            return result.values || [];
        } catch (error) {
            return [];
        }
    }

    async getAllPayments() {
        await this.ensureInit();
        try {
            if (!this.db) return [];
            const result = await this.db.query("SELECT id, customerId, date, amount, method, bankName, checkDate, checkNumber, note, createdAt FROM payments ORDER BY id DESC");
            return result.values || [];
        } catch (error) {
            return [];
        }
    }

    async addPayment(payment) {
        await this.ensureInit();
        try {
            if (!this.db || !payment || !payment.customerId) return null;
            const query = `INSERT INTO payments (customerId, date, amount, method, bankName, checkDate, checkNumber, note, attachment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const values = [
                payment.customerId,
                payment.date || '',
                payment.amount || 0,
                payment.method || 'نقدی',
                payment.bankName || '',
                payment.checkDate || '',
                payment.checkNumber || '',
                payment.note || '',
                payment.attachment || '',
                payment.createdAt || new Date().toISOString()
            ];
            const result = await this.db.run(query, values);
            return result.changes.lastId;
        } catch (error) {
            return null;
        }
    }

    async updatePayment(payment) {
        await this.ensureInit();
        try {
            if (!this.db || !payment || !payment.id) return false;
            const query = `
                UPDATE payments 
                SET date = ?, amount = ?, method = ?, bankName = ?, checkDate = ?, checkNumber = ?, note = ?, attachment = ?
                WHERE id = ?
            `;
            const values = [
                payment.date || '',
                payment.amount || 0,
                payment.method || 'نقدی',
                payment.bankName || '',
                payment.checkDate || '',
                payment.checkNumber || '',
                payment.note || '',
                payment.attachment || '',
                payment.id
            ];
            await this.db.run(query, values);
            return true;
        } catch (error) {
            return false;
        }
    }

    async deletePayment(id) {
        await this.ensureInit();
        try {
            if (!this.db || !id) return false;
            await this.db.run("DELETE FROM payments WHERE id = ?", [id]);
            return true;
        } catch (error) {
            return false;
        }
    }

    async getInvoicesByCustomerId(customerId) {
        await this.ensureInit();
        try {
            if (!this.db) return [];
            const result = await this.db.query("SELECT * FROM invoices WHERE customerId = ? ORDER BY id DESC", [customerId]);
            return result.values || [];
        } catch (error) {
            return [];
        }
    }

    async getAllInvoices() {
        await this.ensureInit();
        try {
            if (!this.db) return [];
            const result = await this.db.query("SELECT * FROM invoices ORDER BY id DESC");
            return result.values || [];
        } catch (error) {
            return [];
        }
    }

    async addInvoice(invoice) {
        await this.ensureInit();
        try {
            if (!this.db || !invoice || !invoice.customerId) return null;
            const query = `INSERT INTO invoices (customerId, customerName, number, type, date, amount, note, items, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const values = [
                invoice.customerId,
                invoice.customerName || '',
                invoice.number || '',
                invoice.type || 'فاکتور',
                invoice.date || '',
                invoice.amount || 0,
                invoice.note || '',
                invoice.items || '[]',
                invoice.createdAt || new Date().toISOString()
            ];
            const result = await this.db.run(query, values);
            return result.changes.lastId;
        } catch (error) {
            return null;
        }
    }

    
    async updateInvoice(invoice) {
        await this.ensureInit();
        try {
            if (!this.db || !invoice || !invoice.id) return false;
            const query = `UPDATE invoices SET customerId=?, customerName=?, number=?, type=?, date=?, amount=?, note=?, items=?, createdAt=? WHERE id=?`;
            const values = [
                invoice.customerId,
                invoice.customerName || '',
                invoice.number || '',
                invoice.type || 'فاکتور',
                invoice.date || '',
                invoice.amount || 0,
                invoice.note || '',
                invoice.items || '[]',
                invoice.createdAt || new Date().toISOString(),
                invoice.id
            ];
            await this.db.run(query, values);
            return true;
        } catch (error) {
            return false;
        }
    }

    
    async deleteInvoice(id) {
        await this.ensureInit();
        try {
            if (!this.db || !id) return false;
            await this.db.run("DELETE FROM invoices WHERE id = ?", [id]);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// ==========================================
// ۲. دیتابیس وب (برای تست لایو روی مرورگر لپ‌تاپ - IndexedDB)
// ==========================================
class WebDatabase {
    constructor() {
        this.dbName = 'my_invoice_db_web';
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        return new Promise((resolve) => {
            const request = indexedDB.open(this.dbName, 2);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('customers')) {
                    db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('payments')) {
                    const paymentStore = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
                    paymentStore.createIndex('customerId', 'customerId', { unique: false });
                }
                if (!db.objectStoreNames.contains('invoices')) {
                    const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
                    invoiceStore.createIndex('customerId', 'customerId', { unique: false });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                resolve(true);
            };
            request.onerror = () => resolve(false);
        });
    }

    async ensureInit() {
        if (!this.isInitialized || !this.db) {
            await this.initialize();
        }
    }

    async getCustomerById(id) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db || !id) return resolve(null);
            const transaction = this.db.transaction(['customers'], 'readonly');
            const store = transaction.objectStore('customers');
            const request = store.get(Number(id));
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => resolve(null);
        });
    }

    async getCustomers() {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const transaction = this.db.transaction(['customers'], 'readonly');
            const store = transaction.objectStore('customers');
            const request = store.getAll();
            request.onsuccess = () => {
                const data = request.result || [];
                data.sort((a, b) => b.id - a.id);
                // For consistency with Native, we could strip avatars here too,
                // but IndexedDB is local and doesn't use a bridge, so it's less of a bottleneck.
                resolve(data);
            };
            request.onerror = () => resolve([]);
        });
    }

    async addCustomer(customer) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db || !customer || !customer.name) return resolve(null);
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');
            const newCustomer = {
                name: customer.name,
                address: customer.address || '',
                phone: customer.phone || '',
                economicCode: customer.economicCode || '',
                avatar: customer.avatar || ''
            };
            const request = store.add(newCustomer);
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = () => resolve(null);
        });
    }

    async updateCustomer(customer) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db || !customer || !customer.id) return resolve(false);
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');
            const request = store.put(customer);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }

    async deleteCustomer(id) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db || !id) return resolve(false);
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }

    async getPaymentsByCustomerId(customerId) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const transaction = this.db.transaction(['payments'], 'readonly');
            const store = transaction.objectStore('payments');
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result || [];
                const filtered = all.filter(p => String(p.customerId) === String(customerId));
                filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
                resolve(filtered);
            };
            request.onerror = () => resolve([]);
        });
    }

    async getAllPayments() {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const transaction = this.db.transaction(['payments'], 'readonly');
            const store = transaction.objectStore('payments');
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result || [];
                all.sort((a, b) => (b.id || 0) - (a.id || 0));
                resolve(all);
            };
            request.onerror = () => resolve([]);
        });
    }

    async addPayment(payment) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db || !payment || !payment.customerId) return resolve(null);
            const transaction = this.db.transaction(['payments'], 'readwrite');
            const store = transaction.objectStore('payments');
            const newPayment = {
                customerId: payment.customerId,
                date: payment.date || '',
                amount: payment.amount || 0,
                method: payment.method || 'نقدی',
                bankName: payment.bankName || '',
                checkDate: payment.checkDate || '',
                checkNumber: payment.checkNumber || '',
                note: payment.note || '',
                attachment: payment.attachment || '',
                createdAt: payment.createdAt || new Date().toISOString()
            };
            const request = store.add(newPayment);
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = () => resolve(null);
        });
    }

    async updatePayment(payment) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db || !payment || !payment.id) return resolve(false);
            const transaction = this.db.transaction(['payments'], 'readwrite');
            const store = transaction.objectStore('payments');
            const request = store.put(payment);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }

    async deletePayment(id) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db || !id) return resolve(false);
            const transaction = this.db.transaction(['payments'], 'readwrite');
            const store = transaction.objectStore('payments');
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }

    async getInvoicesByCustomerId(customerId) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const transaction = this.db.transaction(['invoices'], 'readonly');
            const store = transaction.objectStore('invoices');
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result || [];
                const filtered = all.filter(inv => String(inv.customerId) === String(customerId));
                filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
                resolve(filtered);
            };
            request.onerror = () => resolve([]);
        });
    }

    async getAllInvoices() {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const transaction = this.db.transaction(['invoices'], 'readonly');
            const store = transaction.objectStore('invoices');
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result || [];
                all.sort((a, b) => (b.id || 0) - (a.id || 0));
                resolve(all);
            };
            request.onerror = () => resolve([]);
        });
    }

    async addInvoice(invoice) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db || !invoice || !invoice.customerId) return resolve(null);
            const transaction = this.db.transaction(['invoices'], 'readwrite');
            const store = transaction.objectStore('invoices');
            const newInvoice = {
                customerId: invoice.customerId,
                customerName: invoice.customerName || '',
                number: invoice.number || '',
                type: invoice.type || 'فاکتور',
                date: invoice.date || '',
                amount: invoice.amount || 0,
                note: invoice.note || '',
                items: invoice.items || [],
                createdAt: invoice.createdAt || new Date().toISOString()
            };
            const request = store.add(newInvoice);
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = () => resolve(null);
        });
    }

    
    async updateInvoice(invoice) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db || !invoice || !invoice.id) return resolve(false);
            const transaction = this.db.transaction(['invoices'], 'readwrite');
            const store = transaction.objectStore('invoices');
            const request = store.put(invoice);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }

    async deleteInvoice(id) {
        await this.ensureInit();
        return new Promise((resolve) => {
            if (!this.db || !id) return resolve(false);
            const transaction = this.db.transaction(['invoices'], 'readwrite');
            const store = transaction.objectStore('invoices');
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }
}

// ==========================================
// ۳. رابط کارخانه (مدیریت هوشمند لایه‌ها)
// ==========================================
class DatabaseService {
    constructor() {
        this.strategy = Capacitor.isNativePlatform() ? new NativeDatabase() : new WebDatabase();
    }

    async initialize() {
        return await this.strategy.initialize();
    }

    async getCustomerById(id) {
        if (this.strategy.getCustomerById) {
            return await this.strategy.getCustomerById(id);
        }
        return null;
    }

    async getCustomers() {
        return await this.strategy.getCustomers();
    }

    async addCustomer(customer) {
        return await this.strategy.addCustomer(customer);
    }

    async updateCustomer(customer) {
        return await this.strategy.updateCustomer(customer);
    }

    async deleteCustomer(id) {
        return await this.strategy.deleteCustomer(id);
    }

    async getPaymentsByCustomerId(customerId) {
        return await this.strategy.getPaymentsByCustomerId(customerId);
    }

    async getAllPayments() {
        return await this.strategy.getAllPayments();
    }

    async addPayment(payment) {
        return await this.strategy.addPayment(payment);
    }

    async updatePayment(payment) {
        if (this.strategy.updatePayment) {
            return await this.strategy.updatePayment(payment);
        }
        return false;
    }

    async deletePayment(id) {
        return await this.strategy.deletePayment(id);
    }

    async getInvoicesByCustomerId(customerId) {
        return await this.strategy.getInvoicesByCustomerId(customerId);
    }

    async getAllInvoices() {
        return await this.strategy.getAllInvoices();
    }

    async addInvoice(invoice) {
        return await this.strategy.addInvoice(invoice);
    }

    
    async updateInvoice(invoice) {
        if (this.strategy.updateInvoice) {
            return await this.strategy.updateInvoice(invoice);
        }
        return false;
    }

    async deleteInvoice(id) {
        return await this.strategy.deleteInvoice(id);
    }
}

export const dbService = new DatabaseService();

export const initDB = () => dbService.initialize();
export const getCustomerByIdFromDB = (id) => dbService.getCustomerById(id);
export const getCustomersFromDB = () => dbService.getCustomers();
export const addCustomerToDB = (customer) => dbService.addCustomer(customer);
export const updateCustomerInDB = (customer) => dbService.updateCustomer(customer);
export const deleteCustomerFromDB = (id) => dbService.deleteCustomer(id);

export const getPaymentsFromDB = (customerId) => dbService.getPaymentsByCustomerId(customerId);
export const getAllPaymentsFromDB = () => dbService.getAllPayments();
export const addPaymentToDB = (payment) => dbService.addPayment(payment);
export const updatePaymentToDB = (payment) => dbService.updatePayment(payment);
export const deletePaymentFromDB = (id) => dbService.deletePayment(id);

export const getInvoicesFromDB = (customerId) => dbService.getInvoicesByCustomerId(customerId);
export const getAllInvoicesFromDB = () => dbService.getAllInvoices();
export const addInvoiceToDB = (invoice) => dbService.addInvoice(invoice);
export const deleteInvoiceFromDB = (id) => dbService.deleteInvoice(id);

export const updateInvoiceToDB = (invoice) => dbService.updateInvoice(invoice);
