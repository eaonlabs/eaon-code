export function areExperimentalFeaturesEnabled(): boolean {
	return (process.env.EAON_CODE_EXPERIMENTAL ?? process.env.PI_EXPERIMENTAL) === "1";
}
