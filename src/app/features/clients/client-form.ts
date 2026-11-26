import {
  Component,
  type ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, FormRoot, email, form, maxLength, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideLoaderCircle, LucideTrash2 } from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import {
  CLIENT_FIELDS,
  CLIENT_MAX_LENGTH,
  type Client,
  type ClientData,
  type ClientField,
  emptyClient,
} from '../../core/clients/client';
import { ClientsService } from '../../core/clients/clients.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { UnsavedChanges } from '../../core/session/unsaved-changes.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { NoticeService } from '../../shared/ui/notice.service';
import { TextField } from '../../shared/ui/text-field';

function toData(client: Client): ClientData {
  const values = Object.fromEntries(CLIENT_FIELDS.map((f) => [f, client[f]])) as Record<
    ClientField,
    string
  >;
  return { ...values, active: client.active };
}

/** Create (`/clients/new`) or edit (`/clients/:id`) a client. */
@Component({
  selector: 'app-client-form',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    LucideArrowLeft,
    LucideLoaderCircle,
    LucideTrash2,
    FormAlert,
    TextField,
  ],
  templateUrl: './client-form.html',
})
export class ClientForm {
  private readonly clients = inject(ClientsService);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);
  protected readonly t = inject(I18nService).t;
  protected readonly isAdmin = inject(AuthService).isAdmin;

  /** Route parameter; absent on `/clients/new`. */
  readonly id = input<string>();

  private readonly existing = resource({
    params: () => this.id(),
    loader: ({ params }) => this.clients.get(params),
  });

  protected readonly editing = computed(() => !!this.id());
  protected readonly loading = computed(() => this.editing() && this.existing.isLoading());
  protected readonly notFound = computed(
    () => this.editing() && !this.existing.isLoading() && this.existing.value() === null,
  );
  protected readonly loadError = computed(() =>
    this.existing.error() ? errorKey(this.existing.error()) : null,
  );
  protected readonly savedName = computed(() => this.existing.value()?.name ?? '');

  private readonly model = linkedSignal<ClientData>(() => {
    const client = this.existing.value();
    return client ? toData(client) : emptyClient();
  });

  protected readonly error = signal<ErrorKey | null>(null);
  /** Name the person already confirmed as a deliberate duplicate. */
  private readonly confirmedDuplicate = signal<string | null>(null);
  protected readonly duplicate = computed(() => {
    const confirmed = this.confirmedDuplicate();
    return confirmed !== null && confirmed === this.model().name.trim() ? confirmed : null;
  });

  protected readonly clientForm = form(
    this.model,
    (path) => {
      required(path.name);
      email(path.email);
      for (const f of CLIENT_FIELDS) maxLength(path[f], CLIENT_MAX_LENGTH[f]);
    },
    {
      submission: {
        action: async (f) => {
          this.error.set(null);
          const data = f().value();
          const name = data.name.trim();
          const id = this.id();
          try {
            if (this.duplicate() !== name && (await this.clients.nameTaken(name, id))) {
              this.confirmedDuplicate.set(name);
              return;
            }
            if (id) await this.clients.update(id, data);
            else await this.clients.create(data);
          } catch (e) {
            this.error.set(errorKey(e));
            return;
          }
          this.notices.show({
            tone: 'success',
            text: () => (id ? this.t().clients.updated(name) : this.t().clients.created(name)),
          });
          await this.router.navigateByUrl('/clients');
        },
      },
    },
  );

  constructor() {
    inject(UnsavedChanges).watch(() => this.clientForm().dirty());
  }

  // Deleting, behind a confirmation dialog (administrators only).
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('deleteDialog');
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<ErrorKey | null>(null);

  protected askDelete(): void {
    this.deleteError.set(null);
    this.dialog()?.nativeElement.showModal();
  }

  protected closeDelete(): void {
    this.dialog()?.nativeElement.close();
  }

  protected async confirmDelete(): Promise<void> {
    const id = this.id();
    const name = this.savedName();
    if (!id) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.clients.remove(id);
    } catch (e) {
      this.deleteError.set(errorKey(e));
      return;
    } finally {
      this.deleting.set(false);
    }
    this.closeDelete();
    this.notices.show({ tone: 'success', text: () => this.t().clients.deleted(name) });
    await this.router.navigateByUrl('/clients');
  }
}
