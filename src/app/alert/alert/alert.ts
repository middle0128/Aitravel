import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // 如果是 Standalone Component 要加這個
import { Alert, AlertService } from '../../services/alert';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-alert',
  standalone: true, // 如果你的專案是 Standalone 架構
  imports: [CommonModule], 
  templateUrl: './alert.html', // 👈 連結 HTML
  styleUrls: ['./alert.scss']   // 👈 連結 CSS
})
export class AlertComponent implements OnInit, OnDestroy {
  alert: Alert | null = null;
  private subscription: Subscription | undefined;
  private timeoutId: any;

  constructor(private alertService: AlertService) {}

  ngOnInit() {
    this.subscription = this.alertService.alert$.subscribe(alert => {
      this.alert = alert;
      
      // 每次有新訊息先清除舊的計時器
      if (this.timeoutId) clearTimeout(this.timeoutId);

      // 如果有訊息，3秒後自動消失
      if (alert) {
        this.timeoutId = setTimeout(() => this.close(), 2500);
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  close() {
    this.alertService.clear();
  }
}