import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  createClientsServiceMock,
  provideClientsServiceMock,
  testClient,
} from '../../../testing/clients-service.mock';
import { buttonByText } from '../../../testing/dom';
import { useLanguage } from '../../../testing/setup';
import { ClientsPage } from './clients-page';

const tree = testClient({
  id: 'tree',
  branch: 'A Tree Corporation Branch',
  city: 'Miami',
  state: 'FL',
  zipCode: '33142',
  phone: '305-555-0142',
});
const bodega = testClient({ id: 'bodega', name: 'Bodega La Esquina', city: 'Hialeah' });
const habana = testClient({ id: 'habana', name: 'Café Habana', active: false });

describe('ClientsPage', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  async function open(url: string, list = [bodega, habana, tree]) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'clients', component: ClientsPage }], withComponentInputBinding()),
        provideClientsServiceMock(createClientsServiceMock(list)),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create(url);
    page = harness.routeNativeElement as HTMLElement;
  }

  const names = () =>
    [...page.querySelectorAll('tbody tr td:first-child a')].map((a) => a.textContent?.trim());

  function search(text: string) {
    const input = page.querySelector('input[type=search]') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    harness.fixture.detectChanges();
  }

  it('lists the clients with location, phone and status', async () => {
    await open('/clients');
    expect(names()).toEqual(['Bodega La Esquina', 'Café Habana', 'Tree Logistics']);
    const row = page.querySelectorAll('tbody tr')[2];
    expect(row.textContent).toContain('Miami, FL 33142');
    expect(row.textContent).toContain('305-555-0142');
    expect(page.querySelectorAll('tbody tr')[1].textContent).toContain('Inactive');
    expect(page.textContent).toContain('3 clients');
  });

  it('filters by search text and keeps it in the URL', async () => {
    await open('/clients');
    search('hialeah');
    expect(names()).toEqual(['Bodega La Esquina']);
    expect(page.textContent).toContain('Showing 1 of 3 clients');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/clients?q=hialeah');
  });

  it('opens with the filter from the URL', async () => {
    await open('/clients?status=inactive');
    expect(names()).toEqual(['Café Habana']);
    const label = [...page.querySelectorAll('fieldset label')].map((l) =>
      l.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(label).toEqual(['All 3', 'Active 2', 'Inactive 1']);
  });

  it('says when nothing matches and clears the search', async () => {
    await open('/clients?q=zzz');
    expect(page.textContent).toContain('No client matches');
    buttonByText(page, 'Show all clients').click();
    harness.fixture.detectChanges();
    expect(names()).toHaveLength(3);
  });

  it('invites to add the first client when there are none', async () => {
    await open('/clients', []);
    expect(page.textContent).toContain('No clients yet');
  });
});
