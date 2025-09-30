/**
 * NotificationService handles user notifications and alerts
 * Provides methods for showing success, error, warning, and info messages
 */
export class NotificationService {
  private container: HTMLElement;
  private storageWarningShown: boolean = false;
  private notifications: Map<string, HTMLElement> = new Map();

  constructor() {
    this.container = document.getElementById('notification-container') as HTMLElement;
    if (!this.container) {
      console.error('Notification container not found');
    }
    
    // Check localStorage availability on initialization
    this.checkStorageAvailability();
  }

  /**
   * Show a success notification
   */
  showSuccess(message: string, duration: number = 5000): void {
    this.showNotification(message, 'success', '✅', duration);
  }

  /**
   * Show an error notification
   */
  showError(message: string, duration: number = 8000): void {
    this.showNotification(message, 'error', '❌', duration);
  }

  /**
   * Show a warning notification
   */
  showWarning(message: string, duration: number = 6000): void {
    this.showNotification(message, 'warning', '⚠️', duration);
  }

  /**
   * Show an info notification
   */
  showInfo(message: string, duration: number = 5000): void {
    this.showNotification(message, 'info', 'ℹ️', duration);
  }

  /**
   * Show a persistent storage warning banner
   */
  showStorageWarning(): void {
    if (this.storageWarningShown) return;
    
    this.storageWarningShown = true;
    
    const banner = document.createElement('div');
    banner.className = 'storage-warning';
    banner.innerHTML = `
      <span class="storage-warning-icon">⚠️</span>
      <span>Local storage is not available. Your data will not be saved between sessions.</span>
      <button class="storage-warning-close" aria-label="Close warning">×</button>
    `;
    
    document.body.appendChild(banner);
    
    // Show banner with animation
    setTimeout(() => banner.classList.add('show'), 100);
    
    // Handle close button
    const closeBtn = banner.querySelector('.storage-warning-close') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => {
      banner.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(banner);
      }, 300);
    });
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (banner.parentNode) {
        banner.classList.remove('show');
        setTimeout(() => {
          if (banner.parentNode) {
            document.body.removeChild(banner);
          }
        }, 300);
      }
    }, 10000);
  }

  /**
   * Show a notification with custom type and icon
   */
  private showNotification(
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info', 
    icon: string, 
    duration: number
  ): void {
    if (!this.container) return;

    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.innerHTML = `
      <span class="notification-icon">${icon}</span>
      <div class="notification-content">${this.escapeHtml(message)}</div>
      <button class="notification-close" aria-label="Close notification">×</button>
    `;
    
    this.container.appendChild(notification);
    this.notifications.set(id, notification);
    
    // Show notification with animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Handle close button
    const closeBtn = notification.querySelector('.notification-close') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => {
      this.hideNotification(id);
    });
    
    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        this.hideNotification(id);
      }, duration);
    }
    
    // Limit number of notifications (keep only last 5)
    this.limitNotifications();
  }

  /**
   * Hide a specific notification
   */
  private hideNotification(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) return;
    
    notification.classList.remove('show');
    notification.classList.add('hide');
    
    setTimeout(() => {
      if (notification.parentNode) {
        this.container.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * Limit the number of visible notifications
   */
  private limitNotifications(): void {
    const maxNotifications = 5;
    const notificationElements = Array.from(this.notifications.entries());
    
    if (notificationElements.length > maxNotifications) {
      // Remove oldest notifications
      const toRemove = notificationElements.slice(0, notificationElements.length - maxNotifications);
      toRemove.forEach(([id]) => {
        this.hideNotification(id);
      });
    }
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    Array.from(this.notifications.keys()).forEach(id => {
      this.hideNotification(id);
    });
  }

  /**
   * Check localStorage availability and show warning if needed
   */
  private checkStorageAvailability(): void {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (error) {
      this.showStorageWarning();
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show browser compatibility warnings if needed
   */
  showBrowserCompatibilityWarnings(): void {
    const warnings: string[] = [];
    
    // Check for File API support
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
      warnings.push('File operations may not work properly in this browser');
    }
    
    // Check for localStorage support
    if (!window.localStorage) {
      warnings.push('Local storage is not supported in this browser');
    }
    
    // Check for modern JavaScript features
    if (!window.fetch) {
      warnings.push('Some features may not work in older browsers');
    }
    
    // Check for Intl.NumberFormat support
    if (!window.Intl || !window.Intl.NumberFormat) {
      warnings.push('Number formatting may not display correctly');
    }
    
    // Show warnings
    warnings.forEach(warning => {
      this.showWarning(warning, 10000);
    });
  }

  /**
   * Show operation feedback with appropriate message
   */
  showOperationFeedback(
    operation: 'save' | 'load' | 'export' | 'import' | 'clear' | 'calculate',
    success: boolean,
    details?: string
  ): void {
    const messages = {
      save: {
        success: 'Data saved successfully',
        error: 'Failed to save data'
      },
      load: {
        success: 'Data loaded successfully',
        error: 'Failed to load data'
      },
      export: {
        success: 'Data exported successfully',
        error: 'Failed to export data'
      },
      import: {
        success: 'Data imported successfully',
        error: 'Failed to import data'
      },
      clear: {
        success: 'All data cleared successfully',
        error: 'Failed to clear data'
      },
      calculate: {
        success: 'Calculation completed successfully',
        error: 'Calculation failed'
      }
    };
    
    const baseMessage = messages[operation][success ? 'success' : 'error'];
    const fullMessage = details ? `${baseMessage}: ${details}` : baseMessage;
    
    if (success) {
      this.showSuccess(fullMessage);
    } else {
      this.showError(fullMessage);
    }
  }
}