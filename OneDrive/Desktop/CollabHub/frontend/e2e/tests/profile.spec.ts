import { test, expect, request, type APIRequestContext, type Page } from '@playwright/test';

function unique(s: string) { return `${s}-${Date.now().toString().slice(-6)}`; }

test.describe('Profile — skills flow', () => {
  test('add and remove skill (UI) — end-to-end', async ({ page, baseURL }: { page: Page; baseURL: string }) => {
    const api: APIRequestContext = await request.newContext({ baseURL });

    const email = unique('talent') + '@example.com';
    const password = 'TestPass123!';

    // register + login
    await api.post('/api/v1/auth/register/', { data: { username: email.split('@')[0], email, password, password2: password, role: 'talent' } });
    const login = await api.post('/api/v1/auth/login/', { data: { email, password } });
    const loginJson = await login.json();
    const access = loginJson.access || loginJson.tokens?.access;
    const user = loginJson.user;

    // set auth in localStorage before page load (serialize defensively)
    await page.addInitScript((args: { access?: string; user?: any }) => {
      const a = args?.access ?? '';
      const u = args?.user ?? {};
      localStorage.setItem('collabhub_access_token', a);
      localStorage.setItem('collabhub_user', JSON.stringify(u));
    }, { access, user });

    await page.goto('/app/profile');
    await expect(page.locator('text=Skills')).toBeVisible();

    // Open add-skill modal
    await page.click('text=+ Add Skill');
    await expect(page.locator('#skillModal')).toBeVisible();

    const skillName = unique('PlaywrightTestSkill');
    await page.fill('#skillSearch', skillName);
    await page.selectOption('#proficiency', 'intermediate');
    await page.click('#skillForm button[type="submit"]');

    // Expect success toast and skill in list
    await expect(page.locator('text=Skill added successfully')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#skills-list')).toContainText(skillName);

    // Remove the skill via UI
    const skillTag = page.locator('#skills-list').locator(`text=${skillName}`);
    await skillTag.locator('button').click();
    await expect(page.locator('text=Skill removed')).toBeVisible();
    await expect(page.locator('#skills-list')).not.toContainText(skillName);

    await api.dispose();
  });
});
