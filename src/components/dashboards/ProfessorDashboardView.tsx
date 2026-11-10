import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  LearningRoadmap,
  AcquiredSkill,
  SpacedRepetitionCard,
  StudySummary,
  FlashcardEase,
} from '../../agents/ProfessorService';
import { colors, spacing, borderRadius, typography, touchTargets } from '../../theme/tokens';

export interface ProfessorDashboardViewProps {
  summary: StudySummary;
  roadmaps: LearningRoadmap[];
  skills: AcquiredSkill[];
  dueCards: SpacedRepetitionCard[];
  onReviewCard: (cardId: string, rating: FlashcardEase) => void;
  onAdvanceTopic?: (roadmapId: string, topicId: string) => void;
}

export const ProfessorDashboardView: React.FC<ProfessorDashboardViewProps> = ({
  summary,
  roadmaps,
  skills,
  dueCards,
  onReviewCard,
  onAdvanceTopic,
}) => {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'roadmaps' | 'skills'>('flashcards');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeCard = dueCards.length > 0 && currentCardIndex < dueCards.length
    ? dueCards[currentCardIndex]
    : null;

  const handleRateCard = (rating: FlashcardEase) => {
    if (!activeCard) return;
    onReviewCard(activeCard.id, rating);
    setIsFlipped(false);
    if (currentCardIndex + 1 < dueCards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setCurrentCardIndex(0);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Mastery Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>DUE REVIEWS</Text>
          <Text style={styles.summaryValue}>{summary.dueCardsCount}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>SKILLS MASTERED</Text>
          <Text style={styles.summaryValue}>{summary.acquiredSkillsCount}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>STUDY STREAK</Text>
          <Text style={styles.summaryValue}>{summary.currentStreakDays}d 🔥</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'flashcards' && styles.tabActive]}
          onPress={() => setActiveTab('flashcards')}
        >
          <Text style={[styles.tabText, activeTab === 'flashcards' && styles.tabTextActive]}>
            ᚬ Flashcards ({dueCards.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'roadmaps' && styles.tabActive]}
          onPress={() => setActiveTab('roadmaps')}
        >
          <Text style={[styles.tabText, activeTab === 'roadmaps' && styles.tabTextActive]}>
            ᚱ Roadmaps ({roadmaps.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'skills' && styles.tabActive]}
          onPress={() => setActiveTab('skills')}
        >
          <Text style={[styles.tabText, activeTab === 'skills' && styles.tabTextActive]}>
            ᛋ Skills ({skills.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* FLASHCARDS TAB */}
      {activeTab === 'flashcards' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {!activeCard ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᚬ</Text>
              <Text style={styles.emptyText}>All Flashcards Reviewed!</Text>
              <Text style={styles.emptySubtext}>Great job! Your memory retention intervals are scheduled via SM-2 algorithm.</Text>
            </View>
          ) : (
            <View style={styles.cardContainer}>
              <View style={styles.cardCounterRow}>
                <Text style={styles.cardCounterText}>Card {currentCardIndex + 1} of {dueCards.length}</Text>
                <Text style={styles.cardSubjectBadge}>SM-2 INTERVAL: {activeCard.intervalDays}d</Text>
              </View>

              {/* Flashcard Flip Card */}
              <TouchableOpacity
                style={styles.flashcard}
                activeOpacity={0.9}
                onPress={() => setIsFlipped((prev) => !prev)}
              >
                <Text style={styles.cardSideHint}>{isFlipped ? 'ANSWER (ᛋ)' : 'QUESTION (ᚦ - Tap to reveal)'}</Text>
                <Text style={styles.cardPromptText}>
                  {isFlipped ? activeCard.back : activeCard.front}
                </Text>
              </TouchableOpacity>

              {/* SM-2 Rating Buttons */}
              {isFlipped ? (
                <View style={styles.ratingBar}>
                  <TouchableOpacity
                    style={[styles.ratingBtn, { borderColor: colors.dangerRed }]}
                    onPress={() => handleRateCard('again')}
                  >
                    <Text style={[styles.ratingBtnText, { color: colors.dangerRed }]}>Again</Text>
                    <Text style={styles.ratingBtnSub}>1d</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.ratingBtn, { borderColor: colors.amberWarning }]}
                    onPress={() => handleRateCard('hard')}
                  >
                    <Text style={[styles.ratingBtnText, { color: colors.amberWarning }]}>Hard</Text>
                    <Text style={styles.ratingBtnSub}>2d</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.ratingBtn, { borderColor: colors.glacialCyan }]}
                    onPress={() => handleRateCard('good')}
                  >
                    <Text style={[styles.ratingBtnText, { color: colors.glacialCyan }]}>Good</Text>
                    <Text style={styles.ratingBtnSub}>4d</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.ratingBtn, { borderColor: colors.emeraldGreen }]}
                    onPress={() => handleRateCard('easy')}
                  >
                    <Text style={[styles.ratingBtnText, { color: colors.emeraldGreen }]}>Easy</Text>
                    <Text style={styles.ratingBtnSub}>7d</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.revealButton}
                  onPress={() => setIsFlipped(true)}
                >
                  <Text style={styles.revealButtonText}>Reveal Answer 👁️</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* ROADMAPS TAB */}
      {activeTab === 'roadmaps' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {roadmaps.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᚱ</Text>
              <Text style={styles.emptyText}>No active learning roadmaps</Text>
              <Text style={styles.emptySubtext}>Ask Professor to construct a mastery path for any skill or subject</Text>
            </View>
          ) : (
            roadmaps.map((rm) => {
              const completedCount = rm.topics.filter((t) => t.isCompleted).length;
              const ratio = rm.topics.length > 0 ? completedCount / rm.topics.length : 0;
              return (
                <View key={rm.id} style={styles.roadmapCard}>
                  <View style={styles.roadmapHeader}>
                    <Text style={styles.roadmapTitle}>{rm.title}</Text>
                    <Text style={styles.roadmapProgress}>{Math.round(ratio * 100)}%</Text>
                  </View>
                  <Text style={styles.roadmapDesc}>{rm.description}</Text>

                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.round(ratio * 100)}%` }]} />
                  </View>

                  {/* Topics Checklist */}
                  <View style={styles.topicsList}>
                    {rm.topics.map((top) => (
                      <View key={top.id} style={styles.topicRow}>
                        <TouchableOpacity
                          style={[styles.topicCheckbox, top.isCompleted && styles.topicCheckboxDone]}
                          onPress={() => onAdvanceTopic && onAdvanceTopic(rm.id, top.id)}
                        >
                          <Text style={styles.topicCheckmark}>{top.isCompleted ? '✓' : ''}</Text>
                        </TouchableOpacity>
                        <View style={styles.topicInfo}>
                          <Text style={[styles.topicTitle, top.isCompleted && styles.topicTitleDone]}>
                            {top.title}
                          </Text>
                          {top.description ? <Text style={styles.topicEst}>{top.description}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : null}

      {/* SKILLS TAB */}
      {activeTab === 'skills' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {skills.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᛋ</Text>
              <Text style={styles.emptyText}>No skills recorded yet</Text>
              <Text style={styles.emptySubtext}>Complete topics and flashcards to build your skill tree</Text>
            </View>
          ) : (
            <View style={styles.skillsGrid}>
              {skills.map((skill) => (
                <View key={skill.id} style={styles.skillBadgeCard}>
                  <Text style={styles.skillRune}>ᛟ</Text>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Text style={styles.skillLevel}>{skill.proficiency.toUpperCase()}</Text>
                  <Text style={styles.skillHours}>{skill.hoursInvested} hrs invested</Text>
                </View>
              ))}
            </View>
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
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardSlate,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.cardBorder,
  },
  summaryLabel: {
    ...typography.captionStyle,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.slateMuted,
    marginBottom: 2,
  },
  summaryValue: {
    ...typography.title,
    fontSize: 16,
    color: colors.frostSilver,
    fontWeight: '700',
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
    borderBottomColor: colors.runicGold,
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
  cardContainer: {
    alignItems: 'center',
  },
  cardCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.sm,
  },
  cardCounterText: {
    ...typography.captionStyle,
    color: colors.slateMuted,
  },
  cardSubjectBadge: {
    ...typography.captionStyle,
    color: colors.runicGold,
    fontWeight: '600',
  },
  flashcard: {
    width: '100%',
    minHeight: 240,
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  cardSideHint: {
    ...typography.captionStyle,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.slateMuted,
    position: 'absolute',
    top: spacing.md,
  },
  cardPromptText: {
    ...typography.title,
    fontSize: 18,
    color: colors.frostSilver,
    textAlign: 'center',
    lineHeight: 26,
    marginVertical: spacing.lg,
  },
  ratingBar: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
  },
  ratingBtn: {
    flex: 1,
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  ratingBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ratingBtnSub: {
    ...typography.captionStyle,
    fontSize: 10,
    color: colors.slateMuted,
    marginTop: 2,
  },
  revealButton: {
    width: '100%',
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glacialCyan,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  revealButtonText: {
    color: colors.glacialCyan,
    fontWeight: '700',
    fontSize: 14,
  },
  roadmapCard: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  roadmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roadmapTitle: {
    ...typography.bodyStyle,
    fontSize: 16,
    fontWeight: '700',
    color: colors.frostSilver,
  },
  roadmapProgress: {
    ...typography.title,
    fontSize: 14,
    color: colors.runicGold,
  },
  roadmapDesc: {
    ...typography.captionStyle,
    color: colors.slateMuted,
    marginVertical: spacing.xs,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.cardElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.runicGold,
  },
  topicsList: {
    marginTop: spacing.sm,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  topicCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.slateMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  topicCheckboxDone: {
    backgroundColor: colors.emeraldGreen,
    borderColor: colors.emeraldGreen,
  },
  topicCheckmark: {
    color: colors.midnightObsidian,
    fontWeight: '700',
    fontSize: 12,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    ...typography.bodyStyle,
    fontSize: 13,
    color: colors.frostSilver,
  },
  topicTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.slateMuted,
  },
  topicEst: {
    ...typography.captionStyle,
    fontSize: 10,
    color: colors.slateMuted,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skillBadgeCard: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  skillRune: {
    fontSize: 24,
    color: colors.runicGold,
    marginBottom: spacing.xs,
  },
  skillName: {
    ...typography.bodyStyle,
    fontSize: 13,
    fontWeight: '600',
    color: colors.frostSilver,
    textAlign: 'center',
  },
  skillLevel: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.glacialCyan,
    fontWeight: '700',
    marginVertical: 2,
  },
  skillHours: {
    ...typography.captionStyle,
    fontSize: 10,
    color: colors.slateMuted,
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
