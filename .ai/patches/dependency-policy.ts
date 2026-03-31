import fs from "node:fs";

export function enforcePinnedDeps(packagePath = "package.json") {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const check = (deps: Record<string, string>): string[] => {
    const unpinned: string[] = [];
    for (const [name, version] of Object.entries(deps)) {
      if (
        version.startsWith("^") ||
        version.startsWith("~") ||
        version.startsWith(">") ||
        version.startsWith("<") ||
        version.startsWith(">=") ||
        version.startsWith("<=")
      ) {
        unpinned.push(`${name}@${version}`);
      }
    }
    return unpinned;
  };

  const unpinnedDeps = check(pkg.dependencies ?? {});
  const unpinnedDevDeps = check(pkg.devDependencies ?? {});
  const allUnpinned = [...unpinnedDeps, ...unpinnedDevDeps];

  if (allUnpinned.length > 0) {
    throw new Error(
      `Unpinned dependencies detected:\n${allUnpinned.join("\n")}`,
    );
  }
}
