import type { TUI } from "@eaonlabs/eaon-tui";
import type { SettingsManager } from "../../../core/settings-manager.ts";
import { getDefaultTheme, initTheme, setTheme, setThemeInstance, type Theme } from "./theme.ts";

type ThemeResult = { success: boolean; error?: string };

export class InteractiveThemeController {
	private readonly ui: TUI;
	private readonly getSettingsManager: () => SettingsManager;
	private readonly showError: (message: string) => void;
	private readonly onChanged: () => void;
	private currentThemeSetting: string | undefined;
	private activeThemeName: string | undefined;

	constructor(
		ui: TUI,
		options: {
			getSettingsManager: () => SettingsManager;
			showError: (message: string) => void;
			onChanged: () => void;
			initialThemeSetting?: string;
		},
	) {
		this.ui = ui;
		this.getSettingsManager = options.getSettingsManager;
		this.showError = options.showError;
		this.onChanged = options.onChanged;
		this.currentThemeSetting = options.initialThemeSetting;
		const initialThemeSetting = this.currentThemeSetting ?? this.getSettingsManager().getThemeSetting();
		this.activeThemeName = initialThemeSetting?.includes("/") ? undefined : initialThemeSetting;
		initTheme(this.activeThemeName, true);
	}

	async applyFromSettings(): Promise<void> {
		const settingsManager = this.getSettingsManager();
		const themeSetting = this.currentThemeSetting ?? settingsManager.getThemeSetting();
		if (themeSetting && !themeSetting.includes("/")) {
			const result = this.applyThemeName(themeSetting, true);
			if (result.success) return;
		}

		const fallback = getDefaultTheme();
		const result = this.applyThemeName(fallback);
		if (result.success) {
			this.currentThemeSetting = fallback;
			settingsManager.setTheme(fallback);
		}
	}

	getThemeSelection(): string | undefined {
		return this.currentThemeSetting ?? this.getSettingsManager().getThemeSetting() ?? this.activeThemeName;
	}

	setThemeName(themeName: string, showError = false): ThemeResult {
		const result = this.applyThemeName(themeName, showError);
		if (result.success) {
			this.currentThemeSetting = themeName;
			this.getSettingsManager().setTheme(themeName);
		}
		return result;
	}

	async setThemeSetting(themeSetting: string): Promise<void> {
		this.currentThemeSetting = themeSetting;
		this.getSettingsManager().setTheme(themeSetting);
		await this.applyFromSettings();
	}

	setThemeInstance(themeInstance: Theme): ThemeResult {
		setThemeInstance(themeInstance);
		this.activeThemeName = "<in-memory>";
		this.notifyChanged();
		return { success: true };
	}

	private applyThemeName(themeName: string, showError = false): ThemeResult {
		const result = setTheme(themeName, true);
		this.activeThemeName = result.success ? themeName : getDefaultTheme();
		this.notifyChanged();
		if (!result.success && showError) {
			this.showError(`Failed to load theme "${themeName}": ${result.error}\nFell back to the default theme.`);
		}
		return result;
	}

	private notifyChanged(): void {
		this.ui.invalidate();
		this.onChanged();
	}

	dispose(): void {
		this.ui.setTerminalColorSchemeNotifications(false);
	}
}
