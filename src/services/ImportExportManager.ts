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
      const exportData: ExportData = {
        version: ImportExportManager.APP_VERSION,
        exportDate: new Date(),
        userData: data
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.generateExportFilename();
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to export data: ${error.message}`);
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
      // Validate file type
      if (!file.type.includes('json') && !file.name.endsWith('.json')) {
        throw new Error('Invalid file type. Please select a JSON file.');
      }

      // Check file size (limit to 1MB for safety)
      const maxSize = 1024 * 1024; // 1MB
      if (file.size > maxSize) {
        throw new Error('File is too large. Maximum size is 1MB.');
      }

      // Read file content
      const fileContent = await this.readFileAsText(file);
      
      // Parse JSON
      let parsedData: any;
      try {
        parsedData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error('Invalid JSON format. Please check the file content.');
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

      // Convert date strings back to Date objects
      return {
        ...userData,
        lastUpdated: new Date(userData.lastUpdated)
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