# Codemode

The `codemode` tool lets the model write JavaScript that calls Eaon Code's other tools and non-chat models. Only the script's result reaches the model, so scripts can run calls in parallel and filter large results before returning them. Enable it with `--tools +codemode` or add `"+codemode"` to `defaultTools` in [settings](settings.md#tools). See [tool options](usage.md#tool-options).

## Scripts

The tool input is raw JavaScript, not JSON or a Markdown code fence. It runs as the body of an async function in a QuickJS sandbox, so top-level `await` and `return` work. The sandbox has no Node APIs, filesystem, network access, or timers. Scripts reach external services only through `tools` and `models`.

A script can start with an options line:

```js
// @options: {"max_output_tokens": 2000, "timeout_ms": 60000}
```

- `max_output_tokens` defaults to 10000 and limits returned output. Longer output keeps its start and end; the full text is written to a temporary file whose path is included in the result.
- `timeout_ms` sets a deadline for the script. Image generation can take minutes, so avoid a short deadline for scripts that generate images.

The result includes whether the script completed, its wall time, and its output. A failed script keeps partial output and includes the script error. Tool calls are real and are not undone when a script fails. Calls still running when the script ends are cancelled.

## Calling tools

Every available tool can be called from `tools` by its identifier. Characters that are not valid in a JavaScript identifier become underscores, so an MCP tool such as `mcp__dev-radius__search` is available as `tools.mcp__dev_radius__search(args)`.

The `codemode` description lists tools with their TypeScript declarations, grouped by namespace. MCP tools with default `codemode` exposure are not listed there; find them with `searchTools()`, `describeTool()`, `describeNamespace()`, or `ALL_TOOLS`. Declared tool signatures share the `codemode.inlineBudget` setting, which defaults to 3000 estimated tokens.

The `codemode.mode` setting controls how other tools are presented while codemode is active:

- `on` keeps declared tools visible and explains how to call them from scripts.
- `only` hides active built-in and extension tools from the model and lists them in the `codemode` description instead.

## Store values

`store(key, value)` keeps a JSON value under a string key for later scripts; `store(key, undefined)` deletes it. Values are saved only when a script succeeds. Each successful script that writes values appends a session entry, so stored values are restored with the session and follow the session branch where they were written.

Store small state such as IDs, cursors, or summaries. A value can contain at most 262144 characters of JSON, and all values together can contain at most 1048576 characters. Do not store image data; show it with `image()` or save it with an available file tool.

## Non-chat models

`models` lists and runs classifiers and image models with credentials already configured for the session. Chat models can be listed but cannot be called from scripts. Use `models.getAvailableOfType(type)` to find models that are usable with the current credentials.

```ts
type ModelType = "chat" | "image" | "classifier";

interface ModelInfo {
  type?: ModelType;
  provider: string;
  id: string;
  name: string;
  api: string;
  input: ("text" | "image")[];
  contextWindow?: number;
  [key: string]: unknown;
}

interface ModelRuntime {
  getModelsOfType(type: ModelType, provider?: string): Promise<ModelInfo[]>;
  getAvailableOfType(type: ModelType, provider?: string): Promise<ModelInfo[]>;
  getModelOfType(type: ModelType, provider: string, id: string): Promise<ModelInfo | undefined>;
  classify(model: ModelInfo, context: ClassifierContext): Promise<ClassifierResult>;
  generateImages(model: ModelInfo, context: ImagesContext): Promise<ImagesResult>;
}
```

`classify()` and `generateImages()` use the model's `provider` and `id`, so a plain `{ provider, id }` object works too. Provider failures are returned in `stopReason` and `errorMessage`; check them before using the result. At most four model calls run at once per script. Their usage is added to the `codemode` tool result and counts toward session cost.

### Classifiers

`classify()` answers typed questions about a JSON object. A question can ask for a choice, a score on an ordered scale, or a yes/no result:

```js
const model = await models.getModelOfType("classifier", "typesafe", "jev-latest");
const result = await models.classify(model, {
  state: { feedback: "The editor is fast but the search is confusing." },
  questions: {
    sentiment: {
      type: "choice",
      instructions: "How does the user feel about the product?",
      criteria: { positive: "Satisfied", negative: "Dissatisfied", neutral: "Neither" },
    },
  },
});
if (result.stopReason === "stop") return result.answers.sentiment;
return result.errorMessage;
```

Several items can be classified with `Promise.all()`. A classifier result contains its provider, model, answers, optional usage, and stop reason.

### Image generation

`generateImages()` accepts text and image blocks. Its output can include text and base64 image blocks; pass image blocks to `image()` to show them in the tool result:

```js
// @options: {"timeout_ms": 300000}
const model = await models.getModelOfType("image", "openrouter", "google/gemini-2.5-flash-image");
const result = await models.generateImages(model, {
  input: [{ type: "text", text: "A red fox in snow, watercolor" }],
});
if (result.stopReason !== "stop") return result.errorMessage;
for (const block of result.output) {
  if (block.type === "image") image(block);
  else text(block.text);
}
```

Do not print base64 image data as text. The `image()` helper accepts PNG, JPEG, GIF, and WebP blocks. Each distinct image returned by codemode is saved to a private temporary file, with its path shown next to the image in the tool output.

## Limits

Scripts run in a 256 MB sandbox. Filter or summarize large data instead of accumulating it. A script cannot start another `codemode` script, and it cannot use timers to wait for work that is not represented by a pending tool call.
