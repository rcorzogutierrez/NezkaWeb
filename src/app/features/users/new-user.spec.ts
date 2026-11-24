import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FirebaseError } from 'firebase/app';
import { inputByLabel, submit, type } from '../../../testing/dom';
import { useLanguage } from '../../../testing/setup';
import {
  type UsersServiceMock,
  createUsersServiceMock,
  provideUsersServiceMock,
} from '../../../testing/users-service.mock';
import { NoticeService } from '../../shared/ui/notice.service';
import { NewUser } from './new-user';

describe('NewUser', () => {
  let users: UsersServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  beforeEach(async () => {
    users = createUsersServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'users/new', component: NewUser },
          { path: 'users', children: [] },
        ]),
        provideUsersServiceMock(users),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create('/users/new');
    page = harness.routeNativeElement as HTMLElement;
  });

  async function send() {
    submit(page);
    await harness.fixture.whenStable();
  }

  it('requires a name and a valid email', async () => {
    type(page, 'Email', 'not-an-email');
    await send();
    expect(page.textContent).toContain('This field is required.');
    expect(page.textContent).toContain('That email address is not valid.');
    expect(users.create).not.toHaveBeenCalled();
  });

  it('creates a regular user with a temporary password by default', async () => {
    type(page, 'Name', 'Dora Gil');
    type(page, 'Email', 'Dora@Example.com');
    const password = inputByLabel(page, 'Temporary password').value;
    expect(password).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
    await send();
    expect(users.create).toHaveBeenCalledWith({
      name: 'Dora Gil',
      email: 'Dora@Example.com',
      role: 'user',
      temporaryPassword: password,
    });
    expect(TestBed.inject(Router).url).toBe('/users');
    expect(TestBed.inject(NoticeService).take()?.text()).toContain(password);
  });

  it('accepts a password typed by the administrator, if it is long enough', async () => {
    type(page, 'Name', 'Dora Gil');
    type(page, 'Email', 'dora@example.com');
    type(page, 'Temporary password', 'corta');
    await send();
    expect(users.create).not.toHaveBeenCalled();
    expect(page.textContent).toContain('at least 6');
    type(page, 'Temporary password', 'nezka1');
    await send();
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ temporaryPassword: 'nezka1' }),
    );
  });

  it('can send an email link instead', async () => {
    type(page, 'Name', 'Dora Gil');
    type(page, 'Email', 'Dora@Example.com');
    (page.querySelector('input[type=radio][value=email]') as HTMLInputElement).click();
    harness.fixture.detectChanges();
    expect(page.textContent).not.toContain('Generate another');
    await send();
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ temporaryPassword: undefined }),
    );
    expect(TestBed.inject(NoticeService).take()?.text()).toContain('dora@example.com');
  });

  it('can create an administrator', async () => {
    type(page, 'Name', 'Eva Luna');
    type(page, 'Email', 'eva@example.com');
    const admin = page.querySelector('input[type=radio][value=admin]') as HTMLInputElement;
    admin.click();
    await send();
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }));
  });

  it('offers to reuse the sign-in of someone deleted before', async () => {
    users.create.mockRejectedValueOnce(new FirebaseError('auth/email-already-in-use', 'x'));
    type(page, 'Name', 'Ana');
    type(page, 'Email', 'ana@example.com');
    type(page, 'Temporary password', 'nezka1');
    await send();
    expect(page.textContent).toContain('That email already has a sign-in from before');
    expect(page.querySelector('a[href*="authentication/users"]')).not.toBeNull();
    expect(TestBed.inject(Router).url).toBe('/users/new');

    type(page, 'Current password of that account', 'vieja1');
    await send();
    expect(users.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ temporaryPassword: 'nezka1', currentPassword: 'vieja1' }),
    );
    expect(TestBed.inject(Router).url).toBe('/users');
  });

  it('says when the person is already in the list', async () => {
    users.create.mockRejectedValueOnce(new FirebaseError('app/user-exists', 'x'));
    type(page, 'Name', 'Ana');
    type(page, 'Email', 'ana@example.com');
    await send();
    expect(page.querySelector('[role=alert]')?.textContent).toContain(
      'That person is already in the user list.',
    );
  });
});
