import { Service, signal } from '@angular/core';

export interface Notice {
  readonly tone: 'success' | 'error' | 'info';
  /** A function so the text follows the language switch. */
  readonly text: () => string;
}

/** One message carried to the next page, e.g. "User created" after leaving the form. */
@Service()
export class NoticeService {
  private readonly current = signal<Notice | null>(null);

  show(notice: Notice): void {
    this.current.set(notice);
  }

  /** Returns the pending message and clears it, so it appears only once. */
  take(): Notice | null {
    const notice = this.current();
    this.current.set(null);
    return notice;
  }
}
