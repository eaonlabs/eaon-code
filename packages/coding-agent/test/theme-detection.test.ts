import { resetCapabilitiesCache, setCapabilities } from "@eaonlabs/eaon-tui";
import { afterEach, describe, expect, it } from "vitest";
import {
	getAvailableThemes,
	getDarkThemeNames,
	getDefaultTheme,
	getLightThemeNames,
	getThemeByName,
} from "../src/modes/interactive/theme/theme.ts";

afterEach(() => {
	resetCapabilitiesCache();
});

describe("theme documents", () => {
	it("keeps amber as the default theme", () => {
		expect(getDefaultTheme()).toBe("amber");
		expect(getThemeByName("amber")?.name).toBe("amber");
	});

	it("partitions the available documents into explicit dark and light lists", () => {
		expect(getDarkThemeNames()).toContain("amber");
		expect(getDarkThemeNames()).not.toContain("light-amber");
		expect(getLightThemeNames()).toContain("light-amber");
		expect(getLightThemeNames()).not.toContain("amber");
		expect(getAvailableThemes()).toContain("light");
	});

	it("loads light user-message colors as a light palette", () => {
		const lightTheme = getThemeByName("light-amber");
		expect(lightTheme?.name).toBe("light-amber");
		expect(lightTheme?.getBgAnsi("userMessageBg")).toBeTruthy();
		expect(lightTheme?.getFgAnsi("text")).toBeTruthy();
	});

	it("uses terminal capabilities for ANSI encoding without changing the palette", () => {
		setCapabilities({ images: null, trueColor: false, hyperlinks: false });
		const ansi256Theme = getThemeByName("amber");
		if (!ansi256Theme) throw new Error("amber theme not found");
		expect(ansi256Theme.getColorMode()).toBe("256color");

		setCapabilities({ images: null, trueColor: true, hyperlinks: false });
		const truecolorTheme = getThemeByName("amber");
		if (!truecolorTheme) throw new Error("amber theme not found");
		expect(truecolorTheme.getColorMode()).toBe("truecolor");
	});
});
