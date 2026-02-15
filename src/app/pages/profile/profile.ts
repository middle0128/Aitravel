import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase';
import { AlertService } from '../../services/alert';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  constructor(
    private alertService: AlertService // 👈 注入 AlertService
  ) {}

  private supabaseService = inject(SupabaseService);

  // 表單資料
  displayName = '';
  newPassword = '';
  confirmPassword = '';
  
  isLoading = false;
  message = '';      //用來顯示成功訊息
  errorMessage = ''; //用來顯示錯誤訊息

  // 初始化：把現在的名字填進去
  ngOnInit() {
    const user = this.supabaseService.currentUser();
    if (user && user.user_metadata) {
      this.displayName = user.user_metadata['name'] || '';
    }
  }

  async onSave() {
    this.message = '';
    this.errorMessage = '';

    // 1. 檢查密碼是否一致 (如果有輸入密碼的話)
    if (this.newPassword || this.confirmPassword) {
      if (this.newPassword !== this.confirmPassword) {
        this.errorMessage = '新密碼與確認密碼不符！';
        this.alertService.error('新密碼與確認密碼不符！'); // 顯示錯誤訊息
        return;
      }
      if (this.newPassword.length < 6) {
        this.errorMessage = '密碼長度至少需要 6 個字元';
        this.alertService.error('密碼長度至少需要 6 個字元'); // 顯示錯誤訊息
        return;
      }
    }

    this.isLoading = true;

    try {
      // 2. 準備要更新的資料物件
      const updates: any = {};
      const user = this.supabaseService.currentUser();
    // 2. 判斷名字是否有變更 (且 user 存在)
    // 只有當「輸入的名字」跟「原本 metadata 裡的名字」不一樣時，才加入更新清單
    if (user && this.displayName !== (user.user_metadata['name'] || '')) {
      updates.data = { name: this.displayName };
    }

    // 3. 判斷是否有輸入新密碼
    if (this.newPassword) {
      updates.password = this.newPassword;
    }

    // 4. 關鍵防呆：如果 updates 還是空的 (名字沒改、密碼也沒填)
    // 就直接結束，不要呼叫 API 浪費資源
    if (Object.keys(updates).length === 0) {
      this.alertService.info('資料未變更');
      this.message = '資料未變更';
      this.isLoading = false;
      return; 
    }
      // 5. 呼叫 Service (這行就是寄信的動作！)
await this.supabaseService.updateUser(updates);

      this.message = '';
      this.alertService.success('個人資料更新成功！');

      // 清空密碼欄位，避免誤觸
      this.newPassword = '';
      this.confirmPassword = '';

    } catch (error: any) {
      console.error(error);
        this.alertService.error('更新失敗：' + (error.message || '未知錯誤'));
      this.errorMessage = '更新失敗：' + (error.message || '未知錯誤');
    } finally {
      this.isLoading = false;
    }
  }
}