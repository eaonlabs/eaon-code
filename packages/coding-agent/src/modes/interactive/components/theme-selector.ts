import { Container, type SelectItem, SelectList, type SelectListLayoutOptions, Spacer, Text } from "@eaonlabs/eaon-tui";
import { getDarkThemeNames, getDefaultTheme, getLightThemeNames, getSelectListTheme, theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { ThemePreviewComponent } from "./theme-preview.ts";

const THEME_SELECT_LIST_LAYOUT: SelectListLayoutOptions = {
	minPrimaryColumnWidth: 12,
	maxPrimaryColumnWidth: 32,
};

export class ThemeSelectorComponent extends Container {
	private selectList: SelectList;
	private preview: ThemePreviewComponent;

	constructor(
		currentTheme: string,
		onSelect: (themeName: string) => void,
		onCancel: () => void,
		options?: {
			themes?: string[];
			title?: string;
		},
	) {
		super();

		const themes = options?.themes ?? [...getDarkThemeNames(), ...getLightThemeNames()];
		const themeItems: SelectItem[] = themes.map((name) => ({
			value: name,
			label: name,
			description: name === currentTheme ? "(current)" : undefined,
		}));

		this.addChild(new DynamicBorder());
		if (options?.title) {
			this.addChild(new Text(theme.bold(theme.fg("accent", options.title)), 1, 0));
			this.addChild(new Spacer(1));
		}

		this.selectList = new SelectList(themeItems, 10, getSelectListTheme(), THEME_SELECT_LIST_LAYOUT);

		const currentIndex = themes.indexOf(currentTheme);
		if (currentIndex !== -1) {
			this.selectList.setSelectedIndex(currentIndex);
		} else {
			const defaultIndex = themes.indexOf(getDefaultTheme());
			if (defaultIndex !== -1) this.selectList.setSelectedIndex(defaultIndex);
		}
		this.preview = new ThemePreviewComponent(this.selectList.getSelectedItem()?.value ?? getDefaultTheme());

		this.selectList.onSelect = (item) => {
			onSelect(item.value);
		};

		this.selectList.onCancel = () => {
			onCancel();
		};
		this.selectList.onSelectionChange = (item) => {
			this.preview.setThemeName(item.value);
		};

		this.addChild(this.selectList);
		this.addChild(this.preview);
		this.addChild(new DynamicBorder());
	}

	getSelectList(): SelectList {
		return this.selectList;
	}
}
