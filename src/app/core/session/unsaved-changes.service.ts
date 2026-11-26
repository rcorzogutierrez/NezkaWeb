import { DestroyRef, Service, computed, inject, signal } from '@angular/core';

/**
 * Forms on screen report here whether they hold changes that are not saved yet,
 * so the inactivity warning can say they would be lost.
 */
@Service()
export class UnsavedChanges {
  private readonly sources = signal<readonly (() => boolean)[]>([]);

  /** True while any form on screen has unsaved changes. */
  readonly any = computed(() => this.sources().some((dirty) => dirty()));

  /**
   * Call from a component's constructor or field initializer: the form is followed
   * until the component is destroyed.
   */
  watch(dirty: () => boolean): void {
    this.sources.update((list) => [...list, dirty]);
    inject(DestroyRef).onDestroy(() =>
      this.sources.update((list) => list.filter((d) => d !== dirty)),
    );
  }
}
