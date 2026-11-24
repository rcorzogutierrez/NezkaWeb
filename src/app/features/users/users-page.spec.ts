import { FirebaseError } from 'firebase/app';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  createAuthServiceMock,
  provideAuthServiceMock,
  testUser,
} from '../../../testing/auth-service.mock';
import { buttonByText, submit, type } from '../../../testing/dom';
import { useLanguage } from '../../../testing/setup';
import {
  type UsersServiceMock,
  createUsersServiceMock,
  provideUsersServiceMock,
} from '../../../testing/users-service.mock';
import { UsersPage } from './users-page';

const me = testUser({ uid: 'ana', name: 'Ana Pérez', role: 'admin' });
const beto = testUser({ uid: 'beto', name: 'Beto Ruiz', email: 'beto@example.com' });
const carla = testUser({
  uid: 'carla',
  name: 'Carla Díaz',
  email: 'carla@example.com',
  active: false,
});

describe('UsersPage', () => {
  let users: UsersServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  beforeEach(async () => {
    users = createUsersServiceMock([me, beto, carla]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'users', component: UsersPage }]),
        provideAuthServiceMock(createAuthServiceMock(me)),
        provideUsersServiceMock(users),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create('/users');
    page = harness.routeNativeElement as HTMLElement;
  });

  const row = (name: string) =>
    [...page.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes(name),
    ) as HTMLElement;

  it('lists everyone with role and status', () => {
    expect(page.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(row('Carla Díaz').textContent).toContain('Inactive');
    expect(page.textContent).toContain('3 users · 1 inactive');
  });

  it('does not let admins demote or deactivate themselves', () => {
    const mine = row('Ana Pérez');
    expect(mine.textContent).toContain('You');
    expect((mine.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
    expect(mine.textContent).not.toContain('Deactivate');
  });

  it('changes the role of someone else', async () => {
    const select = row('Beto Ruiz').querySelector('select') as HTMLSelectElement;
    select.value = 'admin';
    select.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    expect(users.update).toHaveBeenCalledWith('beto', { role: 'admin' });
    expect(page.textContent).toContain('Beto Ruiz is now an administrator.');
  });

  it('deactivates and reactivates accounts', async () => {
    buttonByText(row('Beto Ruiz'), 'Deactivate').click();
    await harness.fixture.whenStable();
    expect(users.update).toHaveBeenCalledWith('beto', { active: false });

    buttonByText(row('Carla Díaz'), 'Activate').click();
    await harness.fixture.whenStable();
    expect(users.update).toHaveBeenCalledWith('carla', { active: true });
  });

  it('resends the choose-a-password email', async () => {
    buttonByText(row('Beto Ruiz'), 'Resend email').click();
    await harness.fixture.whenStable();
    expect(users.sendPasswordSetup).toHaveBeenCalledWith('beto@example.com');
    expect(page.querySelector('[role=status]')?.textContent).toContain('beto@example.com');
  });

  /** jsdom has no modal dialogs: open and close them by hand. */
  const dialogs = () => {
    for (const d of page.querySelectorAll('dialog')) {
      d.showModal = function () {
        this.setAttribute('open', '');
      };
      d.close = function () {
        this.removeAttribute('open');
      };
    }
    const [remove, password] = [...page.querySelectorAll('dialog')] as HTMLDialogElement[];
    return { remove, password };
  };

  it('never offers to delete or set the password of your own account', () => {
    const mine = row('Ana Pérez');
    expect(mine.textContent).not.toContain('Delete');
    expect(mine.textContent).not.toContain('Set password');
  });

  it('deletes someone after confirming', async () => {
    const { remove } = dialogs();
    buttonByText(row('Beto Ruiz'), 'Delete').click();
    harness.detectChanges();
    expect(remove.open).toBe(true);
    expect(remove.textContent).toContain('Delete Beto Ruiz?');
    expect(remove.textContent).toContain('beto@example.com');
    buttonByText(remove, 'Delete user').click();
    await harness.fixture.whenStable();
    expect(users.remove).toHaveBeenCalledWith('beto');
    expect(remove.open).toBe(false);
    expect(page.textContent).toContain('Beto Ruiz was deleted.');
  });

  it('keeps the dialog open with the reason when the server refuses', async () => {
    users.remove.mockRejectedValueOnce(new FirebaseError('functions/internal', 'x'));
    const { remove } = dialogs();
    buttonByText(row('Beto Ruiz'), 'Delete').click();
    harness.detectChanges();
    buttonByText(remove, 'Delete user').click();
    await harness.fixture.whenStable();
    expect(remove.open).toBe(true);
    expect(remove.textContent).toContain('The server did not answer.');
  });

  it('sets a simple password of 6 characters', async () => {
    const { password } = dialogs();
    buttonByText(row('Beto Ruiz'), 'Set password').click();
    harness.detectChanges();
    expect(password.open).toBe(true);

    type(password, 'New password', '12345');
    submit(password);
    await harness.fixture.whenStable();
    expect(users.setPassword).not.toHaveBeenCalled();
    expect(password.textContent).toContain('Use at least 6 characters.');

    type(password, 'New password', '123456');
    submit(password);
    await harness.fixture.whenStable();
    expect(users.setPassword).toHaveBeenCalledWith('beto', '123456', false);
    expect(password.open).toBe(false);
    expect(page.textContent).toContain('Beto Ruiz can sign in with the new password.');
  });

  it('can ask them to change it when they sign in', async () => {
    const { password } = dialogs();
    buttonByText(row('Carla Díaz'), 'Set password').click();
    harness.detectChanges();
    type(password, 'New password', 'nezka1');
    const check = password.querySelector('input[type=checkbox]') as HTMLInputElement;
    check.click();
    submit(password);
    await harness.fixture.whenStable();
    expect(users.setPassword).toHaveBeenCalledWith('carla', 'nezka1', true);
  });
});
