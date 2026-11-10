import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius, typography, touchTargets } from '../theme/tokens';

export interface UrgentNoticeItem {
  id: string;
  category: 'calendar' | 'bill' | 'medication' | 'project' | 'health';
  title: string;
  subtitle: string;
  dueText: string;
  priority: 'urgent' | 'high' | 'normal';
  targetAgentId: string;
  onPress?: () => void;
}

export interface ActivityRingsSummary {
  stepsCount: number;
  stepsGoal: number;
  hydrationMl: number;
  hydrationGoalMl: number;
  dueTasksCount: number;
  upcomingBillsCount: number;
}

export interface HomeScreenHubProps {
  notices: UrgentNoticeItem[];
  vitals: ActivityRingsSummary;
  dailyBriefingText?: string;
  onSelectAgent: (agentId: string) => void;
  onOpenScanner?: () => void;
  onOpenStudio?: () => void;
}

export const HomeScreenHub: React.FC<HomeScreenHubProps> = ({
  notices,
  vitals,
  dailyBriefingText,
  onSelectAgent,
  onOpenScanner,
  onOpenStudio,
}) => {
  const stepPercent = Math.min(100, Math.round((vitals.stepsCount / vitals.stepsGoal) * 100)) || 0;
  const hydrationPercent =
    Math.min(100, Math.round((vitals.hydrationMl / vitals.hydrationGoalMl) * 100)) || 0;

  return (
    <View style={styles.container}>
      {/* 1. URGENT / ATTENTION BANNER (If any urgent bills, medication, or events pending) */}
      {notices.length > 0 ? (
        <View style={styles.urgentSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.urgentBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.urgentBadgeText}>NEEDS ATTENTION ({notices.length})</Text>
            </View>
            <Text style={styles.sectionSubtext}>Tap to address immediately</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.noticesScroll}
          >
            {notices.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.noticeCard,
                  item.priority === 'urgent' && styles.noticeCardUrgent,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  if (item.onPress) item.onPress();
                  onSelectAgent(item.targetAgentId);
                }}
              >
                <View style={styles.noticeTopRow}>
                  <Text style={styles.noticeCategory}>{item.category.toUpperCase()}</Text>
                  <Text style={styles.noticeDue}>{item.dueText}</Text>
                </View>
                <Text style={styles.noticeTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.noticeSubtitle} numberOfLines={2}>
                  {item.subtitle}
                </Text>
                <View style={styles.noticeActionRow}>
                  <Text style={styles.noticeActionText}>Open in {item.targetAgentId} →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* 2. GLANCEABLE DAILY HERO BRIEFING */}
      {dailyBriefingText ? (
        <TouchableOpacity
          style={styles.briefingCard}
          activeOpacity={0.85}
          onPress={() => onSelectAgent('butler')}
        >
          <View style={styles.briefingHeader}>
            <Text style={styles.runeSymbol}>ᚲ</Text>
            <Text style={styles.briefingTag}>DAILY BRIEFING • BUTLER</Text>
          </View>
          <Text style={styles.briefingContent}>{dailyBriefingText}</Text>
        </TouchableOpacity>
      ) : null}

      {/* 3. VITALS & DOMAIN METRIC TILES */}
      <View style={styles.metricsGrid}>
        {/* Step Counter Tile */}
        <TouchableOpacity
          style={styles.metricTile}
          activeOpacity={0.8}
          onPress={() => onSelectAgent('health')}
        >
          <Text style={styles.metricLabel}>DAILY STEPS</Text>
          <Text style={styles.metricValue}>{vitals.stepsCount.toLocaleString()}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${stepPercent}%` }]} />
          </View>
          <Text style={styles.metricSub}>{stepPercent}% of {vitals.stepsGoal.toLocaleString()}</Text>
        </TouchableOpacity>

        {/* Hydration Tile */}
        <TouchableOpacity
          style={styles.metricTile}
          activeOpacity={0.8}
          onPress={() => onSelectAgent('health')}
        >
          <Text style={styles.metricLabel}>HYDRATION</Text>
          <Text style={styles.metricValue}>{vitals.hydrationMl} ml</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                styles.progressCyan,
                { width: `${hydrationPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.metricSub}>{vitals.hydrationGoalMl} ml Target</Text>
        </TouchableOpacity>
      </View>

      {/* 4. ONE-TAP ACTION DOCK */}
      <View style={styles.quickDock}>
        {onOpenScanner ? (
          <TouchableOpacity
            style={styles.dockButton}
            activeOpacity={0.8}
            onPress={onOpenScanner}
          >
            <Text style={styles.dockIcon}>📷</Text>
            <Text style={styles.dockLabel}>Scan Document</Text>
          </TouchableOpacity>
        ) : null}

        {onOpenStudio ? (
          <TouchableOpacity
            style={styles.dockButton}
            activeOpacity={0.8}
            onPress={onOpenStudio}
          >
            <Text style={styles.dockIcon}>⚡</Text>
            <Text style={styles.dockLabel}>Agent Studio</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  urgentSection: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
    marginRight: 6,
  },
  urgentBadgeText: {
    color: '#fca5a5',
    fontSize: typography.micro,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  sectionSubtext: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  noticesScroll: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  noticeCard: {
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  noticeCardUrgent: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
    backgroundColor: '#16111a',
  },
  noticeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  noticeCategory: {
    color: colors.accentCyan,
    fontSize: typography.micro,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  noticeDue: {
    color: '#f87171',
    fontSize: typography.caption,
    fontWeight: typography.semibold,
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: typography.bold,
    marginBottom: 2,
  },
  noticeSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  noticeActionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  noticeActionText: {
    color: colors.accentCyan,
    fontSize: typography.caption,
    fontWeight: typography.semibold,
  },
  briefingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderHighlighted,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  briefingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  runeSymbol: {
    color: colors.accentCyan,
    fontSize: 16,
    marginRight: 6,
    fontWeight: 'bold',
  },
  briefingTag: {
    color: colors.accentCyan,
    fontSize: typography.caption,
    fontWeight: typography.bold,
    letterSpacing: 1,
  },
  briefingContent: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: typography.h2,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#1e1e2d',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accentEmerald,
    borderRadius: borderRadius.full,
  },
  progressCyan: {
    backgroundColor: colors.accentCyan,
  },
  metricSub: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  quickDock: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dockButton: {
    flex: 1,
    minHeight: touchTargets.minTouchArea,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dockIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  dockLabel: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: typography.semibold,
  },
});
