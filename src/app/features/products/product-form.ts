import {
  Component,
  DestroyRef,
  type ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
  untracked,
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
  LucideZoomIn,
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
  nextRef,
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
  /** True once the price per unit was typed by hand; else it follows price per box ÷ pack. */
  unitManual: boolean;
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
    unitManual: !!p?.pricePerUnit,
    active: p?.active ?? true,
  };
}

/** An automatic price per unit is stored as 0, so it keeps following the price and the pack. */
function toData({ price, unitPrice, unitManual, ...rest }: ProductModel): ProductData {
  const pricePerUnit = unitManual ? (parsePrice(unitPrice) ?? 0) : 0;
  return { ...rest, pricePerBox: parsePrice(price) ?? 0, pricePerUnit };
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
    LucideZoomIn,
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

  /** New products get the next free catalog reference, which the person can change. */
  private readonly suggestedRef = resource({
    params: () => (this.id() ? undefined : true),
    loader: async () => nextRef(await this.products.list()),
  });
  protected readonly refSuggested = signal(false);

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
    // An automatic price per unit shows the calculation and follows price and pack.
    effect(() => {
      const auto = this.unitAuto();
      if (this.model().unitManual) return;
      const text = auto ? priceText(auto.value) : '';
      if (untracked(this.model).unitPrice !== text) {
        this.model.update((m) => ({ ...m, unitPrice: text }));
      }
    });
    effect(() => {
      const ref = this.suggestedRef.hasValue() ? this.suggestedRef.value() : null;
      if (!ref || this.editing() || untracked(this.model).ref) return;
      this.model.update((m) => ({ ...m, ref }));
      this.refSuggested.set(true);
    });
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
  // Price per unit: price per box ÷ pack while the person has not typed one.
  protected readonly unitAuto = computed(() => {
    const m = this.model();
    const value = unitPriceFromBox(parsePrice(m.price) ?? 0, m.pack);
    return value === null ? null : { value, text: formatMoney(value), units: m.pack.trim() };
  });
  protected readonly unitManual = computed(() => this.model().unitManual);

  /** Typing in the field makes the price per unit manual. */
  protected unitTyped(): void {
    if (!this.model().unitManual) this.model.update((m) => ({ ...m, unitManual: true }));
  }

  protected unitBackToAuto(): void {
    this.model.update((m) => ({ ...m, unitManual: false }));
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

  // The photo, shown large in a dialog. Esc, the X or a click outside the photo closes it.
  private readonly zoomDialog = viewChild<ElementRef<HTMLDialogElement>>('zoomDialog');

  protected openZoom(): void {
    this.zoomDialog()?.nativeElement.showModal();
  }

  protected closeZoom(): void {
    this.zoomDialog()?.nativeElement.close();
  }

  /** A click on the dialog itself (not its content) is a click on the dark backdrop. */
  protected onZoomClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeZoom();
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
