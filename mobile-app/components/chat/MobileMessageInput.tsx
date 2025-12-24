import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Send, Mic, StopCircle, X, Check } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import ChatImagePicker from './ImagePicker';
import { spacing } from '@/constants/Theme';

interface MobileMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImageUpload?: (file: File) => void;
  onAudioSend?: (audioUri: string) => void;
  onRemoveAttachment?: () => void;
  onS2SStart?: () => void;
  onS2SStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  onStop?: () => void;
  isS2SActive?: boolean;
}

export default function MobileMessageInput({
  value,
  onChange,
  onSend,
  onImageUpload,
  onAudioSend,
  onRemoveAttachment,
  onS2SStart,
  onS2SStop,
  disabled = false,
  placeholder = 'Message AI...',
  onStop,
  isS2SActive = false,
}: MobileMessageInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const recordingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const hasTextContent = value.trim().length > 0;

  const startRecording = async () => {
    try {
      // Request permission if not granted
      if (permissionResponse?.status !== 'granted') {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert('Permission Required', 'Microphone permission is required to record voice messages');
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
      setRecordingTime(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000) as any;

    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);
      setRecordingTime(0);

      if (uri) {
        setRecordedAudioUri(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const cancelRecording = () => {
    setRecordedAudioUri(null);
  };

  const confirmRecording = () => {
    if (recordedAudioUri && onAudioSend) {
      onAudioSend(recordedAudioUri);
      setRecordedAudioUri(null);
    }
  };

  const handleSend = () => {
    if (!hasTextContent && selectedImages.length === 0) return;
    onSend();
    setSelectedImages([]);
  };

  const handleS2SToggle = () => {
    if (isS2SActive) {
      onS2SStop?.();
    } else {
      onS2SStart?.();
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        {isRecording ? (
          // Recording State
          <View style={styles.recordingContainer}>
            <View style={styles.recordingInfo}>
              <View style={styles.pulsingDot} />
              <Text style={styles.recordingTime}>{formatRecordingTime(recordingTime)}</Text>
            </View>
            <TouchableOpacity onPress={stopRecording} style={styles.stopButton}>
              <StopCircle size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : recordedAudioUri ? (
          // Recorded Audio State
          <View style={styles.recordedContainer}>
            <View style={styles.recordedInfo}>
              <Mic size={18} color="#6B7280" />
              <Text style={styles.recordedText}>Voice message ready</Text>
            </View>
            <View style={styles.recordedActions}>
              <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
                <X size={20} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmRecording} style={styles.confirmButton}>
                <Check size={20} color="#10B981" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Normal Input State
          <>
            <ChatImagePicker onImagesSelected={(uris) => {
              if (onImageUpload) {
                uris.forEach(uri => onImageUpload(uri as any));
              }
            }} />
            
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={value}
              onChangeText={onChange}
              multiline
              maxLength={1000}
              editable={!disabled}
            />

            {/* Action Buttons */}
            {disabled && onStop ? (
              // Stop Thinking Button
              <TouchableOpacity onPress={onStop} style={styles.stopThinkingButton}>
                <StopCircle size={22} color="#F97316" />
              </TouchableOpacity>
            ) : hasTextContent ? (
              // Send Button
              <TouchableOpacity
                onPress={handleSend}
                style={styles.sendButton}
                disabled={disabled}
              >
                {disabled ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <LinearGradient
                    colors={['#101827', '#000000']}
                    style={styles.sendGradient}
                  >
                    <Send size={18} color="#fff" />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            ) : (
              // Voice/S2S Buttons
              <View style={styles.voiceButtons}>
                <TouchableOpacity
                  onPress={startRecording}
                  style={styles.micButton}
                  disabled={disabled}
                >
                  <Mic size={22} color="#6B7280" />
                </TouchableOpacity>

                {/* S2S Button */}
                <TouchableOpacity
                  onPress={handleS2SToggle}
                  style={[
                    styles.s2sButton,
                    isS2SActive && styles.s2sButtonActive
                  ]}
                  disabled={disabled || selectedImages.length > 0}
                >
                  <LinearGradient
                    colors={isS2SActive ? ['#EF4444', '#DC2626'] : ['#000000', '#111827']}
                    style={styles.s2sGradient}
                  >
                    <View style={styles.s2sIcon}>
                      <View style={[styles.s2sCircle, styles.s2sCircleInner]} />
                      <View style={[styles.s2sCircle, styles.s2sCircleMiddle]} />
                      <View style={[styles.s2sCircle, styles.s2sCircleOuter]} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  recordingInfo: {
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
  recordingTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  stopButton: {
    padding: 8,
  },
  recordedContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  recordedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordedText: {
    fontSize: 14,
    color: '#6B7280',
  },
  recordedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    padding: 8,
  },
  confirmButton: {
    padding: 8,
  },
  voiceButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  micButton: {
    padding: 10,
  },
  sendButton: {
    marginBottom: 4,
    marginRight: 4,
  },
  sendGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopThinkingButton: {
    padding: 10,
  },
  s2sButton: {
    marginBottom: 2,
  },
  s2sButtonActive: {
    // Add pulsing animation if needed
  },
  s2sGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  s2sIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  s2sCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'transparent',
    borderColor: '#fff',
  },
  s2sCircleInner: {
    width: 4,
    height: 4,
    backgroundColor: '#fff',
    borderWidth: 0,
  },
  s2sCircleMiddle: {
    width: 10,
    height: 10,
    borderWidth: 1.5,
    opacity: 0.6,
  },
  s2sCircleOuter: {
    width: 16,
    height: 16,
    borderWidth: 1,
    opacity: 0.4,
  },
});
