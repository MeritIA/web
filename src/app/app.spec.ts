import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // La prueba de "should render title" que traia `ng new` comprobaba un
  // <h1>Hello, web</h1> del andamiaje que esta aplicacion no tiene nunca. Se
  // quito en vez de adaptarla: no afirmaba nada del producto.
});
