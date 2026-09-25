> Eaon Code can help you create Eaon Code packages. Ask it to bundle your extensions, skills, prompt templates, or themes.

# Eaon Code Packages

Eaon Code packages bundle extensions, skills, prompt templates, and themes so you can share them through npm or git. A package can declare resources in `package.json` under the `eaon` key, or use conventional directories.

## Table of Contents

- [Install and Manage](#install-and-manage)
- [Package Sources](#package-sources)
- [Creating a Package](#creating-a-package)
- [Package Structure](#package-structure)
- [Dependencies](#dependencies)
- [Package Filtering](#package-filtering)
- [Enable and Disable Resources](#enable-and-disable-resources)
- [Scope and Deduplication](#scope-and-deduplication)

## Install and Manage

> **Security:** Eaon Code packages run with full system access. Extensions execute arbitrary code, and skills can instruct the model to perform any action including running executables. Review source code before installing third-party packages.

```bash
eaon-code install npm:@foo/bar@1.0.0
eaon-code install git:github.com/user/repo@v1
eaon-code install https://github.com/user/repo  # raw URLs work too
eaon-code install /absolute/path/to/package
eaon-code install ./relative/path/to/package

eaon-code remove npm:@foo/bar
eaon-code list                     # show installed packages from settings
eaon-code update                   # update Eaon Code only
eaon-code update --all             # update Eaon Code, packages, and pinned git refs
eaon-code update --extensions      # update packages and reconcile pinned git refs only
eaon-code update --models          # refresh model catalogs only
eaon-code update --self            # update Eaon Code only
eaon-code update --self --force    # reinstall Eaon Code even if current
eaon-code update npm:@foo/bar      # update one package
eaon-code update --extension npm:@foo/bar
```

These commands manage Eaon Code packages. Installer-created source checkouts check for upstream changes at startup and quietly rerun the installer when an update is available. The terminal only shows `Checking for updates...`; installer build output stays hidden. The check is skipped in offline mode and does not overwrite a checkout with local changes. `eaon-code update --self` remains available for a manual update. To uninstall Eaon Code itself, see [Quickstart](quickstart.md#uninstall).

By default, `install` and `remove` write to user settings (`~/.eaon/agent/settings.json`). Use `-l` to write to project settings (`.eaon/settings.json`) instead. Project settings can be shared with your team, and Eaon Code installs any missing packages automatically on startup after the project is trusted.

To try a package without installing it, use `--extension` or `-e`. This installs to a temporary directory for the current run only:

```bash
eaon-code -e npm:@foo/bar
eaon-code -e git:github.com/user/repo
```

## Package Sources

Eaon Code accepts three source types in settings and `eaon-code install`.

### npm

```
npm:@scope/pkg@1.2.3
npm:pkg
```

- Versioned specs are pinned and skipped by package updates (`eaon-code update --extensions`, `eaon-code update --all`).
- User installs go under `~/.eaon/agent/npm/`.
- Project installs go under `.eaon/npm/`.
- Set `npmCommand` in `settings.json` to pin npm package lookup and install operations to a specific wrapper command such as `mise` or `asdf`.

Example:

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

### git

```
git:github.com/user/repo@v1
git:git@github.com:user/repo@v1
https://github.com/user/repo@v1
ssh://git@github.com/user/repo@v1
```

- Without `git:` prefix, only protocol URLs are accepted (`https://`, `http://`, `ssh://`, `git://`).
- With `git:` prefix, shorthand formats are accepted, including `github.com/user/repo` and `git@github.com:user/repo`.
- HTTPS and SSH URLs are both supported.
- SSH URLs use your configured SSH keys automatically (respects `~/.ssh/config`).
- For non-interactive runs (for example CI), you can set `GIT_TERMINAL_PROMPT=0` to disable credential prompts and set `GIT_SSH_COMMAND` (for example `ssh -o BatchMode=yes -o ConnectTimeout=5`) to fail fast.
- Refs are pinned tags or commits. `eaon-code update --extensions` and `eaon-code update --all` do not move them to newer refs, but they do reconcile an existing clone to the configured ref.
- Use `eaon-code install git:host/user/repo@new-ref` to update settings and move an existing package to a new pinned ref.
- Cloned to `~/.eaon/agent/git/<host>/<path>` (global) or `.eaon/git/<host>/<path>` (project).
- When reconciliation changes the checkout, Eaon Code resets and cleans the clone, then runs `npm install` if `package.json` exists.

**SSH examples:**
```bash
# git@host:path shorthand (requires git: prefix)
eaon-code install git:git@github.com:user/repo

# ssh:// protocol format
eaon-code install ssh://git@github.com/user/repo

# With version ref
eaon-code install git:git@github.com:user/repo@v1.0.0
```

### Local Paths

```
/absolute/path/to/package
./relative/path/to/package
```

Local paths point to files or directories on disk and are added to settings without copying. Relative paths are resolved against the settings file they appear in. If the path is a file, it loads as a single extension. If it is a directory, Eaon Code loads resources using package rules.

## Creating a Package

Add an `eaon` manifest to `package.json` or use conventional directories. Optionally add the `eaon-code` npm keyword for discoverability.

```json
{
  "name": "my-package",
  "keywords": ["eaon-code"],
  "eaon": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

Paths are relative to the package root. Arrays support glob patterns and `!exclusions`. Positive manifest globs discover visible paths in lexical order. List dot-prefixed paths directly. If a glob would need to continue through a symlink, list the symlinked resource root directly.


## Package Structure

### Convention Directories

If no `eaon` manifest is present, Eaon Code auto-discovers resources from these directories:

- `extensions/` loads `.ts` and `.js` files
- `skills/` recursively finds `SKILL.md` folders and loads top-level `.md` files as skills
- `prompts/` loads `.md` files
- `themes/` loads `.json` files

## Dependencies

Third party runtime dependencies belong in `dependencies` in `package.json`. Dependencies that do not register extensions, skills, prompt templates, or themes also belong in `dependencies`. When Eaon Code installs a package from npm or git, it runs `npm install`, so those dependencies are installed automatically.

Eaon Code bundles core packages for extensions and skills. If you import any of these, list them in `peerDependencies` with a `"*"` range and do not bundle them: `@eaonlabs/eaon-ai`, `@eaonlabs/eaon-agent-core`, `@eaonlabs/eaon-code`, `@eaonlabs/eaon-tui`, `typebox`.

Other Eaon Code packages must be bundled in your tarball. Add them to `dependencies` and `bundledDependencies`, then reference their resources through `node_modules/` paths. Eaon Code loads packages with separate module roots, so separate installs do not collide or share modules.

Example:

```json
{
  "dependencies": {
    "shitty-extensions": "^1.0.1"
  },
  "bundledDependencies": ["shitty-extensions"],
  "eaon": {
    "extensions": ["extensions", "node_modules/shitty-extensions/extensions"],
    "skills": ["skills", "node_modules/shitty-extensions/skills"]
  }
}
```

## Package Filtering

Filter what a package loads using the object form in settings:

```json
{
  "packages": [
    "npm:simple-pkg",
    {
      "source": "npm:my-package",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"],
      "themes": ["+themes/legacy.json"]
    }
  ]
}
```

`+path` and `-path` are exact paths relative to the package root.

- Omit a key to load all of that type.
- Use `[]` to load none of that type.
- `!pattern` excludes matches.
- `+path` force-includes an exact path.
- `-path` force-excludes an exact path.
- Filters layer on top of the manifest. They narrow down what is already allowed.

## Enable and Disable Resources

Use `eaon-code config` to enable or disable extensions, skills, prompt templates, and themes from installed packages and local directories. `eaon-code config` starts in global settings (`~/.eaon/agent/settings.json`); press Tab to switch between global and project-local modes. Use `eaon-code config -l` to start in project overrides (`.eaon/settings.json`) with inherited global resources dimmed.

## Scope and Deduplication

Packages can appear in both global and project settings. If the same package appears in both, the project entry wins unless the project entry has `autoload: false`, in which case it is applied as a delta over the global entry. Identity is determined by:

- npm: package name
- git: repository URL without ref
- local: resolved absolute path
