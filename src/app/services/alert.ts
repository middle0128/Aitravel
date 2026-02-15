import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Alert {
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  // 用來廣播通知的 Subject
  private alertSubject = new Subject<Alert | null>();
  alert$ = this.alertSubject.asObservable();

  constructor() { }

  // ✅ 成功 (綠色)
  success(message: string) {
    this.alertSubject.next({ type: 'success', message });
  }

  // ❌ 錯誤 (紅色)
  error(message: string) {
    this.alertSubject.next({ type: 'error', message });
  }

  // ℹ️ 資訊 (藍色)
  info(message: string) {
    this.alertSubject.next({ type: 'info', message });
  }

  // 清除通知
  clear() {
    this.alertSubject.next(null);
  }
}