import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { hardwareVault } from './src/security/HardwareVault';
import { vaultDatabase, AgentConfigRecord } from './src/security/VaultDatabase';
import { butlerService } from './src/services/ButlerService';
import { jobQueue } from './src/queue/JobQueue';
import { audioCapture } from './src/ai/AudioCaptureService';
import { localSTT } from './src/ai/LocalSTTEngine';
import { localLLM } from './src/ai/LocalLLMEngine';
import { streamingTTS } from './src/ai/StreamingTTSEngine';
import { AnimatedAvatarStage } from './src/components/AnimatedAvatarStage';
import { AgentStudioModal } from './src/components/AgentStudioModal';
import { CameraScannerModal } from './src/components/CameraScannerModal';
import { HomeScreenHub, UrgentNoticeItem, ActivityRingsSummary } from './src/components/HomeScreenHub';
import { AgentManifest } from './src/agents/AgentManifest';
import { butlerAgent, CalendarEvent, ButlerReminder } from './src/agents/ButlerAgentService';
import { healthAgent, DailyHealthVitals, MedicationSchedule, WorkoutSession } from './src/agents/HealthService';
import { accountsAgent, SpendingSummary, ExpenseRecord, RecurringBill, ExpenseCategory } from './src/agents/AccountsService';
import { projectManagerAgent, ProjectItem, ProjectTask, Milestone, PriorityLevel, TaskStatus } from './src/agents/ProjectManagerService';
import { professorAgent, StudySummary, LearningRoadmap, AcquiredSkill, SpacedRepetitionCard, FlashcardEase } from './src/agents/ProfessorService';
import { chefAgent, ScheduledMeal, Recipe, GroceryItem, ActiveKitchenTimer, DietaryPreference } from './src/agents/ChefService';
import { colors, spacing, borderRadius, typography, touchTargets } from './src/theme/tokens';

