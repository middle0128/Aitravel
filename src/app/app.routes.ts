import { Routes } from '@angular/router';
import { OrdersComponent } from '../app/pages/orders/orders';
import { TasksComponent } from '../app/pages/tasks/tasks';
import { OrderFormComponent } from '../app/pages/order-form/order-form';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login';
import { ProfileComponent } from './pages/profile/profile';

export const routes: Routes = [
  // 登入頁不需要 Guard
  { path: 'login', component: LoginComponent },

  // 其他頁面都需要 Guard 保護
  { 
    path: '', 
    canActivate: [authGuard], // 👈 加上這行
    children: [
        { path: '', redirectTo: 'orders', pathMatch: 'full' },
        { path: 'orders', component: OrdersComponent },
        { path: 'orders/new', component: OrderFormComponent },
        { path: 'tasks/:id', component: TasksComponent },
        { path: 'orders/:id/tasks', component: TasksComponent },
        { path: 'profile', component: ProfileComponent },
    ]
  },
  
  // 萬一亂打網址，導回 login
  { path: '**', redirectTo: 'login' }
];