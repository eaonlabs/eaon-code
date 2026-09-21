import * as bundledPiAgentCore from "@eaonlabs/eaon-agent-core";
import * as bundledPiAiCompat from "@eaonlabs/eaon-ai/compat";
import * as bundledPiAiOauth from "@eaonlabs/eaon-ai/oauth";
import * as bundledPiAiProviders from "@eaonlabs/eaon-ai/providers/all";
import * as bundledPiTui from "@eaonlabs/eaon-tui";
import * as bundledCroner from "croner";
import * as bundledNanoid from "nanoid";
import * as bundledTypebox from "typebox";
import * as bundledTypeboxCompile from "typebox/compile";
import * as bundledTypeboxValue from "typebox/value";
// This import is safe because loader.ts exports are not re-exported from index.ts.
// Extensions can therefore import from @eaonlabs/eaon-code.
import * as bundledPiCodingAgent from "../../index.ts";

/** Modules available to extensions in source and compiled binary runtimes. */
export const VIRTUAL_MODULES: Record<string, unknown> = {
	typebox: bundledTypebox,
	"typebox/compile": bundledTypeboxCompile,
	"typebox/value": bundledTypeboxValue,
	"@sinclair/typebox": bundledTypebox,
	"@sinclair/typebox/compile": bundledTypeboxCompile,
	"@sinclair/typebox/value": bundledTypeboxValue,
	croner: bundledCroner,
	nanoid: bundledNanoid,
	"@eaonlabs/eaon-agent-core": bundledPiAgentCore,
	"@eaonlabs/eaon-tui": bundledPiTui,
	"@eaonlabs/eaon-ai": bundledPiAiCompat,
	"@eaonlabs/eaon-ai/compat": bundledPiAiCompat,
	"@eaonlabs/eaon-ai/oauth": bundledPiAiOauth,
	"@eaonlabs/eaon-ai/providers/all": bundledPiAiProviders,
	"@eaonlabs/eaon-code": bundledPiCodingAgent,
	"@earendil-works/pi-agent-core": bundledPiAgentCore,
	"@earendil-works/pi-tui": bundledPiTui,
	// Extensions resolve the pi-ai root to the compat entrypoint (a strict
	// superset of the core entrypoint): existing extensions using the old
	// global API keep working at runtime until compat is removed.
	"@earendil-works/pi-ai": bundledPiAiCompat,
	"@earendil-works/pi-ai/compat": bundledPiAiCompat,
	"@earendil-works/pi-ai/oauth": bundledPiAiOauth,
	"@earendil-works/pi-ai/providers/all": bundledPiAiProviders,
	"@earendil-works/pi-coding-agent": bundledPiCodingAgent,
	"@mariozechner/pi-agent-core": bundledPiAgentCore,
	"@mariozechner/pi-tui": bundledPiTui,
	"@mariozechner/pi-ai": bundledPiAiCompat,
	"@mariozechner/pi-ai/compat": bundledPiAiCompat,
	"@mariozechner/pi-ai/oauth": bundledPiAiOauth,
	"@mariozechner/pi-ai/providers/all": bundledPiAiProviders,
	"@mariozechner/pi-coding-agent": bundledPiCodingAgent,
};
