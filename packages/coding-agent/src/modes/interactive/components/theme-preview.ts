import { Container, Text } from "@eaonlabs/eaon-tui";
import { getThemeByName } from "../theme/theme.ts";

export class ThemePreviewComponent extends Container {
	constructor(themeName: string) {
		super();
		this.setThemeName(themeName);
	}

	setThemeName(themeName: string): void {
		this.clear();

		const previewTheme = getThemeByName(themeName);
		if (!previewTheme) return;

		this.addChild(new Text(previewTheme.bold(previewTheme.fg("accent", `Preview: ${themeName}`)), 1, 0));
		this.addChild(
			new Text(previewTheme.bg("userMessageBg", previewTheme.fg("userMessageText", " You: Hello! ")), 1, 0),
		);
		this.addChild(
			new Text(`${previewTheme.fg("text", "Assistant: Ready.")} ${previewTheme.fg("success", "✓")}`, 1, 0),
		);
	}
}
