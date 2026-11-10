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
  MedicationSchedule,
  WorkoutSession,
  DailyHealthVitals,
} from '../../agents/HealthService';
import { colors, spacing, borderRadius, typography, touchTargets } from '../../theme/tokens';

export interface HealthDashboardViewProps {
  vitals: DailyHealthVitals;
  medications: MedicationSchedule[];
  workouts: WorkoutSession[];
  onLogSteps: (delta: number) => void;
  onLogHydration: (amountMl: number) => void;
  onToggleMedication: (medicationId: string) => void;
  onLogWorkout: (type: WorkoutSession['exerciseType'], title: string, durationMinutes: number, caloriesBurned?: number) => void;
}

export const HealthDashboardView: React.FC<HealthDashboardViewProps> = ({
  vitals,
  medications,
  workouts,
  onLogSteps,
  onLogHydration,
  onToggleMedication,
  onLogWorkout,
}) => {
  const [activeTab, setActiveTab] = useState<'vitals' | 'meds' | 'workouts'>('vitals');
  const [workoutType, setWorkoutType] = useState<WorkoutSession['exerciseType']>('cardio');
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutCalories, setWorkoutCalories] = useState('');

  const stepsGoal = 10000;
  const stepsRatio = Math.min(vitals.steps / stepsGoal, 1);
  const hydrationRatio = Math.min(vitals.hydrationMl / vitals.hydrationGoalMl, 1);

  const handleCreateWorkout = () => {
    const duration = parseInt(workoutDuration, 10);
    if (isNaN(duration) || duration <= 0 || !workoutTitle.trim()) return;
    const calories = workoutCalories ? parseInt(workoutCalories, 10) : undefined;
    onLogWorkout(workoutType, workoutTitle.trim(), duration, calories);
    setWorkoutTitle('');
    setWorkoutDuration('');
    setWorkoutCalories('');
  };

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vitals' && styles.tabActive]}
          onPress={() => setActiveTab('vitals')}
        >
          <Text style={[styles.tabText, activeTab === 'vitals' && styles.tabTextActive]}>
            ᚢ Vitals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'meds' && styles.tabActive]}
          onPress={() => setActiveTab('meds')}
        >
          <Text style={[styles.tabText, activeTab === 'meds' && styles.tabTextActive]}>
            ᛚ Meds ({medications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'workouts' && styles.tabActive]}
          onPress={() => setActiveTab('workouts')}
        >
          <Text style={[styles.tabText, activeTab === 'workouts' && styles.tabTextActive]}>
            ᛏ Workouts ({workouts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* VITALS TAB */}
      {activeTab === 'vitals' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {/* Steps Tile */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <View>
                <Text style={styles.vitalTitle}>DAILY STEPS</Text>
                <Text style={styles.vitalValue}>{vitals.steps.toLocaleString()} <Text style={styles.vitalGoal}>/ {stepsGoal.toLocaleString()}</Text></Text>
              </View>
              <Text style={styles.vitalPercentage}>{Math.round(stepsRatio * 100)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.round(stepsRatio * 100)}%`, backgroundColor: colors.emeraldGreen }]} />
            </View>
            <View style={styles.quickAddRow}>
              {[500, 1000, 2500].map((stepAdd) => (
                <TouchableOpacity
                  key={stepAdd}
                  style={styles.quickBtn}
                  onPress={() => onLogSteps(stepAdd)}
                >
                  <Text style={styles.quickBtnText}>+{stepAdd} Steps</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Hydration Tile */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <View>
                <Text style={styles.vitalTitle}>HYDRATION</Text>
                <Text style={styles.vitalValue}>{vitals.hydrationMl} ml <Text style={styles.vitalGoal}>/ {vitals.hydrationGoalMl} ml</Text></Text>
              </View>
              <Text style={styles.vitalPercentage}>{Math.round(hydrationRatio * 100)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.round(hydrationRatio * 100)}%`, backgroundColor: colors.glacialCyan }]} />
            </View>
            <View style={styles.quickAddRow}>
              {[250, 500, 750].map((mlAdd) => (
                <TouchableOpacity
                  key={mlAdd}
                  style={styles.quickBtn}
                  onPress={() => onLogHydration(mlAdd)}
                >
                  <Text style={styles.quickBtnText}>+{mlAdd} ml 💧</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Meds & Workouts Daily summary */}
          <View style={styles.vitalCard}>
            <Text style={styles.vitalTitle}>DAILY ADHERENCE</Text>
            <Text style={styles.vitalValue}>
              {vitals.medicationsTakenCount} / {vitals.medicationsTotalCount} Meds Taken
            </Text>
            <Text style={styles.vitalGoal}>{vitals.workouts.length} workout sessions completed today</Text>
          </View>
        </ScrollView>
      ) : null}

      {/* MEDICATIONS TAB */}
      {activeTab === 'meds' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {medications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᛚ</Text>
              <Text style={styles.emptyText}>No medications scheduled</Text>
              <Text style={styles.emptySubtext}>Ask Health Agent to schedule reminders & supplements</Text>
            </View>
          ) : (
            medications.map((med) => {
              const isTaken = !!med.lastTakenTimestamp && (Date.now() - med.lastTakenTimestamp < 12 * 60 * 60 * 1000);
              return (
                <View key={med.id} style={styles.medCard}>
                  <View style={styles.medDetails}>
                    <Text style={styles.medName}>{med.name} ({med.dosage})</Text>
                    <Text style={styles.medTime}>⏰ {med.timeOfDay} • {med.frequency}</Text>
                    {med.notes ? <Text style={styles.medNotes}>{med.notes}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={[styles.medCheckBtn, isTaken && styles.medCheckBtnTaken]}
                    onPress={() => onToggleMedication(med.id)}
                  >
                    <Text style={[styles.medCheckText, isTaken && styles.medCheckTextTaken]}>
                      {isTaken ? '✓ Taken' : 'Mark Taken'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : null}

      {/* WORKOUTS TAB */}
      {activeTab === 'workouts' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {/* Quick Workout Logger */}
          <View style={styles.vitalCard}>
            <Text style={styles.vitalTitle}>+ LOG WORKOUT SESSION</Text>
            <View style={styles.workoutTypeRow}>
              {(['cardio', 'strength', 'flexibility', 'hiit', 'recovery'] as WorkoutSession['exerciseType'][]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, workoutType === type && styles.typeChipActive]}
                  onPress={() => setWorkoutType(type)}
                >
                  <Text style={[styles.typeChipText, workoutType === type && styles.typeChipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { marginBottom: spacing.sm }]}
              placeholder="Workout title e.g. Morning Fjord Run"
              placeholderTextColor={colors.slateMuted}
              value={workoutTitle}
              onChangeText={setWorkoutTitle}
            />

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: spacing.sm }]}
                placeholder="Duration (mins)"
                placeholderTextColor={colors.slateMuted}
                keyboardType="numeric"
                value={workoutDuration}
                onChangeText={setWorkoutDuration}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Est. Calories (kcal)"
                placeholderTextColor={colors.slateMuted}
                keyboardType="numeric"
                value={workoutCalories}
                onChangeText={setWorkoutCalories}
              />
            </View>

            <TouchableOpacity style={styles.logWorkoutBtn} onPress={handleCreateWorkout}>
              <Text style={styles.logWorkoutBtnText}>Record Workout</Text>
            </TouchableOpacity>
          </View>

          {/* Workout History */}
          {workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᛏ</Text>
              <Text style={styles.emptyText}>No workouts logged yet</Text>
              <Text style={styles.emptySubtext}>Keep your streak alive with daily exercises</Text>
            </View>
          ) : (
            workouts.map((w) => {
              const dateStr = new Date(w.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
              return (
                <View key={w.id} style={styles.workoutItem}>
                  <View style={styles.workoutIconBox}>
                    <Text style={styles.workoutIconRune}>ᛏ</Text>
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutName}>{w.title} ({w.exerciseType})</Text>
                    <Text style={styles.workoutMeta}>{dateStr} • {w.durationMinutes} minutes</Text>
                  </View>
                  <Text style={styles.workoutCals}>{w.caloriesBurned ? `${w.caloriesBurned} kcal` : ''}</Text>
                </View>
              );
            })
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
    borderBottomColor: colors.emeraldGreen,
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
  vitalCard: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  vitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vitalTitle: {
    ...typography.captionStyle,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.slateMuted,
  },
  vitalValue: {
    ...typography.title,
    fontSize: 22,
    color: colors.frostSilver,
    fontWeight: '700',
    marginTop: 2,
  },
  vitalGoal: {
    fontSize: 13,
    color: colors.slateMuted,
    fontWeight: '400',
  },
  vitalPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.glacialCyan,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: colors.cardElevated,
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.cardElevated,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  quickBtnText: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.glacialCyan,
    fontWeight: '600',
  },
  medCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  medDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  medName: {
    ...typography.bodyStyle,
    fontSize: 15,
    fontWeight: '600',
    color: colors.frostSilver,
  },
  medTime: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.glacialCyan,
    marginVertical: 2,
  },
  medNotes: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.slateMuted,
  },
  medCheckBtn: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  medCheckBtnTaken: {
    borderColor: colors.emeraldGreen,
    backgroundColor: '#064e3b',
  },
  medCheckText: {
    ...typography.captionStyle,
    fontSize: 12,
    color: colors.slateMuted,
  },
  medCheckTextTaken: {
    color: colors.emeraldGreen,
    fontWeight: '700',
  },
  workoutTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  typeChipActive: {
    backgroundColor: colors.emeraldGreen,
    borderColor: colors.emeraldGreen,
  },
  typeChipText: {
    fontSize: 11,
    color: colors.slateMuted,
    textTransform: 'capitalize',
  },
  typeChipTextActive: {
    color: colors.midnightObsidian,
    fontWeight: '700',
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
  logWorkoutBtn: {
    backgroundColor: colors.emeraldGreen,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  logWorkoutBtnText: {
    color: colors.midnightObsidian,
    fontWeight: '700',
    fontSize: 13,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSlate,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  workoutIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  workoutIconRune: {
    color: colors.emeraldGreen,
    fontSize: 14,
    fontWeight: '700',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    ...typography.bodyStyle,
    fontSize: 14,
    fontWeight: '600',
    color: colors.frostSilver,
  },
  workoutMeta: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.slateMuted,
  },
  workoutCals: {
    ...typography.captionStyle,
    fontSize: 12,
    color: colors.runicGold,
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
