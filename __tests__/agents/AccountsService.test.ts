import { AccountsService, accountsAgent } from '../../src/agents/AccountsService';
import { ButlerAgentService, butlerAgent } from '../../src/agents/ButlerAgentService';
import { agentBus } from '../../src/kernel/AgentBusService';

describe('AccountsService (Task 3.5)', () => {
  let accounts: AccountsService;

  beforeEach(() => {
    accounts = AccountsService.getInstance();
    accounts.clearAll();
    butlerAgent.clearAll();
  });

  describe('Expense Logging & Querying', () => {
    it('logs an expense record successfully', () => {
      const expense = accounts.logExpense(
        42.5,
        'Trader Joe',
        'groceries',
        'USD',
        'Weekly fresh supplies'
      );

      expect(expense.id).toMatch(/^exp_/);
      expect(expense.amount).toBe(42.5);
      expect(expense.merchant).toBe('Trader Joe');
      expect(expense.category).toBe('groceries');
      expect(expense.currency).toBe('USD');
      expect(expense.isRecurring).toBe(false);

      const list = accounts.getExpenses();
      expect(list).toHaveLength(1);
    });

    it('throws error when amount is zero or negative', () => {
      expect(() => accounts.logExpense(0, 'Store')).toThrow(
        'Expense amount must be a positive number'
      );
      expect(() => accounts.logExpense(-15, 'Store')).toThrow(
        'Expense amount must be a positive number'
      );
      expect(() => accounts.logExpense(NaN, 'Store')).toThrow(
        'Expense amount must be a positive number'
      );
    });

    it('throws error when merchant name is empty', () => {
      expect(() => accounts.logExpense(10, '')).toThrow('Merchant name cannot be empty');
      expect(() => accounts.logExpense(10, '   ')).toThrow('Merchant name cannot be empty');
    });

    it('filters expenses by category and timestamp bounds', () => {
      const now = Date.now();
      accounts.logExpense(10, 'Coffee Shop', 'food_dining', 'USD', undefined, undefined, false, now - 5000);
      accounts.logExpense(50, 'Metro Card', 'transportation', 'USD', undefined, undefined, false, now - 2000);
      accounts.logExpense(120, 'Supermarket', 'groceries', 'USD', undefined, undefined, false, now);

      const diningExpenses = accounts.getExpenses('food_dining');
      expect(diningExpenses).toHaveLength(1);
      expect(diningExpenses[0].merchant).toBe('Coffee Shop');

      const recentExpenses = accounts.getExpenses(undefined, now - 3000, now + 1000);
      expect(recentExpenses).toHaveLength(2);
    });

    it('deletes an expense record', () => {
      const expense = accounts.logExpense(25, 'Bookstore', 'shopping');
      expect(accounts.deleteExpense(expense.id)).toBe(true);
      expect(accounts.getExpenses()).toHaveLength(0);
      expect(accounts.deleteExpense('unknown_id')).toBe(false);
    });
  });

  describe('Spending Summaries & Budget Breakdown', () => {
    it('calculates total spent, category breakdown, and average accurately', () => {
      accounts.logExpense(30, 'Dinner', 'food_dining');
      accounts.logExpense(70, 'Groceries', 'groceries');
      accounts.logExpense(50, 'Gas', 'transportation');

      const summary = accounts.getSpendingSummary();
      expect(summary.totalSpent).toBe(150);
      expect(summary.count).toBe(3);
      expect(summary.averageExpense).toBe(50);
      expect(summary.categoryBreakdown.food_dining).toBe(30);
      expect(summary.categoryBreakdown.groceries).toBe(70);
      expect(summary.categoryBreakdown.transportation).toBe(50);
      expect(summary.categoryBreakdown.utilities).toBe(0);
    });

    it('returns zeroes for empty spending summaries', () => {
      const summary = accounts.getSpendingSummary();
      expect(summary.totalSpent).toBe(0);
      expect(summary.count).toBe(0);
      expect(summary.averageExpense).toBe(0);
    });
  });

  describe('Recurring Bills & Butler Alerts', () => {
    it('creates recurring bill and marks it paid', () => {
      const bill = accounts.addRecurringBill('Fiber Internet', 65.0, 15, 'monthly', 'utilities');

      expect(bill.id).toMatch(/^bill_/);
      expect(bill.name).toBe('Fiber Internet');
      expect(bill.amount).toBe(65.0);
      expect(bill.isPaidForCurrentCycle).toBe(false);

      const paidBill = accounts.markBillPaid(bill.id, true);
      expect(paidBill.isPaidForCurrentCycle).toBe(true);

      const expenses = accounts.getExpenses();
      expect(expenses).toHaveLength(1);
      expect(expenses[0].merchant).toBe('Fiber Internet');
      expect(expenses[0].isRecurring).toBe(true);
    });

    it('throws error creating bill with invalid name, amount, or due day', () => {
      expect(() => accounts.addRecurringBill('', 50, 10)).toThrow('Bill name cannot be empty');
      expect(() => accounts.addRecurringBill('Water', -10, 10)).toThrow(
        'Bill amount must be a positive number'
      );
      expect(() => accounts.addRecurringBill('Power', 50, 32)).toThrow(
        'Due day must be between 1 and 31'
      );
      expect(() => accounts.addRecurringBill('Power', 50, 0)).toThrow(
        'Due day must be between 1 and 31'
      );
    });

    it('throws error marking non-existent bill paid', () => {
      expect(() => accounts.markBillPaid('unknown_bill')).toThrow('Bill unknown_bill not found');
    });

    it('retrieves upcoming bills within given window', () => {
      accounts.addRecurringBill('Cloud Storage', 10, 20);
      const bills = accounts.getUpcomingBills(60);
      expect(bills.length).toBeGreaterThanOrEqual(1);
    });

    it('deletes a recurring bill', () => {
      const bill = accounts.addRecurringBill('Gym', 45, 1);
      expect(accounts.deleteRecurringBill(bill.id)).toBe(true);
      expect(accounts.deleteRecurringBill('bill_fake')).toBe(false);
    });

    it('schedules bill alert with Butler over Agent Bus', async () => {
      const bill = accounts.addRecurringBill('Electricity', 120.0, 25);
      const res = await accounts.scheduleBillReminderWithButler(bill.id, 48);

      expect(res.scheduled).toBe(true);
      expect(res.reminderId).toBeDefined();

      const reminders = butlerAgent.getReminders(true);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].text).toContain('Electricity');
      expect(reminders[0].priority).toBe('high');
    });

    it('throws error scheduling reminder for non-existent bill', async () => {
      await expect(accounts.scheduleBillReminderWithButler('missing_bill')).rejects.toThrow(
        'Bill missing_bill not found'
      );
    });
  });

  describe('Receipt OCR Ingestion & Parser', () => {
    it('extracts merchant, total amount, and currency from OCR string', () => {
      const sampleReceipt = `
        WHOLE FOODS MARKET
        100 Main Street
        Apples 3.99
        Almond Milk 4.50
        Bread 2.50
        ---------------------
        TOTAL: $10.99
        THANK YOU FOR SHOPPING
      `;

      const parsed = accounts.parseReceiptText(sampleReceipt);
      expect(parsed.merchant).toBe('WHOLE FOODS MARKET');
      expect(parsed.amount).toBe(10.99);
      expect(parsed.currency).toBe('USD');
    });

    it('parses European EUR receipt text', () => {
      const eurReceipt = `
        Carrefour City
        Paris, France
        Croissant 1.50
        Cafe 2.00
        Total 3.50 EUR
      `;

      const parsed = accounts.parseReceiptText(eurReceipt);
      expect(parsed.merchant).toBe('Carrefour City');
      expect(parsed.amount).toBe(3.5);
      expect(parsed.currency).toBe('EUR');
    });

    it('handles empty receipt text gracefully', () => {
      const parsed = accounts.parseReceiptText('');
      expect(parsed.detectedText).toBe('');
      expect(parsed.amount).toBeUndefined();
    });

    it('logs expense directly from receipt OCR text', () => {
      const receipt = `
        Organic Harvest
        Avocados 5.00
        Olive Oil 12.00
        Total: $17.00
      `;

      const expense = accounts.logExpenseFromReceipt(receipt, 'groceries', 'file://receipts/img1.png');
      expect(expense.merchant).toBe('Organic Harvest');
      expect(expense.amount).toBe(17.0);
      expect(expense.category).toBe('groceries');
      expect(expense.receiptUri).toBe('file://receipts/img1.png');
      expect(accounts.getExpenses()).toHaveLength(1);
    });

    it('throws error logging expense from receipt without valid amount', () => {
      const unreadableReceipt = `
        Some Store
        No Prices Found Here
      `;
      expect(() => accounts.logExpenseFromReceipt(unreadableReceipt)).toThrow(
        'Could not detect a valid positive amount from receipt'
      );
    });
  });

  describe('Agent Bus Integration & Peer Agent Queries', () => {
    it('answers get_spending_summary query over Agent Bus', async () => {
      accounts.logExpense(80, 'Tech Store', 'shopping');

      const response = await agentBus.askAgent<
        { startTime?: number },
        { totalSpent: number; count: number }
      >('butler', 'accounts', 'get_spending_summary', {});

      expect(response.success).toBe(true);
      expect(response.data?.totalSpent).toBe(80);
      expect(response.data?.count).toBe(1);
    });

    it('answers get_upcoming_bills query over Agent Bus', async () => {
      accounts.addRecurringBill('Streaming Service', 15.99, 10);

      const response = await agentBus.askAgent<
        { daysAhead?: number },
        Array<{ name: string; amount: number }>
      >('butler', 'accounts', 'get_upcoming_bills', { daysAhead: 60 });

      expect(response.success).toBe(true);
      expect(response.data?.length).toBeGreaterThanOrEqual(1);
      expect(response.data![0].name).toBe('Streaming Service');
    });

    it('allows peer agents to log an expense via Agent Bus', async () => {
      const response = await agentBus.askAgent<
        { amount: number; merchant: string; category?: string },
        { id: string; amount: number; merchant: string }
      >('butler', 'accounts', 'log_expense', {
        amount: 22.0,
        merchant: 'Pharmacy',
        category: 'health_medical',
      });

      expect(response.success).toBe(true);
      expect(response.data?.amount).toBe(22.0);
      expect(response.data?.merchant).toBe('Pharmacy');
      expect(accounts.getExpenses()).toHaveLength(1);
    });
  });
});
