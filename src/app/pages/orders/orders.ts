import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router, RouterLink } from '@angular/router'; // 引入路由，為了之後跳轉到任務頁
import { SupabaseService } from '../../services/supabase'; // 引入 Supabase 服務
import { FormsModule } from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { Subject } from 'rxjs';
import { AlertService } from '../../services/alert';
@Injectable()
export class CustomPaginatorIntl implements MatPaginatorIntl {
  changes = new Subject<void>();

  // 這裡就是你要改的文字
  firstPageLabel = '第一頁';
  itemsPerPageLabel = '每頁顯示：'; // 原本的 Items per page
  lastPageLabel = '最後一頁';
  nextPageLabel = '下一頁';
  previousPageLabel = '上一頁';

  // 這是處理 "1 - 10 of 100" 這段文字的邏輯
  getRangeLabel(page: number, pageSize: number, length: number): string {
    if (length === 0) {
      return '第 0 筆、共 0 筆';
    }
    const amount = length;
    const startIndex = page * pageSize;
    const endIndex = startIndex < length ?
      Math.min(startIndex + pageSize, length) :
      startIndex + pageSize;
      
    // 回傳格式：第 1 - 10 筆、共 100 筆
    return `第 ${startIndex + 1} - ${endIndex} 筆、共 ${amount} 筆`;
  }
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, MatPaginatorModule, FormsModule, RouterLink, MatIconModule], // 這裡一定要引入 MatPaginatorModule
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
  providers: [
    { provide: MatPaginatorIntl, useClass: CustomPaginatorIntl }
  ]
})
export class OrdersComponent implements OnInit {
  // 注入 Service 與 Router
  constructor(
    private alertService: AlertService // 👈 注入 Service
  ) {}
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  
  // 資料與狀態變數
  orders: any[] = [];
  totalCount = 0;   // 給 Paginator 用的總筆數
  pageSize = 10;    // 預設一頁 10 筆
  pageIndex = 0;    // 目前頁碼 (從 0 開始)
  isLoading = true; // 控制載入動畫

  searchTerm = '';
  statusFilter = 'All'; 
  
  // 定義篩選選項 (給 HTML 用)
  tabs = [
    { id: 'All', label: '全部訂單' },
    { id: 'Planning', label: '尚未完成' },
    { id: 'Confirmed', label: '已完成' },
    { id: 'is_priority', label: '🔥 急件/優先' },
    { id: 'has_issue', label: '⚠️ 狀況/問題' }
  ];

  // 🆕 當切換 Tab 時
  setFilter(status: string) {
    this.statusFilter = status;
    this.pageIndex = 0; // 切換狀態重置回第一頁
    this.loadOrders();
  }

  ngOnInit() {
    this.loadOrders();
  }

  onSearch() {
    this.pageIndex = 0; // 搜尋時重置回第一頁
    this.loadOrders();
  }

  // 讀取訂單 (包含分頁邏輯)
  loadOrders() {
    this.isLoading = true;
      this.supabaseService.getOrders(
        this.pageIndex,
        this.pageSize,
        this.statusFilter,
        this.searchTerm
      ).subscribe({
      next: (response) => {
        if (response.error) {
          console.error('載入訂單失敗:', response.error);
          this.alertService.error('載入訂單失敗:' + response.error);
        } else {
          this.orders = response.data || [];
          // Supabase 會回傳 count 屬性 (因為我們在 service 寫了 { count: 'exact' })
          this.totalCount = response.count || 0; 
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('發生未預期的錯誤:', err);
        this.alertService.error('載入訂單時發生錯誤');
        this.isLoading = false;
      }
    });
  
}

  async deleteOrder(order: any, event: Event) {
    // 1. 阻止事件冒泡 (避免點了刪除，卻不小心觸發進入詳情頁的動作)
    event.stopPropagation();

    // 2. 確認對話框
    const confirmed = confirm(`確定要刪除團號「${order.id} (${order.client_name})」嗎？\n\n⚠️ 警告：該團體底下的所有任務資料也會一併被永久刪除！`);
    
    if (!confirmed) return;

    try {
      // 3. 呼叫後端刪除
      await this.supabaseService.deleteOrder(order.id);
      
      // 4. 前端直接移除該筆資料 (不用重整)
      this.orders = this.orders.filter(o => o.id !== order.id);
      this.totalCount--; // 總筆數扣 1
      
      this.alertService.success('刪除成功');

    } catch (error) {
      console.error('刪除失敗:', error);
      this.alertService.error('刪除失敗，請稍後再試');
    }
  }


  // 當使用者切換分頁 (下一頁、變更每頁筆數) 時觸發
  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadOrders(); // 重新撈資料
  }

  // 點擊「管理任務細節」按鈕時觸發 (準備給下一步路由使用)
  goToTasks(orderId: string) {
    this.router.navigate(['/tasks', orderId]);
  }

  gotoordernew() {
    this.router.navigate(['/orders/new']);
  }

}