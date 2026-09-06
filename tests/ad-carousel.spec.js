import { test, expect } from '@playwright/test';

const ads = [
  { label: 'Réseau 120 MPAKA', src: /Re%CC%81sau%20120\.png$/, href: null },
  { label: 'Les Cancres heureux', src: /les%20canceres%20heureux\.png$/, href: 'https://www.fnac.com/a21699840/Cedric-Mpindy-Les-Cancres-heureux' },
  { label: 'Le Sabre et le Goupillon', src: /Le%20sabre%20et%20le%20goupillon\.png$/, href: 'https://www.leslettresmouchetees.com/product-page/le-sabre-et-le-goupillon' },
];

test.describe('Carousel publicitaire', () => {
  test('affiche les trois publicites configurees avec leurs liens et controles accessibles', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/index.html');
    const carousel = page.locator('[data-ad-carousel]');
    await expect(carousel).toBeVisible();
    await expect(carousel.getByRole('button')).toHaveCount(3);

    for (let index = 0; index < ads.length; index += 1) {
      const ad = ads[index];
      const dot = carousel.getByRole('button', { name: `Afficher la publicité ${ad.label}` });
      await expect(dot).toBeVisible();
      await dot.click();

      const slide = carousel.locator('.ad-carousel__slide').nth(index);
      await expect(slide.locator('img')).toHaveAttribute('src', ad.src);
      await expect(slide.locator('img')).toHaveAttribute('alt');

      const link = slide.locator('a');
      if (ad.href) {
        await expect(link).toHaveAttribute('href', ad.href);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      } else {
        await expect(link).toHaveCount(0);
      }
    }

    expect(consoleErrors).toEqual([]);
  });

  test('boucle automatiquement, se met en pause au survol et supporte le swipe', async ({ page }) => {
    await page.goto('/index.html');
    const carousel = page.locator('[data-ad-carousel]');

    await page.waitForTimeout(6200);
    await expect(carousel.getByRole('button', { name: 'Afficher la publicité Les Cancres heureux' })).toHaveAttribute('aria-current', 'true');

    await carousel.hover();
    await page.waitForTimeout(6200);
    await expect(carousel.getByRole('button', { name: 'Afficher la publicité Les Cancres heureux' })).toHaveAttribute('aria-current', 'true');

    await page.setViewportSize({ width: 375, height: 667 });
    await carousel.dispatchEvent('touchstart', { changedTouches: [{ identifier: 1, clientX: 300 }] });
    await carousel.dispatchEvent('touchend', { changedTouches: [{ identifier: 1, clientX: 100 }] });
    await expect(carousel.getByRole('button', { name: 'Afficher la publicité Le Sabre et le Goupillon' })).toHaveAttribute('aria-current', 'true');
  });

  test('preserve un carousel et footer lisibles sur tablette et mobile', async ({ page }) => {
    for (const viewport of [
      { width: 768, height: 900 },
      { width: 375, height: 667 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/index.html');
      const carousel = page.locator('[data-ad-carousel]');
      const footer = page.locator('.site-footer');

      await expect(carousel).toBeVisible();
      await expect(footer).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      const imageBox = await carousel.locator('img').first().boundingBox();
      expect((imageBox?.width ?? 0) / (imageBox?.height ?? 1)).toBeCloseTo(1190 / 256, 1);
    }
  });
});