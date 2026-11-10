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
  Milestone,
  ProjectItem,
  ProjectTask,
  TaskStatus,
  PriorityLevel,
} from '../../agents/ProjectManagerService';
import { colors, spacing, borderRadius, typography, touchTargets } from '../../theme/tokens';

export interface ProjectManagerDashboardViewProps {
  projects: ProjectItem[];
  tasks: ProjectTask[];
  milestones: Milestone[];
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onAddTask: (projectId: string, title: string, priority: PriorityLevel) => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onAddMilestone?: (projectId: string, title: string, targetDate: number) => void;
  onFocusBlockRequested?: (taskTitle: string) => void;
}

const KANBAN_COLUMNS: { key: TaskStatus; label: string; rune: string; color: string }[] = [
  { key: 'todo', label: 'To Do', rune: 'ᚦ', color: colors.slateMuted },
  { key: 'in_progress', label: 'Active', rune: 'ᚱ', color: colors.glacialCyan },
  { key: 'review', label: 'Review', rune: 'ᛋ', color: colors.runicGold },
  { key: 'done', label: 'Done', rune: 'ᛏ', color: colors.emeraldGreen },
];

export const ProjectManagerDashboardView: React.FC<ProjectManagerDashboardViewProps> = ({
  projects,
  tasks,
  milestones,
  activeProjectId,
  onSelectProject,
  onAddTask,
  onUpdateTaskStatus,
  onAddMilestone,
  onFocusBlockRequested,
}) => {
  const [selectedCol, setSelectedCol] = useState<TaskStatus>('todo');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('medium');

  const currentProjectId = activeProjectId || (projects.length > 0 ? projects[0].id : 'default');

  const filteredTasks = tasks.filter(
    (t) => (!activeProjectId || t.projectId === currentProjectId)
  );

  const columnTasks = filteredTasks.filter((t) => t.status === selectedCol);

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    onAddTask(currentProjectId, newTaskTitle.trim(), taskPriority);
    setNewTaskTitle('');
  };

  return (
    <View style={styles.container}>
      {/* Project Selector Chips */}
      {projects.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectScroll}>
          {projects.map((proj) => {
            const isSelected = proj.id === currentProjectId;
            return (
              <TouchableOpacity
                key={proj.id}
                style={[styles.projectChip, isSelected && styles.projectChipActive]}
                onPress={() => onSelectProject && onSelectProject(proj.id)}
              >
                <Text style={[styles.projectChipText, isSelected && styles.projectChipTextActive]}>
                  {proj.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Milestones Horizontal Progress Bar */}
      {milestones.length > 0 ? (
        <View style={styles.milestoneSection}>
          <Text style={styles.sectionHeader}>ᚹ MILESTONES & TARGETS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {milestones.map((m) => {
              const targetStr = new Date(m.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
              return (
                <View key={m.id} style={[styles.milestoneCard, m.isCompleted && styles.milestoneCompleted]}>
                  <View style={styles.milestoneTop}>
                    <Text style={styles.milestoneRune}>{m.isCompleted ? '✓' : 'ᚹ'}</Text>
                    <Text style={styles.milestoneDate}>{targetStr}</Text>
                  </View>
                  <Text style={styles.milestoneTitle} numberOfLines={2}>
                    {m.title}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Kanban Stage Tabs */}
      <View style={styles.kanbanTabBar}>
        {KANBAN_COLUMNS.map((col) => {
          const count = filteredTasks.filter((t) => t.status === col.key).length;
          const isSelected = selectedCol === col.key;
          return (
            <TouchableOpacity
              key={col.key}
              style={[styles.kanbanTab, isSelected && { borderBottomColor: col.color, borderBottomWidth: 2 }]}
              onPress={() => setSelectedCol(col.key)}
            >
              <Text style={[styles.kanbanTabRune, { color: col.color }]}>{col.rune}</Text>
              <Text style={[styles.kanbanTabText, isSelected && styles.kanbanTabTextActive]}>
                {col.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Add Task Input */}
      <View style={styles.quickAddCard}>
        <TextInput
          style={styles.inputField}
          placeholder="New task title... (ᚦ Thor's Focus)"
          placeholderTextColor={colors.slateMuted}
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
        />
        <View style={styles.quickAddRow}>
          <View style={styles.prioritySelector}>
            {(['low', 'medium', 'high', 'critical'] as PriorityLevel[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityChip, taskPriority === p && styles.priorityChipSelected]}
                onPress={() => setTaskPriority(p)}
              >
                <Text style={[styles.priorityText, taskPriority === p && styles.priorityTextSelected]}>
                  {p.charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleCreateTask}>
            <Text style={styles.addButtonText}>+ Add Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tasks List */}
      <ScrollView style={styles.tasksList} showsVerticalScrollIndicator={false}>
        {columnTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyRune}>ᛏ</Text>
            <Text style={styles.emptyText}>No tasks in {selectedCol.replace('_', ' ')}</Text>
            <Text style={styles.emptySubtext}>Add a task above or move from other columns</Text>
          </View>
        ) : (
          columnTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.priorityBadge}>
                  <Text
                    style={[
                      styles.priorityBadgeText,
                      task.priority === 'critical' && { color: colors.dangerRed },
                      task.priority === 'high' && { color: colors.amberWarning },
                    ]}
                  >
                    {task.priority.toUpperCase()}
                  </Text>
                </View>
                {onFocusBlockRequested ? (
                  <TouchableOpacity
                    style={styles.focusBtn}
                    onPress={() => onFocusBlockRequested(task.title)}
                  >
                    <Text style={styles.focusBtnText}>ᛞ Focus Block</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.taskTitle}>{task.title}</Text>
              {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}

              {/* Status Mover Buttons */}
              <View style={styles.statusButtonsRow}>
                {KANBAN_COLUMNS.map((col) => {
                  if (col.key === task.status) return null;
                  return (
                    <TouchableOpacity
                      key={col.key}
                      style={styles.moveBtn}
                      onPress={() => onUpdateTaskStatus(task.id, col.key)}
                    >
                      <Text style={styles.moveBtnText}>→ {col.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightObsidian,
  },
  projectScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  projectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.cardSlate,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  projectChipActive: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.glacialCyan,
  },
  projectChipText: {
    ...typography.bodyStyle,
    fontSize: 13,
    color: colors.slateMuted,
  },
  projectChipTextActive: {
    color: colors.glacialCyan,
    fontWeight: '600',
  },
  milestoneSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.slateMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  milestoneCard: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    width: 140,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  milestoneCompleted: {
    borderColor: colors.emeraldGreen,
  },
  milestoneTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  milestoneRune: {
    color: colors.glacialCyan,
    fontWeight: '700',
    fontSize: 12,
  },
  milestoneDate: {
    ...typography.captionStyle,
    fontSize: 10,
    color: colors.slateMuted,
  },
  milestoneTitle: {
    ...typography.bodyStyle,
    fontSize: 12,
    color: colors.frostSilver,
  },
  kanbanTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardSlate,
  },
  kanbanTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  kanbanTabRune: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  kanbanTabText: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.slateMuted,
  },
  kanbanTabTextActive: {
    color: colors.frostSilver,
    fontWeight: '600',
  },
  quickAddCard: {
    backgroundColor: colors.cardElevated,
    margin: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputField: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.frostSilver,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
    minHeight: touchTargets.min,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prioritySelector: {
    flexDirection: 'row',
  },
  priorityChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardSlate,
    marginRight: spacing.xs,
    minWidth: 28,
    alignItems: 'center',
  },
  priorityChipSelected: {
    backgroundColor: colors.glacialCyan,
  },
  priorityText: {
    fontSize: 11,
    color: colors.slateMuted,
    fontWeight: '600',
  },
  priorityTextSelected: {
    color: colors.midnightObsidian,
  },
  addButton: {
    backgroundColor: colors.glacialCyan,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.midnightObsidian,
    fontWeight: '700',
    fontSize: 13,
  },
  tasksList: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  taskCard: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priorityBadge: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.glacialCyan,
  },
  focusBtn: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glacialCyan,
  },
  focusBtnText: {
    fontSize: 11,
    color: colors.glacialCyan,
    fontWeight: '600',
  },
  taskTitle: {
    ...typography.bodyStyle,
    fontSize: 15,
    fontWeight: '600',
    color: colors.frostSilver,
    marginBottom: spacing.xs,
  },
  taskDesc: {
    ...typography.captionStyle,
    fontSize: 12,
    color: colors.slateMuted,
    marginBottom: spacing.sm,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  moveBtn: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minHeight: 32,
    justifyContent: 'center',
  },
  moveBtnText: {
    ...typography.captionStyle,
    fontSize: 11,
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
