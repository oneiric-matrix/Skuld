import { Linking } from 'react-native';

export interface WidgetLaunchParams {
  action: 'quick_talk' | 'view_dashboard' | 'scan_receipt';
  agentId?: string;
  source: 'android_widget' | 'ios_widget' | 'external_deeplink';
}

export class WidgetDeeplinkBridge {
  private static instance: WidgetDeeplinkBridge | null = null;
  private pendingAction: WidgetLaunchParams | null = null;
  private listeners: ((params: WidgetLaunchParams) => void)[] = [];

  static getInstance(): WidgetDeeplinkBridge {
    if (!this.instance) {
      this.instance = new WidgetDeeplinkBridge();
    }
    return this.instance;
  }

  /**
   * Parses incoming URL from widget launch into actionable params
   * e.g., skuld://quick-talk?agent=butler&source=android_widget
   */
  parseWidgetUrl(url: string | null): WidgetLaunchParams | null {
    if (!url) return null;
    try {
      // Custom lightweight URL parser compatible with React Native environment
      const match = url.match(/^([a-zA-Z0-9_\-]+):\/\/([^?#]+)(?:\?([^#]*))?/);
      if (!match) return null;

      const [, scheme, route, queryStr] = match;
      if (scheme !== 'skuld') return null;

      const queryParams: Record<string, string> = {};
      if (queryStr) {
        queryStr.split('&').forEach((part) => {
          const [k, v] = part.split('=');
          if (k) queryParams[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
      }

      let action: WidgetLaunchParams['action'] = 'quick_talk';
      if (route.includes('quick-talk') || route.includes('talk')) {
        action = 'quick_talk';
      } else if (route.includes('scan')) {
        action = 'scan_receipt';
      } else if (route.includes('dashboard')) {
        action = 'view_dashboard';
      }

      const agentId = queryParams.agent ? queryParams.agent : undefined;
      const source = (queryParams.source as any) || 'android_widget';

      return {
        action,
        agentId,
        source,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Initializes deep link listening from OS widget launches
   */
  async initDeeplinkListener(onTrigger: (params: WidgetLaunchParams) => void): Promise<void> {
    this.listeners.push(onTrigger);

    try {
      const initialUrl = await Linking.getInitialURL();
      const initialParams = this.parseWidgetUrl(initialUrl || null);
      if (initialParams) {
        this.pendingAction = initialParams;
        onTrigger(initialParams);
      }
    } catch (e) {
      // Ignore in tests
    }

    Linking.addEventListener('url', (event: { url: string }) => {
      const params = this.parseWidgetUrl(event.url);
      if (params) {
        this.pendingAction = params;
        this.listeners.forEach((l) => l(params));
      }
    });
  }

  getPendingAction(): WidgetLaunchParams | null {
    return this.pendingAction;
  }

  clearPendingAction(): void {
    this.pendingAction = null;
  }

  buildWidgetUrl(action: WidgetLaunchParams['action'], agentId?: string): string {
    const query = [
      agentId ? `agent=${encodeURIComponent(agentId)}` : '',
      'source=android_widget',
    ]
      .filter(Boolean)
      .join('&');

    return `skuld://${action}?${query}`;
  }
}

export const widgetDeeplinkBridge = WidgetDeeplinkBridge.getInstance();
