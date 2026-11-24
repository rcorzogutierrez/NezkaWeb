import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  createClientsServiceMock,
  provideClientsServiceMock,
} from '../../../testing/clients-service.mock';
import {
  createProductsServiceMock,
  provideProductsServiceMock,
} from '../../../testing/products-service.mock';
import {
  createEstimatesServiceMock,
  provideEstimatesServiceMock,
} from '../../../testing/estimates-service.mock';
import { useLanguage } from '../../../testing/setup';
import { es } from '../../core/i18n/messages.es';
import { DesktopImport, failureText } from './desktop-import';

describe('failureText', () => {
  it('says each cause once, with its code and a few of the names', () => {
    const failed = ['A', 'B', 'C', 'D', 'E'].map((name) => ({
      name,
      reason: 'storage/unauthorized',
    }));
    const text = failureText(es.desktopImport, [...failed, { name: 'PF-2', reason: 'x/y' }]);
    expect(text).toBe(
      '6 no se pudieron guardar. Firebase Storage no dio permiso para subir la foto ' +
        '[storage/unauthorized]: A, B, C y 2 más. Error [x/y]: PF-2. ' +
        'Vuelve a importar el archivo para reintentarlo.',
    );
  });
});

describe('DesktopImport', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'import', component: DesktopImport }]),
        provideProductsServiceMock(createProductsServiceMock()),
        provideClientsServiceMock(createClientsServiceMock()),
        provideEstimatesServiceMock(createEstimatesServiceMock()),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create('/import');
    page = harness.routeNativeElement as HTMLElement;
  });

  it('tells where the desktop database is', () => {
    expect(page.textContent).toContain(String.raw`%APPDATA%\Elpidio Jr. Produce Co\Nezka Invoice`);
    expect(page.textContent).toContain('close Nezka Invoice');
  });

  it('explains when the file is not the database', async () => {
    const input = page.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [new File(['name,email\n'], 'clientes.csv', { type: 'text/csv' })],
    });
    input.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 50));
    await harness.fixture.whenStable();
    expect(page.textContent).toContain('That file is not a database. Choose nezka.db.');
    expect(page.querySelector('table')).toBeNull();
  });
});
