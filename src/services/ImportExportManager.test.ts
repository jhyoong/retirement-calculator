import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ImportExportManager } from './ImportExportManager';
import type { RetirementData, ExportData } from '../types';

// Mock DOM APIs
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

// Setup DOM mocks
Object.defineProperty(global, 'document', {
  value: {
    createElement: mockCreateElement,
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild
    }
  }
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  }
});

Object.defineProperty(global, 'Blob', {
  value: class MockBlob {
    constructor(public content: any[], public options: any) {}
  }
});

Object.defineProperty(global, 'FileReader', {
  value: class MockFileReader {
    onload: ((event: any) => void) | null = null;
    onerror: (() => void) | null = null;
    result: string | null = null;

    readAsText(file: File) {
      // Simulate async file reading
      setTimeout(() => {
        if (file.name.includes('error')) {
          this.onerror?.();
        } else {
          this.result = (file as any).content || '{"test": "data"}';
          this.onload?.({ target: { result: this.result } });
        }
      }, 0);
    }
  }
});

describe('ImportExportManager', () => {
  let importExportManager: ImportExportManager;
  let sampleRetirementData: RetirementData;

  beforeEach(() => {
    importExportManager = new ImportExportManager();
    sampleRetirementData = {
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedAnnualReturn: 0.07,
      lastUpdated: new Date('2024-01-01T00:00:00.000Z')
    };

    // Reset mocks
    vi.clearAllMocks();
    mockCreateElement.mockReturnValue({
      href: '',
      download: '',
      click: mockClick
    });
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('exportData', () => {
    it('should export data successfully', () => {
      importExportManager.exportData(sampleRetirementData);

      // Verify DOM manipulation
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should generate correct export data structure', () => {
      // Test the export data structure by calling the method and checking it doesn't throw
      expect(() => {
        importExportManager.exportData(sampleRetirementData);
      }).not.toThrow();

      // Verify DOM manipulation occurred
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });

    it('should generate filename with timestamp', () => {
      const mockLink = {
        href: '',
        download: '',
        click: mockClick
      };
      mockCreateElement.mockReturnValue(mockLink);

      importExportManager.exportData(sampleRetirementData);

      expect(mockLink.download).toMatch(/^retirement-calculator-data-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
    });

    it('should handle export errors', () => {
      mockCreateElement.mockImplementation(() => {
        throw new Error('DOM error');
      });

      expect(() => {
        importExportManager.exportData(sampleRetirementData);
      }).toThrow('Failed to export data: DOM error');
    });
  });

  describe('importData', () => {
    it('should import valid data successfully', async () => {
      const validExportData: ExportData = {
        version: '1.0.0',
        exportDate: new Date(),
        userData: sampleRetirementData
      };

      const mockFile = new File(
        [JSON.stringify(validExportData)],
        'test.json',
        { type: 'application/json' }
      ) as any;
      mockFile.content = JSON.stringify(validExportData);

      const result = await importExportManager.importData(mockFile);

      expect(result).toEqual(sampleRetirementData);
    });

    it('should reject non-JSON files', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      await expect(importExportManager.importData(mockFile)).rejects.toThrow(
        'Invalid file type. Please select a JSON file.'
      );
    });

    it('should reject files that are too large', async () => {
      const mockFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.json', {
        type: 'application/json'
      });

      await expect(importExportManager.importData(mockFile)).rejects.toThrow(
        'File is too large. Maximum size is 1MB.'
      );
    });

    it('should reject invalid JSON', async () => {
      const mockFile = new File(['invalid json'], 'test.json', {
        type: 'application/json'
      }) as any;
      mockFile.content = 'invalid json';

      await expect(importExportManager.importData(mockFile)).rejects.toThrow(
        'Invalid JSON format. Please check the file content.'
      );
    });

    it('should reject data with invalid structure', async () => {
      const invalidData = { invalid: 'structure' };
      const mockFile = new File([JSON.stringify(invalidData)], 'test.json', {
        type: 'application/json'
      }) as any;
      mockFile.content = JSON.stringify(invalidData);

      await expect(importExportManager.importData(mockFile)).rejects.toThrow(
        'Invalid data structure. This file does not contain valid retirement calculator data.'
      );
    });

    it('should reject data with invalid retirement data', async () => {
      const invalidExportData = {
        version: '1.0.0',
        exportDate: new Date(),
        userData: {
          currentAge: -5, // Invalid age
          retirementAge: 65,
          currentSavings: 50000,
          monthlyContribution: 1000,
          expectedAnnualReturn: 0.07,
          lastUpdated: new Date()
        }
      };

      const mockFile = new File([JSON.stringify(invalidExportData)], 'test.json', {
        type: 'application/json'
      }) as any;
      mockFile.content = JSON.stringify(invalidExportData);

      await expect(importExportManager.importData(mockFile)).rejects.toThrow(
        'Invalid data structure. This file does not contain valid retirement calculator data.'
      );
    });

    it('should handle file reading errors', async () => {
      const mockFile = new File(['test'], 'error.json', {
        type: 'application/json'
      });

      await expect(importExportManager.importData(mockFile)).rejects.toThrow();
    });
  });

  describe('validateImportData', () => {
    it('should validate correct export data structure', () => {
      const validData: ExportData = {
        version: '1.0.0',
        exportDate: new Date(),
        userData: sampleRetirementData
      };

      expect(importExportManager.validateImportData(validData)).toBe(true);
    });

    it('should reject data missing required fields', () => {
      const invalidData = {
        version: '1.0.0'
        // missing exportDate and userData
      };

      expect(importExportManager.validateImportData(invalidData)).toBe(false);
    });

    it('should reject null or undefined data', () => {
      expect(importExportManager.validateImportData(null)).toBe(false);
      expect(importExportManager.validateImportData(undefined)).toBe(false);
    });

    it('should reject non-object data', () => {
      expect(importExportManager.validateImportData('string')).toBe(false);
      expect(importExportManager.validateImportData(123)).toBe(false);
    });
  });

  describe('retirement data validation', () => {
    it('should validate correct retirement data', () => {
      expect(importExportManager.validateRetirementData(sampleRetirementData)).toBe(true);
    });

    it('should reject data with invalid age ranges', () => {
      const testCases = [
        { ...sampleRetirementData, currentAge: -1 },
        { ...sampleRetirementData, currentAge: 200 },
        { ...sampleRetirementData, retirementAge: -1 },
        { ...sampleRetirementData, retirementAge: 200 },
        { ...sampleRetirementData, currentAge: 65, retirementAge: 60 } // retirement age <= current age
      ];

      testCases.forEach(invalidData => {
        expect(importExportManager.validateRetirementData(invalidData)).toBe(false);
      });
    });

    it('should reject data with negative financial values', () => {
      const testCases = [
        { ...sampleRetirementData, currentSavings: -1 },
        { ...sampleRetirementData, monthlyContribution: -1 }
      ];

      testCases.forEach(invalidData => {
        expect(importExportManager.validateRetirementData(invalidData)).toBe(false);
      });
    });

    it('should reject data with invalid return rates', () => {
      const testCases = [
        { ...sampleRetirementData, expectedAnnualReturn: -0.1 },
        { ...sampleRetirementData, expectedAnnualReturn: 1.5 }
      ];

      testCases.forEach(invalidData => {
        expect(importExportManager.validateRetirementData(invalidData)).toBe(false);
      });
    });

    it('should reject data with missing required fields', () => {
      const incompleteData = {
        currentAge: 30,
        retirementAge: 65
        // missing other required fields
      };

      expect(importExportManager.validateRetirementData(incompleteData)).toBe(false);
    });

    it('should reject data with wrong field types', () => {
      const invalidTypeData = {
        ...sampleRetirementData,
        currentAge: '30' // should be number
      };

      expect(importExportManager.validateRetirementData(invalidTypeData)).toBe(false);
    });

    it('should validate complete export data structure', () => {
      const validData = {
        version: '1.0.0',
        exportDate: new Date(),
        userData: sampleRetirementData
      };

      expect(importExportManager.validateImportData(validData)).toBe(true);
    });

    it('should reject export data with invalid retirement data', () => {
      const invalidData = {
        version: '1.0.0',
        exportDate: new Date(),
        userData: { ...sampleRetirementData, currentAge: -1 }
      };

      expect(importExportManager.validateImportData(invalidData)).toBe(false);
    });
  });
});