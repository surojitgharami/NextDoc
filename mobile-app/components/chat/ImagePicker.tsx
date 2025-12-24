import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Paperclip, X, Camera, Image as ImageIcon } from 'lucide-react-native';
import { spacing } from '@/constants/Theme';

interface ChatImagePickerProps {
  onImagesSelected: (uris: string[]) => void;
  maxImages?: number;
}

export default function ChatImagePicker({ onImagesSelected, maxImages = 5 }: ChatImagePickerProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [permissionResponse, requestPermission] = ImagePicker.useCameraPermissions();

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Image compression failed:', error);
      return uri;
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const compressedUri = await compressImage(result.assets[0].uri);
        addImage(compressedUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      // Request permission if not granted
      if (permissionResponse?.status !== 'granted') {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const compressedUri = await compressImage(result.assets[0].uri);
        addImage(compressedUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const addImage = (uri: string) => {
    if (selectedImages.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only select up to ${maxImages} images`);
      return;
    }

    const newImages = [...selectedImages, uri];
    setSelectedImages(newImages);
    onImagesSelected(newImages);
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    onImagesSelected(newImages);
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Image',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: pickFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View>
      <TouchableOpacity onPress={showImageOptions} style={styles.attachButton}>
        <Paperclip size={22} color="#6B7280" />
      </TouchableOpacity>

      {selectedImages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagePreviewContainer}
          contentContainerStyle={styles.imagePreviewContent}
        >
          {selectedImages.map((uri, index) => (
            <View key={index} style={styles.imagePreview}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity
                onPress={() => removeImage(index)}
                style={styles.removeButton}
              >
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  attachButton: {
    padding: 10,
  },
  imagePreviewContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
  },
  imagePreviewContent: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  imagePreview: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
