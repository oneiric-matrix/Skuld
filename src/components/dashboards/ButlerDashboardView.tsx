import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { CalendarEvent, ButlerReminder } from '../../agents/ButlerAgentService';
import { colors, spacing, borderRadius, typography, touchTargets } from '../../theme/tokens';

export interface ButlerDashboardViewProps {
  events: CalendarEvent[];
  reminders: ButlerReminder[];
  onAddEvent: (title: string, startTime: number, endTime: number, category: CalendarEvent['category']) => void;
  onToggleReminder: (reminderId: string) => void;
  onAddReminder: (text: string, priority: ButlerReminder['priority']) => void;
  onDeleteEvent?: (id: string) => void;
}

export const ButlerDashboardView: React.FC<ButlerDashboardViewProps> = ({
  events,
  reminders,
  onAddEvent,
  onToggleReminder,
  onAddReminder,
  onDeleteEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'reminders'>('schedule');
  const [newReminderText, setNewReminderText] = useState('');
  const [reminderPriority, setReminderPriority] = useState<ButlerReminder['priority']>('normal');

  const handleCreateReminder = () => {
    if (!newReminderText.trim()) return;
    onAddReminder(newReminderText.trim(), reminderPriority);
    setNewReminderText('');
  };

  return (
    <View style={styles.container}>
      {/* Header & Tab Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'schedule' && styles.tabButtonActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>
            Schedule ({events.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'reminders' && styles.tabButtonActive]}
          onPress={() => setActiveTab('reminders')}
        >
          <Text style={[styles.tabText, activeTab === 'reminders' && styles.tabTextActive]}>
            Reminders ({reminders.filter((r) => !r.isCompleted).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* SCHEDULE AGENDA TAB */}
      {activeTab === 'schedule' ? (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᛞ</Text>
              <Text style={styles.emptyText}>No upcoming events scheduled</Text>
              <Text style={styles.emptySubtext}>Ask Butler to book focus blocks or meetings</Text>
            </View>
          ) : (
            events.map((evt) => {
              const start = new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const end = new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <View key={evt.id} style={styles.eventCard}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeText}>{start}</Text>
                    <Text style={styles.timeSubtext}>{end}</Text>
                  </View>
                  <View style={styles.eventDivider} />
                  <View style={styles.eventDetails}>
                    <View style={styles.eventBadgeRow}>
                      <Text style={styles.eventCategoryBadge}>{evt.category.toUpperCase()}</Text>
                      {onDeleteEvent ? (
                        <TouchableOpacity onPress={() => onDeleteEvent(evt.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Text style={styles.deleteText}>✕</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <Text style={styles.eventTitle}>{evt.title}</Text>
                    {evt.location ? <Text style={styles.eventLocation}>📍 {evt.location}</Text> : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* REMINDERS TAB */
        <View style={styles.remindersWrapper}>
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {reminders.map((rem) => (
              <TouchableOpacity
                key={rem.id}
                style={[styles.reminderCard, rem.isCompleted && styles.reminderCardDone]}
                activeOpacity={0.7}
                onPress={() => onToggleReminder(rem.id)}
              >
                <View style={[styles.checkbox, rem.isCompleted && styles.checkboxDone]}>
                  {rem.isCompleted ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <View style={styles.reminderContent}>
                  <Text style={[styles.reminderText, rem.isCompleted && styles.reminderTextDone]}>
                    {rem.text}
                  </Text>
                  <Text style={styles.reminderPriority}>
                    Priority: {rem.priority.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick-Add Reminder Dock */}
          <View style={styles.addReminderRow}>
            <TextInput
              style={styles.reminderInput}
              placeholder="Add a new reminder..."
              placeholderTextColor={colors.textDim}
              value={newReminderText}
              onChangeText={setNewReminderText}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleCreateReminder}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0a0a12',
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceElevated,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: typography.semibold,
  },
  tabTextActive: {
    color: colors.accentCyan,
  },
  listContainer: {
    maxHeight: 280,
  },
  remindersWrapper: {
    minHeight: 200,
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyRune: {
    color: colors.accentCyan,
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginTop: 2,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeColumn: {
    width: 65,
    justifyContent: 'center',
  },
  timeText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
  timeSubtext: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  eventDivider: {
    width: 2,
    backgroundColor: colors.accentCyan,
    marginHorizontal: spacing.sm,
    borderRadius: 1,
  },
  eventDetails: {
    flex: 1,
  },
  eventBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventCategoryBadge: {
    color: colors.accentCyan,
    fontSize: typography.micro,
    fontWeight: typography.bold,
  },
  deleteText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  eventTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  eventLocation: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 4,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderCardDone: {
    opacity: 0.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxDone: {
    backgroundColor: colors.accentCyan,
  },
  checkmark: {
    color: '#0a0a12',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reminderContent: {
    flex: 1,
  },
  reminderText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  reminderTextDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  reminderPriority: {
    color: colors.textMuted,
    fontSize: typography.micro,
    marginTop: 2,
  },
  addReminderRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  reminderInput: {
    flex: 1,
    minHeight: touchTargets.minTouchArea,
    backgroundColor: '#0a0a12',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.body,
  },
  addBtn: {
    minHeight: touchTargets.minTouchArea,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentCyan,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#0a0a12',
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
});
