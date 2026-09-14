/**
 * First-run / reusable setup wizard.
 * Steps: welcome → provider (Eaon Plan recommended) → theme family → done.
 */

import { Container, getKeybindings, SelectList, type SelectItem, Spacer, Text } from "@eaonlabs/eaon-tui";
import { type TerminalTheme, theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { keyHint, rawKeyHint } from "./keybinding-hints.ts";

export interface SetupResult {
	provider: "eaon" | "other" | "skip";
	themeFamily: "dark" | "light";
	themeName: string;
	shareAnalytics: boolean;
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

/** Theme pick — ember is the product default. */
const DARK_THEMES = [
	{ id: "ember", label: "ember" },
	{ id: "orange", label: "orange" },
	{ id: "midnight", label: "midnight" },
	{ id: "violet", label: "violet" },
	{ id: "mono", label: "mono" },
];
const LIGHT_THEMES = [
	{ id: "light-ember", label: "light-ember" },
	{ id: "light-orange", label: "light-orange" },
	{ id: "light-ocean", label: "light-ocean" },
	{ id: "light-mono", label: "light-mono" },
];

const LOGO = ["███████", "██     ", "██████ ", "██     ", "███████"];

type Step = "welcome" | "provider" | "theme-family" | "theme-pick" | "analytics" | "done";

export class SetupWizardComponent extends Container {
	private step: Step = "welcome";
	private providerIndex = 0;
	private themeFamilyIndex = 0;
	private themePickIndex = 0;
	private analyticsIndex = 0;
	private themeFamily: "dark" | "light";
	private readonly options: SetupOptions;

	constructor(options: SetupOptions) {
		super();
		this.options = options;
		this.themeFamily = options.detectedTheme === "light" ? "light" : "dark";
		this.themeFamilyIndex = this.themeFamily === "light" ? 1 : 0;
		// default ember in the matching family
		const list = this.themeFamily === "light" ? LIGHT_THEMES : DARK_THEMES;
		const defaultId = this.themeFamily === "light" ? "light-ember" : "ember";
		this.themePickIndex = Math.max(0, list.findIndex((t) => t.id === defaultId));
		this.update();
	}

	private get themeList() {
		return this.themeFamily === "light" ? LIGHT_THEMES : DARK_THEMES;
	}

	private previewSelectedTheme(): void {
		const id = this.themeList[this.themePickIndex]?.id;
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
			this.addChild(new Spacer(1));
			this.addChild(
				new Text(
					rawKeyHint("Enter", "start") + "  " + keyHint("tui.select.cancel", "skip setup"),
					1,
					0,
				),
			);
		} else if (this.step === "provider") {
			this.addChild(new Text(theme.fg("text", "1/3  Provider"), 1, 0));
			this.addChild(
				new Text(theme.fg("muted", "Eaon Plan: paste one key, get frontier models. Get a key at ai.eaon.dev"), 1, 0),
			);
			this.addChild(new Spacer(1));
			this.renderOptions(
				PROVIDERS.map((p) => ({ label: p.label, description: p.description })),
				this.providerIndex,
			);
		} else if (this.step === "theme-family") {
			this.addChild(new Text(theme.fg("text", "2/3  Colors — dark or light?"), 1, 0));
			this.addChild(new Text(theme.fg("muted", "Default family follows your terminal. You can pick any theme after."), 1, 0));
			this.addChild(new Spacer(1));
			this.renderOptions(
				[
					{ label: "Dark", description: "ember default · dark terminals" },
					{ label: "Light", description: "light-ember · light terminals" },
				],
				this.themeFamilyIndex,
			);
		} else if (this.step === "theme-pick") {
			this.addChild(new Text(theme.fg("text", `2/3  ${this.themeFamily === "light" ? "Light" : "Dark"} theme`), 1, 0));
			this.addChild(new Text(theme.fg("muted", "ember is the Eaon default. Preview updates live."), 1, 0));
			this.addChild(new Spacer(1));
			this.renderOptions(
				this.themeList.map((t) => ({ label: t.label, description: t.id === "ember" || t.id === "light-ember" ? "default" : "" })),
				this.themePickIndex,
			);
		} else if (this.step === "analytics") {
			this.addChild(new Text(theme.fg("text", "3/3  Anonymous usage data"), 1, 0));
			this.addChild(new Text(theme.fg("muted", "Optional. Nothing is shared if you skip."), 1, 0));
			this.addChild(new Spacer(1));
			this.renderOptions(
				[
					{ label: "Don't share", description: "" },
					{ label: "Share anonymous usage", description: "helps fix bugs" },
				],
				this.analyticsIndex,
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
		} else if (this.step === "theme-family") {
			this.themeFamilyIndex = Math.max(0, Math.min(1, this.themeFamilyIndex + delta));
		} else if (this.step === "theme-pick") {
			const n = this.themeList.length;
			this.themePickIndex = (this.themePickIndex + delta + n) % n;
			this.previewSelectedTheme();
		} else if (this.step === "analytics") {
			this.analyticsIndex = Math.max(0, Math.min(1, this.analyticsIndex + delta));
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
			this.step = "theme-family";
		} else if (this.step === "theme-family") {
			this.themeFamily = this.themeFamilyIndex === 1 ? "light" : "dark";
			const list = this.themeFamily === "light" ? LIGHT_THEMES : DARK_THEMES;
			const defaultId = this.themeFamily === "light" ? "light-ember" : "ember";
			this.themePickIndex = Math.max(0, list.findIndex((t) => t.id === defaultId));
			this.previewSelectedTheme();
			this.step = "theme-pick";
		} else if (this.step === "theme-pick") {
			this.step = "analytics";
		} else if (this.step === "analytics") {
			this.finish();
			return;
		}
		this.update();
	}

	private finish(): void {
		const themeId = this.themeList[this.themePickIndex]?.id ?? (this.themeFamily === "light" ? "light-ember" : "ember");
		this.options.currentThemeName = themeId;
		this.step = "done";
		this.update();
		this.options.onSubmit({
			provider: PROVIDERS[this.providerIndex]?.value ?? "skip",
			themeFamily: this.themeFamily,
			themeName: themeId,
			shareAnalytics: this.analyticsIndex === 1,
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
