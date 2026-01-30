import { test, expect, request, type APIRequestContext, type Page } from '@playwright/test';

function unique(s: string) { return `${s}-${Date.now().toString().slice(-6)}`; }

test.describe('Startup flows — apply, interest, updates', () => {
  test('founder posts update; talent applies and expresses interest', async ({ page, baseURL }: { page: Page; baseURL: string }) => {
    const api: APIRequestContext = await request.newContext({ baseURL });

    // Create founder and startup
    const fEmail = unique('founder') + '@example.com';
    const fPass = 'FounderPass1!';
    await api.post('/api/v1/auth/register/', { data: { username: fEmail.split('@')[0], email: fEmail, password: fPass, password2: fPass, role: 'founder' } });
    const fLogin = await api.post('/api/v1/auth/login/', { data: { email: fEmail, password: fPass } });
    const fJson = await fLogin.json();
    const fToken = fJson.access || fJson.tokens?.access;

    const startupRes = await api.post('/api/v1/startups/', {
      data: { name: unique('E2EStartup'), industry: 'tech', description: 'e2e', stage: 'idea' },
      headers: { Authorization: `Bearer ${fToken}` }
    });
    const startup = await startupRes.json();

    // Create an opportunity for the startup
    const oppRes = await api.post('/api/v1/opportunities/', {
      data: { title: 'E2E Role', type: 'internship', startup: startup.id, status: 'open' },
      headers: { Authorization: `Bearer ${fToken}` }
    });
    const opportunity = await oppRes.json();

    // Create talent and login
    const tEmail = unique('talent') + '@example.com';
    const tPass = 'TalentPass1!';
    await api.post('/api/v1/auth/register/', { data: { username: tEmail.split('@')[0], email: tEmail, password: tPass, password2: tPass, role: 'talent' } });
    const tLogin = await api.post('/api/v1/auth/login/', { data: { email: tEmail, password: tPass } });
    const tJson = await tLogin.json();
    const tToken = tJson.access || tJson.tokens?.access;

    // Set localStorage for talent session
    await page.addInitScript((args: { access?: string; user?: any }) => {
      const a = args?.access ?? '';
      const u = args?.user ?? {};
      localStorage.setItem('collabhub_access_token', a);
      localStorage.setItem('collabhub_user', JSON.stringify(u));
    }, { access: tToken, user: tJson.user });

    // Go to startup-detail and apply
    await page.goto(`/app/startup-detail?id=${startup.id}`);
    await expect(page.locator('text=Open Opportunities')).toBeVisible();

    // Open apply modal — select opportunity and submit
    await page.click('button:has-text("Apply")');
    await expect(page.locator('#apply-opportunity')).toBeVisible();
    await page.selectOption('#apply-opportunity', String(opportunity.id));
    await page.fill('#cover-letter', 'I am eager to join');
    await page.click('#apply-form button[type="submit"]');

    await expect(page.locator('text=Application submitted successfully!')).toBeVisible({ timeout: 5000 });

    // Express interest (talent)
    await page.click('button:has-text("Express Interest")');
    await expect(page.locator('text=Interest sent — founder will be notified')).toBeVisible({ timeout: 5000 });

    // Now verify via API that application exists for the talent
    const apps = await api.get('/api/v1/collaborations/applications/', { headers: { Authorization: `Bearer ${tToken}` } });
    const appsJson = await apps.json();
    const appsArr = Array.isArray(appsJson) ? appsJson : (appsJson?.results ?? []);
    expect(appsArr.some((a: any) => a.opportunity === opportunity.id)).toBeTruthy();

    // Founder posts an update and it appears
    await api.post(`/api/v1/startups/${startup.id}/updates/`, {
      data: { title: 'Launch', content: 'We shipped v1' },
      headers: { Authorization: `Bearer ${fToken}` }
    });

    // Reload startup page and expect the update
    await page.reload();
    await expect(page.locator('text=We shipped v1')).toBeVisible();

    await api.dispose();
  });
});
