/**
 * First-run / reusable setup wizard.
 * Steps: welcome → provider (Eaon Plan recommended) → theme → done.
 * One theme list (no light/dark family step). No usage collection.
 */

import { Container, getKeybindings, Spacer, Text } from "@eaonlabs/eaon-tui";
import { type TerminalTheme, theme } from "../theme/theme.ts";
import { getAvailableThemes, isLightTheme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { keyHint, rawKeyHint } from "./keybinding-hints.ts";

export interface SetupResult {
	provider: "eaon" | "other" | "skip";
	themeName: string;
}

export interface SetupOptions {
	detectedTheme: TerminalTheme;
	currentThemeName?: string;
	onPreviewTheme: (name: string) => void;
	onSubmit: (result: SetupResult) => void;
	onCancel: () => void;
}

const PROVIDERS: Array<{ value: SetupResult["provider"]; label: string; description: string }> = [
	{ value: "eaon", label: "Eaon Plan (recommended)", description: "One key · https://ai.eaon.dev · paste eaon_sk_…" },
	{ value: "other", label: "Other provider", description: "Anthropic, OpenAI, Google, local, …" },
	{ value: "skip", label: "Skip for now", description: "Configure later with /login" },
];

const LOGO = ["███████", "██     ", "██████ ", "██     ", "███████"];

type Step = "welcome" | "provider" | "theme" | "done";

/** Prefer ember first, then the rest of the built-in list. */
function themeListSorted(): string[] {
	const all = getAvailableThemes();
	const preferred = ["ember", "light-ember", "orange", "midnight", "light-ocean"];
	const rest = all.filter((n) => !preferred.includes(n) && n !== "dark" && n !== "light");
	const head = preferred.filter((n) => all.includes(n));
	return [...head, ...rest];
}

export class SetupWizardComponent extends Container {
	private step: Step = "welcome";
	private providerIndex = 0;
	private themePickIndex = 0;
	private themes: string[];
	private readonly options: SetupOptions;

	constructor(options: SetupOptions) {
		super();
		this.options = options;
		this.themes = themeListSorted();
		const current = options.currentThemeName;
		const defaultId = options.detectedTheme === "light" && this.themes.includes("light-ember") ? "light-ember" : "ember";
		const startId = current && this.themes.includes(current) ? current : defaultId;
		this.themePickIndex = Math.max(0, this.themes.indexOf(startId));
		this.previewSelectedTheme();
		this.update();
	}

	private previewSelectedTheme(): void {
		const id = this.themes[this.themePickIndex];
		if (id) this.options.onPreviewTheme(id);
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
			this.addChild(new Text(theme.fg("muted", "You can change everything later with /login and /theme."), 1, 0));
			this.addChild(new Text(theme.fg("dim", "No usage is collected or stored."), 1, 0));
			this.addChild(new Spacer(1));
			this.addChild(
				new Text(rawKeyHint("Enter", "start") + "  " + keyHint("tui.select.cancel", "skip setup"), 1, 0),
			);
		} else if (this.step === "provider") {
			this.addChild(new Text(theme.fg("text", "1/2  Provider"), 1, 0));
			this.addChild(
				new Text(theme.fg("muted", "Eaon Plan: paste one key, get frontier models. Get a key at ai.eaon.dev"), 1, 0),
			);
			this.addChild(new Spacer(1));
			this.renderOptions(
				PROVIDERS.map((p) => ({ label: p.label, description: p.description })),
				this.providerIndex,
			);
		} else if (this.step === "theme") {
			this.addChild(new Text(theme.fg("text", "2/2  Theme"), 1, 0));
			this.addChild(new Text(theme.fg("muted", "ember is the default. Works on any terminal."), 1, 0));
			this.addChild(new Spacer(1));
			this.renderOptions(
				this.themes.map((id) => ({
					label: id,
					description: id === "ember" ? "default" : isLightTheme(id) ? "light" : "",
				})),
				this.themePickIndex,
			);
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
		const p = PROVIDERS[this.providerIndex];
		if (!p) return "";
		if (p.value === "eaon") return "Next: /login → Eaon Plan → paste eaon_sk_…";
		if (p.value === "other") return "Next: /login → pick a provider";
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
			this.providerIndex = Math.max(0, Math.min(PROVIDERS.length - 1, this.providerIndex + delta));
		} else if (this.step === "theme") {
			const n = this.themes.length;
			this.themePickIndex = (this.themePickIndex + delta + n) % n;
			this.previewSelectedTheme();
		}
		this.update();
	}

	private advance(): void {
		if (this.step === "welcome") {
			this.step = "provider";
		} else if (this.step === "provider") {
			const choice = PROVIDERS[this.providerIndex]?.value ?? "skip";
			if (choice === "skip") {
				this.finish();
				return;
			}
			this.step = "theme";
		} else if (this.step === "theme") {
			this.finish();
			return;
		}
		this.update();
	}

	private finish(): void {
		const themeId = this.themes[this.themePickIndex] ?? "ember";
		this.options.currentThemeName = themeId;
		this.step = "done";
		this.update();
		this.options.onSubmit({
			provider: PROVIDERS[this.providerIndex]?.value ?? "skip",
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
			this.options.onCancel();
		}
	}
}
