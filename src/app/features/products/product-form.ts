import {
  Component,
  DestroyRef,
  type ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, FormRoot, form, maxLength, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideImagePlus,
  LucideLoaderCircle,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { PhotoError, preparePhoto } from '../../core/products/photo';
import {
  PRODUCT_MAX_LENGTH,
  PRODUCT_TEXT_FIELDS,
  type Product,
  type ProductData,
  type ProductTextField,
  normalizeUpc,
  formatMoney,
  parsePrice,
  priceText,
  unitPriceFromBox,
} from '../../core/products/product';
import { type PhotoChange, ProductsService } from '../../core/products/products.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { NoticeService } from '../../shared/ui/notice.service';
import { TextField } from '../../shared/ui/text-field';

/** What the form edits: like ProductData, but the price is the text typed. */
type ProductModel = Record<ProductTextField, string> & {
  price: string;
  unitPrice: string;
  active: boolean;
};

function toModel(p?: Product | null): ProductModel {
  const text = Object.fromEntries(PRODUCT_TEXT_FIELDS.map((f) => [f, p?.[f] ?? ''])) as Record<
    ProductTextField,
    string
  >;
  return {
    ...text,
    price: priceText(p?.pricePerBox ?? 0),
    unitPrice: priceText(p?.pricePerUnit ?? 0),
    active: p?.active ?? true,
  };
}

function toData({ price, unitPrice, ...rest }: ProductModel): ProductData {
  return { ...rest, pricePerBox: parsePrice(price) ?? 0, pricePerUnit: parsePrice(unitPrice) ?? 0 };
}

interface DuplicateWarning {
  /** Ref and UPC that were checked; the warning holds only while they stay the same. */
  readonly key: string;
  readonly ref: Product | null;
  readonly upc: Product | null;
}

const duplicateKey = (m: Pick<ProductModel, 'ref' | 'upc'>) =>
  `${m.ref.trim().toLowerCase()}|${normalizeUpc(m.upc)}`;

/** Create (`/products/new`) or edit (`/products/:id`) a product and its photo. */
@Component({
  selector: 'app-product-form',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    LucideArrowLeft,
    LucideImagePlus,
    LucideLoaderCircle,
    LucideTrash2,
    LucideX,
    FormAlert,
    TextField,
  ],
  templateUrl: './product-form.html',
})
export class ProductForm {
  private readonly products = inject(ProductsService);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);
  protected readonly t = inject(I18nService).t;
  protected readonly isAdmin = inject(AuthService).isAdmin;

  /** Route parameter; absent on `/products/new`. */
  readonly id = input<string>();

  private readonly existing = resource({
    params: () => this.id(),
    loader: ({ params }) => this.products.get(params),
  });

  protected readonly editing = computed(() => !!this.id());
  protected readonly loading = computed(() => this.editing() && this.existing.isLoading());
  protected readonly notFound = computed(
    () => this.editing() && !this.existing.isLoading() && this.existing.value() === null,
  );
  protected readonly loadError = computed(() =>
    this.existing.error() ? errorKey(this.existing.error()) : null,
  );
  protected readonly savedName = computed(() => this.existing.value()?.description ?? '');

  private readonly model = linkedSignal<ProductModel>(() => toModel(this.existing.value()));

  // The photo: kept, replaced by a prepared file, or removed. Saved together with the form.
  protected readonly photo = signal<PhotoChange>({ kind: 'keep' });
  protected readonly photoBusy = signal(false);
  protected readonly photoError = signal<PhotoError['code'] | null>(null);
  protected readonly dragging = signal(false);
  private readonly newPhotoUrl = signal<string | null>(null);
  protected readonly preview = computed(() => {
    const change = this.photo();
    if (change.kind === 'replace') return this.newPhotoUrl();
    if (change.kind === 'remove') return null;
    return this.existing.value()?.photoUrl || null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.setNewPhotoUrl(null));
  }

  protected async pickPhoto(file: File | undefined): Promise<void> {
    if (!file) return;
    this.photoError.set(null);
    this.photoBusy.set(true);
    try {
      const blob = await preparePhoto(file);
      this.setNewPhotoUrl(URL.createObjectURL(blob));
      this.photo.set({ kind: 'replace', file: blob });
    } catch (e) {
      this.photoError.set(e instanceof PhotoError ? e.code : 'notImage');
    } finally {
      this.photoBusy.set(false);
    }
  }

  protected onFileInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    void this.pickPhoto(el.files?.[0]);
    el.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    void this.pickPhoto(event.dataTransfer?.files[0]);
  }

  protected removePhoto(): void {
    this.photoError.set(null);
    this.setNewPhotoUrl(null);
    this.photo.set(this.existing.value()?.photoPath ? { kind: 'remove' } : { kind: 'keep' });
  }

  private setNewPhotoUrl(url: string | null): void {
    const old = this.newPhotoUrl();
    if (old) URL.revokeObjectURL(old);
    this.newPhotoUrl.set(url);
  }

  /** Price per box ÷ units per box, offered while the price per unit is something else. */
  protected readonly unitSuggestion = computed(() => {
    const m = this.model();
    const value = unitPriceFromBox(parsePrice(m.price) ?? 0, m.pack);
    if (value === null || value === parsePrice(m.unitPrice)) return null;
    return { value, text: formatMoney(value), units: m.pack.trim() };
  });

  protected useUnitSuggestion(): void {
    const s = this.unitSuggestion();
    if (s) this.model.update((m) => ({ ...m, unitPrice: priceText(s.value) }));
  }

  protected readonly error = signal<ErrorKey | null>(null);
  private readonly checked = signal<DuplicateWarning | null>(null);
  /** Products that already use this ref or UPC, once the person has been warned. */
  protected readonly duplicate = computed(() => {
    const warning = this.checked();
    return warning && warning.key === duplicateKey(this.model()) ? warning : null;
  });

  protected readonly productForm = form(
    this.model,
    (path) => {
      required(path.description);
      for (const f of PRODUCT_TEXT_FIELDS) maxLength(path[f], PRODUCT_MAX_LENGTH[f]);
      validate(path.price, ({ value }) =>
        parsePrice(value()) === null ? { kind: 'price' } : null,
      );
      validate(path.unitPrice, ({ value }) =>
        parsePrice(value()) === null ? { kind: 'price' } : null,
      );
    },
    {
      submission: {
        action: async (f) => {
          this.error.set(null);
          const model = f().value();
          const data = toData(model);
          const id = this.id();
          const name = data.description.trim();
          try {
            if (!this.duplicate()) {
              const found = await this.products.duplicates(data, id);
              if (found.ref || found.upc) {
                this.checked.set({ key: duplicateKey(model), ...found });
                return;
              }
            }
            await this.products.save(id, data, this.photo(), this.existing.value() ?? undefined);
          } catch (e) {
            this.error.set(errorKey(e));
            return;
          }
          this.notices.show({
            tone: 'success',
            text: () => (id ? this.t().products.updated(name) : this.t().products.created(name)),
          });
          await this.router.navigateByUrl('/products');
        },
      },
    },
  );

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
    const product = this.existing.value();
    if (!product) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.products.remove(product);
    } catch (e) {
      this.deleteError.set(errorKey(e));
      return;
    } finally {
      this.deleting.set(false);
    }
    this.closeDelete();
    const name = product.description;
    this.notices.show({ tone: 'success', text: () => this.t().products.deleted(name) });
    await this.router.navigateByUrl('/products');
  }
}
