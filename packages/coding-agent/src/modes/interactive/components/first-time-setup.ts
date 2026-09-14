import { Container, getKeybindings, Spacer, Text } from "@eaonlabs/eaon-tui";
import { APP_NAME } from "../../../config.ts";
import { type TerminalTheme, theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { keyHint, rawKeyHint } from "./keybinding-hints.ts";

export interface FirstTimeSetupResult {
	theme: TerminalTheme;
}

export interface FirstTimeSetupOptions {
	detectedTheme: TerminalTheme;
	onThemePreview: (themeName: TerminalTheme) => void;
	onSubmit: (result: FirstTimeSetupResult) => void;
	onCancel: () => void;
}

const THEME_OPTIONS: Array<{ value: TerminalTheme; label: string }> = [
	{ value: "dark", label: "Dark" },
	{ value: "light", label: "Light" },
];

// Block-letter E for Eaon Code (replaces upstream Pi mark)
const SETUP_LOGO_LINES = ["███████", "██     ", "██████ ", "██     ", "███████"];

/** First-time setup dialog: theme choice only. No usage collection. */
export class FirstTimeSetupComponent extends Container {
	private themeIndex: number;
	private readonly options: FirstTimeSetupOptions;

	constructor(options: FirstTimeSetupOptions) {
		super();
		this.options = options;
		this.themeIndex = Math.max(
			0,
			THEME_OPTIONS.findIndex((option) => option.value === options.detectedTheme),
		);
		this.update();
	}

	// Rebuild the whole dialog on every change so theme previews recolor all text.
	private update(): void {
		this.clear();
		this.addChild(new DynamicBorder());
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("accent", SETUP_LOGO_LINES.join("\n")), 1, 0));
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("accent", theme.bold(`Welcome to ${APP_NAME}`)), 1, 0));
		this.addChild(new Text(theme.fg("muted", "Pick a theme. Change anytime with /theme."), 1, 0));
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("text", "Colors"), 1, 0));
		this.addChild(new Spacer(1));
		this.addOptionList(
			THEME_OPTIONS.map((option) => option.label),
			this.themeIndex,
		);

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
		const next = Math.max(0, Math.min(THEME_OPTIONS.length - 1, this.themeIndex + delta));
		if (next !== this.themeIndex) {
			this.themeIndex = next;
			this.options.onThemePreview(THEME_OPTIONS[this.themeIndex].value);
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
				theme: THEME_OPTIONS[this.themeIndex].value,
			});
		} else if (kb.matches(keyData, "tui.select.cancel")) {
			this.options.onCancel();
		}
	}
}
