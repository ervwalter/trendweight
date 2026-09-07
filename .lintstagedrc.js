const path = require("node:path");

module.exports = {
  // Prettier resolves plugins from the working directory, and the Tailwind plugin
  // is installed only in the web workspace, so run it there (paths are absolute).
  "apps/web/**/*.{js,jsx,ts,tsx,json,css,md}": (filenames) =>
    `npm exec -w apps/web -- prettier --write ${filenames.map((f) => JSON.stringify(f)).join(" ")}`,
  "apps/api/**/*.cs": (filenames) => {
    // lint-staged passes absolute paths; dotnet format wants them relative to
    // the repository root, which is where this config file lives.
    const relativePaths = filenames.map((f) => path.relative(__dirname, f));
    return `dotnet format apps/api/TrendWeight.sln --include ${relativePaths.join(" ")}`;
  },
};
