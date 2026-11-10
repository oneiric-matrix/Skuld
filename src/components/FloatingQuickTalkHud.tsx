import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { AgentConfigRecord } from '../security/VaultDatabase';
import { AnimatedAvatarStage } from './AnimatedAvatarStage';
import { colors, spacing, borderRadius, typography, touchTargets } from '../theme/tokens';

export interface FloatingQuickTalkHudProps {
  agents: AgentConfigRecord[];
  activeAgent: AgentConfigRecord | null;
  onSelectAgent: (agent: AgentConfigRecord) => void;
  isRecording: boolean;
  isThinking: boolean;
  streamedResponse: string;
  onToggleVoice: () => void;
  onSendTextPrompt: (text: string) => void;
  statusMessage?: string;
}

export const FloatingQuickTalkHud: React.FC<FloatingQuickTalkHudProps> = ({
  agents,
  activeAgent,
  onSelectAgent,
  isRecording,
  isThinking,
  streamedResponse,
  onToggleVoice,
  onSendTextPrompt,
  statusMessage,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isRecording) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleSendText = () => {
    if (!inputText.trim()) return;
    onSendTextPrompt(inputText.trim());
    setInputText('');
  };

  const currentAgentName = activeAgent?.customName || 'Skuld';
  const currentRole = activeAgent?.roleTitle || 'AI Companion';

  return (
    <>
      {/* FLOATING ACTION PILL (Always visible on all screens) */}
      <View style={styles.floatingContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[
            styles.floatingPill,
            isRecording && styles.floatingPillRecording,
            isThinking && styles.floatingPillThinking,
          ]}
          activeOpacity={0.85}
          onPress={() => setIsExpanded(true)}
        >
          <Animated.View
            style={[
              styles.micOrb,
              isRecording && styles.micOrbRecording,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={styles.micIconText}>
              {isRecording ? '⏹️' : isThinking ? '⚡' : '🎙️'}
            </Text>
          </Animated.View>

          <View style={styles.pillTextContainer}>
            <Text style={styles.pillAgentName} numberOfLines={1}>
              {isRecording ? 'Listening...' : isThinking ? 'Thinking...' : currentAgentName}
            </Text>
            <Text style={styles.pillSubtitle} numberOfLines={1}>
              {isRecording ? 'Tap to finish' : 'Tap for Quick Talk'}
            </Text>
          </View>

          {/* Quick Voice Toggle Direct Button inside pill */}
          <TouchableOpacity
            style={[
              styles.quickVoiceTap,
              isRecording && styles.quickVoiceTapActive,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onToggleVoice();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.quickVoiceTapText}>
              {isRecording ? 'Stop' : 'Talk'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* FULL HUD OVERLAY MODAL */}
      <Modal
        visible={isExpanded}
        transparent
        animationType="fade"
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.hudCard}>
            {/* Header & Agent Selector */}
            <View style={styles.hudHeader}>
              <View>
                <Text style={styles.hudHeaderSub}>ᛞ QUICK TALK HUD</Text>
                <Text style={styles.hudHeaderTitle}>{currentAgentName} • {currentRole}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsExpanded(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Agent Switcher Chips */}
            {agents.length > 1 ? (
              <View style={styles.agentChipsRow}>
                {agents.map((agent) => {
                  const isSelected = activeAgent?.id === agent.id;
                  return (
                    <TouchableOpacity
                      key={agent.id}
                      style={[styles.agentChip, isSelected && styles.agentChipActive]}
                      onPress={() => onSelectAgent(agent)}
                    >
                      <Text style={[styles.agentChipText, isSelected && styles.agentChipTextActive]}>
                        {agent.customName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {/* Living Avatar Stage */}
            <View style={styles.avatarStageWrap}>
              <AnimatedAvatarStage
                agentName={currentAgentName}
                avatarConfig={{
                  type: 'sprite_viseme',
                  assetUri: activeAgent?.avatarProfile || 'assets/avatars/odin_default.png',
                  mouthFlapEnabled: true,
                  accentColor: activeAgent?.id === 'butler' ? colors.glacialCyan : colors.emeraldGreen,
                }}
                isListening={isRecording}
                isThinking={isThinking}
              />
            </View>

            {/* Live Streaming Response or Status */}
            {streamedResponse ? (
              <View style={styles.responseContainer}>
                <Text style={styles.responseText}>{streamedResponse}</Text>
              </View>
            ) : statusMessage ? (
              <View style={styles.statusBox}>
                <Text style={styles.statusBoxText}>{statusMessage}</Text>
              </View>
            ) : (
              <Text style={styles.promptHintText}>
                Speak naturally or type your prompt to {currentAgentName}.
              </Text>
            )}

            {/* Input Bar */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder={`Ask ${currentAgentName}...`}
                placeholderTextColor={colors.slateMuted}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendText}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSendText}
                disabled={!inputText.trim()}
              >
                <Text style={styles.sendBtnText}>💬</Text>
              </TouchableOpacity>
            </View>

            {/* Big Mic Button */}
            <TouchableOpacity
              style={[
                styles.bigMicButton,
                isRecording && styles.bigMicButtonRecording,
                isThinking && styles.bigMicButtonThinking,
              ]}
              onPress={onToggleVoice}
            >
              {isThinking ? (
                <ActivityIndicator color={colors.midnightObsidian} size="small" />
              ) : (
                <Text style={styles.bigMicText}>
                  {isRecording ? '⏹️ Stop Speaking & Send' : '🎙️ Hold or Tap to Speak'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 9999,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    minHeight: touchTargets.min,
    width: '100%',
    maxWidth: 380,
  },
  floatingPillRecording: {
    borderColor: colors.dangerRed,
    backgroundColor: '#1f1318',
  },
  floatingPillThinking: {
    borderColor: colors.runicGold,
    backgroundColor: '#1f1c13',
  },
  micOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glacialCyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  micOrbRecording: {
    backgroundColor: colors.dangerRed,
  },
  micIconText: {
    fontSize: 16,
  },
  pillTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  pillAgentName: {
    ...typography.bodyStyle,
    fontSize: 13,
    fontWeight: '700',
    color: colors.frostSilver,
  },
  pillSubtitle: {
    ...typography.captionStyle,
    fontSize: 10,
    color: colors.slateMuted,
  },
  quickVoiceTap: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 32,
    justifyContent: 'center',
  },
  quickVoiceTapActive: {
    backgroundColor: colors.dangerRed,
    borderColor: colors.dangerRed,
  },
  quickVoiceTapText: {
    ...typography.captionStyle,
    fontSize: 11,
    fontWeight: '700',
    color: colors.glacialCyan,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 10, 0.85)',
    justifyContent: 'flex-end',
  },
  hudCard: {
    backgroundColor: colors.cardSlate,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.cardBorder,
    maxHeight: '90%',
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  hudHeaderSub: {
    ...typography.captionStyle,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.glacialCyan,
  },
  hudHeaderTitle: {
    ...typography.title,
    fontSize: 16,
    color: colors.frostSilver,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.slateMuted,
    fontWeight: '700',
  },
  agentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  agentChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  agentChipActive: {
    borderColor: colors.glacialCyan,
    backgroundColor: '#0c2233',
  },
  agentChipText: {
    fontSize: 11,
    color: colors.slateMuted,
  },
  agentChipTextActive: {
    color: colors.glacialCyan,
    fontWeight: '700',
  },
  avatarStageWrap: {
    marginVertical: spacing.xs,
  },
  responseContainer: {
    backgroundColor: colors.cardElevated,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.glacialCyan,
    maxHeight: 140,
  },
  responseText: {
    ...typography.bodyStyle,
    fontSize: 13,
    color: colors.frostSilver,
    lineHeight: 18,
  },
  statusBox: {
    backgroundColor: colors.cardElevated,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.runicGold,
  },
  statusBoxText: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.slateMuted,
  },
  promptHintText: {
    ...typography.captionStyle,
    color: colors.slateMuted,
    textAlign: 'center',
    marginVertical: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.frostSilver,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: touchTargets.min,
  },
  sendBtn: {
    width: touchTargets.min,
    height: touchTargets.min,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sendBtnText: {
    fontSize: 16,
  },
  bigMicButton: {
    backgroundColor: colors.glacialCyan,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  bigMicButtonRecording: {
    backgroundColor: colors.dangerRed,
  },
  bigMicButtonThinking: {
    backgroundColor: colors.runicGold,
  },
  bigMicText: {
    color: colors.midnightObsidian,
    fontSize: 14,
    fontWeight: '700',
  },
});
