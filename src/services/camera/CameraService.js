import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { requestCameraPermission, requestStoragePermission } from '../../utils/permissions';
import { IMAGE_CONFIG } from '../../utils/constants';

class CameraService {
    // Capture photo from camera
    async capturePhoto() {
        try {
            const hasPermission = await requestCameraPermission();
            if (!hasPermission) {
                throw new Error('Camera permission denied');
            }

            const options = {
                mediaType: 'photo',
                maxWidth: IMAGE_CONFIG.maxWidth,
                maxHeight: IMAGE_CONFIG.maxHeight,
                quality: IMAGE_CONFIG.quality,
                saveToPhotos: false,
            };

            const result = await launchCamera(options);

            if (result.didCancel) {
                return null;
            }

            if (result.errorCode) {
                throw new Error(result.errorMessage);
            }

            return result.assets[0];
        } catch (error) {
            console.error('Error capturing photo:', error);
            throw error;
        }
    }

    // Select photo from gallery
    async selectFromGallery() {
        try {
            const hasPermission = await requestStoragePermission();
            if (!hasPermission) {
                throw new Error('Storage permission denied');
            }

            const options = {
                mediaType: 'photo',
                maxWidth: IMAGE_CONFIG.maxWidth,
                maxHeight: IMAGE_CONFIG.maxHeight,
                quality: IMAGE_CONFIG.quality,
            };

            const result = await launchImageLibrary(options);

            if (result.didCancel) {
                return null;
            }

            if (result.errorCode) {
                throw new Error(result.errorMessage);
            }

            return result.assets[0];
        } catch (error) {
            console.error('Error selecting from gallery:', error);
            throw error;
        }
    }
}

export default new CameraService();
