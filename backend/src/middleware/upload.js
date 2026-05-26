const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

const fileFilter = (req, file, cb) => {
  const extname = /\.(jpeg|jpg|png|gif|webp)$/i.test(path.extname(file.originalname));
  const mimetype = ALLOWED_MIME_TYPES.has(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)'));
};

// Use memory storage - files are uploaded to Cloudinary, not saved to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

/**
 * Upload a buffer to Cloudinary and return the result.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} folder  - Cloudinary folder name
 * @param {string} [publicId] - Optional public ID
 * @returns {Promise<object>} Cloudinary upload result
 */
const uploadToCloudinary = (buffer, folder = 'yatra', publicId) => {
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto'
    };
    if (publicId) options.public_id = publicId;

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary by public ID.
 * @param {string} publicId - Cloudinary public ID
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // Non-fatal: log but don't throw
    console.error('Failed to delete from Cloudinary:', err.message);
  }
};

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary };
