import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  createEstimatesServiceMock,
  provideEstimatesServiceMock,
  testEstimate,
} from '../../../testing/estimates-service.mock';
import { buttonByText } from '../../../testing/dom';
import { useLanguage } from '../../../testing/setup';
import { PdfService } from '../../core/pdf/pdf.service';
import { EstimatesPage } from './estimates-page';

describe('EstimatesPage', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;
  const pdf = {
    proformas: vi.fn(async () => new Blob(['%PDF'])),
    download: vi.fn(),
    open: vi.fn(),
  };

  async function open(url = '/estimates') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'estimates', component: EstimatesPage }],
          withComponentInputBinding(),
        ),
        provideEstimatesServiceMock(
          createEstimatesServiceMock([
            testEstimate(),
            testEstimate({
              id: 'e2',
              number: 'PF-2026-1029',
              clientName: 'Café Habana',
              status: 'rejected',
            }),
          ]),
        ),
        { provide: PdfService, useValue: pdf },
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    page = harness.routeNativeElement as HTMLElement;
  }

  const numbers = () =>
    [...page.querySelectorAll('tbody tr a.font-bold')].map((a) => a.textContent?.trim());

  it('hides rejected estimates by default and sums only the active ones', async () => {
    await open();
    expect(numbers()).toEqual(['PF-2026-1028']);
    const stats = page.querySelector('dl')!.textContent!;
    expect(stats).toContain('$240.00');
    expect(page.textContent).toContain('Showing 1 of 2 estimates');
  });

  it('shows every status and searches from the URL', async () => {
    await open('/estimates?status=all&q=habana');
    expect(numbers()).toEqual(['PF-2026-1029']);
    expect(page.textContent).toContain('Rejected');
  });

  it('downloads the marked estimates together, in the list order', async () => {
    pdf.proformas.mockClear();
    pdf.download.mockClear();
    await open('/estimates?status=all');
    const boxes = () => [...page.querySelectorAll<HTMLInputElement>('tbody input[type=checkbox]')];
    expect(page.textContent).not.toContain('Download as one PDF');

    const all = page.querySelector<HTMLInputElement>('thead input[type=checkbox]')!;
    all.checked = true;
    all.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    expect(boxes().every((b) => b.checked)).toBe(true);
    expect(page.textContent).toContain('2 marked');

    boxes()[0].checked = false;
    boxes()[0].dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    expect(all.indeterminate).toBe(true);
    expect(page.textContent).toContain('1 marked');

    buttonByText(page, 'Download as one PDF').click();
    await harness.fixture.whenStable();
    expect(pdf.proformas).toHaveBeenCalledWith([expect.objectContaining({ id: 'e2' })]);
    expect(pdf.download).toHaveBeenCalledWith(
      expect.any(Blob),
      'Proforma_PF-2026-1029_Café Habana.pdf',
    );

    buttonByText(page, 'Clear marks').click();
    await harness.fixture.whenStable();
    expect(boxes().some((b) => b.checked)).toBe(false);
  });
});
