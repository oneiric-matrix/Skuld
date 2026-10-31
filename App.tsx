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

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentConfigRecord[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfigRecord | null>(null);
  const [inputText, setInputText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Start background job worker
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
        const roster = await butlerService.getAgentRoster();
        setAgents(roster);
        if (roster.length > 0) {
          setSelectedAgent(roster[0]);
        }
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

  const handleQuickCaptureSubmit = async (mode: 'voice' | 'text') => {
    if (!selectedAgent) return;
    const content = mode === 'voice' ? 'Voice memo captured (simulated)' : inputText;
    if (!content.trim()) return;

    setStatusMessage(`Enqueuing background task for ${selectedAgent.customName}...`);
    try {
      const jobId = await butlerService.handleWidgetCapture(selectedAgent.id, {
        inputMode: mode,
        rawText: content,
        source: 'hud',
        timestamp: Date.now(),
      });
      setInputText('');
      setStatusMessage(`✅ Task ${jobId} securely enqueued! Agent will process in background.`);
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>SKULD</Text>
        <Text style={styles.subtitle}>Privacy-Sovereign Multi-Agent OS</Text>
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
          <Text style={styles.sectionTitle}>Select Active Agent</Text>
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
            <View style={styles.captureCard}>
              <View style={styles.agentHeader}>
                <View>
                  <Text style={styles.activeAgentTitle}>{selectedAgent.customName}</Text>
                  <Text style={styles.activeAgentRole}>{selectedAgent.roleTitle}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Widget Ready</Text>
                </View>
              </View>

              <Text style={styles.agentPromptSnippet}>"{selectedAgent.systemPrompt}"</Text>

              <TextInput
                style={styles.textInput}
                placeholder={`Tell or ask ${selectedAgent.customName}...`}
                placeholderTextColor="#777"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.voiceBtn]}
                  onPress={() => handleQuickCaptureSubmit('voice')}
                >
                  <Text style={styles.actionBtnText}>🎙️ Speak to Agent</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.sendBtn]}
                  onPress={() => handleQuickCaptureSubmit('text')}
                >
                  <Text style={styles.actionBtnText}>💬 Send Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {statusMessage ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusBoxText}>{statusMessage}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8899A6',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  agentScroll: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  agentCard: {
    backgroundColor: '#141D2B',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 140,
    borderWidth: 1,
    borderColor: '#1F2C42',
  },
  agentCardSelected: {
    borderColor: '#00E5FF',
    backgroundColor: '#172738',
  },
  agentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  agentRole: {
    fontSize: 11,
    color: '#8899A6',
  },
  captureCard: {
    backgroundColor: '#141D2B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2C42',
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activeAgentTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  activeAgentRole: {
    fontSize: 13,
    color: '#00E5FF',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#1F3348',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    color: '#00E5FF',
    fontWeight: '600',
  },
  agentPromptSnippet: {
    fontSize: 12,
    color: '#8899A6',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#0D1420',
    color: '#FFF',
    borderRadius: 10,
    padding: 14,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#24334C',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
  sendBtn: {
    backgroundColor: '#00E5FF',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A0E17',
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
