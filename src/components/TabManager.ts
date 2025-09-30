/**
 * TabManager handles the tabbed interface navigation and content switching
 */
export class TabManager {
  private activeTab: string = 'income';

  constructor() {
    this.initializeEventHandlers();
    this.setActiveTab('income'); // Start with income tab active
  }

  /**
   * Initialize event handlers for tab navigation
   */
  private initializeEventHandlers(): void {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const target = event.target as HTMLButtonElement;
        const tabName = target.getAttribute('data-tab');
        if (tabName) {
          this.setActiveTab(tabName);
        }
      });
    });

    // Handle keyboard navigation
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            this.setActiveTab('income');
            break;
          case '2':
            event.preventDefault();
            this.setActiveTab('basic');
            break;
          case '3':
            event.preventDefault();
            this.setActiveTab('results');
            break;
        }
      }
    });
  }

  /**
   * Set the active tab
   */
  public setActiveTab(tabName: string): void {
    // Update button states
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      const buttonTabName = button.getAttribute('data-tab');
      if (buttonTabName === tabName) {
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
      } else {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
      }
    });

    // Update panel visibility
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabPanels.forEach(panel => {
      const panelId = panel.id;
      if (panelId === `${tabName}-tab`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    this.activeTab = tabName;

    // Trigger custom event for other components to react to tab changes
    const tabChangeEvent = new CustomEvent('tabChange', {
      detail: { activeTab: tabName }
    });
    document.dispatchEvent(tabChangeEvent);
  }

  /**
   * Get the currently active tab
   */
  public getActiveTab(): string {
    return this.activeTab;
  }

  /**
   * Switch to the next tab
   */
  public nextTab(): void {
    const tabs = ['income', 'basic', 'results'];
    const currentIndex = tabs.indexOf(this.activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    this.setActiveTab(tabs[nextIndex]);
  }

  /**
   * Switch to the previous tab
   */
  public previousTab(): void {
    const tabs = ['income', 'basic', 'results'];
    const currentIndex = tabs.indexOf(this.activeTab);
    const previousIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    this.setActiveTab(tabs[previousIndex]);
  }

  /**
   * Enable or disable a tab
   */
  public setTabEnabled(tabName: string, enabled: boolean): void {
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`) as HTMLButtonElement;
    if (tabButton) {
      tabButton.disabled = !enabled;
      if (!enabled) {
        tabButton.classList.add('disabled');
      } else {
        tabButton.classList.remove('disabled');
      }
    }
  }

  /**
   * Add a badge or indicator to a tab
   */
  public setTabBadge(tabName: string, badge: string | null): void {
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`) as HTMLButtonElement;
    if (tabButton) {
      // Remove existing badge
      const existingBadge = tabButton.querySelector('.tab-badge');
      if (existingBadge) {
        existingBadge.remove();
      }

      // Add new badge if provided
      if (badge) {
        const badgeElement = document.createElement('span');
        badgeElement.className = 'tab-badge';
        badgeElement.textContent = badge;
        tabButton.appendChild(badgeElement);
      }
    }
  }
}