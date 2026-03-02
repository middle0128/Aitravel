import { Injectable,signal } from '@angular/core';
import { createClient, SupabaseClient,User } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { from, Observable } from 'rxjs';
// 定義介面 (Interface) 讓 TypeScript 看得懂資料結構
export interface Order {
  id: string;
  created_at?: string;
  client_name: string;
  start_date: string;
  end_date: string;
  main_contact: string;
  status: string;
  updated_at?: string;
  is_priority?: boolean;
  has_issue?: boolean;
  flight_info?: string;
  adults?: number;
  children?: number;
}

export interface Task {
  id: string;
  order_id: string;
  day_number: number;
  category: string;
  item_name: string;
  is_completed: boolean;
  assignee: string;
  remarks?: string;
  updated_at?: string;
  is_priority?: boolean;
  has_issue?: boolean;
  start_time?: string;  
  contact_phone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    this.supabase.auth.getUser().then(({ data }) => {
      this.currentUser.set(data.user);
    });

    // 2. 監聽登入狀態變化 (登入/登出時自動更新 Signal)
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth Event:', event);
      if (session?.user) {
        this.currentUser.set(session.user);
      } else {
        this.currentUser.set(null);
      }
    });
    
  }

  currentUser = signal<User | null>(null);

  ngOnInit() {
    // 1. 初始化時，檢查是否已經有登入的 Session
    
  }

  //  取得所有訂單 (依照出發日期排序)
getOrders(pageIndex: number, pageSize: number, statusFilter: string = 'All', searchTerm: string = ''): Observable<any> {
    const fromIndex = pageIndex * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    let query = this.supabase
      .from('orders')
      .select('*', { count: 'exact' });

    if (searchTerm && searchTerm.trim() !== '') {
      
      // 語法意思： "id 包含搜尋字串 OR search_keywords 包含搜尋字串"
      // 這樣你輸入 ID (例如 "JP-001") 或者 團名/聯絡人/任務名 都能找到！
      query = query.or(`id.ilike.%${searchTerm}%,search_keywords.ilike.%${searchTerm}%`);
    }

    // 2. 狀態篩選 (維持原樣，邏輯是正確的)
    if (statusFilter && statusFilter !== 'All') {
      if (statusFilter === 'is_priority') {
        query = query.eq('is_priority', true);
      } else if (statusFilter === 'has_issue') {
        query = query.eq('has_issue', true);
      } else {
        query = query.eq('status', statusFilter);
      }
    }

    // 3. 排序與分頁
    const promise = query
      .order('updated_at', { ascending: false })
      .range(fromIndex, toIndex);

    return from(promise);
  }
  // 2. 取得單一訂單的任務 (依照天數排序)
  getTasks(orderId: string): Observable<any> {
    const promise = this.supabase
      .from('tasks')
      .select('*')
      .eq('order_id', orderId)
      .order('day_number', { ascending: true }) // 🆕 確保依照天數排序 (Day 1, 2, 3...)
    return from(promise);
  }

  // 3. 批次更新任務狀態 (這是你提到的重點功能)
  // 我們接受一個 Task 物件陣列，一次寫入
  async updateTasks(tasksToUpdate: Partial<Task>[]) {
    // Supabase 的 upsert 可以用來更新 (只要有 ID)
    const { data, error } = await this.supabase
      .from('tasks')
      .upsert(tasksToUpdate)
      .select();

    if (error) throw error;
    return data;
  }

  async deleteTasks(ids: string[]) {
    const { data, error } = await this.supabase
      .from('tasks')
      .delete()
      .in('id', ids); // WHERE id IN ('...', '...')

    if (error) throw error;
    return data;
  }
  // 放在 SupabaseService class 裡面
async getOrderById(id: string) {
  // 注意：這裡是用 this.supabase 還是 this.client 要看你 service 內部的命名
  // 假設你內部是用 supabase
  return await this.supabase
    .from('orders')
    .select('client_name, start_date, end_date')
    .eq('id', id)
    .single();
}
  // 🆕 新增：檢查訂單編號是否已存在
  async checkOrderIdExists(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('id')
      .eq('id', id)
      .maybeSingle(); // 使用 maybeSingle，找不到時不會報錯，只會回傳 null

    if (error) throw error;
    return !!data; // 如果有資料回傳 true，沒資料回傳 false
  }
  
  // 4. 新增訂單
  async createOrder(orderData: Partial<Order>) {
    const { data, error } = await this.supabase
      .from('orders')
      .insert(orderData) // orderData 裡面現在會包含 id
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteOrder(id: string) {
    const { error } = await this.supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  // 🆕 登出
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }
  
  // 🆕 取得目前 Session (給 Guard 用的)
  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  async updateUser(attributes: { password?: string; data?: { name: string } }) {
    const { data, error } = await this.supabase.auth.updateUser(attributes);
    
    if (error) throw error;

    // 如果更新成功，手動更新一下 Signal 確保畫面同步
    if (data.user) {
      this.currentUser.set(data.user);
    }
    
    return data;
  }
}