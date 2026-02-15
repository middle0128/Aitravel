import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService, Order } from '../../services/supabase';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-form.html',
  styleUrl: './order-form.scss'
})
export class OrderFormComponent {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  // 模擬當前登入的使用者 (未來這裡會從 AuthService 拿)
  currentUser = {
    name: '何中天', // 假設這是登入者
    role: 'OP'
  }
  model: Partial<Order> = {
    id: '',            // 🆕 團體編號 (手動輸入)
    client_name: '',
    main_contact: '',  // 之後自動帶入
    start_date: '',
    end_date: ''
  };

  isSubmitting = false;
  isCheckingId = false; // 檢查 ID 中的 loading 狀態
  errorMessage = '';
  idError = ''; // 專門顯示 ID 重複的錯誤

  ngOnInit() {
    // 進入頁面時，自動帶入登入者姓名
    this.model.main_contact = this.currentUser.name;
  }
  // 🆕 當 ID 輸入框失去焦點 (Blur) 時，檢查重複
  async checkId() {
    if (!this.model.id) {
      
      return;
    }

    this.isCheckingId = true;
    this.idError = '';

    try {
      const exists = await this.supabaseService.checkOrderIdExists(this.model.id);
      if (exists) {
        this.idError = '❌ 此團體編號已存在，請更換';
      }
    } catch (err) {
      console.error('檢查 ID 失敗', err);
    } finally {
      this.isCheckingId = false;
    }
  }

  async onSubmit() {
    // 1. 驗證必填
    if (!this.model.id || !this.model.client_name || !this.model.start_date || !this.model.end_date) {
      this.errorMessage = '請填寫所有必填欄位';
      return;
    }

    // 2. 阻擋 ID 重複 (雙重保險)
    if (this.idError) {
      return; // 如果還有錯誤訊息，不給送出
    }

    // 3. 驗證日期
    if (this.model.start_date! > this.model.end_date!) {
      this.errorMessage = '結束日期不能早於開始日期';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      // 再次檢查 ID (怕使用者手速太快，Blur 還沒跑完就按送出)
      const exists = await this.supabaseService.checkOrderIdExists(this.model.id);
      if (exists) {
        this.idError = '❌ 此團體編號已存在，請更換';
        this.isSubmitting = false;
        return;
      }

      // 建立訂單 (型別斷言：因為我們確認過欄位都有值了)
      await this.supabaseService.createOrder(this.model as Order);
      
      // 成功跳轉
      this.router.navigate(['/tasks', this.model.id]); 

    } catch (error: any) {
      console.error('建立失敗', error);
      this.errorMessage = '建立訂單失敗，請稍後再試。';
    } finally {
      this.isSubmitting = false;
    }
  }

}