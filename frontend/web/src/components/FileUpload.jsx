import { useState, useRef } from 'react';
import { filesApi } from '../api';

export default function FileUpload({ onUpload, messageId, taskId }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const result = await filesApi.upload(file, messageId, taskId);
      if (onUpload) {
        onUpload(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="file-upload">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ display: 'none' }}
        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.zip,.rar,.7z"
      />
      <button
        type="button"
        className="upload-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Прикрепить файл"
      >
        {uploading ? '⏳' : '📎'}
      </button>
      {error && <span className="upload-error">{error}</span>}
      
      <style>{`
        .file-upload {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .upload-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: #374151;
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
          transition: background 0.2s;
        }
        .upload-btn:hover:not(:disabled) {
          background: #4b5563;
        }
        .upload-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .upload-error {
          color: #ff6b6b;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
