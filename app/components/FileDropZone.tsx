import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';

interface FileDropZoneProps {
  onFileAnalyzed: (data: any) => void;
}

export default function FileDropZone({ onFileAnalyzed }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProcessingStep('Reading file...');

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setProcessingStep('Parsing Excel data...');
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Try to find a sheet with WIP data
          const sheetName = workbook.SheetNames.find(name => 
            name.toLowerCase().includes('wip') || 
            name.toLowerCase().includes('work') ||
            name.toLowerCase().includes('time')
          ) || workbook.SheetNames[0];
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: true,
            defval: null, // Use null for empty cells
            blankrows: false // Skip blank rows
          });

          if (!jsonData || jsonData.length === 0) {
            throw new Error('No data found in the Excel file. Please make sure the file contains data.');
          }

          setProcessingStep('Analyzing data structure...');
          console.log('Excel data:', jsonData);
          
          // First parse the Excel data
          setProcessingStep('Processing with AI...');
          const parseResponse = await fetch('/api/excel-parse', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(jsonData)
          });

          if (!parseResponse.ok) {
            const errorData = await parseResponse.json();
            throw new Error(errorData.error || 'Failed to process Excel file');
          }

          const entries = await parseResponse.json();
          
          if (!Array.isArray(entries) || entries.length === 0) {
            throw new Error('No valid entries found in the file. Please check the file format.');
          }

          // Now analyze the parsed data
          setProcessingStep('Analyzing WIP data...');
          const analyzeResponse = await fetch('/api/wip/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(entries)
          });

          if (!analyzeResponse.ok) {
            const errorData = await analyzeResponse.json();
            throw new Error(errorData.error || 'Failed to analyze WIP data');
          }

          const analyzedData = await analyzeResponse.json();
          
          if (!analyzedData.success || !analyzedData.data) {
            throw new Error('Failed to analyze WIP data');
          }

          // Pass the analyzed data to parent
          onFileAnalyzed(analyzedData.data);
          setProcessingStep('');
        } catch (err: any) {
          console.error('Error processing file:', err);
          setError(err.message || 'Failed to process Excel file. Please make sure it\'s a valid data file.');
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read the file. Please try again.');
        setIsProcessing(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Failed to process the file. Please try again.');
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
    onDragLeave: () => setIsDragging(false)
  });

  return (
    <div 
      {...getRootProps()} 
      className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all
        ${isDragging 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }
      `}
    >
      <input {...getInputProps()} />
      {isProcessing ? (
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {processingStep || 'Processing file...'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Drop any Excel file here, or click to select
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Our AI will analyze the data structure automatically
          </p>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
} 