// Phase 5 Dashboards
import { ButlerDashboardView } from './src/components/dashboards/ButlerDashboardView';
import { ProjectManagerDashboardView } from './src/components/dashboards/ProjectManagerDashboardView';
import { AccountsDashboardView } from './src/components/dashboards/AccountsDashboardView';
import { HealthDashboardView } from './src/components/dashboards/HealthDashboardView';
import { ProfessorDashboardView } from './src/components/dashboards/ProfessorDashboardView';
import { ChefDashboardView } from './src/components/dashboards/ChefDashboardView';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentConfigRecord[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfigRecord | null>(null);
  const [inputText, setInputText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Home Hub Live States
  const [notices, setNotices] = useState<UrgentNoticeItem[]>([]);
  const [vitalsSummary, setVitalsSummary] = useState<ActivityRingsSummary>({
    stepsCount: 0,
    stepsGoal: 10000,
    hydrationMl: 0,
    hydrationGoalMl: 2500,
    dueTasksCount: 0,
    upcomingBillsCount: 0,
  });
  const [dailyBriefing, setDailyBriefing] = useState('');

  // AI Pipeline State
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState('');

  // Domain Agent Data States
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<ButlerReminder[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [spendingSummary, setSpendingSummary] = useState<SpendingSummary>({
    totalSpent: 0,
    currency: 'USD',
    count: 0,
    categoryBreakdown: {} as any,
    averageExpense: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState<ExpenseRecord[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [dailyVitals, setDailyVitals] = useState<DailyHealthVitals>({
    dateString: new Date().toISOString().split('T')[0],
    steps: 0,
    hydrationMl: 0,
    hydrationGoalMl: 2500,
    workouts: [],
    medicationsTakenCount: 0,
    medicationsTotalCount: 0,
  });
  const [medications, setMedications] = useState<MedicationSchedule[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [studySummary, setStudySummary] = useState<StudySummary>({
    activeRoadmapsCount: 0,
    acquiredSkillsCount: 0,
    dueCardsCount: 0,
    currentStreakDays: 1,
    totalStudyHours: 0,
  });
  const [roadmaps, setRoadmaps] = useState<LearningRoadmap[]>([]);
  const [skills, setSkills] = useState<AcquiredSkill[]>([]);
  const [dueCards, setDueCards] = useState<SpacedRepetitionCard[]>([]);
  const [scheduledMeals, setScheduledMeals] = useState<ScheduledMeal[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [timers, setTimers] = useState<ActiveKitchenTimer[]>([]);

  useEffect(() => {
    jobQueue.startQueueWorker(2000);
    return () => {
      jobQueue.stopQueueWorker();
    };
  }, []);

  const handleUnlock = async () => {
    setLoading(true);
    setStatusMessage('');
    try {
      const unlocked = await hardwareVault.unlockVault('Unlock Skuld Secure Vault');
      if (unlocked) {
        await vaultDatabase.init();
        await refreshAgents();
        setIsUnlocked(true);
        setStatusMessage('Vault unlocked with hardware-backed encryption.');
      } else {
        setStatusMessage('Authentication failed or cancelled.');
      }
    } catch (err: any) {
      setStatusMessage('Error: ' + (err?.message || 'Authentication error'));
    } finally {
      setLoading(false);
    }
  };

  const refreshAgents = async () => {
    const roster = await butlerService.getAgentRoster();
    setAgents(roster);
    if (roster.length > 0 && !selectedAgent) {
      setSelectedAgent(roster[0]);
    }
    await refreshHomeHubData();
    await refreshDomainData();
  };

  const refreshDomainData = async () => {
    try {
      // Butler
      setCalendarEvents(butlerAgent.getUpcomingEvents());
      setReminders(butlerAgent.getReminders());

      // Project Manager
      const projs = projectManagerAgent.getProjects();
      setProjects(projs);
      const activeProjId = projs.length > 0 ? projs[0].id : '';
      setTasks(projectManagerAgent.getTasksForProject(activeProjId));
      if (projs.length > 0 && projs[0].milestones) {
        setMilestones(projs[0].milestones);
      }

      // Accounts
      setSpendingSummary(accountsAgent.getSpendingSummary());
      setRecentExpenses(accountsAgent.getExpenses());
      setRecurringBills(accountsAgent.getUpcomingBills(30));

      // Health
      setDailyVitals(healthAgent.getDailyVitals());
      setMedications(healthAgent.getMedications());
      setWorkouts(healthAgent.getWorkouts());

      // Professor
      setStudySummary(professorAgent.getStudySummary());
      setRoadmaps(professorAgent.getRoadmaps());
      setSkills(professorAgent.getSkills());
      setDueCards(professorAgent.getDueFlashcards());

      // Chef
      setScheduledMeals(chefAgent.getScheduledMeals());
      setRecipes(chefAgent.getRecipes());
      setGroceries(chefAgent.getGroceryList());
      setTimers(chefAgent.getTimers());
    } catch (e) {
      // Fallback safe state
    }
  };

  const refreshHomeHubData = async () => {
    try {
      // 1. Fetch live daily briefing
      const briefing = await butlerAgent.generateDailyBriefing();
      setDailyBriefing(briefing);

      // 2. Fetch live vitals
      const vitals = healthAgent.getDailyVitals();
      const bills = accountsAgent.getUpcomingBills(7);
      const pendingTasks = projectManagerAgent.getTasksForProject('').filter((t) => t.status !== 'done');

      setVitalsSummary({
        stepsCount: vitals.steps,
        stepsGoal: 10000,
        hydrationMl: vitals.hydrationMl,
        hydrationGoalMl: vitals.hydrationGoalMl,
        dueTasksCount: pendingTasks.length,
        upcomingBillsCount: bills.length,
      });

      // 3. Compile urgent notices
      const urgentList: UrgentNoticeItem[] = [];

      // Check for urgent medication due today
      const meds = healthAgent.getMedications();
      for (const m of meds) {
        if (!m.lastTakenTimestamp) {
          urgentList.push({
            id: `notice_med_${m.id}`,
            category: 'medication',
            title: `Take ${m.name}`,
            subtitle: `Dosage: ${m.dosage} • Scheduled for ${m.timeOfDay}`,
            dueText: 'DUE TODAY',
            priority: 'urgent',
            targetAgentId: 'health',
          });
        }
      }

      // Check upcoming bills due in next 48h
      for (const b of bills) {
        const daysLeft = Math.round((b.nextDueDate - Date.now()) / 86400000);
        if (daysLeft <= 2) {
          urgentList.push({
            id: `notice_bill_${b.id}`,
            category: 'bill',
            title: `${b.name} Due`,
            subtitle: `${b.currency} ${b.amount.toFixed(2)} due soon`,
            dueText: daysLeft <= 0 ? 'DUE TODAY' : `IN ${daysLeft}D`,
            priority: 'urgent',
            targetAgentId: 'accounts',
          });
        }
      }

      // Check upcoming calendar events in next 2 hours
      const upcomingEvents = butlerAgent.getUpcomingEvents();
      if (upcomingEvents.length > 0) {
        const nextEvt = upcomingEvents[0];
        const minsUntil = Math.round((nextEvt.startTime - Date.now()) / 60000);
        if (minsUntil <= 120 && minsUntil >= -30) {
          urgentList.push({
            id: `notice_evt_${nextEvt.id}`,
            category: 'calendar',
            title: nextEvt.title,
            subtitle: nextEvt.location ? `Location: ${nextEvt.location}` : 'Upcoming calendar event',
            dueText: minsUntil <= 0 ? 'NOW' : `IN ${minsUntil}M`,
            priority: minsUntil <= 15 ? 'urgent' : 'high',
            targetAgentId: 'butler',
          });
        }
      }

      setNotices(urgentList);
    } catch (err: any) {
      console.warn('Failed to refresh home hub metrics:', err.message);
    }
  };

  const handleAgentCreated = (newAgent: AgentManifest) => {
    refreshAgents();
    setStatusMessage(`🎉 Agent "${newAgent.name}" provisioned and widget-ready!`);
  };

  const handleToggleVoice = async () => {
    if (!selectedAgent) return;

    if (!isRecording) {
      try {
        await audioCapture.startRecording();
        setIsRecording(true);
        setStatusMessage('🎙️ Listening... Tap again to finish speaking.');
      } catch (err: any) {
        setStatusMessage('Mic Error: ' + err.message);
      }
    } else {
      try {
        setIsRecording(false);
        setStatusMessage('Processing speech locally (<100ms)...');
        const audioResult = await audioCapture.stopRecording();
        const transcript = await localSTT.transcribeAudio(audioResult.uri);
        setStatusMessage(`You said: "${transcript}"`);
        await runStreamingConversation(transcript);
      } catch (err: any) {
        setStatusMessage('Transcription Error: ' + err.message);
      }
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim() || !selectedAgent) return;
    const query = inputText.trim();
    setInputText('');
    await runStreamingConversation(query);
  };

  const runStreamingConversation = async (userPrompt: string) => {
    if (!selectedAgent) return;

    setIsThinking(true);
    setStreamedResponse('');

    try {
      await localLLM.streamCompletion(
        [
          { role: 'system', content: selectedAgent.systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        (token) => {
          setIsThinking(false);
          setStreamedResponse((prev) => prev + token);
        },
        (clause) => {
          streamingTTS.speakClause(clause, {
            modelId: selectedAgent.voiceId as any,
            speed: 1.0,
            pitch: 1.0,
          });
        }
      );
    } catch (err: any) {
      setStatusMessage('Inference Error: ' + err.message);
      setIsThinking(false);
    }
  };

  const renderActiveDashboard = () => {
    if (!selectedAgent) return null;
    const id = selectedAgent.id.toLowerCase();

    if (id.includes('butler')) {
      return (
        <ButlerDashboardView
          events={calendarEvents}
          reminders={reminders}
          onAddEvent={(title, startTime, endTime, category) => {
            butlerAgent.addCalendarEvent(title, startTime, endTime, category);
            refreshDomainData();
            refreshHomeHubData();
          }}
          onToggleReminder={(reminderId) => {
            butlerAgent.toggleReminder(reminderId);
            refreshDomainData();
            refreshHomeHubData();
          }}
          onAddReminder={(text, priority) => {
            butlerAgent.addReminder(text, Date.now() + 3600000, priority);
            refreshDomainData();
            refreshHomeHubData();
          }}
          onDeleteEvent={(evtId) => {
            butlerAgent.deleteCalendarEvent(evtId);
            refreshDomainData();
          }}
        />
      );
    }

    if (id.includes('project') || id.includes('pm')) {
      return (
        <ProjectManagerDashboardView
          projects={projects}
          tasks={tasks}
          milestones={milestones}
          onAddTask={(projectId, title, priority: PriorityLevel) => {
            projectManagerAgent.addTask(projectId, title, priority);
            refreshDomainData();
            refreshHomeHubData();
          }}
          onUpdateTaskStatus={(taskId, status: TaskStatus) => {
            projectManagerAgent.updateTaskStatus(taskId, status);
            refreshDomainData();
            refreshHomeHubData();
          }}
          onFocusBlockRequested={(taskTitle) => {
            const now = Date.now();
            butlerAgent.addCalendarEvent(
              `Focus: ${taskTitle}`,
              now + 600000,
              now + 3600000,
              'focus_block'
            );
            setStatusMessage(`📅 Focus Block booked with Butler for "${taskTitle}"`);
            refreshDomainData();
          }}
        />
      );
    }

    if (id.includes('accounts') || id.includes('finance')) {
      return (
        <AccountsDashboardView
          summary={spendingSummary}
          recentExpenses={recentExpenses}
          recurringBills={recurringBills}
          onAddExpense={(amount, category: ExpenseCategory, merchant, currency) => {
            accountsAgent.logExpense(amount, merchant, category, currency);
            refreshDomainData();
            refreshHomeHubData();
          }}
          onToggleBillPaid={(billId) => {
            accountsAgent.markBillPaid(billId);
            refreshDomainData();
            refreshHomeHubData();
          }}
          onOpenReceiptScanner={() => setIsScannerOpen(true)}
        />
      );
    }

    if (id.includes('health') || id.includes('doctor')) {
      return (
        <HealthDashboardView
          vitals={dailyVitals}
          medications={medications}
          workouts={workouts}
          onLogSteps={(delta) => {
            healthAgent.recordSteps(delta);
            refreshDomainData();
            refreshHomeHubData();
          }}
          onLogHydration={(amountMl) => {
            healthAgent.logHydration(amountMl);
            refreshDomainData();
            refreshHomeHubData();
          }}
          onToggleMedication={(medId) => {
            healthAgent.markMedicationTaken(medId);
            refreshDomainData();
            refreshHomeHubData();
          }}
          onLogWorkout={(type, title, durationMinutes, caloriesBurned) => {
            healthAgent.logWorkout(title, type, durationMinutes, caloriesBurned);
            refreshDomainData();
            refreshHomeHubData();
          }}
        />
      );
    }

    if (id.includes('professor') || id.includes('tutor')) {
      return (
        <ProfessorDashboardView
          summary={studySummary}
          roadmaps={roadmaps}
          skills={skills}
          dueCards={dueCards}
          onReviewCard={(cardId, rating: FlashcardEase) => {
            professorAgent.reviewFlashcard(cardId, rating);
            refreshDomainData();
          }}
          onAdvanceTopic={(roadmapId, topicId) => {
            professorAgent.toggleTopicCompletion(roadmapId, topicId);
            refreshDomainData();
          }}
        />
      );
    }

    if (id.includes('chef') || id.includes('cook')) {
      return (
        <ChefDashboardView
          scheduledMeals={scheduledMeals}
          recipes={recipes}
          groceryList={groceries}
          activeTimers={timers}
          onToggleGroceryItem={(itemId) => {
            chefAgent.toggleGroceryItem(itemId);
            refreshDomainData();
          }}
          onStartCookingTimer={(label, durationSeconds) => {
            chefAgent.startTimer(label, durationSeconds);
            refreshDomainData();
          }}
          onFilterDiet={(diet: DietaryPreference) => {
            // State managed internally by view
          }}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SKULD</Text>
          <Text style={styles.subtitle}>Privacy-Sovereign Multi-Agent OS</Text>
        </View>
        {isUnlocked ? (
          <TouchableOpacity
            style={styles.newAgentBtn}
            onPress={() => setIsStudioOpen(true)}
          >
            <Text style={styles.newAgentBtnText}>+ New Agent</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {!isUnlocked ? (
        <View style={styles.lockContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockTitle}>Hardware Vault Locked</Text>
          <Text style={styles.lockDesc}>
            Your persona memories, financial records, and medical logs are encrypted in the hardware-backed vault.
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color="#00E5FF" />
          ) : (
            <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock}>
              <Text style={styles.unlockButtonText}>Authenticate & Unlock</Text>
            </TouchableOpacity>
          )}
          {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* URGENT HIGHLIGHTS & GLANCEABLE HOME HUB */}
          <HomeScreenHub
            notices={notices}
            vitals={vitalsSummary}
            dailyBriefingText={dailyBriefing}
            onSelectAgent={(agentId) => {
              const match = agents.find((a) => a.id.toLowerCase().includes(agentId.toLowerCase()));
              if (match) setSelectedAgent(match);
            }}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenStudio={() => setIsStudioOpen(true)}
          />

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Agent Roster</Text>
            <TouchableOpacity onPress={() => setIsStudioOpen(true)}>
              <Text style={styles.openStudioText}>Studio ⚙️</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.agentScroll}>
            {agents.map((agent) => {
              const isSelected = selectedAgent?.id === agent.id;
              return (
                <TouchableOpacity
                  key={agent.id}
                  style={[styles.agentCard, isSelected && styles.agentCardSelected]}
                  onPress={() => setSelectedAgent(agent)}
                >
                  <Text style={styles.agentName}>{agent.customName}</Text>
                  <Text style={styles.agentRole}>{agent.roleTitle}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedAgent ? (
            <View style={styles.stageCard}>
              <AnimatedAvatarStage
                agentName={selectedAgent.customName}
                avatarConfig={{
                  type: 'sprite_viseme',
                  assetUri: selectedAgent.avatarProfile,
                  mouthFlapEnabled: true,
                  accentColor: selectedAgent.id === 'butler' ? '#00E5FF' : '#10B981',
                }}
                isListening={isRecording}
                isThinking={isThinking}
              />

              {streamedResponse ? (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseText}>{streamedResponse}</Text>
                </View>
              ) : null}

              <TextInput
                style={styles.textInput}
                placeholder={`Chat with ${selectedAgent.customName}...`}
                placeholderTextColor="#777"
                value={inputText}
                onChangeText={setInputText}
              />

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, isRecording ? styles.voiceBtnActive : styles.voiceBtn]}
                  onPress={handleToggleVoice}
                >
                  <Text style={[styles.actionBtnText, isRecording ? styles.textWhite : null]}>
                    {isRecording ? '⏹️ Stop Speaking' : '🎙️ Speak to Agent'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.sendBtn]}
                  onPress={handleSendText}
                >
                  <Text style={styles.actionBtnText}>💬 Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* DYNAMIC DOMAIN PERSONA DASHBOARD VIEW */}
          {selectedAgent ? (
            <View style={styles.dashboardContainer}>
              <Text style={styles.dashboardHeader}>
                ᛞ {selectedAgent.customName.toUpperCase()} DOMAIN DASHBOARD
              </Text>
              {renderActiveDashboard()}
            </View>
          ) : null}

          {statusMessage ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusBoxText}>{statusMessage}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Dynamic Agent Creation Studio Modal */}
      <AgentStudioModal
        visible={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        onAgentCreated={handleAgentCreated}
      />

      {/* Instant Camera Scanner HUD */}
      <CameraScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={() => {
          refreshHomeHubData();
          refreshDomainData();
          setStatusMessage('Document scanned and processed into vault.');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00E5FF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#8899A6',
    marginTop: 2,
  },
  newAgentBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newAgentBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  lockIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  lockDesc: {
    fontSize: 14,
    color: '#8899A6',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  unlockButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  unlockButtonText: {
    color: '#0A0E17',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8899A6',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  openStudioText: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '700',
  },
  agentScroll: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  agentCard: {
    backgroundColor: '#141D2B',
    padding: 14,
    borderRadius: 12,
    marginRight: 10,
    width: 135,
    borderWidth: 1,
    borderColor: '#1F2C42',
  },
  agentCardSelected: {
    borderColor: '#00E5FF',
    backgroundColor: '#172738',
  },
  agentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  agentRole: {
    fontSize: 11,
    color: '#8899A6',
  },
  stageCard: {
    backgroundColor: '#141D2B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1F2C42',
    marginBottom: 20,
  },
  responseContainer: {
    backgroundColor: '#0E1724',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#00E5FF',
  },
  responseText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: '#0D1420',
    color: '#FFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#24334C',
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtn: {
    backgroundColor: '#202B3C',
    borderWidth: 1,
    borderColor: '#30425D',
  },
  voiceBtnActive: {
    backgroundColor: '#EF4444',
  },
  sendBtn: {
    backgroundColor: '#00E5FF',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A0E17',
  },
  textWhite: {
    color: '#FFF',
  },
  dashboardContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  dashboardHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E5FF',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  statusText: {
    marginTop: 16,
    color: '#00E5FF',
    fontSize: 13,
    textAlign: 'center',
  },
  statusBox: {
    marginTop: 16,
    backgroundColor: '#0E1A29',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00E5FF',
  },
  statusBoxText: {
    color: '#A0B2C6',
    fontSize: 12,
  },
});
