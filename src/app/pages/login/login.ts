import { Component, inject } from '@angular/core';
import { CommonModule,NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { AlertService } from '../../services/alert'; // 引入 AlertService

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule,NgOptimizedImage],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {

  constructor(
    private alertService: AlertService // 👈 注入 AlertService
  ) {}

  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  showPassword = false;
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onLogin() {

    this.isLoading = true;
    if (!this.email || !this.password) {
      this.errorMessage = '請輸入帳號與密碼';
      this.alertService.error('請輸入帳號與密碼'); // 顯示錯誤訊息
      this.isLoading = false;
      return;
    }

    
    this.errorMessage = '';

    try {
      await this.supabaseService.signIn(this.email, this.password);
      // 登入成功，導向訂單列表
      this.alertService.success('登入成功！');
      this.router.navigate(['/orders']);
    } catch (error: any) {
      console.error('登入失敗', error);
      this.errorMessage = '登入失敗：帳號或密碼錯誤';
      this.alertService.error('登入失敗：帳號或密碼錯誤'); // 顯示錯誤訊息
    } finally {
      this.isLoading = false;
      if (!this.errorMessage) {
      this.email = '';
      this.password = '';
      }
    }
  }
}