import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  ExpenseRecord,
  RecurringBill,
  SpendingSummary,
  ExpenseCategory,
} from '../../agents/AccountsService';
import { colors, spacing, borderRadius, typography, touchTargets } from '../../theme/tokens';

export interface AccountsDashboardViewProps {
  summary: SpendingSummary;
  recentExpenses: ExpenseRecord[];
  recurringBills: RecurringBill[];
  onAddExpense: (amount: number, category: ExpenseCategory, merchant: string, currency?: string) => void;
  onToggleBillPaid: (billId: string) => void;
  onOpenReceiptScanner: () => void;
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food_dining: colors.runicGold,
  groceries: colors.emeraldGreen,
  transportation: '#818cf8',
  utilities: colors.glacialCyan,
  entertainment: '#f43f5e',
  health_medical: '#2dd4bf',
  shopping: '#fb923c',
  education: '#a855f7',
  other: colors.slateMuted,
};

export const AccountsDashboardView: React.FC<AccountsDashboardViewProps> = ({
  summary,
  recentExpenses,
  recurringBills,
  onAddExpense,
  onToggleBillPaid,
  onOpenReceiptScanner,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'bills'>('overview');
  const [amountInput, setAmountInput] = useState('');
  const [merchantInput, setMerchantInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>('groceries');

  const handleCreateExpense = () => {
    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !merchantInput.trim()) return;
    onAddExpense(parsedAmount, selectedCategory, merchantInput.trim(), summary.currency || 'USD');
    setAmountInput('');
    setMerchantInput('');
  };

  const categories = Object.keys(summary.categoryBreakdown || {}) as ExpenseCategory[];
  const breakdownValues = Object.values(summary.categoryBreakdown || {});
  const maxCategorySpend = breakdownValues.length > 0 ? Math.max(...breakdownValues, 1) : 1;

  return (
    <View style={styles.container}>
      {/* Top Action & Scanner Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarSub}>ᛞ TOTAL MONTHLY OUTFLOW</Text>
          <Text style={styles.topBarTotal}>${summary.totalSpent.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.scanReceiptBtn} onPress={onOpenReceiptScanner}>
          <Text style={styles.scanReceiptBtnText}>📷 Scan Receipt</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'expenses' && styles.tabActive]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>
            Expenses ({recentExpenses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'bills' && styles.tabActive]}
          onPress={() => setActiveTab('bills')}
        >
          <Text style={[styles.tabText, activeTab === 'bills' && styles.tabTextActive]}>
            Bills ({recurringBills.filter((b) => !b.isPaidForCurrentCycle).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {/* Category Breakdown Bar Chart */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>SPENDING BY CATEGORY</Text>
            {categories.length === 0 ? (
              <Text style={styles.emptyCardText}>No expenses recorded yet.</Text>
            ) : (
              categories.map((cat) => {
                const amount = summary.categoryBreakdown[cat] || 0;
                const ratio = Math.min(amount / maxCategorySpend, 1);
                const color = CATEGORY_COLORS[cat] || colors.slateMuted;
                return (
                  <View key={cat} style={styles.chartRow}>
                    <View style={styles.chartLabelRow}>
                      <Text style={styles.chartCategory}>{cat.replace('_', ' ').toUpperCase()}</Text>
                      <Text style={styles.chartAmount}>${amount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.barBackground}>
                      <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Quick Expense Form */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>+ QUICK EXPENSE LOG</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: spacing.sm }]}
                placeholder="Amount ($)"
                placeholderTextColor={colors.slateMuted}
                keyboardType="numeric"
                value={amountInput}
                onChangeText={setAmountInput}
              />
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Merchant / Vendor"
                placeholderTextColor={colors.slateMuted}
                value={merchantInput}
                onChangeText={setMerchantInput}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {(Object.keys(CATEGORY_COLORS) as ExpenseCategory[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    selectedCategory === cat && { backgroundColor: CATEGORY_COLORS[cat] || colors.glacialCyan },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      selectedCategory === cat && { color: colors.midnightObsidian, fontWeight: '700' },
                    ]}
                  >
                    {cat.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.logButton} onPress={handleCreateExpense}>
              <Text style={styles.logButtonText}>Save Expense Log</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}

      {/* EXPENSES LIST TAB */}
      {activeTab === 'expenses' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {recentExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᚠ</Text>
              <Text style={styles.emptyText}>No recent expense transactions</Text>
              <Text style={styles.emptySubtext}>Use quick expense or scan a receipt</Text>
            </View>
          ) : (
            recentExpenses.map((exp) => {
              const dateStr = new Date(exp.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
              const color = CATEGORY_COLORS[exp.category] || colors.slateMuted;
              return (
                <View key={exp.id} style={styles.expenseItem}>
                  <View style={[styles.categoryPill, { backgroundColor: color }]}>
                    <Text style={styles.categoryPillText}>{exp.category.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseDesc}>{exp.merchant}</Text>
                    <Text style={styles.expenseSub}>{dateStr} • {exp.category.replace('_', ' ')}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>-${exp.amount.toFixed(2)}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : null}

      {/* RECURRING BILLS TAB */}
      {activeTab === 'bills' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {recurringBills.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᛇ</Text>
              <Text style={styles.emptyText}>No upcoming recurring bills</Text>
              <Text style={styles.emptySubtext}>Ask Accounts Agent to track subscriptions</Text>
            </View>
          ) : (
            recurringBills.map((bill) => (
              <View key={bill.id} style={styles.billCard}>
                <View style={styles.billInfo}>
                  <Text style={styles.billName}>{bill.name}</Text>
                  <Text style={styles.billDue}>Due day {bill.dueDayOfMonth} of each month</Text>
                  <Text style={styles.billAmount}>${bill.amount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.paidToggle, bill.isPaidForCurrentCycle && styles.paidToggleActive]}
                  onPress={() => onToggleBillPaid(bill.id)}
                >
                  <Text style={[styles.paidToggleText, bill.isPaidForCurrentCycle && styles.paidToggleTextActive]}>
                    {bill.isPaidForCurrentCycle ? '✓ Paid' : 'Mark Paid'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightObsidian,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.cardSlate,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  topBarSub: {
    ...typography.captionStyle,
    fontSize: 10,
    color: colors.slateMuted,
    letterSpacing: 1,
  },
  topBarTotal: {
    ...typography.title,
    fontSize: 24,
    color: colors.frostSilver,
    fontWeight: '700',
  },
  scanReceiptBtn: {
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glacialCyan,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  scanReceiptBtnText: {
    color: colors.glacialCyan,
    fontWeight: '600',
    fontSize: 13,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardSlate,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.glacialCyan,
  },
  tabText: {
    ...typography.captionStyle,
    fontSize: 12,
    color: colors.slateMuted,
  },
  tabTextActive: {
    color: colors.frostSilver,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    ...typography.captionStyle,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.slateMuted,
    marginBottom: spacing.md,
  },
  emptyCardText: {
    ...typography.captionStyle,
    color: colors.slateMuted,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  chartRow: {
    marginBottom: spacing.sm,
  },
  chartLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartCategory: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.frostSilver,
  },
  chartAmount: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.slateMuted,
    fontWeight: '600',
  },
  barBackground: {
    height: 8,
    backgroundColor: colors.cardElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.frostSilver,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: touchTargets.min,
  },
  categoryScroll: {
    marginVertical: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.cardElevated,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  catChipText: {
    fontSize: 11,
    color: colors.slateMuted,
    textTransform: 'capitalize',
  },
  logButton: {
    backgroundColor: colors.glacialCyan,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  logButtonText: {
    color: colors.midnightObsidian,
    fontWeight: '700',
    fontSize: 13,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSlate,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryPillText: {
    color: colors.midnightObsidian,
    fontWeight: '700',
    fontSize: 13,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseDesc: {
    ...typography.bodyStyle,
    fontSize: 14,
    color: colors.frostSilver,
    fontWeight: '600',
  },
  expenseSub: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.slateMuted,
    textTransform: 'capitalize',
  },
  expenseAmount: {
    ...typography.title,
    fontSize: 15,
    color: colors.frostSilver,
    fontWeight: '700',
  },
  billCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardSlate,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    ...typography.bodyStyle,
    fontSize: 15,
    fontWeight: '600',
    color: colors.frostSilver,
  },
  billDue: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.slateMuted,
    marginVertical: 2,
  },
  billAmount: {
    ...typography.title,
    fontSize: 14,
    color: colors.runicGold,
    fontWeight: '700',
  },
  paidToggle: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  paidToggleActive: {
    borderColor: colors.emeraldGreen,
    backgroundColor: '#064e3b',
  },
  paidToggleText: {
    ...typography.captionStyle,
    fontSize: 12,
    color: colors.slateMuted,
  },
  paidToggleTextActive: {
    color: colors.emeraldGreen,
    fontWeight: '700',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRune: {
    fontSize: 40,
    color: colors.slateMuted,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.title,
    fontSize: 16,
    color: colors.frostSilver,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.captionStyle,
    color: colors.slateMuted,
    textAlign: 'center',
  },
});
