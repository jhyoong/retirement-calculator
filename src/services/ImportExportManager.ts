import type { RetirementData, ExportData } from '../types';

/**
 * ImportExportManager handles data import and export operations
 * Provides JSON export/import with validation and error handling
 */
export class ImportExportManager {
  private static readonly APP_VERSION = '1.0.0';
  private static readonly EXPORT_FILE_PREFIX = 'retirement-calculator-data';

  /**
   * Export retirement data to a downloadable JSON file
   * @param data RetirementData to export
   * @throws Error if export fails
   */
  exportData(data: RetirementData): void {
    try {
      // Validate data before export
      if (!data) {
        throw new Error('No data to export');
      }

      // Check if browser supports required APIs
      if (!window.Blob) {
        throw new Error('File download is not supported in this browser');
      }

      if (!window.URL || !window.URL.createObjectURL) {
        throw new Error('File download is not supported in this browser');
      }

      const exportData: ExportData = {
        version: ImportExportManager.APP_VERSION,
        exportDate: new Date(),
        userData: data
      };

      // Validate that the data can be serialized
      let jsonString: string;
      try {
        jsonString = JSON.stringify(exportData, null, 2);
      } catch (serializeError) {
        throw new Error('Failed to serialize data for export');
      }

      // Check if the serialized data is reasonable
      if (!jsonString || jsonString.length < 10) {
        throw new Error('Export data appears to be invalid');
      }

      // Create blob with error handling
      let blob: Blob;
      try {
        blob = new Blob([jsonString], { type: 'application/json' });
      } catch (blobError) {
        throw new Error('Failed to create download file');
      }

      // Create download link with error handling
      let url: string;
      try {
        url = URL.createObjectURL(blob);
      } catch (urlError) {
        throw new Error('Failed to create download link');
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = this.generateExportFilename();
      
      // Add link to document temporarily
      if (link.style) {
        link.style.display = 'none';
      }
      document.body.appendChild(link);
      
      // Trigger download
      try {
        link.click();
      } catch (clickError) {
        throw new Error('Failed to trigger file download');
      }
      
      // Cleanup with timeout to ensure download starts
      setTimeout(() => {
        try {
          if (link.parentNode) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
        } catch (cleanupError) {
          console.warn('Failed to cleanup download resources:', cleanupError);
        }
      }, 100);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to export data: Unknown error');
    }
  }

  /**
   * Import retirement data from a JSON file
   * @param file File object containing JSON data
   * @returns Promise<RetirementData> parsed and validated data
   * @throws Error if import fails or data is invalid
   */
  async importData(file: File): Promise<RetirementData> {
    try {
      // Validate file exists
      if (!file) {
        throw new Error('No file selected for import.');
      }

      // Validate file type
      if (!file.type.includes('json') && !file.name.endsWith('.json')) {
        throw new Error('Invalid file type. Please select a JSON file.');
      }

      // Check file size (limit to 1MB for safety)
      const maxSize = 1024 * 1024; // 1MB
      if (file.size > maxSize) {
        throw new Error('File is too large. Maximum size is 1MB.');
      }

      // Check for empty file
      if (file.size === 0) {
        throw new Error('File is empty. Please select a valid data file.');
      }

      // Read file content
      const fileContent = await this.readFileAsText(file);
      
      // Check for empty content
      if (!fileContent.trim()) {
        throw new Error('File content is empty. Please select a valid data file.');
      }

      // Parse JSON
      let parsedData: any;
      try {
        parsedData = JSON.parse(fileContent);
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error('Invalid JSON format. The file appears to be corrupted or not a valid JSON file.');
        }
        throw new Error('Failed to parse file content. Please check the file format.');
      }

      // Validate import data structure
      if (!this.validateImportData(parsedData)) {
        throw new Error('Invalid data structure. This file does not contain valid retirement calculator data.');
      }

      // Extract and validate user data
      const userData = parsedData.userData;
      if (!this.validateRetirementData(userData)) {
        throw new Error('Invalid retirement data. Please check the data values in the file.');
      }

      // Convert date strings back to Date objects and validate
      let lastUpdated: Date;
      try {
        lastUpdated = new Date(userData.lastUpdated);
        if (isNaN(lastUpdated.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (dateError) {
        // Use current date if lastUpdated is invalid
        lastUpdated = new Date();
      }

      return {
        ...userData,
        lastUpdated
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to import data: Unknown error');
    }
  }

  /**
   * Validate the structure of imported data
   * @param data Data to validate
   * @returns true if data has valid ExportData structure
   */
  validateImportData(data: any): data is ExportData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (typeof data.version !== 'string') {
      return false;
    }

    if (!(data.exportDate instanceof Date) && typeof data.exportDate !== 'string') {
      return false;
    }

    if (!data.userData || typeof data.userData !== 'object') {
      return false;
    }

    // Also validate the retirement data structure
    return this.validateRetirementData(data.userData);
  }

  /**
   * Validate retirement data structure and values
   * @param data Data to validate
   * @returns true if data is valid RetirementData
   */
  validateRetirementData(data: any): data is RetirementData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check required fields exist and have correct types
    const requiredFields = [
      'currentAge',
      'retirementAge', 
      'currentSavings',
      'monthlyContribution',
      'expectedAnnualReturn'
    ];

    for (const field of requiredFields) {
      if (typeof data[field] !== 'number') {
        return false;
      }
    }

    // Validate lastUpdated field
    if (!data.lastUpdated || 
        (!(data.lastUpdated instanceof Date) && typeof data.lastUpdated !== 'string')) {
      return false;
    }

    // Validate value ranges
    if (data.currentAge < 0 || data.currentAge > 150) {
      return false;
    }

    if (data.retirementAge < 0 || data.retirementAge > 150) {
      return false;
    }

    if (data.retirementAge <= data.currentAge) {
      return false;
    }

    if (data.currentSavings < 0) {
      return false;
    }

    if (data.monthlyContribution < 0) {
      return false;
    }

    if (data.expectedAnnualReturn < 0 || data.expectedAnnualReturn > 1) {
      return false;
    }

    return true;
  }

  /**
   * Generate a descriptive filename with timestamp for export
   * @returns filename string
   */
  private generateExportFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
    return `${ImportExportManager.EXPORT_FILE_PREFIX}-${timestamp}.json`;
  }

  /**
   * Read file content as text
   * @param file File to read
   * @returns Promise<string> file content
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  }
}