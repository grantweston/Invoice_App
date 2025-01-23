import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';

interface FileDropZoneProps {
  onFileAnalyzed: (data: any) => void;
}

export default function FileDropZone({ onFileAnalyzed }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          onFileAnalyzed(jsonData);
        } catch (err) {
          setError('Failed to process Excel file. Please make sure it\'s a valid WIP report.');
          console.error('Error processing file:', err);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Failed to read file');
      setIsProcessing(false);
    }
  }, [onFileAnalyzed]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false)
  });

  return (
    <div 
      {...getRootProps()} 
      className={`
        relative p-8 border-2 border-dashed rounded-xl transition-all duration-200
        ${isDragging 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="text-center">
        {isProcessing ? (
          <div className="space-y-3">
            <svg className="w-8 h-8 mx-auto text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400">Processing Excel file...</p>
          </div>
        ) : (
          <>
            <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Drop your WIP Excel file here, or click to select
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Supports .xlsx and .xls files
            </p>
          </>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
} 