import { filesApi } from '../api';

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function getFileIcon(fileType) {
  switch (fileType) {
    case 'image': return '🖼️';
    case 'document': return '📄';
    case 'archive': return '📦';
    default: return '📁';
  }
}

export default function AttachmentList({ attachments, onDelete, canDelete = false }) {
  if (!attachments || attachments.length === 0) return null;

  const handleDownload = (attachment) => {
    const link = document.createElement('a');
    link.href = filesApi.getUrl(attachment.id);
    link.download = attachment.original_name;
    link.click();
  };

  return (
    <div className="attachment-list">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="attachment-item">
          {attachment.file_type === 'image' && attachment.thumbnail_url ? (
            <img 
              src={attachment.thumbnail_url} 
              alt={attachment.original_name}
              className="attachment-thumb"
              onClick={() => window.open(filesApi.getUrl(attachment.id), '_blank')}
            />
          ) : (
            <div className="attachment-icon" onClick={() => handleDownload(attachment)}>
              {getFileIcon(attachment.file_type)}
            </div>
          )}
          <div className="attachment-info">
            <span className="attachment-name" title={attachment.original_name}>
              {attachment.original_name}
            </span>
            <span className="attachment-size">{formatSize(attachment.size)}</span>
          </div>
          <div className="attachment-actions">
            <button 
              className="attachment-download"
              onClick={() => handleDownload(attachment)}
              title="Скачать"
            >
              ⬇️
            </button>
            {canDelete && (
              <button 
                className="attachment-delete"
                onClick={() => onDelete && onDelete(attachment.id)}
                title="Удалить"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      ))}
      
      <style>{`
        .attachment-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .attachment-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: #1e1e2e;
          border-radius: 8px;
          max-width: 280px;
        }
        .attachment-thumb {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 4px;
          cursor: pointer;
        }
        .attachment-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #2d2d3d;
          border-radius: 4px;
          font-size: 24px;
          cursor: pointer;
        }
        .attachment-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .attachment-name {
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .attachment-size {
          font-size: 11px;
          color: #888;
        }
        .attachment-actions {
          display: flex;
          gap: 4px;
        }
        .attachment-actions button {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .attachment-actions button:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
