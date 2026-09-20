import { Container, Spacer, Text } from "@eaonlabs/eaon-tui";
import { theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";

const REPOSITORY_URL = "https://github.com/eaonlabs/eaon-code";

export class EaonCodeAnnouncementComponent extends Container {
	constructor() {
		super();
		this.addChild(new DynamicBorder((text) => theme.fg("accent", text)));
		this.addChild(new Text(theme.bold(theme.fg("accent", "Eaon Code")), 1, 0));
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("muted", "Source code:"), 1, 0));
		this.addChild(new Text(theme.fg("mdLink", REPOSITORY_URL), 1, 0));
		this.addChild(new Spacer(1));
		this.addChild(new DynamicBorder((text) => theme.fg("accent", text)));
	}
}
