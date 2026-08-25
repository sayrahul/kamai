/**
 * Live Payment Bridge & Event Bus for Real-Time POS Payment Matching
 * Connects Native Android Notification Listeners, Bank SMS Streams, and Web POS.
 */

import { ParsedPaymentEvent, parsePaymentNotification } from './notificationParser';

type PaymentListener = (event: ParsedPaymentEvent) => void;

class PaymentBridgeService {
  private listeners: Set<PaymentListener> = new Set();
  private paymentHistory: ParsedPaymentEvent[] = [];
  private processedUtrs: Set<string> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // 1. Cross-Tab / Cross-Window BroadcastChannel
    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('kamai_payment_stream');
        this.broadcastChannel.onmessage = (ev) => {
          if (ev.data && ev.data.type === 'PAYMENT_RECEIVED') {
            this.handleIncomingParsedPayment(ev.data.payload, false);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment');
    }

    // 2. Window CustomEvent Listener (For Android Injected WebViews / Extensions)
    window.addEventListener('kamai_payment_received', ((e: CustomEvent) => {
      if (e.detail) {
        this.handleRawNotification(e.detail.text, e.detail.title);
      }
    }) as EventListener);

    // 3. Expose Global Android Native Bridge Interface
    (window as any).KamaiAndroidBridge = {
      onNotificationReceived: (rawText: string, title?: string) => {
        return this.handleRawNotification(rawText, title);
      },
      onPaymentReceived: (jsonPayload: string | object) => {
        try {
          const parsed = typeof jsonPayload === 'string' ? JSON.parse(jsonPayload) : jsonPayload;
          return this.handleIncomingParsedPayment(parsed, true);
        } catch (err) {
          console.error('Failed to parse Android bridge JSON payload', err);
          return false;
        }
      },
      getBridgeStatus: () => ({
        active: true,
        version: '1.0.0',
        listenersCount: this.listeners.size,
        historyCount: this.paymentHistory.length,
      }),
    };

    this.isInitialized = true;
  }

  /**
   * Ingest raw notification string from Android NotificationListenerService or SMS broadcast
   */
  public handleRawNotification(rawText: string, title?: string): ParsedPaymentEvent | null {
    const parsed = parsePaymentNotification(rawText, title);
    if (!parsed) return null;

    this.handleIncomingParsedPayment(parsed, true);
    return parsed;
  }

  /**
   * Internal processor for incoming parsed payment events
   */
  public handleIncomingParsedPayment(payment: ParsedPaymentEvent, broadcast = true): boolean {
    // Deduplication check using UTR or ID
    if (payment.referenceNumber && this.processedUtrs.has(payment.referenceNumber)) {
      console.log('Skipping duplicate payment UTR:', payment.referenceNumber);
      return false;
    }

    if (payment.referenceNumber) {
      this.processedUtrs.add(payment.referenceNumber);
    }

    // Add to rolling history (max 50 items)
    this.paymentHistory.unshift(payment);
    if (this.paymentHistory.length > 50) {
      this.paymentHistory.pop();
    }

    // Broadcast to other tabs/windows
    if (broadcast && this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'PAYMENT_RECEIVED',
        payload: payment,
      });
    }

    // Notify active subscribers in the current tab
    this.listeners.forEach((listener) => {
      try {
        listener(payment);
      } catch (err) {
        console.error('Error in payment subscriber listener', err);
      }
    });

    return true;
  }

  /**
   * Subscribe active POS component to real-time incoming payments
   */
  public subscribe(listener: PaymentListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Search recent payment buffer for matching amount within time window
   */
  public matchActiveBill(billAmountPaise: number, toleranceMs = 180000): ParsedPaymentEvent | null {
    const now = Date.now();
    const match = this.paymentHistory.find((p) => {
      const isWithinTime = now - p.timestamp <= toleranceMs;
      const isAmountMatch = p.amountPaise === billAmountPaise;
      return isWithinTime && isAmountMatch;
    });

    return match || null;
  }

  /**
   * Simulate payment for merchant testing & demonstrations
   */
  public simulatePayment(
    amountRupees: number,
    payerName = 'Rahul Sharma',
    sourceApp: ParsedPaymentEvent['sourceApp'] = 'PhonePe'
  ): ParsedPaymentEvent {
    const amountPaise = Math.round(amountRupees * 100);
    const mockUtr = `423${Math.floor(100000000 + Math.random() * 900000000)}`;

    const event: ParsedPaymentEvent = {
      id: `sim_${Date.now()}`,
      amountPaise,
      amountRupees,
      payerName,
      referenceNumber: mockUtr,
      sourceApp,
      timestamp: Date.now(),
      rawText: `Received ₹${amountRupees.toFixed(2)} from ${payerName} via ${sourceApp} (Ref: ${mockUtr})`,
      isCredit: true,
    };

    this.handleIncomingParsedPayment(event, true);
    return event;
  }

  public getHistory(): ParsedPaymentEvent[] {
    return [...this.paymentHistory];
  }

  public clearHistory(): void {
    this.paymentHistory = [];
    this.processedUtrs.clear();
  }
}

export const paymentBridge = new PaymentBridgeService();
