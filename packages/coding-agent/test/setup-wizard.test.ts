import { setKeybindings } from "@eaonlabs/eaon-tui";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { KeybindingsManager } from "../src/core/keybindings.ts";
import { SetupWizardComponent } from "../src/modes/interactive/components/setup-wizard.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";
import { stripAnsi } from "../src/utils/ansi.ts";

beforeAll(() => {
	initTheme("amber");
	setKeybindings(new KeybindingsManager());
});

describe("SetupWizardComponent", () => {
	it("opens a theme category menu before the matching theme list", () => {
		const onSubmit = vi.fn();
		const wizard = new SetupWizardComponent({
			currentThemeName: "amber",
			onSubmit,
			onCancel: vi.fn(),
		});

		wizard.handleInput("\r");
		wizard.handleInput("\r");
		let output = stripAnsi(wizard.render(120).join("\n"));
		expect(output).toContain("Dark themes");
		expect(output).toContain("Light themes");
		expect(output).not.toContain("light-amber");

		wizard.handleInput("\r");
		output = stripAnsi(wizard.render(120).join("\n"));
		expect(output).toContain("Dark themes");
		expect(output).toContain("amber");
		expect(output).not.toContain("light-amber");

		wizard.handleInput("\x1b");
		wizard.handleInput("\x1b[B");
		wizard.handleInput("\r");
		output = stripAnsi(wizard.render(120).join("\n"));
		expect(output).toContain("Light themes");
		expect(output).toContain("light-amber");
		expect(output).not.toContain("\namber");

		wizard.handleInput("\x1b[B");
		wizard.handleInput("\r");
		expect(onSubmit).toHaveBeenCalledWith({ provider: "eaon", themeName: "light-amber" });
	});
});
