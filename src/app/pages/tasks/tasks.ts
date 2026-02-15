import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // 1. 引入 FormsModule 處理勾選
import { SupabaseService,Task } from '../../services/supabase';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {MatIconModule} from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AlertService } from '../../services/alert';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule,MatSlideToggleModule,MatIconModule], // 2. 加入 Imports
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss'
})
export class TasksComponent implements OnInit {

  constructor(
    private alertService: AlertService // 👈 注入 AlertService
  ) {}

  private route = inject(ActivatedRoute);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router); // 為了導航回上一頁

  private http = inject(HttpClient); // 注入 Http

  // 控制匯入視窗開關
  showImportModal = false;
  
  isProcessingAi = false; // 控制全螢幕 Loading

  // 匯入的輸入內容 (可能是 JSON 字串，也可能是純文字行程)
  importContent = '';

  n8nWebhookUrl = environment.n8nWebhookUrl; // 從環境變數讀取 n8n Webhook URL

  orderId: string | null = null;
  // 1. 資料本體
  tasks: Task[] = [];
  // 2. 原始資料備份 (用來比對是否有更動)
  originalTasksMap = new Map<string, Task>();
  // 3. 下拉選單選項 (寫死前端)
  categories = ['住宿', '景點', '餐廳', '其他'];
  days = Array.from({ length: 20 }, (_, i) => i + 1); // [1, 2, ..., 20]

  deletedTaskIds = new Set<string>();
  
  isEditMode = false;           // 是否為編輯模式
  lastUpdatedTime: Date | null = null; // 該團最後更新時間
  
  // 3. 核心變數：紀錄哪些任務被修改過 (Set 確保 ID 不重複)
  changedTaskIds = new Set<string>();
  
  isLoading = true;
  isSaving = false;

  currentUser = {
    name: this.supabaseService.currentUser()?.user_metadata['name'], 
    role: 'OP'
  };

  parseJson() {
    try {
      // 嘗試把輸入框的文字轉成 JSON 物件陣列
      const data = JSON.parse(this.importContent);
      
      if (Array.isArray(data)) {
        // 假設你的 tasks 是用 Signal 管理的，例如 tasksList
        // 或是直接 push 到目前的暫存陣列
        // 這裡示範把它們加進去 (你需要根據你的資料結構調整欄位)
        const newTasks = data.map(item => ({
          id: self.crypto.randomUUID(), // 🔥 關鍵：必須產生 ID，不然 Angular track 會報錯，存檔也會有問題
          order_id: this.orderId!,      // 補上訂單 ID
          category: item.category || '其他',
          // 修正欄位對應 (左邊要是 Task 介面的名稱)
          day_number: item.day || 1,       // ❌ 原本寫 day，要改 day_number
          start_time: item.time || '',
          item_name: item.item_name ||  '',
          status: 'Planning', // 預設狀態
          is_priority: false,
          has_issue: false,
          is_completed: false,
          assignee: this.currentUser.name,
          remarks: item.remarks || '',
          contact_phone: item.contact_phone || '',
        }));
        this.tasks = [...this.tasks, ...newTasks];

        // 匯入新資料後，馬上排整齊
        this.sortTasks();
        // 3. 自動幫使用者開啟編輯模式，讓他們看到新增的項目並可以修改
        this.isEditMode = true;
        this.alertService.success(`成功解析 ${newTasks.length} 筆資料！`);
        
        this.showImportModal = false;
        this.importContent = '';
      } else {
        this.alertService.error('格式錯誤：JSON 必須是陣列 [...]');
      }
    } catch (e) {
      this.alertService.error('JSON 格式錯誤，請檢查符號');
    }
  }


  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) {
      console.warn('沒有選擇檔案');
      return;

      }
    this.isProcessingAi = true; // 開啟全螢幕 Loading
      console.log('選擇的檔案:', file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        // 把 Base64 填入 importContent 或直接發送給 AI
        // 為了簡單，我們這裡假設傳送給 n8n 的 body 包含 image 欄位
        this.isProcessingAi = true;
        console.log('正在上傳圖片給 AI 解析...');
        this.http.post(this.n8nWebhookUrl, { 
          image: base64String 
        },{responseType: 'text'}).subscribe({
            next: (res:any) => {
                console.log('AI 原始回傳:', res);

                 let cleanJson = res
            .replace(/```json/g, '') // 刪除 ```json
            .replace(/```/g, '')     // 刪除結尾的 ```
            .trim();                 // 刪除前後空白

          // 3. 嘗試 Parse 看看是不是真的 JSON (為了安全)
          try {
            // 如果 Make 回傳的是物件 { "Result": "..." }，我們要多剝一層皮
            // 但因為我們上面用 responseType: 'text'，所以這裡視為純字串處理
            // 如果你發現 log 出來是 {"Result": "..."} 格式，請解開下面這行註解：
            // const parsedObj = JSON.parse(cleanJson);
            // cleanJson = typeof parsedObj === 'object' ? JSON.stringify(parsedObj) : cleanJson;

            // 4. 把清洗乾淨的 JSON 填回輸入框
            this.importContent = cleanJson;
            
            // 5. 自動幫使用者按下「解析」按鈕 (選擇性功能)
            // this.parseJson(); 

          } catch (e) {
            console.error('JSON 解析失敗', e);
            this.importContent = cleanJson; // 就算解析失敗，也先把文字填進去讓使用者自己改
          }

          this.isProcessingAi = false;
          event.target.value = '';
        },
      error: (err) => {
        console.error(err);
        this.alertService.error('AI 辨識失敗，請檢查 n8n 連線');
        this.isProcessingAi = false;
      }
    });
    };
    // 3. 加入錯誤處理 (建議加上，以免檔案讀取失敗時沒反應)
    reader.onerror = (error) => {
      console.error('檔案讀取錯誤:', error);
      this.isProcessingAi = false;
    };

    // 🔥🔥🔥 4. 關鍵的一行！你可能漏了這行，或者放在錯誤的地方 🔥🔥🔥
    reader.readAsDataURL(file); 
    
    // 5. 清空 input，這樣重複選同一張圖才會觸發 change 事件
    event.target.value = '';
    
  }

  addTask() {
    if (!this.orderId) return;

    this.isEditMode = true;
    const newId = self.crypto.randomUUID();

    const newTask: Task = {
      id: newId,
      order_id: this.orderId,
      day_number: 1,
      category: '',
      item_name: '',
      is_completed: false,
      
      // 🆕 關鍵修改：自動帶入登入者名字
      assignee: this.currentUser.name, 
      
      start_time: '',
      contact_phone: '',
      remarks: '',
      is_priority: false,
      has_issue: false,
      // updated_at 先留空，資料庫寫入時會自動產生
    };

    this.tasks.push(newTask);
    
    // 自動滾動到底部
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  }

  ngOnInit() {
    this.orderId = this.route.snapshot.paramMap.get('id');
    if (this.orderId) {
      this.loadTasks(this.orderId);
    }
    
  }

  // 讀取任務
  loadTasks(id: string) {
    this.isLoading = true;
    this.supabaseService.getTasks(id).subscribe({
      next: (response) => {
        if (response.error) {
          console.error('Error:', response.error);
        } else if (response.data) {
          // 深拷貝資料，避免 reference 導致原始資料跟著變
          this.tasks = JSON.parse(JSON.stringify(response.data));
          // 🆕 雙重保險：前端再依照天數排一次 (避免任何意外)
          // this.tasks.sort((a, b) => a.day_number - b.day_number);
          this.sortTasks();
          this.lastUpdatedTime = this.tasks[0]?.updated_at ? new Date(this.tasks[0].updated_at) : null;
          // 建立原始資料對照表
          this.originalTasksMap.clear();
          this.tasks.forEach(t => {
            this.originalTasksMap.set(t.id, JSON.parse(JSON.stringify(t)));
          });
        }
        this.isLoading = false;
        this.changedTaskIds.clear();
      }
    });
  }

  sortTasks() {
    this.tasks.sort((a, b) => {
      // 1. 先比天數
      const dayA = a.day_number || 0;
      const dayB = b.day_number || 0;
      if (dayA !== dayB) {
        return dayA - dayB;
      }

      // 2. 再比時間 (字串比對)
      // 如果沒有時間 (空字串)，我們把它設為 '23:59' 讓它排在當天的最後面
      const timeA = a.start_time || '23:59'; 
      const timeB = b.start_time || '23:59';
      
      return timeA.localeCompare(timeB);
    });
  }

  // 🆕 計算列表中最新的更新時間
  calculateLastUpdate() {
    if (!this.tasks || this.tasks.length === 0) return;
    
    // 找出 updated_at 最大的那個時間
    const dates = this.tasks
      .map(t => t.updated_at ? new Date(t.updated_at).getTime() : 0);
    
    const maxDate = Math.max(...dates);
    if (maxDate > 0) {
      this.lastUpdatedTime = new Date(maxDate);
    }
  }

 // 切換編輯模式
  toggleEditMode() {
    if (this.isEditMode) {
      // 如果按「取消」，把資料還原成原始狀態
      if(this.changedTasks.length > 0||this.deletedTaskIds.size > 0){
        const confirmed = confirm('您有未儲存的變更，確定要取消編輯嗎？');
        if (!confirmed) return;
      }
      this.tasks = this.tasks.map(t => {
        const original = this.originalTasksMap.get(t.id);
        return original ? JSON.parse(JSON.stringify(original)) : t;
      });
    }
    this.isEditMode = !this.isEditMode;
  }

  // 🔑 核心邏輯：判斷單一任務是否被修改過
  isTaskDirty(task: Task): boolean {
    const original = this.originalTasksMap.get(task.id);
    if (!original) return true;

    return (
      task.is_completed !== original.is_completed ||
      task.item_name !== original.item_name ||
      task.remarks !== original.remarks ||
      task.day_number !== original.day_number || // 偵測天數變更
      task.category !== original.category ||       // 偵測類別變更
      task.start_time !== original.start_time ||   // 偵測開始時間變更
      task.contact_phone !== original.contact_phone || // 偵測聯絡電話變更
      task.is_priority !== original.is_priority|| 
      task.has_issue !== original.has_issue
    );
  }


  // 4. 當使用者勾選/取消 Checkbox 時觸發
  onTaskChange(task: any) {
    // 標記此 ID 為「已修改」
    this.changedTaskIds.add(task.id);
    
    // console.log 用來除錯，讓你知道目前暫存了哪些
    console.log('待儲存清單:', this.changedTaskIds); 
  }

 // 取得所有被修改過的任務
  get changedTasks() {
    return this.tasks.filter(t => this.isTaskDirty(t));
  }

 async saveChanges() {
    // 檢查是否有 更新 或 刪除 的資料
    const hasUpdates = this.changedTasks.length > 0;
    const hasDeletes = this.deletedTaskIds.size > 0;

    if (!this.orderId) {
      this.alertService.error('無法找到訂單 ID 可能卡bug了@@');
      return;
    }
    if (!hasUpdates && !hasDeletes) return;

    this.isSaving = true;
    const now = new Date();

    try {
      // 1. 處理刪除 (如果有)
      if (hasDeletes) {
        await this.supabaseService.deleteTasks(Array.from(this.deletedTaskIds));
        this.deletedTaskIds.clear(); // 清空待刪除清單
      }

      // 2. 處理更新 (如果有)
      if (hasUpdates) {
        const tasksToUpdate = this.changedTasks.map(t => ({
           // ... (原本的欄位映射，保持不變)
           id: t.id,
           order_id: this.orderId!,
           is_completed: t.is_completed,
           item_name: t.item_name,
           remarks: t.remarks,
           day_number: t.day_number,
           category: t.category,
           is_priority: t.is_priority,
           has_issue: t.has_issue,
           start_time: t.start_time,
            contact_phone: t.contact_phone,
            assignee: this.currentUser.name,
           updated_at: now.toISOString()
        }));
        
        await this.supabaseService.updateTasks(tasksToUpdate);
        
        // 更新原始對照表
        this.changedTasks.forEach(t => {
          t.updated_at = now.toISOString();
          this.originalTasksMap.set(t.id, JSON.parse(JSON.stringify(t)));
        });
        
        // 重新排序
        this.tasks.sort((a, b) => {
           if (a.day_number !== b.day_number) return a.day_number - b.day_number;
           return 0;
        });
      }

      this.isEditMode = false;
      this.calculateLastUpdate();
      this.alertService.success('儲存成功！');

    } catch (error) {
      console.error('儲存失敗:', error);
      this.alertService.error('儲存失敗，請稍後再試');
    } finally {
      this.isSaving = false;
    }
  }
  
  deleteTask(task: Task) {
    // 1. 詢問確認
    const confirmed = confirm(`確定要刪除「${task.item_name}」嗎？\n此動作在按下「儲存」後才會生效\n按下「儲存」後請在按上方儲存變更來徹底刪除`);
    if (!confirmed) return;

    this.tasks = this.tasks.filter(t => t.id !== task.id);

    // 3. 判斷這是不是「已存在資料庫」的舊任務
    const isExistingTask = this.originalTasksMap.has(task.id);

    if (isExistingTask) {
      // ✅ 情況 A：這是舊任務 -> 必須告訴後端刪除它
      this.deletedTaskIds.add(task.id);
    }
    
    // 4. 如果它原本在「修改清單」中，移除它 (不需要又改又刪)
    if (this.changedTaskIds.has(task.id)) {
      this.changedTaskIds.delete(task.id);
    }
  }

  goBackcheck(){
      if(this.changedTasks.length > 0||this.deletedTaskIds.size > 0){
        const confirmed = confirm('您有未儲存的變更，確定要返回嗎？');
        if (!confirmed) return;else this.router.navigate(['/orders']);
      }else{
          this.router.navigate(['/orders']);
      }

  }

  get hasInvalidChanges(): boolean {
    // 檢查 changedTasks 陣列中，是否有任何一筆的 item_name 是空的
    return this.changedTasks.some(task => !task.item_name || task.item_name.trim() === '') ||
           this.changedTasks.some(task => !task.day_number || task.day_number == null) ||
           this.changedTasks.some(task => !task.category || task.category.trim() === '') ||
           this.changedTasks.some(task => !task.start_time || task.start_time.trim() === '') ||
          //  this.changedTasks.some(task => !task.contact_phone || task.contact_phone.trim() === '') ||
           this.changedTasks.some(task => !task.assignee || task.assignee.trim() === '');
  }

  // 🆕 新增：判斷是否可以存檔 (整合所有條件)
  get canSave(): boolean {
    // 1. 正在存檔中 -> 不可按
    if (this.isSaving) return false;

    // 2. 完全沒變更 (沒改也沒刪) -> 不可按
    const hasChanges = this.changedTasks.length > 0 || this.deletedTaskIds.size > 0;
    if (!hasChanges) return false;

    // 3. 有變更但資料不合法 (有名稱沒填) -> 不可按
    if (this.hasInvalidChanges) return false;

    return true; // 所有條件通過，可以存檔
  }

  
  // 為了在 Template 中使用 Set 的屬性
  get hasUnsavedChanges() {
    return this.changedTaskIds.size > 0;
  }
}