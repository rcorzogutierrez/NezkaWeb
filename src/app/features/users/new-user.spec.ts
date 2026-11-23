import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FirebaseError } from 'firebase/app';
import { submit, type } from '../../../testing/dom';
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

  it('creates a regular user by default and returns to the list with a confirmation', async () => {
    type(page, 'Name', 'Dora Gil');
    type(page, 'Email', 'Dora@Example.com');
    await send();
    expect(users.create).toHaveBeenCalledWith({
      name: 'Dora Gil',
      email: 'Dora@Example.com',
      role: 'user',
    });
    expect(TestBed.inject(Router).url).toBe('/users');
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

  it('explains when the email is already taken', async () => {
    users.create.mockRejectedValueOnce(new FirebaseError('auth/email-already-in-use', 'x'));
    type(page, 'Name', 'Ana');
    type(page, 'Email', 'ana@example.com');
    await send();
    expect(page.querySelector('[role=alert]')?.textContent).toContain(
      'There is already an account with that email.',
    );
    expect(TestBed.inject(Router).url).toBe('/users/new');
  });
});
