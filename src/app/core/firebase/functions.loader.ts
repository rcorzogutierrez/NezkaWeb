import { Service, inject } from '@angular/core';
import type { Functions } from 'firebase/functions';
import { APP_ENVIRONMENT, FIREBASE_APP } from './firebase.providers';

type FunctionsModule = typeof import('./functions.lazy');
type FunctionsKit = FunctionsModule & { readonly functions: Functions };

/** Loads the Cloud Functions SDK the first time something calls a function, then reuses it. */
@Service()
export class FunctionsLoader {
  private readonly app = inject(FIREBASE_APP);
  private readonly env = inject(APP_ENVIRONMENT);
  private kit: Promise<FunctionsKit> | null = null;

  private load(): Promise<FunctionsKit> {
    this.kit ??= import('./functions.lazy').then((m) => ({
      ...m,
      functions: m.connect(this.app, this.env.useEmulators),
    }));
    return this.kit;
  }

  /** Calls an HTTPS callable function and returns its result. */
  async call<Data, Result = unknown>(name: string, data: Data): Promise<Result> {
    const { functions, httpsCallable } = await this.load();
    const result = await httpsCallable<Data, Result>(functions, name)(data);
    return result.data;
  }
}
