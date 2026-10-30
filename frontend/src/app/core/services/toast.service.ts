import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; run: () => void };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(message: string, action?: Toast['action']): void {
    this.push('success', message, action);
  }

  error(message: string): void {
    this.push('error', message, undefined, 8000);
  }

  info(message: string, action?: Toast['action']): void {
    this.push('info', message, action);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, message: string, action?: Toast['action'], ttl = action ? 7000 : 4000): void {
    const toast: Toast = { id: this.nextId++, kind, message, action };
    this.toasts.update((list) => [...list.slice(-3), toast]);
    setTimeout(() => this.dismiss(toast.id), ttl);
  }
}
