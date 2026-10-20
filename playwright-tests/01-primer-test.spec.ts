import { test, expect } from '@playwright/test';

test.describe('Introducción a Playwright - Flujo Básico', () => {

  test('Debe permitir el inicio de sesión exitoso en la RealWorld App', async ({ page }) => {
    // 1. Navegar a la página de login
    await page.goto('/signin');

    // 2. Llenar el formulario (sin espacios en los valores)
    await page.getByLabel('Username').fill('Dina20');
    await page.getByLabel('Password').fill('s3cret');

    // 3. Clic en Sign in
    await page.getByRole('button', { name: /sign in/i }).click();

    // 4. Verificación: el botón "NEW" es visible en el dashboard
    await expect(page.getByRole('link', { name: /new/i })).toBeVisible();
  });

});