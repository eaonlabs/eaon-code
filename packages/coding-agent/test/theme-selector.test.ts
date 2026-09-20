import { setKeybindings } from "@eaonlabs/eaon-tui";
import { beforeAll, describe, expect, it } from "vitest";
import { KeybindingsManager } from "../src/core/keybindings.ts";
import { ThemeSelectorComponent } from "../src/modes/interactive/components/theme-selector.ts";
import { getThemeByName, initTheme } from "../src/modes/interactive/theme/theme.ts";

beforeAll(() => {
	initTheme("dark-amber");
	setKeybindings(new KeybindingsManager());
});

describe("ThemeSelectorComponent", () => {
	it("updates the inline preview as the highlighted theme changes", () => {
		const amber = getThemeByName("dark-amber");
		const copper = getThemeByName("dark-copper");
		if (!amber || !copper) throw new Error("test themes not found");

		const selector = new ThemeSelectorComponent(
			"dark-amber",
			() => {},
			() => {},
			{
				themes: ["dark-amber", "dark-copper"],
				title: "Dark themes",
			},
		);
		let output = selector.render(80).join("\n");
		expect(output).toContain("Preview: dark-amber");
		expect(output).toContain(amber.getBgAnsi("userMessageBg"));

		selector.getSelectList().handleInput("\x1b[B");
		output = selector.render(80).join("\n");
		expect(output).toContain("Preview: dark-copper");
		expect(output).toContain(copper.getBgAnsi("userMessageBg"));
		expect(output).toContain(copper.getFgAnsi("accent"));
	});
});
