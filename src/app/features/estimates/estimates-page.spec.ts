import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  createEstimatesServiceMock,
  provideEstimatesServiceMock,
  testEstimate,
} from '../../../testing/estimates-service.mock';
import { useLanguage } from '../../../testing/setup';
import { PdfService } from '../../core/pdf/pdf.service';
import { EstimatesPage } from './estimates-page';

describe('EstimatesPage', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;

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
        { provide: PdfService, useValue: {} },
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
});
