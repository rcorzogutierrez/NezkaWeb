import { Component, type ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideLoaderCircle,
  LucideMail,
  LucideTrash2,
  LucideUserCheck,
  LucideUserPlus,
  LucideUserX,
} from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { USER_ROLES, type UserProfile, type UserRole } from '../../core/users/user-profile';
import { UsersService } from '../../core/users/users.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { type Notice, NoticeService } from '../../shared/ui/notice.service';
import { StatusBadge } from '../../shared/ui/status-badge';

/** Admin-only list of the people who can sign in. */
@Component({
  selector: 'app-users-page',
  imports: [
    RouterLink,
    LucideLoaderCircle,
    LucideMail,
    LucideTrash2,
    LucideUserCheck,
    LucideUserPlus,
    LucideUserX,
    FormAlert,
    StatusBadge,
  ],
  templateUrl: './users-page.html',
})
export class UsersPage {
  private readonly usersService = inject(UsersService);
  private readonly auth = inject(AuthService);
  protected readonly t = inject(I18nService).t;

  protected readonly roles = USER_ROLES;
  protected readonly me = computed(() => this.auth.user()?.uid);

  private readonly live = this.usersService.watchAll();
  protected readonly users = this.live.users;
  protected readonly loadFailed = this.live.error;
  protected readonly counts = computed(() => {
    const list = this.users() ?? [];
    return { total: list.length, inactive: list.filter((u) => !u.active).length };
  });

  protected readonly notice = signal<Notice | null>(inject(NoticeService).take());
  /** Users with a change in flight, so their buttons wait. */
  protected readonly busy = signal<ReadonlySet<string>>(new Set());

  protected isBusy(uid: string): boolean {
    return this.busy().has(uid);
  }

  protected changeRole(user: UserProfile, value: string): void {
    const role = value as UserRole;
    if (role === user.role || !USER_ROLES.includes(role)) return;
    void this.run(
      user,
      () => this.usersService.update(user.uid, { role }),
      () => this.t().users.roleChanged(user.name, this.t().users.roles[role]),
    );
  }

  protected toggleActive(user: UserProfile): void {
    const active = !user.active;
    void this.run(
      user,
      () => this.usersService.update(user.uid, { active }),
      () => (active ? this.t().users.activated(user.name) : this.t().users.deactivated(user.name)),
    );
  }

  protected resendEmail(user: UserProfile): void {
    void this.run(
      user,
      () => this.usersService.sendPasswordSetup(user.email),
      () => this.t().users.emailSent(user.email),
    );
  }

  // Deleting, behind a confirmation dialog. Never offered for your own account.
  private readonly deleteDialog = viewChild<ElementRef<HTMLDialogElement>>('deleteDialog');
  protected readonly toDelete = signal<UserProfile | null>(null);
  protected readonly deleteError = signal<ErrorKey | null>(null);
  protected readonly deleting = signal(false);

  protected askDelete(user: UserProfile): void {
    this.toDelete.set(user);
    this.deleteError.set(null);
    this.deleteDialog()?.nativeElement.showModal();
  }

  protected closeDelete(): void {
    this.deleteDialog()?.nativeElement.close();
  }

  protected async confirmDelete(): Promise<void> {
    const user = this.toDelete();
    if (!user || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.usersService.remove(user.uid);
    } catch (e) {
      this.deleteError.set(errorKey(e));
      return;
    } finally {
      this.deleting.set(false);
    }
    this.closeDelete();
    this.notice.set({ tone: 'success', text: () => this.t().users.deleted(user.name) });
  }

  private async run(user: UserProfile, task: () => Promise<void>, done: () => string) {
    this.busy.update((s) => new Set(s).add(user.uid));
    try {
      await task();
      this.notice.set({ tone: 'success', text: done });
    } catch (e) {
      const key = errorKey(e);
      this.notice.set({ tone: 'error', text: () => this.t().errors[key] });
    } finally {
      this.busy.update((s) => {
        const next = new Set(s);
        next.delete(user.uid);
        return next;
      });
    }
  }
}
