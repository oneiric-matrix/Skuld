import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AppReleaseInfo, appUpdaterService } from '../services/AppUpdaterService';
import { colors, spacing, borderRadius, typography, touchTargets } from '../theme/tokens';

export interface UpdateModalProps {
  visible: boolean;
  releaseInfo: AppReleaseInfo | null;
  onClose: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateModalProps> = ({
  visible,
  releaseInfo,
  onClose,
}) => {
  if (!releaseInfo) return null;

  const handleDownload = async () => {
    await appUpdaterService.triggerUpdateDownload(releaseInfo.downloadUrl);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.runeBadge}>ᛞ NEW UPDATE AVAILABLE</Text>
              <Text style={styles.versionTitle}>Skuld {releaseInfo.version}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            An updated build with fresh agent capabilities, UI improvements, and bug fixes is ready to install.
          </Text>

          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>RELEASE HIGHLIGHTS:</Text>
            <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.notesText}>{releaseInfo.releaseNotes}</Text>
            </ScrollView>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.laterBtn} onPress={onClose}>
              <Text style={styles.laterBtnText}>Later</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.updateBtn} onPress={handleDownload}>
              <Text style={styles.updateBtnText}>⚡ Download & Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.glacialCyan,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  runeBadge: {
    ...typography.captionStyle,
    fontSize: 10,
    color: colors.glacialCyan,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  versionTitle: {
    ...typography.title,
    fontSize: 18,
    color: colors.frostSilver,
    marginTop: 2,
  },
  closeText: {
    fontSize: 16,
    color: colors.slateMuted,
    fontWeight: '700',
    padding: 4,
  },
  subtext: {
    ...typography.captionStyle,
    fontSize: 12,
    color: colors.slateMuted,
    marginVertical: spacing.sm,
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  notesLabel: {
    ...typography.captionStyle,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.runicGold,
    marginBottom: 4,
  },
  notesScroll: {
    maxHeight: 100,
  },
  notesText: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.frostSilver,
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  laterBtn: {
    flex: 1,
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  laterBtnText: {
    ...typography.captionStyle,
    fontSize: 12,
    color: colors.slateMuted,
    fontWeight: '600',
  },
  updateBtn: {
    flex: 2,
    backgroundColor: colors.glacialCyan,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  updateBtnText: {
    color: colors.midnightObsidian,
    fontSize: 13,
    fontWeight: '700',
  },
});
