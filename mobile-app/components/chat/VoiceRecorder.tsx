import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, X, Send } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/constants/Theme';

interface VoiceRecorderProps {
  onSend: (audioUri: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onSend, onCancel, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [recording]);

  useEffect(() => {
    if (isRecording) {
      // Pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const startRecording = async () => {
    if (disabled) return;

    try {
      // Request permission if not granted
      if (permissionResponse?.status !== 'granted') {
        const { granted } = await requestPermission();
        if (!granted) {
          alert('Permission to access microphone is required!');
          return;
        }
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setDuration(0);

      // Start duration counter
      durationInterval.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000) as any;

    } catch (err) {
      console.error('Failed to start recording', err);
      alert('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async (shouldSend: boolean = true) => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);
      setDuration(0);

      if (uri && shouldSend) {
        onSend(uri);
      } else if (!shouldSend && onCancel) {
        onCancel();
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const cancelRecording = async () => {
    await stopRecording(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <View style={styles.recordingContainer}>
        <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
          <X size={24} color="#EF4444" />
        </TouchableOpacity>

        <View style={styles.recordingInfo}>
          <Animated.View style={[styles.pulsingDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>

        <TouchableOpacity onPress={() => stopRecording(true)} style={styles.sendButton}>
          <LinearGradient
            colors={['#4F9CF9', '#3B82F6']}
            style={styles.sendGradient}
          >
            <Send size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={startRecording}
      style={[styles.micButton, disabled && styles.micButtonDisabled]}
      disabled={disabled}
    >
      <Mic size={22} color={disabled ? '#ccc' : '#6B7280'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  micButton: {
    padding: 10,
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  cancelButton: {
    padding: 8,
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sendButton: {
    padding: 4,
  },
  sendGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
