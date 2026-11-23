import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FirebaseError } from 'firebase/app';
import {
  type ClientsServiceMock,
  createClientsServiceMock,
  provideClientsServiceMock,
  testClient,
} from '../../../testing/clients-service.mock';
import { buttonByText } from '../../../testing/dom';
import { useLanguage } from '../../../testing/setup';
import { NoticeService } from '../../shared/ui/notice.service';
import { ImportClients } from './import-clients';

const CSV =
  'Customer,Company,Main Phone,City,State\n' +
  'Tree Logistics,,305-555-0101,Miami,FL\n' +
  'Bodega Latina,,786-555-0000,Hialeah,FL\n' +
  'Café Habana,,305-555-0110,Doral,FL\n';

describe('ImportClients', () => {
  let clients: ClientsServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;
  let component: ImportClients;

  beforeEach(async () => {
    clients = createClientsServiceMock([testClient({ name: 'TREE LOGISTICS' })]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'clients/import', component: ImportClients },
          { path: 'clients', children: [] },
        ]),
        provideClientsServiceMock(clients),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create('/clients/import');
    page = harness.routeNativeElement as HTMLElement;
    component = harness.routeDebugElement!.componentInstance as ImportClients;
  });

  async function load(name: string, content: string) {
    await component.load(new File([content], name));
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
  }

  it('previews the file and marks the clients that already exist', async () => {
    await load('customers.csv', CSV);
    const rows = [...page.querySelectorAll('tbody tr')].map((r) => r.textContent ?? '');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('Already exists');
    expect(rows[1]).toContain('New');
    expect(page.textContent).toContain('2 new clients · 1 skipped');
  });

  it('imports only the new clients and goes back to the list', async () => {
    await load('customers.csv', CSV);
    buttonByText(page, 'Import 2 clients').click();
    await harness.fixture.whenStable();
    expect(clients.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Bodega Latina', city: 'Hialeah' }),
      expect.objectContaining({ name: 'Café Habana' }),
    ]);
    expect(TestBed.inject(Router).url).toBe('/clients');
    expect(TestBed.inject(NoticeService).take()?.text()).toBe(
      '2 clients were imported from QuickBooks.',
    );
  });

  it('explains a file that is not a client list', async () => {
    await load('items.csv', 'Item,Price\nApple,1\n');
    expect(page.textContent).toContain('The client name column (Customer or Name) was not found.');
    expect(page.querySelector('table')).toBeNull();
  });

  it('shows the save error and stays on the page', async () => {
    await load('customers.csv', CSV);
    clients.createMany.mockRejectedValue(new FirebaseError('unavailable', 'x'));
    buttonByText(page, 'Import 2 clients').click();
    await harness.fixture.whenStable();
    expect(page.textContent).toContain('Cannot reach the server.');
  });
});
