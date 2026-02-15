import { Component, signal,inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from '../app/components/header/header'; // 引入
import { SupabaseService } from '../app/services/supabase'; // 引入
import { AlertComponent } from './alert/alert/alert'; // 引入 AlertComponent

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,HeaderComponent,AlertComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('travel-group-control');

  private supabaseService = inject(SupabaseService);
  
  // 讓 template 可以存取 currentUser
  currentUser = this.supabaseService.currentUser;
}
