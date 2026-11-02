import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import {
  AvailableVoiceModel,
  StandardAgentCapability,
  AgentManifest,
} from '../agents/AgentManifest';
import { agentStudio } from '../services/AgentStudioService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAgentCreated: (agent: AgentManifest) => void;
}

const VOICE_OPTIONS: { id: AvailableVoiceModel; label: string }[] = [
  { id: 'en_GB-alan-medium', label: 'Alan (British Male - Formal)' },
  { id: 'en_US-amy-medium', label: 'Amy (American Female - Crisp)' },
  { id: 'en_US-danny-low', label: 'Danny (American Male - Relaxed)' },
  { id: 'en_US-kathleen-low', label: 'Kathleen (American Female - Warm)' },
  { id: 'en_GB-northern_english_male-medium', label: 'Julian (Northern British - Scholar)' },
  { id: 'en_US-bryce-medium', label: 'Bryce (American Male - Energetic)' },
];

const COLOR_OPTIONS = ['#00E5FF', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444'];

const ALL_CAPABILITIES: { id: StandardAgentCapability; label: string; icon: string }[] = [
  { id: 'calendar_events', label: 'Calendar Management', icon: '📅' },
  { id: 'reminder_alarms', label: 'Reminders & Alarms', icon: '⏰' },
  { id: 'notes_backlog', label: 'Ideas & Task Backlog', icon: '📝' },
  { id: 'expense_ledger', label: 'Expense & Budget Tracker', icon: '💰' },
  { id: 'step_vitals_sync', label: 'Health & Step Sync', icon: '🏃' },
  { id: 'document_ocr', label: 'Document & Receipt OCR', icon: '📄' },
  { id: 'math_calculator', label: 'Math & Financial Projections', icon: '🧮' },
];

export const AgentStudioModal: React.FC<Props> = ({ visible, onClose, onAgentCreated }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [lore, setLore] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<AvailableVoiceModel>('en_US-amy-medium');
  const [selectedColor, setSelectedColor] = useState('#00E5FF');
  const [selectedCapabilities, setSelectedCapabilities] = useState<StandardAgentCapability[]>([
    'reminder_alarms',
    'notes_backlog',
  ]);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleCapability = (cap: StandardAgentCapability) => {
    setSelectedCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter an agent name.');
      return;
    }
    if (!roleTitle.trim()) {
      setErrorMsg('Please enter a role title.');
      return;
    }

    try {
      const manifest = await agentStudio.createOrUpdateAgent({
        name,
        roleTitle,
        lore,
        systemPrompt,
        voice: {
          modelId: selectedVoice,
          speed: 1.0,
          pitch: 1.0,
        },
        avatar: {
          type: 'sprite_viseme',
          assetUri: `avatar_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.riv`,
          mouthFlapEnabled: true,
          accentColor: selectedColor,
        },
        capabilities: selectedCapabilities,
      });

      onAgentCreated(manifest);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save agent');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>✨ Agent Creation Studio</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Stepper Tabs */}
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepTab, step === 1 && styles.stepTabActive]}
              onPress={() => setStep(1)}
            >
              <Text style={[styles.stepTabText, step === 1 && styles.stepTabTextActive]}>
                1. Persona
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepTab, step === 2 && styles.stepTabActive]}
              onPress={() => setStep(2)}
            >
              <Text style={[styles.stepTabText, step === 2 && styles.stepTabTextActive]}>
                2. Voice & Look
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepTab, step === 3 && styles.stepTabActive]}
              onPress={() => setStep(3)}
            >
              <Text style={[styles.stepTabText, step === 3 && styles.stepTabTextActive]}>
                3. Tools & Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea}>
            {step === 1 ? (
              <View>
                <Text style={styles.fieldLabel}>Agent Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Socrates, Jarvis, Coach Leo"
                  placeholderTextColor="#666"
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.fieldLabel}>Role Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Philosophy Mentor, Fitness Coach"
                  placeholderTextColor="#666"
                  value={roleTitle}
                  onChangeText={setRoleTitle}
                />

                <Text style={styles.fieldLabel}>Personality & Lore</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Describe backstory, speaking style, tone..."
                  placeholderTextColor="#666"
                  value={lore}
                  onChangeText={setLore}
                  multiline
                />
              </View>
            ) : step === 2 ? (
              <View>
                <Text style={styles.fieldLabel}>Neural Voice Model</Text>
                {VOICE_OPTIONS.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.voiceCard,
                      selectedVoice === v.id && styles.voiceCardSelected,
                    ]}
                    onPress={() => setSelectedVoice(v.id)}
                  >
                    <Text
                      style={[
                        styles.voiceCardText,
                        selectedVoice === v.id && styles.voiceCardTextSelected,
                      ]}
                    >
                      🗣️ {v.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Theme / 1x1 Widget Color</Text>
                <View style={styles.colorRow}>
                  {COLOR_OPTIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        selectedColor === c && styles.colorSwatchSelected,
                      ]}
                      onPress={() => setSelectedColor(c)}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.fieldLabel}>Attach Capabilities (Tools)</Text>
                {ALL_CAPABILITIES.map((cap) => {
                  const isChecked = selectedCapabilities.includes(cap.id);
                  return (
                    <TouchableOpacity
                      key={cap.id}
                      style={[styles.capCard, isChecked && styles.capCardSelected]}
                      onPress={() => toggleCapability(cap.id)}
                    >
                      <Text style={styles.capIcon}>{cap.icon}</Text>
                      <Text
                        style={[styles.capLabel, isChecked && styles.capLabelSelected]}
                      >
                        {cap.label}
                      </Text>
                      <Text style={styles.checkbox}>{isChecked ? '☑️' : '⬜'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <View style={styles.footerRow}>
            {step > 1 ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep((s) => (s - 1) as any)}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            ) : null}

            {step < 3 ? (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => setStep((s) => (s + 1) as any)}
              >
                <Text style={styles.nextBtnText}>Next Step</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>🚀 Provision Agent</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00E5FF',
  },
  closeBtn: {
    color: '#94A3B8',
    fontSize: 20,
    padding: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stepTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  stepTabActive: {
    backgroundColor: '#0284C7',
  },
  stepTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  stepTabTextActive: {
    color: '#FFF',
  },
  scrollArea: {
    maxHeight: 340,
  },
  fieldLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  voiceCard: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  voiceCardSelected: {
    borderColor: '#00E5FF',
    backgroundColor: '#0C4A6E',
  },
  voiceCardText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  voiceCardTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    transform: [{ scale: 1.15 }],
  },
  capCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  capCardSelected: {
    borderColor: '#00E5FF',
    backgroundColor: '#0F2942',
  },
  capIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  capLabel: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 13,
  },
  capLabelSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  checkbox: {
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  nextBtn: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: '#0284C7',
    borderRadius: 8,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: '#00E5FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#0A0E17',
    fontWeight: '800',
  },
});
