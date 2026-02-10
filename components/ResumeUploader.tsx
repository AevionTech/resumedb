"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Types
interface StagedFile {
  id: string;
  file: File;
  size: number;
  name: string;
}

interface ResumeUploaderProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const PDF_MIME_TYPE = "application/pdf";

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.type !== PDF_MIME_TYPE) {
    return { valid: false, error: "Only PDF files are allowed" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size must be less than 5MB" };
  }
  return { valid: true };
};

// Simulated processing function
const processResumes = async (files: StagedFile[]): Promise<void> => {
  // Simulate API call with delay
  await new Promise((resolve) => setTimeout(resolve, 3000));
  
  // Simulate potential error (5% chance for demo purposes)
  if (Math.random() < 0.05) {
    throw new Error("Failed to process resumes. Please try again.");
  }
  
  return Promise.resolve();
};

export default function ResumeUploader({
  onSuccess,
  onError,
}: ResumeUploaderProps) {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TanStack Query mutation for processing
  const mutation = useMutation({
    mutationFn: processResumes,
    onSuccess: () => {
      setStagedFiles([]);
      setError(null);
      onSuccess?.();
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "An error occurred while processing resumes";
      setError(errorMessage);
      onError?.(errorMessage);
    },
  });

  const handleFileSelection = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    const newFiles: StagedFile[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const validation = validateFile(file);
      if (validation.valid) {
        newFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          size: file.size,
          name: file.name,
        });
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(". "));
    }

    if (newFiles.length > 0) {
      setStagedFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFileSelection(e.dataTransfer.files);
    },
    [handleFileSelection]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelection(e.target.files);
      // Reset input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFileSelection]
  );

  const removeFile = useCallback((id: string) => {
    setStagedFiles((prev) => prev.filter((file) => file.id !== id));
    setError(null);
  }, []);

  const handleProcess = useCallback(() => {
    if (stagedFiles.length === 0) return;
    setError(null);
    mutation.mutate(stagedFiles);
  }, [stagedFiles, mutation]);

  const handleDropzoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Error Toast */}
      {error && (
        <div
          className="flex items-center gap-2 p-4 bg-red-950/20 border border-red-800 rounded-lg text-red-400"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Message */}
      {mutation.isSuccess && !mutation.isPending && (
        <div
          className="flex items-center gap-2 p-4 bg-green-950/20 border border-green-800 rounded-lg text-green-400"
          role="alert"
          aria-live="polite"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">
            Resumes processed successfully!
          </p>
        </div>
      )}

      {/* Dropzone */}
      <div
        onClick={handleDropzoneClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? "border-blue-500 bg-blue-950/20"
              : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
          }
        `}
        role="button"
        tabIndex={0}
        aria-label="Upload PDF files by clicking or dragging and dropping"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleDropzoneClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="File input"
        />
        <Upload
          className={`w-12 h-12 mx-auto mb-4 ${
            isDragging
              ? "text-blue-400"
              : "text-slate-400"
          }`}
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-slate-200 mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-slate-400">
          PDF files only (max 5MB per file)
        </p>
      </div>

      {/* File List */}
      {stagedFiles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Staged Files ({stagedFiles.length})
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2 bg-slate-800/50 rounded-md -mr-2">
            {stagedFiles.map((stagedFile) => (
              <div
                key={stagedFile.id}
                className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
              >
                <FileText
                  className="w-5 h-5 text-red-400 flex-shrink-0"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {stagedFile.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatFileSize(stagedFile.size)}
                  </p>
                </div>
                <button
                  onClick={() => removeFile(stagedFile.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors"
                  aria-label={`Remove ${stagedFile.name}`}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process Button */}
      <div className="space-y-3">
        <button
          onClick={handleProcess}
          disabled={stagedFiles.length === 0 || mutation.isPending}
          className={`
            w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium
            transition-all duration-200
            ${
              stagedFiles.length === 0 || mutation.isPending
                ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
                : "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            }
          `}
          aria-label="Process resumes"
          aria-busy={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Processing...</span>
            </>
          ) : (
            <span>Process Resumes</span>
          )}
        </button>

        {/* Progress Bar */}
        {mutation.isPending && (
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden dark:bg-gray-800">
            <div
              className="bg-blue-600 h-2 rounded-full animate-pulse"
              style={{ width: "100%" }}
              role="progressbar"
              aria-valuenow={100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Processing resumes"
            />
          </div>
        )}
      </div>
    </div>
  );
}
