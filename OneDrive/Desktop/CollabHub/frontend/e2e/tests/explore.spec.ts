import { test, expect, request, type APIRequestContext, type Page } from '@playwright/test';

function unique(s: string) { return `${s}-${Date.now().toString().slice(-6)}`; }

test('Explore — search and express interest (talent)', async ({ page, baseURL }: { page: Page; baseURL: string }) => {
  const api: APIRequestContext = await request.newContext({ baseURL });

  const fEmail = unique('founder') + '@example.com';
  const fPass = 'FounderPass1!';
  await api.post('/api/v1/auth/register/', { data: { username: fEmail.split('@')[0], email: fEmail, password: fPass, password2: fPass, role: 'founder' } });
  const fLogin = await api.post('/api/v1/auth/login/', { data: { email: fEmail, password: fPass } });
  const fJson = await fLogin.json();
  const fToken = fJson.access || fJson.tokens?.access;

  const startupRes = await api.post('/api/v1/startups/', {
    data: { name: unique('ExploreCo'), industry: 'ai', description: 'explore' },
    headers: { Authorization: `Bearer ${fToken}` }
  });
  const startup = await startupRes.json();

  const tEmail = unique('talent') + '@example.com';
  const tPass = 'TalentPass1!';
  await api.post('/api/v1/auth/register/', { data: { username: tEmail.split('@')[0], email: tEmail, password: tPass, password2: tPass, role: 'talent' } });
  const tLogin = await api.post('/api/v1/auth/login/', { data: { email: tEmail, password: tPass } });
  const tJson = await tLogin.json();
  const tToken = tJson.access || tJson.tokens?.access;

  await page.addInitScript((args: { access?: string; user?: any }) => {
    const a = args?.access ?? '';
    const u = args?.user ?? {};
    localStorage.setItem('collabhub_access_token', a);
    localStorage.setItem('collabhub_user', JSON.stringify(u));
  }, { access: tToken, user: tJson.user });

  await page.goto('/app/explore-startups');
  await page.fill('#explore-search', startup.name);
  await page.waitForTimeout(600); // debounce
  await expect(page.locator(`text=${startup.name}`)).toBeVisible({ timeout: 5000 });

  // click the interest button within the startup card (more robust selector)
  await page.locator(`article:has-text("${startup.name}")`).getByRole('button', { name: "I'm Interested" }).click();
  await expect(page.locator('text=Interest sent')).toBeVisible({ timeout: 5000 });

  // Verify interest via API
  const resp = await api.get(`/api/v1/startups/${startup.id}/interests/`, { headers: { Authorization: `Bearer ${fToken}` } });
  const json = await resp.json();
  const arr = Array.isArray(json) ? json : (json?.results ?? []);
  expect(arr.some((i: any) => i.user?.email === tEmail)).toBeTruthy();

  await api.dispose();
});
