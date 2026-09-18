import type { TUI } from "@eaonlabs/eaon-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsManager } from "../src/core/settings-manager.ts";
import { initTheme, theme } from "../src/modes/interactive/theme/theme.ts";
import { InteractiveThemeController } from "../src/modes/interactive/theme/theme-controller.ts";

function createUi() {
	return {
		invalidate: vi.fn(),
		requestRender: vi.fn(),
		setTerminalColorSchemeNotifications: vi.fn(),
	} as unknown as TUI;
}

function createController(ui: TUI, getSettingsManager: () => SettingsManager, initialThemeSetting?: string) {
	return new InteractiveThemeController(ui, {
		getSettingsManager,
		showError: vi.fn(),
		onChanged: vi.fn(),
		initialThemeSetting,
	});
}

afterEach(() => {
	initTheme("dark");
	vi.unstubAllEnvs();
});

describe("InteractiveThemeController", () => {
	it("uses the initial fixed theme without persisting it", async () => {
		const ui = createUi();
		const manager = SettingsManager.inMemory({ theme: "dark" });
		const setTheme = vi.spyOn(manager, "setTheme");
		const flush = vi.spyOn(manager, "flush");
		const controller = createController(ui, () => manager, "light-amber");

		expect(theme.name).toBe("light-amber");
		expect(controller.getThemeSelection()).toBe("light-amber");
		await controller.applyFromSettings();

		expect(setTheme).not.toHaveBeenCalled();
		expect(flush).not.toHaveBeenCalled();
		expect(ui.setTerminalColorSchemeNotifications as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
	});

	it("migrates a legacy automatic setting to the default theme", async () => {
		const ui = createUi();
		const manager = SettingsManager.inMemory({ theme: "light-amber/amber" });
		const controller = createController(ui, () => manager);

		await controller.applyFromSettings();

		expect(theme.name).toBe("dark-amber");
		expect(manager.getTheme()).toBe("dark-amber");
		expect(ui.setTerminalColorSchemeNotifications as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
	});

	it("persists an explicit selection and supports light palettes", () => {
		const ui = createUi();
		const manager = SettingsManager.inMemory({ theme: "amber" });
		const controller = createController(ui, () => manager);

		expect(controller.setThemeName("light-amber")).toEqual({ success: true });
		expect(theme.name).toBe("light-amber");
		expect(manager.getTheme()).toBe("light-amber");
	});

	it("reloads the current manager setting when no initial setting was supplied", async () => {
		const ui = createUi();
		const manager = SettingsManager.inMemory({ theme: "dark" });
		const controller = createController(ui, () => manager);

		await controller.applyFromSettings();
		manager.applyOverrides({ theme: "light-amber" });
		await controller.applyFromSettings();

		expect(theme.name).toBe("light-amber");
	});
});
