import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: 'about', loadChildren: './pages/about/about.module#AboutPageModule' },
  { path: 'approval', loadChildren: './pages/approval/approval.module#ApprovalPageModule' },
  { path: 'help', loadChildren: './pages/help/help.module#HelpPageModule' },
  { path: 'history', loadChildren: './pages/history/history.module#HistoryPageModule' },
  { path: 'profile', loadChildren: './pages/profile/profile.module#ProfilePageModule' },
  { path: 'promos', loadChildren: './pages/promo/promo.module#PromoPageModule' },
  { path: 'system', loadChildren: './pages/system/system.module#SystemPageModule' },
  { path: '', loadChildren: './pages/camera/camera.module#CameraPageModule' },
  { path: 'pending', loadChildren: './pages/pending/pending.module#PendingPageModule' },
  { path: 'ff-details', loadChildren: './modals/ff-details/ff-details.module#FfDetailsPageModule' },
  { path: 'setup', loadChildren: './modals/setup/setup.module#SetupPageModule' },
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
