import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * End-to-end: open the AI panel and assert the VoiceButton renders.
 *
 * The button's aria-label depends on `window.SpeechRecognition` /
 * `window.webkitSpeechRecognition`. In headless Chromium without the desktop
 * Web Speech API the "supported" branch is false, so the label is
 * "Voice input not supported in this browser". In Chrome stable with Web
 * Speech available the label is "Hold to record voice message". We accept
 * either to keep the spec stable across environments.
 *
 * We do NOT exercise speech recognition itself — that needs real microphone
 * hardware which neither CI nor headless Chromium can fake.
 */
test.describe("voice button", () => {
  test("renders inside the AI panel with one of the two valid aria-labels", async ({ page }) => {
    await signIn(page);

    // Open the AI panel via the floating "Schedule with AI" button (its
    // `aria-label` is "Open AI assistant" — see DashboardPage.tsx).
    const openAI = page.getByRole("button", { name: /open ai assistant/i });
    await expect(openAI).toBeVisible({ timeout: 15_000 });
    await openAI.click();

    // The AI panel surfaces the VoiceButton with one of two aria-labels.
    // AIAssistant renders both a desktop drawer (`<aside aria-label="AI
    // assistant">`) and a mobile bottom-sheet sibling, so multiple nodes
    // match. Scope to the visible desktop drawer.
    const desktopDrawer = page.locator('aside[aria-label="AI assistant"]');
    await expect(desktopDrawer).toBeVisible({ timeout: 15_000 });

    const voiceButton = desktopDrawer.locator(
      'button[aria-label="Hold to record voice message"], button[aria-label="Voice input not supported in this browser"]'
    );

    await expect(voiceButton).toHaveCount(1, { timeout: 15_000 });
    await expect(voiceButton).toBeVisible();

    const label = await voiceButton.getAttribute("aria-label");
    expect(label).toMatch(
      /^(Hold to record voice message|Voice input not supported in this browser)$/
    );
  });
});
