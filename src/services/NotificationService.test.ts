import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from './NotificationService';

// Mock DOM elements
const mockContainer = document.createElement('div');
mockContainer.id = 'notification-container';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    // Clear the document body
    document.body.innerHTML = '';
    
    // Clear the mock container
    mockContainer.innerHTML = '';
    
    // Add the notification container
    document.body.appendChild(mockContainer);
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    notificationService = new NotificationService();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('showSuccess', () => {
    it('should create and display a success notification', () => {
      notificationService.showSuccess('Test success message');
      
      const notifications = mockContainer.querySelectorAll('.notification.success');
      expect(notifications).toHaveLength(1);
      
      const notification = notifications[0];
      expect(notification.textContent).toContain('Test success message');
      expect(notification.querySelector('.notification-icon')?.textContent).toBe('✅');
    });

    it('should auto-hide success notification after specified duration', (done) => {
      notificationService.showSuccess('Test message', 100);
      
      expect(mockContainer.querySelectorAll('.notification')).toHaveLength(1);
      
      setTimeout(() => {
        expect(mockContainer.querySelectorAll('.notification')).toHaveLength(0);
        done();
      }, 500);
    });
  });

  describe('showError', () => {
    it('should create and display an error notification', () => {
      notificationService.showError('Test error message');
      
      const notifications = mockContainer.querySelectorAll('.notification.error');
      expect(notifications).toHaveLength(1);
      
      const notification = notifications[0];
      expect(notification.textContent).toContain('Test error message');
      expect(notification.querySelector('.notification-icon')?.textContent).toBe('❌');
    });
  });

  describe('showWarning', () => {
    it('should create and display a warning notification', () => {
      notificationService.showWarning('Test warning message');
      
      const notifications = mockContainer.querySelectorAll('.notification.warning');
      expect(notifications).toHaveLength(1);
      
      const notification = notifications[0];
      expect(notification.textContent).toContain('Test warning message');
      expect(notification.querySelector('.notification-icon')?.textContent).toBe('⚠️');
    });
  });

  describe('showInfo', () => {
    it('should create and display an info notification', () => {
      notificationService.showInfo('Test info message');
      
      const notifications = mockContainer.querySelectorAll('.notification.info');
      expect(notifications).toHaveLength(1);
      
      const notification = notifications[0];
      expect(notification.textContent).toContain('Test info message');
      expect(notification.querySelector('.notification-icon')?.textContent).toBe('ℹ️');
    });
  });

  describe('showStorageWarning', () => {
    it('should create and display a storage warning banner', () => {
      notificationService.showStorageWarning();
      
      const banner = document.querySelector('.storage-warning');
      expect(banner).toBeTruthy();
      expect(banner?.textContent).toContain('Local storage is not available');
    });

    it('should only show storage warning once', () => {
      notificationService.showStorageWarning();
      notificationService.showStorageWarning();
      
      const banners = document.querySelectorAll('.storage-warning');
      expect(banners).toHaveLength(1);
    });

    it('should allow closing the storage warning', () => {
      notificationService.showStorageWarning();
      
      const banner = document.querySelector('.storage-warning');
      const closeBtn = banner?.querySelector('.storage-warning-close') as HTMLButtonElement;
      
      expect(closeBtn).toBeTruthy();
      closeBtn?.click();
      
      // Banner should be hidden (class removed)
      expect(banner?.classList.contains('show')).toBe(false);
    });
  });

  describe('notification close functionality', () => {
    it('should allow closing notifications manually', () => {
      notificationService.showSuccess('Test message');
      
      const notification = mockContainer.querySelector('.notification');
      const closeBtn = notification?.querySelector('.notification-close') as HTMLButtonElement;
      
      expect(closeBtn).toBeTruthy();
      closeBtn?.click();
      
      // Notification should start hiding
      expect(notification?.classList.contains('hide')).toBe(true);
    });
  });

  describe('notification limit', () => {
    it('should limit the number of notifications displayed', () => {
      // Show more than 5 notifications
      for (let i = 0; i < 7; i++) {
        notificationService.showSuccess(`Message ${i}`, 0); // No auto-hide
      }
      
      // Should only have 5 notifications
      setTimeout(() => {
        const notifications = mockContainer.querySelectorAll('.notification');
        expect(notifications.length).toBeLessThanOrEqual(5);
      }, 100);
    });
  });

  describe('clearAll', () => {
    it('should clear all notifications', () => {
      notificationService.showSuccess('Message 1');
      notificationService.showError('Message 2');
      notificationService.showWarning('Message 3');
      
      expect(mockContainer.querySelectorAll('.notification')).toHaveLength(3);
      
      notificationService.clearAll();
      
      setTimeout(() => {
        expect(mockContainer.querySelectorAll('.notification')).toHaveLength(0);
      }, 100);
    });
  });

  describe('showBrowserCompatibilityWarnings', () => {
    it('should show warnings for missing browser features', () => {
      // Mock missing File API
      const originalFile = window.File;
      // @ts-ignore
      delete window.File;
      
      notificationService.showBrowserCompatibilityWarnings();
      
      const warnings = mockContainer.querySelectorAll('.notification.warning');
      expect(warnings.length).toBeGreaterThan(0);
      
      // Restore File API
      window.File = originalFile;
    });

    it('should show warning for missing localStorage', () => {
      // Mock missing localStorage
      const originalLocalStorage = window.localStorage;
      // @ts-ignore
      delete window.localStorage;
      
      notificationService.showBrowserCompatibilityWarnings();
      
      const warnings = mockContainer.querySelectorAll('.notification.warning');
      expect(warnings.length).toBeGreaterThan(0);
      
      // Restore localStorage
      window.localStorage = originalLocalStorage;
    });
  });

  describe('showOperationFeedback', () => {
    it('should show success feedback for successful operations', () => {
      notificationService.showOperationFeedback('save', true);
      
      const notifications = mockContainer.querySelectorAll('.notification.success');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].textContent).toContain('Data saved successfully');
    });

    it('should show error feedback for failed operations', () => {
      notificationService.showOperationFeedback('save', false, 'Storage unavailable');
      
      const notifications = mockContainer.querySelectorAll('.notification.error');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].textContent).toContain('Failed to save data: Storage unavailable');
    });

    it('should handle all operation types', () => {
      const operations: Array<'save' | 'load' | 'export' | 'import' | 'clear' | 'calculate'> = 
        ['save', 'load', 'export', 'import', 'clear', 'calculate'];
      
      operations.forEach(operation => {
        notificationService.showOperationFeedback(operation, true);
      });
      
      const notifications = mockContainer.querySelectorAll('.notification.success');
      expect(notifications).toHaveLength(operations.length);
    });
  });

  describe('HTML escaping', () => {
    it('should escape HTML in notification messages', () => {
      const maliciousMessage = '<script>alert("xss")</script>Test message';
      notificationService.showSuccess(maliciousMessage);
      
      const notification = mockContainer.querySelector('.notification');
      const content = notification?.querySelector('.notification-content');
      
      // Should not contain actual script tag
      expect(content?.innerHTML).not.toContain('<script>');
      // Should contain escaped HTML
      expect(content?.textContent).toContain('<script>alert("xss")</script>Test message');
    });
  });

  describe('error handling', () => {
    it('should handle missing notification container gracefully', () => {
      // Remove the container
      document.body.removeChild(mockContainer);
      
      // Should not throw error
      expect(() => {
        const service = new NotificationService();
        service.showSuccess('Test message');
      }).not.toThrow();
    });
  });
});