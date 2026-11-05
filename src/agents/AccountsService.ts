import { agentBus } from '../kernel/AgentBusService';

export type ExpenseCategory =
  | 'food_dining'
  | 'groceries'
  | 'transportation'
  | 'utilities'
  | 'entertainment'
  | 'health_medical'
  | 'shopping'
  | 'education'
  | 'other';

export type BillFrequency = 'one_time' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface ExpenseRecord {
  id: string;
  amount: number; // Stored in major currency units e.g. 12.50
  currency: string; // ISO 4217 e.g. 'USD', 'EUR', 'INR'
  category: ExpenseCategory;
  merchant: string;
  notes?: string;
  receiptUri?: string;
  isRecurring: boolean;
  timestamp: number;
  createdAt: number;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  frequency: BillFrequency;
  dueDayOfMonth: number; // 1-31
  nextDueDate: number;
  autoAlertEnabled: boolean;
  isPaidForCurrentCycle: boolean;
  createdAt: number;
}

export interface SpendingSummary {
  totalSpent: number;
  currency: string;
  count: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
  averageExpense: number;
}

export interface ReceiptOCRResult {
  merchant?: string;
  amount?: number;
  currency?: string;
  date?: string;
  detectedText: string;
}

/**
 * Accounts & Personal Finance Domain Service.
 * Manages expense logging, recurring bill tracking, budget summaries,
 * and handles receipt scanning (OCR) ingestion.
 * Integrates with Butler via AgentBus to schedule bill reminders and alerts.
 */
export class AccountsService {
  private static instance: AccountsService | null = null;
  private expenses = new Map<string, ExpenseRecord>();
  private bills = new Map<string, RecurringBill>();

  private constructor() {
    this.registerBusHandlers();
  }

  static getInstance(): AccountsService {
    if (!AccountsService.instance) {
      AccountsService.instance = new AccountsService();
    }
    return AccountsService.instance;
  }

  /**
   * Registers Accounts query & command handlers onto the central Agent Bus.
   */
  private registerBusHandlers(): void {
    // 1. Peer agents can query spending summary
    agentBus.registerQueryHandler<
      { startTime?: number; endTime?: number; category?: ExpenseCategory },
      SpendingSummary
    >('accounts', 'get_spending_summary', async (query) => {
      return this.getSpendingSummary(
        query.payload.startTime,
        query.payload.endTime,
        query.payload.category
      );
    });

    // 2. Peer agents can query upcoming recurring bills
    agentBus.registerQueryHandler<{ daysAhead?: number }, RecurringBill[]>(
      'accounts',
      'get_upcoming_bills',
      async (query) => {
        return this.getUpcomingBills(query.payload.daysAhead || 30);
      }
    );

    // 3. Peer agents can log expenses via Agent Bus
    agentBus.registerQueryHandler<
      {
        amount: number;
        merchant: string;
        category?: ExpenseCategory;
        currency?: string;
        notes?: string;
      },
      ExpenseRecord
    >('accounts', 'log_expense', async (query) => {
      return this.logExpense(
        query.payload.amount,
        query.payload.merchant,
        query.payload.category || 'other',
        query.payload.currency || 'USD',
        query.payload.notes
      );
    });
  }

  // --- Expense Management ---

  logExpense(
    amount: number,
    merchant: string,
    category: ExpenseCategory = 'other',
    currency = 'USD',
    notes?: string,
    receiptUri?: string,
    isRecurring = false,
    timestamp = Date.now()
  ): ExpenseRecord {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new Error('Expense amount must be a positive number');
    }
    if (!merchant || !merchant.trim()) {
      throw new Error('Merchant name cannot be empty');
    }

    const now = Date.now();
    const expense: ExpenseRecord = {
      id: `exp_${now}_${Math.random().toString(36).substring(2, 7)}`,
      amount: Math.round(amount * 100) / 100,
      currency: currency.toUpperCase().trim(),
      category,
      merchant: merchant.trim(),
      notes: notes?.trim(),
      receiptUri,
      isRecurring,
      timestamp,
      createdAt: now,
    };

