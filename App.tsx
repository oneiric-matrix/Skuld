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

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentConfigRecord[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfigRecord | null>(null);
  const [inputText, setInputText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // AI Pipeline State
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState('');

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

  // Zero-Lag Voice Conversation Flow
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
        
        // Transcribe locally
        const transcript = await localSTT.transcribeAudio(audioResult.uri);
        setStatusMessage(`You said: "${transcript}"`);

        // Trigger zero-lag streaming conversation with avatar
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
          // Immediately feed clause to TTS while subsequent tokens are generating!
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
            <View style={styles.stageCard}>
              {/* Dynamic Animated Avatar Stage with Mouth Flap Visemes */}
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
