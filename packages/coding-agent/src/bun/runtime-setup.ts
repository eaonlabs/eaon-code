import { bedrockProviderModule } from "@eaonlabs/eaon-ai/bedrock-provider";
import { registerBunOAuthFlows } from "@eaonlabs/eaon-ai/bun-oauth";
import { setBedrockProviderModule } from "@eaonlabs/eaon-ai/compat";
import { APP_NAME } from "../config.ts";

process.title = APP_NAME;
process.emitWarning = (() => {}) as typeof process.emitWarning;
registerBunOAuthFlows();
setBedrockProviderModule(bedrockProviderModule);
