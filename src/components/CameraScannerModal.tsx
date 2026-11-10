import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { cameraScanner, DocumentScanSession } from '../services/CameraScannerService';
import { OCRTargetDocumentType } from '../services/OCREngineService';

export interface CameraScannerModalProps {
  visible: boolean;
  onClose: () => void;
  documentType?: OCRTargetDocumentType;
  onScanComplete?: (session: DocumentScanSession) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  visible,
  onClose,
  documentType = 'receipt',
  onScanComplete,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<DocumentScanSession | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCapture = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const session = await cameraScanner.captureAndScan(
        { quality: 0.9, autoCropPerspective: true },
        { documentType, confidenceThreshold: 0.65 }
      );
      setLastScan(session);
      if (onScanComplete) {
        onScanComplete(session);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Document & Receipt Scanner</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Mode: <Text style={styles.modeText}>{documentType.toUpperCase()}</Text>
          </Text>

          {/* Viewfinder Preview Stage */}
          <View style={styles.viewfinder}>
            <View style={styles.targetReticle} />
            {isScanning ? (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color="#00ffcc" />
                <Text style={styles.scanningText}>Analyzing Text & Rectifying...</Text>
              </View>
            ) : (
              <Text style={styles.viewfinderPrompt}>
                Align document inside frame and tap Capture
              </Text>
            )}
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* Scanned Result Preview */}
          {lastScan && lastScan.ocrResult ? (
            <ScrollView style={styles.resultBox}>
              <Text style={styles.resultHeader}>Extracted Text Preview:</Text>
              <Text style={styles.resultContent}>{lastScan.ocrResult.fullText}</Text>
            </ScrollView>
          ) : null}

          {/* Shutter / Capture Trigger */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.captureBtn, isScanning && styles.captureBtnDisabled]}
              onPress={handleCapture}
              disabled={isScanning}
            >
              <View style={styles.captureInnerRing} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#121217',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262633',
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#8b8b9e',
    fontSize: 20,
  },
  subtext: {
    color: '#8b8b9e',
    fontSize: 13,
    marginBottom: 16,
  },
  modeText: {
    color: '#00ffcc',
    fontWeight: '600',
  },
  viewfinder: {
    height: 240,
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333344',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  targetReticle: {
    width: '80%',
    height: '70%',
    borderWidth: 2,
    borderColor: '#00ffcc',
    borderStyle: 'dashed',
    borderRadius: 8,
    opacity: 0.6,
  },
  viewfinderPrompt: {
    position: 'absolute',
    color: '#a0a0b5',
    fontSize: 12,
    bottom: 12,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10,10,15,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: '#00ffcc',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '500',
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  resultBox: {
    maxHeight: 120,
    marginTop: 12,
    backgroundColor: '#1a1a24',
    padding: 10,
    borderRadius: 8,
  },
  resultHeader: {
    color: '#00ffcc',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultContent: {
    color: '#d0d0e0',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  captureBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#00ffcc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureInnerRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
  },
});
