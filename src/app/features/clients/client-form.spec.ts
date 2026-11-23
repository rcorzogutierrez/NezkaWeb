import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FirebaseError } from 'firebase/app';
import {
  createAuthServiceMock,
  provideAuthServiceMock,
  testUser,
} from '../../../testing/auth-service.mock';
import {
  type ClientsServiceMock,
  createClientsServiceMock,
  provideClientsServiceMock,
  testClient,
} from '../../../testing/clients-service.mock';
import { buttonByText, inputByLabel, submit, type } from '../../../testing/dom';
import { useLanguage } from '../../../testing/setup';
import { NoticeService } from '../../shared/ui/notice.service';
import { ClientForm } from './client-form';

const tree = testClient({ id: 'tree', city: 'Miami', email: 'compras@tree.com' });

describe('ClientForm', () => {
  let clients: ClientsServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  async function open(url: string, role: 'admin' | 'user' = 'user') {
    clients = createClientsServiceMock([tree]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'clients/new', component: ClientForm },
            { path: 'clients/:id', component: ClientForm },
            { path: 'clients', children: [] },
          ],
          withComponentInputBinding(),
        ),
        provideClientsServiceMock(clients),
        provideAuthServiceMock(createAuthServiceMock(testUser({ role }))),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    page = harness.routeNativeElement as HTMLElement;
  }

  async function send() {
    submit(page);
    await harness.fixture.whenStable();
  }

  it('creates a client and goes back to the list with a notice', async () => {
    await open('/clients/new');
    type(page, 'Client name', ' Bodega La Esquina ');
    type(page, 'City', 'Hialeah');
    await send();
    expect(clients.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: ' Bodega La Esquina ', city: 'Hialeah', active: true }),
    );
    expect(TestBed.inject(Router).url).toBe('/clients');
    expect(TestBed.inject(NoticeService).take()?.text()).toBe('Bodega La Esquina was saved.');
  });

  it('requires a name and a valid email', async () => {
    await open('/clients/new');
    type(page, 'Email', 'no-es-correo');
    await send();
    expect(clients.create).not.toHaveBeenCalled();
    expect(page.textContent).toContain('This field is required.');
    expect(page.textContent).toContain('That email address is not valid.');
  });

  it('warns about a duplicate name and saves on the second try', async () => {
    await open('/clients/new');
    clients.nameTaken.mockResolvedValue(true);
    type(page, 'Client name', 'Tree Logistics');
    await send();
    expect(clients.create).not.toHaveBeenCalled();
    expect(page.textContent).toContain('A client named “Tree Logistics” already exists.');
    buttonByText(page, 'Save anyway');
    await send();
    expect(clients.create).toHaveBeenCalledTimes(1);
  });

  it('loads an existing client and saves changes', async () => {
    await open('/clients/tree');
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Tree Logistics');
    expect(inputByLabel(page, 'Email').value).toBe('compras@tree.com');
    type(page, 'City', 'Doral');
    await send();
    expect(clients.update).toHaveBeenCalledWith(
      'tree',
      expect.objectContaining({ name: 'Tree Logistics', city: 'Doral' }),
    );
  });

  it('says so when the client does not exist', async () => {
    await open('/clients/nadie');
    expect(page.textContent).toContain('That client does not exist or was deleted.');
    expect(page.querySelector('form')).toBeNull();
  });

  it('shows the save error', async () => {
    await open('/clients/tree');
    clients.update.mockRejectedValue(new FirebaseError('permission-denied', 'x'));
    await send();
    expect(page.textContent).toContain('You do not have permission to do this.');
  });

  it('only administrators can delete', async () => {
    await open('/clients/tree');
    expect(page.textContent).not.toContain('Delete client');
  });

  it('an administrator deletes after confirming', async () => {
    await open('/clients/tree', 'admin');
    const dialog = page.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = function () {
      this.open = true;
    };
    dialog.close = function () {
      this.open = false;
    };
    buttonByText(page, 'Delete client').click();
    expect(dialog.open).toBe(true);
    buttonByText(dialog, 'Delete').click();
    await harness.fixture.whenStable();
    expect(clients.remove).toHaveBeenCalledWith('tree');
    expect(TestBed.inject(Router).url).toBe('/clients');
  });
});
