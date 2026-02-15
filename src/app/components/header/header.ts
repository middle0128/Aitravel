import { Component, inject, computed } from '@angular/core'; // 引入 computed
import { CommonModule,NgOptimizedImage } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { MatIconModule } from '@angular/material/icon'; // 如果有用 Icon
import { AlertService } from '../../services/alert'; // 引入 AlertService

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule,NgOptimizedImage],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent {
  constructor(
    private alertService: AlertService // 👈 注入 AlertService
  ) {}

  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  // 1. 取得當前使用者 (Signal)
  currentUser = this.supabaseService.currentUser;

  // 2. 計算顯示名稱 (如果有設定 metadata 就顯示名字，否則顯示 Email 前綴)
  displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    // 如果 user_metadata 裡有 name 就用，沒有就切 email
    return user.user_metadata?.['name'] || user.email?.split('@')[0] || '使用者';
  });

  // 3. 登出
  async onLogout() {
    await this.supabaseService.signOut();
    this.alertService.success('已成功登出');
    this.router.navigate(['/login']);
  }
}