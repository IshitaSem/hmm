const CLOUDINARY_CLOUD_NAME = "da2beokss";
const CLOUDINARY_UPLOAD_PRESET = "payment_screenshots";

/**
 * Upload an image file to Cloudinary using Unsigned Upload API
 * @param {File} file 
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
const uploadPaymentScreenshot = async (file) => {
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            return { success: false, error: "Please upload a valid image file." };
        }
        
        // Validate file size (e.g., max 10MB)
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            return { success: false, error: "File is too large. Please upload an image smaller than 10MB." };
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "Upload failed");
        }

        const data = await response.json();
        
        // Ensure we return the secure (https) URL
        return { success: true, url: data.secure_url };
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        return { success: false, error: error.message };
    }
};

window.cloudinaryAPI = {
    uploadPaymentScreenshot
};
