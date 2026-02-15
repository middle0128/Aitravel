import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // 檢查是否有登入的 Session
  const session = await supabase.getSession();

  if (session) {
    return true; // 有登入，放行
  } else {
    // 沒登入，踢回登入頁
    router.navigate(['/login']);
    return false;
  }
};