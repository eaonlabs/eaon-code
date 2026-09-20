import { describe, expect, it } from "vitest";
import { ThemePreviewComponent } from "../src/modes/interactive/components/theme-preview.ts";
import { getThemeByName } from "../src/modes/interactive/theme/theme.ts";

describe("theme preview", () => {
	it("renders the highlighted theme palette and updates without applying it globally", () => {
		const darkTheme = getThemeByName("dark-amber");
		const lightTheme = getThemeByName("light-amber");
		if (!darkTheme || !lightTheme) throw new Error("test themes not found");

		const preview = new ThemePreviewComponent("dark-amber");
		const darkLines = preview.render(80).join("\n");
		expect(darkLines).toContain("Preview: dark-amber");
		expect(darkLines).toContain(darkTheme.getBgAnsi("userMessageBg"));

		preview.setThemeName("light-amber");
		const lightLines = preview.render(80).join("\n");
		expect(lightLines).toContain("Preview: light-amber");
		expect(lightLines).toContain(lightTheme.getBgAnsi("userMessageBg"));
		expect(lightLines).not.toContain(darkTheme.getBgAnsi("userMessageBg"));
	});
});
