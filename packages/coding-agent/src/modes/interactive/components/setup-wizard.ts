/**
 * First-run / reusable setup wizard.
 * Steps: welcome → provider → theme category → theme → done.
 * No usage collection.
 */

import { Container, getKeybindings, Spacer, Text } from "@eaonlabs/eaon-tui";
import { getDarkThemeNames, getDefaultTheme, getLightThemeNames, isLightTheme, theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { keyHint, rawKeyHint } from "./keybinding-hints.ts";

export interface SetupResult {
	provider: string | "skip";
	themeName: string;
}

export interface SetupProviderOption {
	readonly id: string;
	readonly name: string;
}

export interface SetupOptions {
	currentThemeName?: string;
	providers: readonly SetupProviderOption[];
	onSubmit: (result: SetupResult) => void;
	onCancel: () => void;
}

const LOGO = ["███████", "██     ", "██████ ", "██     ", "███████"];

type Step = "welcome" | "provider" | "theme" | "done";
type ThemeCategory = "dark" | "light";
type ThemeMenu = "categories" | "themes";

function getThemeNames(category: ThemeCategory): string[] {
	return category === "light" ? getLightThemeNames() : getDarkThemeNames();
}

export class SetupWizardComponent extends Container {
	private step: Step = "welcome";
	private providerIndex = 0;
	private themeCategoryIndex = 0;
	private themeMenu: ThemeMenu = "categories";
	private themeCategory: ThemeCategory = "dark";
	private themePickIndex = 0;
	private themes: string[];
	private readonly options: SetupOptions;
	private readonly providers: readonly SetupProviderOption[];

	constructor(options: SetupOptions) {
		super();
		this.options = options;
		this.providers = options.providers;
		this.themeCategory = isLightTheme(options.currentThemeName) ? "light" : "dark";
		this.themeCategoryIndex = this.themeCategory === "light" ? 1 : 0;
		this.themes = getThemeNames(this.themeCategory);
		const current = options.currentThemeName;
		const startId = current && this.themes.includes(current) ? current : getDefaultTheme();
		this.themePickIndex = Math.max(0, this.themes.indexOf(startId));
		this.update();
	}

	private update(): void {
		this.clear();
		this.addChild(new DynamicBorder());
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("accent", LOGO.join("\n")), 1, 0));
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.bold(theme.fg("accent", "Eaon Code setup")), 1, 0));
		this.addChild(new Spacer(1));

		if (this.step === "welcome") {
			this.addChild(new Text(theme.fg("text", "Two quick choices, then you're in."), 1, 0));
			this.addChild(new Text(theme.fg("muted", "You can change everything later with /login and /themes."), 1, 0));
			this.addChild(new Text(theme.fg("dim", "No usage is collected or stored."), 1, 0));
			this.addChild(new Spacer(1));
			this.addChild(
				new Text(`${rawKeyHint("Enter", "start")}  ${keyHint("tui.select.cancel", "skip setup")}`, 1, 0),
			);
		} else if (this.step === "provider") {
			this.addChild(new Text(theme.fg("text", "1/2  Provider"), 1, 0));
			this.addChild(new Text(theme.fg("muted", "Choose a provider now, or skip and configure one later."), 1, 0));
			this.addChild(new Spacer(1));
			this.renderOptions(
				[
					...this.providers.map((provider) => ({ label: provider.name, description: provider.id })),
					{ label: "Skip for now", description: "Configure later with /login" },
				],
				this.providerIndex,
			);
		} else if (this.step === "theme") {
			this.addChild(new Text(theme.fg("text", "2/2  Theme"), 1, 0));
			this.addChild(new Text(theme.fg("muted", "Choose a category, then a theme. Body text stays the same."), 1, 0));
			this.addChild(new Spacer(1));
			if (this.themeMenu === "categories") {
				this.renderOptions(
					[
						{ label: "Dark themes", description: `${getDarkThemeNames().length} themes` },
						{ label: "Light themes", description: `${getLightThemeNames().length} themes` },
					],
					this.themeCategoryIndex,
				);
			} else {
				this.addChild(
					new Text(theme.fg("muted", this.themeCategory === "light" ? "Light themes" : "Dark themes"), 1, 0),
				);
				this.addChild(new Spacer(1));
				this.renderOptions(
					this.themes.map((id) => ({ label: id, description: id === getDefaultTheme() ? "default" : "" })),
					this.themePickIndex,
				);
			}
		} else {
			this.addChild(new Text(theme.fg("success", "Setup complete."), 1, 0));
			this.addChild(new Spacer(1));
			const lines = [
				this.options.currentThemeName ? `Theme: ${this.options.currentThemeName}` : null,
				this.selectedProviderLabel(),
				"Type a message to start · /help for commands",
			].filter(Boolean) as string[];
			for (const line of lines) this.addChild(new Text(theme.fg("muted", line), 1, 0));
		}

		this.addChild(new Spacer(1));
		this.addChild(new DynamicBorder());
	}

	private selectedProviderLabel(): string {
		const provider = this.providers[this.providerIndex];
		if (provider) return `Next: /login → ${provider.name}`;
		return "Provider skipped — /login when ready";
	}

	private renderOptions(items: Array<{ label: string; description?: string }>, selected: number): void {
		for (let i = 0; i < items.length; i++) {
			const isSel = i === selected;
			const prefix = isSel ? theme.fg("accent", "→ ") : "  ";
			const label = isSel ? theme.bold(theme.fg("accent", items[i]!.label)) : theme.fg("text", items[i]!.label);
			const desc = items[i]!.description ? theme.fg("muted", `  ${items[i]!.description}`) : "";
			this.addChild(new Text(`${prefix}${label}${desc}`, 1, 0));
		}
	}

	private move(delta: number): void {
		if (this.step === "provider") {
			const optionCount = this.providers.length + 1;
			this.providerIndex = Math.max(0, Math.min(optionCount - 1, this.providerIndex + delta));
		} else if (this.step === "theme") {
			if (this.themeMenu === "categories") {
				this.themeCategoryIndex = (this.themeCategoryIndex + delta + 2) % 2;
				this.themeCategory = this.themeCategoryIndex === 1 ? "light" : "dark";
				this.themes = getThemeNames(this.themeCategory);
				const currentIndex = this.options.currentThemeName
					? this.themes.indexOf(this.options.currentThemeName)
					: -1;
				this.themePickIndex = currentIndex >= 0 ? currentIndex : 0;
			} else {
				const n = this.themes.length;
				this.themePickIndex = (this.themePickIndex + delta + n) % n;
			}
		}
		this.update();
	}

	private advance(): void {
		if (this.step === "welcome") {
			this.step = "provider";
		} else if (this.step === "provider") {
			const choice = this.providers[this.providerIndex]?.id ?? "skip";
			if (choice === "skip") {
				this.finish();
				return;
			}
			this.step = "theme";
		} else if (this.step === "theme") {
			if (this.themeMenu === "categories") {
				this.themeMenu = "themes";
				this.update();
				return;
			}
			this.finish();
			return;
		}
		this.update();
	}

	private finish(): void {
		const themeId = this.themes[this.themePickIndex] ?? getDefaultTheme();
		this.options.currentThemeName = themeId;
		this.step = "done";
		this.update();
		this.options.onSubmit({
			provider: this.providers[this.providerIndex]?.id ?? "skip",
			themeName: themeId,
		});
	}

	handleInput(keyData: string): void {
		const kb = getKeybindings();
		if (kb.matches(keyData, "tui.select.up") || keyData === "k") {
			this.move(-1);
		} else if (kb.matches(keyData, "tui.select.down") || keyData === "j") {
			this.move(1);
		} else if (kb.matches(keyData, "tui.select.confirm") || keyData === "\n" || keyData === "\r") {
			this.advance();
		} else if (kb.matches(keyData, "tui.select.cancel") || keyData === "\x1b") {
			if (this.step === "theme" && this.themeMenu === "themes") {
				this.themeMenu = "categories";
				this.update();
			} else {
				this.options.onCancel();
			}
		}
	}
}
