import { Container, getKeybindings, Spacer, Text } from "@eaonlabs/eaon-tui";
import { APP_NAME } from "../../../config.ts";
import { theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { keyHint, rawKeyHint } from "./keybinding-hints.ts";

export interface FirstTimeSetupResult {
	theme: string;
}

export interface FirstTimeSetupOptions {
	currentTheme: string;
	availableThemes: string[];
	onSubmit: (result: FirstTimeSetupResult) => void;
	onCancel: () => void;
}

// Block-letter E for Eaon Code (replaces upstream Pi mark)
const SETUP_LOGO_LINES = ["███████", "██     ", "██████ ", "██     ", "███████"];

/** First-time setup dialog: theme choice only. No usage collection. */
export class FirstTimeSetupComponent extends Container {
	private themeIndex: number;
	private readonly themes: string[];
	private readonly options: FirstTimeSetupOptions;

	constructor(options: FirstTimeSetupOptions) {
		super();
		this.options = options;
		this.themes = options.availableThemes.length > 0 ? options.availableThemes : [options.currentTheme];
		this.themeIndex = Math.max(0, this.themes.indexOf(options.currentTheme));
		this.update();
	}

	private update(): void {
		this.clear();
		this.addChild(new DynamicBorder());
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("accent", SETUP_LOGO_LINES.join("\n")), 1, 0));
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("accent", theme.bold(`Welcome to ${APP_NAME}`)), 1, 0));
		this.addChild(new Text(theme.fg("muted", "Pick a theme. Change anytime with /themes."), 1, 0));
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("text", "Colors"), 1, 0));
		this.addChild(new Spacer(1));
		this.addOptionList(this.themes, this.themeIndex);

		this.addChild(new Spacer(1));
		this.addChild(
			new Text(
				rawKeyHint("↑↓", "navigate") +
					"  " +
					keyHint("tui.select.confirm", "finish") +
					"  " +
					keyHint("tui.select.cancel", "skip setup"),
				1,
				0,
			),
		);
		this.addChild(new Spacer(1));
		this.addChild(new DynamicBorder());
	}

	private addOptionList(labels: string[], selectedIndex: number): void {
		for (let i = 0; i < labels.length; i++) {
			const isSelected = i === selectedIndex;
			const prefix = isSelected ? theme.fg("accent", "→ ") : "  ";
			const label = isSelected ? theme.fg("accent", labels[i]) : theme.fg("text", labels[i]);
			this.addChild(new Text(`${prefix}${label}`, 1, 0));
		}
	}

	private moveSelection(delta: number): void {
		const next = Math.max(0, Math.min(this.themes.length - 1, this.themeIndex + delta));
		if (next !== this.themeIndex) {
			this.themeIndex = next;
		}
		this.update();
	}

	handleInput(keyData: string): void {
		const kb = getKeybindings();
		if (kb.matches(keyData, "tui.select.up") || keyData === "k") {
			this.moveSelection(-1);
		} else if (kb.matches(keyData, "tui.select.down") || keyData === "j") {
			this.moveSelection(1);
		} else if (kb.matches(keyData, "tui.select.confirm") || keyData === "\n") {
			this.options.onSubmit({
				theme: this.themes[this.themeIndex] ?? this.options.currentTheme,
			});
		} else if (kb.matches(keyData, "tui.select.cancel")) {
			this.options.onCancel();
		}
	}
}
