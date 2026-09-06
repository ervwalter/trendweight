const path = require("node:path");

module.exports = {
  "apps/web/**/*.{js,jsx,ts,tsx,json,css,md}": "prettier --write",
  "apps/api/**/*.cs": (filenames) => {
    // lint-staged passes absolute paths; dotnet format wants them relative to
    // the repository root, which is where this config file lives.
    const relativePaths = filenames.map((f) => path.relative(__dirname, f));
    return `dotnet format apps/api/TrendWeight.sln --include ${relativePaths.join(" ")}`;
  },
};
