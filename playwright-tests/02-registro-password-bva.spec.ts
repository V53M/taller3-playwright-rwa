import { test, expect, Page } from '@playwright/test';

/**
 * Ejercicio práctico - Módulo de Registro de Usuarios
 * Regla: la contraseña debe contener un mínimo de 4 caracteres.
 * Técnica: Análisis de Valores Límite (BVA) + Particiones de Equivalencia.
 *
 * Particiones:
 *   P1 (inválida): longitud 0  -> campo vacío
 *   P2 (inválida): longitud 1 a 3
 *   P3 (válida):   longitud >= 4
 * Valores límite evaluados: 0, 1, 3, 4, 5
 */

const MENSAJE_MINIMO = 'Password must contain at least 4 characters';
const MENSAJE_VACIO = 'Enter your password';

// Localizadores del formulario /signup (atributos data-test de la RWA)
const campo = (page: Page, dataTest: string) =>
  page.locator(`[data-test="${dataTest}"] input`);

async function llenarRegistro(page: Page, username: string, password: string) {
  await page.goto('/signup');
  await campo(page, 'signup-first-name').fill('Victor');
  await campo(page, 'signup-last-name').fill('Marin');
  await campo(page, 'signup-username').fill(username);
  await campo(page, 'signup-password').fill(password);
  await campo(page, 'signup-confirmPassword').fill(password);
  // Quitar el foco para que se dispare la validación del formulario
  await campo(page, 'signup-confirmPassword').blur();
}

const usuarioUnico = (sufijo: string) => `bva_${sufijo}_${Date.now()}`;

test.describe('Registro de usuarios - Contraseña mínimo 4 caracteres (BVA)', () => {

  test('CP-01 | Límite 0: contraseña vacía es rechazada', async ({ page }) => {
    await page.goto('/signup');
    await campo(page, 'signup-first-name').fill('Victor');
    await campo(page, 'signup-last-name').fill('Marin');
    await campo(page, 'signup-username').fill(usuarioUnico('cp01'));
    await campo(page, 'signup-password').focus();
    await campo(page, 'signup-password').blur();

    await expect(page.getByText(MENSAJE_VACIO)).toBeVisible();
    await expect(page.locator('[data-test="signup-submit"]')).toBeDisabled();
  });

  // Valores inválidos: por debajo del mínimo
  const invalidos = [
    { id: 'CP-02', longitud: 1, password: 'a' },
    { id: 'CP-03', longitud: 3, password: 'abc' },
  ];

  for (const caso of invalidos) {
    test(`${caso.id} | Límite ${caso.longitud}: contraseña de ${caso.longitud} caracter(es) es rechazada`, async ({ page }) => {
      await llenarRegistro(page, usuarioUnico(caso.id), caso.password);

      await expect(page.getByText(MENSAJE_MINIMO)).toBeVisible();
      await expect(page.locator('[data-test="signup-submit"]')).toBeDisabled();
    });
  }

  // Valores válidos: en el mínimo y justo por encima
  const validos = [
    { id: 'CP-04', longitud: 4, password: 'abcd' },
    { id: 'CP-05', longitud: 5, password: 'abcde' },
  ];

  for (const caso of validos) {
    test(`${caso.id} | Límite ${caso.longitud}: contraseña de ${caso.longitud} caracteres es aceptada y permite iniciar sesión`, async ({ page }) => {
      const username = usuarioUnico(caso.id);
      await llenarRegistro(page, username, caso.password);

      // Sin mensaje de error y botón habilitado
      await expect(page.getByText(MENSAJE_MINIMO)).toHaveCount(0);
      const botonRegistro = page.locator('[data-test="signup-submit"]');
      await expect(botonRegistro).toBeEnabled();

      // Registro exitoso: el servidor crea el usuario (201 Created)
      const [respuestaRegistro] = await Promise.all([
        page.waitForResponse(r => r.url().includes('/users') && r.request().method() === 'POST'),
        botonRegistro.click(),
      ]);
      expect(respuestaRegistro.status()).toBe(201);

      // Confirmación: el usuario nuevo puede iniciar sesión con esa contraseña
      await page.goto('/signin');
      await page.getByLabel('Username').fill(username);
      await page.getByLabel('Password').fill(caso.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(`@${username}`)).toBeVisible();
    });
  }

  // Misma regla verificada directamente en la API (sin pasar por el formulario)
  test('CP-06 | Límite 3 vía API: el backend rechaza una contraseña de 3 caracteres', async ({ request }) => {
    const respuesta = await request.post('http://localhost:3001/users', {
      data: {
        firstName: 'Victor',
        lastName: 'Marin',
        username: usuarioUnico('cp06'),
        password: 'abc',
        confirmPassword: 'abc',
      },
    });

    // Se espera un error 4xx (petición inválida), no la creación del usuario
    expect(respuesta.status(), 'La API no debería crear usuarios con contraseña < 4').toBeGreaterThanOrEqual(400);
  });
});
