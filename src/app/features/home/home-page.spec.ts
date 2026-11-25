import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  createAuthServiceMock,
  provideAuthServiceMock,
  testUser,
} from '../../../testing/auth-service.mock';
import {
  createClientsServiceMock,
  provideClientsServiceMock,
  testClient,
} from '../../../testing/clients-service.mock';
import {
  createEstimatesServiceMock,
  provideEstimatesServiceMock,
  testEstimate,
} from '../../../testing/estimates-service.mock';
import {
  createProductsServiceMock,
  provideProductsServiceMock,
  testProduct,
} from '../../../testing/products-service.mock';
import {
  createUsersServiceMock,
  provideUsersServiceMock,
} from '../../../testing/users-service.mock';
import { useLanguage } from '../../../testing/setup';
import type { UserProfile } from '../../core/users/user-profile';
import { HomePage } from './home-page';

describe('HomePage', () => {
  let page: HTMLElement;
  const year = new Date().getFullYear();

  async function open(user: UserProfile, language: 'en' | 'es' = 'en') {
    const users = createUsersServiceMock([user, testUser({ uid: 'b', active: false })]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: HomePage }]),
        provideAuthServiceMock(createAuthServiceMock(user)),
        provideClientsServiceMock(createClientsServiceMock([testClient()])),
        provideProductsServiceMock(createProductsServiceMock([testProduct()])),
        provideEstimatesServiceMock(
          createEstimatesServiceMock([
            testEstimate({ date: `${year}-01-15`, status: 'draft' }),
            testEstimate({ id: 'e2', number: 'PF-0002', date: `${year}-01-10`, status: 'sent' }),
          ]),
        ),
        provideUsersServiceMock(users),
      ],
    });
    useLanguage(language);
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    page = harness.routeNativeElement as HTMLElement;
    return users;
  }

  it('greets by first name and offers the quick actions', async () => {
    await open(testUser());
    expect(page.querySelector('h1')?.textContent).toMatch(/Good (morning|afternoon|evening), Ana/);
    const actions = [...page.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));
    expect(actions).toEqual(['/estimates/new', '/clients/new', '/products/new']);
  });

  it('shows the figures, recent estimates and what needs attention', async () => {
    await open(testUser());
    const band = page.querySelector('#home-summary + ul')!.textContent!;
    expect(band).toContain('Active clients');
    expect(band).toContain(`Quoted in ${year}`);
    expect(band).toContain('$480.00');
    expect(page.textContent).toContain('PF-0002');
    expect(page.textContent).toContain('1 draft not sent');
    expect(page.textContent).toContain('1 estimate waiting for an answer');
    expect(page.textContent).toContain('1 product with missing data');
    expect(page.textContent).toContain('Tree Logistics');
  });

  it('keeps administration for administrators', async () => {
    const users = await open(testUser());
    expect(page.textContent).not.toContain('Administration');
    expect(users.watchAll).not.toHaveBeenCalled();
  });

  it('shows the team to administrators, in Spanish too', async () => {
    await open(testUser({ role: 'admin' }), 'es');
    expect(page.textContent).toContain('Administración');
    expect(page.textContent).toContain('1 usuario activo de 2');
    expect(page.textContent).toContain('Clientes activos');
  });
});
