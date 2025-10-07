import React, { useState, useCallback, useEffect } from 'react';
import type { DocumentSource } from '../preload';

interface DocumentManagementProps {
  onDocumentSelect?: (document: DocumentSource) => void;
  selectedDocumentId?: string;
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({
  onDocumentSelect,
  selectedDocumentId,
}) => {
  const [documents, setDocuments] = useState<DocumentSource[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const result = await window.electronAPI.documents.list();
      setDocuments(result.documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Process each file
    for (const file of files) {
      await uploadFile(file);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await uploadFile(file);
    }
    // Reset input
    e.target.value = '';
  }, []);

  const uploadFile = async (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert(`Unsupported file type: ${file.type}. Please upload PDF, TXT, or DOCX files.`);
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 50MB.`);
      return;
    }

    setIsUploading(true);
    try {
      // Convert File to ArrayBuffer for IPC transfer
      const arrayBuffer = await file.arrayBuffer();
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        data: arrayBuffer,
      };

      const document = await window.electronAPI.documents.upload(fileData);
      setDocuments(prev => [...prev, document]);

      // Start progress monitoring
      monitorProgress(document.id);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const monitorProgress = async (documentId: string) => {
    const checkProgress = async () => {
      try {
        const progress = await window.electronAPI.documents.getProgress(documentId);
        setUploadProgress(prev => ({ ...prev, [documentId]: progress.progress }));

        // Update document status in list
        setDocuments(prev => prev.map(doc =>
          doc.id === documentId
            ? { ...doc, embeddingProgress: progress.progress, embeddingStatus: progress.status as any }
            : doc
        ));

        // Continue monitoring if still processing
        if (progress.status === 'processing') {
          setTimeout(checkProgress, 1000);
        }
      } catch (error) {
        console.error('Progress check failed:', error);
      }
    };

    checkProgress();
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await window.electronAPI.documents.delete(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[documentId];
        return newProgress;
      });
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'completed': return 'Ready';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      default: return 'Pending';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Document Management</h2>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isUploading ? 'Uploading...' : 'Drop documents here or click to browse'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports PDF, TXT, and DOCX files (max 50MB each)
            </p>
          </div>
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.docx"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            Browse Files
          </label>
        </div>
      </div>

      {/* Documents List */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Documents</h3>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No documents uploaded yet.</p>
            <p className="text-sm mt-1">Upload documents above to use LangChain RAG mode.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`border rounded-lg p-4 transition-all ${
                  selectedDocumentId === doc.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {doc.filename}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.embeddingStatus)}`}>
                        {getStatusText(doc.embeddingStatus)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>{doc.fileType.toUpperCase()}</span>
                      <span>{formatFileSize(doc.fileSizeBytes)}</span>
                      <span>{doc.chunkCount} chunks</span>
                      <span>{doc.totalTokens} tokens</span>
                    </div>

                    {/* Progress Bar */}
                    {doc.embeddingStatus === 'processing' && (
                      <div className="mt-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[doc.id] || doc.embeddingProgress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {uploadProgress[doc.id] || doc.embeddingProgress}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {doc.embeddingStatus === 'failed' && doc.embeddingError && (
                      <div className="mt-2 text-sm text-red-600">
                        Error: {doc.embeddingError}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {onDocumentSelect && doc.embeddingStatus === 'completed' && (
                      <button
                        onClick={() => onDocumentSelect(doc)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Select
                      </button>
                    )}
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                      disabled={doc.embeddingStatus === 'processing'}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};