    this.expenses.set(expense.id, expense);
    return expense;
  }

  getExpenses(categoryFilter?: ExpenseCategory, startTime?: number, endTime?: number): ExpenseRecord[] {
    return Array.from(this.expenses.values())
      .filter((e) => {
        if (categoryFilter && e.category !== categoryFilter) return false;
        if (startTime && e.timestamp < startTime) return false;
        if (endTime && e.timestamp > endTime) return false;
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  deleteExpense(id: string): boolean {
    return this.expenses.delete(id);
  }

  // --- Spending Analysis & Budgeting ---

  getSpendingSummary(
    startTime = 0,
    endTime = Date.now() + 86400000,
    categoryFilter?: ExpenseCategory
  ): SpendingSummary {
    const list = this.getExpenses(categoryFilter, startTime, endTime);

    const breakdown: Record<ExpenseCategory, number> = {
      food_dining: 0,
      groceries: 0,
      transportation: 0,
      utilities: 0,
      entertainment: 0,
      health_medical: 0,
      shopping: 0,
      education: 0,
      other: 0,
    };

    let total = 0;
    const defaultCurrency = list.length > 0 ? list[0].currency : 'USD';

    for (const item of list) {
      total += item.amount;
      breakdown[item.category] = (breakdown[item.category] || 0) + item.amount;
    }

    total = Math.round(total * 100) / 100;
    for (const key of Object.keys(breakdown) as ExpenseCategory[]) {
      breakdown[key] = Math.round(breakdown[key] * 100) / 100;
    }

    const count = list.length;
    const average = count === 0 ? 0 : Math.round((total / count) * 100) / 100;

    return {
      totalSpent: total,
      currency: defaultCurrency,
      count,
      categoryBreakdown: breakdown,
      averageExpense: average,
    };
  }

  // --- Recurring Bills & Alerts ---

  addRecurringBill(
    name: string,
    amount: number,
    dueDayOfMonth: number,
    frequency: BillFrequency = 'monthly',
    category: ExpenseCategory = 'utilities',
    currency = 'USD',
    autoAlertEnabled = true
  ): RecurringBill {
    if (!name || !name.trim()) {
      throw new Error('Bill name cannot be empty');
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new Error('Bill amount must be a positive number');
    }
    if (dueDayOfMonth < 1 || dueDayOfMonth > 31) {
      throw new Error('Due day must be between 1 and 31');
    }

    const now = new Date();
    let nextDueDate = new Date(now.getFullYear(), now.getMonth(), dueDayOfMonth).getTime();
    if (nextDueDate < now.getTime()) {
      nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDayOfMonth).getTime();
    }

    const bill: RecurringBill = {
      id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      amount: Math.round(amount * 100) / 100,
      currency: currency.toUpperCase().trim(),
      category,
      frequency,
      dueDayOfMonth,
      nextDueDate,
      autoAlertEnabled,
      isPaidForCurrentCycle: false,
      createdAt: Date.now(),
    };

    this.bills.set(bill.id, bill);
    return bill;
  }

  markBillPaid(billId: string, logAsExpense = true): RecurringBill {
    const bill = this.bills.get(billId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    bill.isPaidForCurrentCycle = true;

    if (logAsExpense) {
      this.logExpense(
        bill.amount,
        bill.name,
        bill.category,
        bill.currency,
        `Recurring bill payment (${bill.frequency})`,
        undefined,
        true
      );
    }

    return bill;
  }

  getUpcomingBills(daysAhead = 30): RecurringBill[] {
    const now = Date.now();
    const threshold = now + daysAhead * 86400000;

    return Array.from(this.bills.values())
      .filter((b) => b.nextDueDate >= now && b.nextDueDate <= threshold)
      .sort((a, b) => a.nextDueDate - b.nextDueDate);
  }

  deleteRecurringBill(id: string): boolean {
    return this.bills.delete(id);
  }

  /**
   * Schedules bill reminder alerts via Butler over the central Agent Bus.
   */
  async scheduleBillReminderWithButler(
    billId: string,
    hoursBeforeDue = 24
  ): Promise<{ scheduled: boolean; reminderId?: string }> {
    const bill = this.bills.get(billId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    const alertTime = bill.nextDueDate - hoursBeforeDue * 3600000;
    const alertText = `Upcoming Bill Due: ${bill.name} (${bill.currency} ${bill.amount.toFixed(2)}) is due soon.`;

    const response = await agentBus.askAgent<
      { text: string; remindAt: number; priority: string },
      { id: string }
    >('accounts', 'butler', 'create_reminder', {
      text: alertText,
      remindAt: Math.max(Date.now(), alertTime),
      priority: 'high',
    });

    if (response.success && response.data) {
      return { scheduled: true, reminderId: response.data.id };
    }
    return { scheduled: false };
  }

  // --- Receipt OCR Parser & Ingestion ---

  /**
   * Ingests text extracted by OCR engine and extracts structured expense data.
   */
  parseReceiptText(ocrText: string): ReceiptOCRResult {
    if (!ocrText || !ocrText.trim()) {
      return { detectedText: '' };
    }

    const text = ocrText.trim();
    let merchant: string | undefined;
    let amount: number | undefined;
    let currency = 'USD';

    // 1. Identify common currency symbols
    if (text.includes('€') || text.includes('EUR')) currency = 'EUR';
    else if (text.includes('£') || text.includes('GBP')) currency = 'GBP';
    else if (text.includes('₹') || text.includes('INR')) currency = 'INR';
    else if (text.includes('$') || text.includes('USD')) currency = 'USD';

    // 2. Extract potential Total amounts (e.g. "Total: $45.60", "TOTAL 120.00", "Amount: 89.99")
    const totalMatch = text.match(
      /(?:total|amount|subtotal|balance due)[\s:=$€£₹]*([0-9]+[.,][0-9]{2})/i
    );
    if (totalMatch && totalMatch[1]) {
      const parsedAmount = parseFloat(totalMatch[1].replace(',', '.'));
      if (!isNaN(parsedAmount)) {
        amount = parsedAmount;
      }
    } else {
      // Fallback: look for the largest standalone currency amount
      const currencyPattern = /[$€£₹]?\s*([0-9]+\.[0-9]{2})/g;
      const matches = Array.from(text.matchAll(currencyPattern));
      if (matches.length > 0) {
        const candidateAmounts = matches
          .map((m) => parseFloat(m[1]))
          .filter((v) => !isNaN(v));
        if (candidateAmounts.length > 0) {
          amount = Math.max(...candidateAmounts);
        }
      }
    }

    // 3. Extract Merchant (first non-empty line usually represents store/merchant name)
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 1 && !/^[0-9\W]+$/.test(l));

    if (lines.length > 0) {
      merchant = lines[0];
    }

    return {
      merchant,
      amount,
      currency,
      detectedText: text,
    };
  }

  /**
   * Helper to process receipt text and log it as an expense record directly.
   */
  logExpenseFromReceipt(
    ocrText: string,
    defaultCategory: ExpenseCategory = 'groceries',
    receiptUri?: string
  ): ExpenseRecord {
    const parsed = this.parseReceiptText(ocrText);
    const amount = parsed.amount || 0;
    const merchant = parsed.merchant || 'Unknown Merchant';

    if (amount <= 0) {
      throw new Error('Could not detect a valid positive amount from receipt');
    }

    return this.logExpense(
      amount,
      merchant,
      defaultCategory,
      parsed.currency || 'USD',
      `Parsed from OCR receipt: ${merchant}`,
      receiptUri
    );
  }

  clearAll(): void {
    this.expenses.clear();
    this.bills.clear();
  }
}

export const accountsAgent = AccountsService.getInstance();
