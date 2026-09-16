import { Container, type SelectItem, SelectList, type SelectListLayoutOptions, Spacer, Text } from "@eaonlabs/eaon-tui";
import { getAvailableThemes, getSelectListTheme, theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";

const THEME_SELECT_LIST_LAYOUT: SelectListLayoutOptions = {
	minPrimaryColumnWidth: 12,
	maxPrimaryColumnWidth: 32,
};

export class ThemeSelectorComponent extends Container {
	private selectList: SelectList;

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

		const themes = options?.themes ?? getAvailableThemes();
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
		}

		this.selectList.onSelect = (item) => {
			onSelect(item.value);
		};

		this.selectList.onCancel = () => {
			onCancel();
		};

		this.addChild(this.selectList);
		this.addChild(new DynamicBorder());
	}

	getSelectList(): SelectList {
		return this.selectList;
	}
}
