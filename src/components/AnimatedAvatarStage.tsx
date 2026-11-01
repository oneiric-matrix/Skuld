import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { streamingTTS, VisemeFrame } from '../ai/StreamingTTSEngine';
import { AvatarRigConfig } from '../agents/AgentManifest';

interface Props {
  agentName: string;
  avatarConfig: AvatarRigConfig;
  isListening: boolean;
  isThinking: boolean;
}

export const AnimatedAvatarStage: React.FC<Props> = ({
  agentName,
  avatarConfig,
  isListening,
  isThinking,
}) => {
  const [mouthShape, setMouthShape] = useState<VisemeFrame['mouthShape']>('closed');
  const [mouthScale] = useState(new Animated.Value(0.1));
  const [breathScale] = useState(new Animated.Value(1.0));

  useEffect(() => {
    // Idle breathing animation loop
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, {
          toValue: 1.04,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(breathScale, {
          toValue: 1.0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    breathing.start();

    // Subscribe to real-time speech viseme updates
    const unsubscribe = streamingTTS.addVisemeListener((frame) => {
      setMouthShape(frame.mouthShape);
      Animated.timing(mouthScale, {
        toValue: frame.amplitude > 0 ? frame.amplitude : 0.1,
        duration: 80,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      breathing.stop();
      unsubscribe();
    };
  }, []);

  const getMouthHeight = () => {
    switch (mouthShape) {
      case 'open_wide':
        return 18;
      case 'round':
        return 14;
      case 'open_slight':
        return 8;
      case 'smile':
        return 6;
      default:
        return 2;
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.avatarCircle,
          { borderColor: avatarConfig.accentColor || '#00E5FF' },
          { transform: [{ scale: breathScale }] },
        ]}
      >
        {/* Animated Eyes */}
        <View style={styles.eyeRow}>
          <View
            style={[
              styles.eye,
              isListening ? styles.eyeListening : null,
              isThinking ? styles.eyeThinking : null,
            ]}
          />
          <View
            style={[
              styles.eye,
              isListening ? styles.eyeListening : null,
              isThinking ? styles.eyeThinking : null,
            ]}
          />
        </View>

        {/* Dynamic Mouth Flap with Visemes */}
        <Animated.View
          style={[
            styles.mouth,
            {
              height: getMouthHeight(),
              width: mouthShape === 'round' ? 14 : 26,
              borderRadius: mouthShape === 'round' ? 7 : 4,
              backgroundColor: avatarConfig.accentColor || '#00E5FF',
            },
            { transform: [{ scaleY: mouthScale }] },
          ]}
        />
      </Animated.View>

      <View style={styles.badgeRow}>
        <Text style={styles.agentNameText}>{agentName}</Text>
        {isListening ? (
          <Text style={styles.statusBadge}>🎙️ Listening...</Text>
        ) : isThinking ? (
          <Text style={styles.statusBadge}>💭 Generating...</Text>
        ) : streamingTTS.getIsSpeaking() ? (
          <Text style={[styles.statusBadge, { color: avatarConfig.accentColor || '#00E5FF' }]}>
            🗣️ Speaking
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 14,
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#111827',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  eyeRow: {
    flexDirection: 'row',
    gap: 22,
    marginBottom: 16,
  },
  eye: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF',
  },
  eyeListening: {
    backgroundColor: '#00E5FF',
    transform: [{ scaleY: 1.4 }],
  },
  eyeThinking: {
    backgroundColor: '#EAB308',
    transform: [{ scaleX: 1.3 }],
  },
  mouth: {
    alignSelf: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  agentNameText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
});
