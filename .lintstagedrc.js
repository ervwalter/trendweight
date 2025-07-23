module.exports = {
  "apps/web/**/*.{js,jsx,ts,tsx,json,css,md}": "prettier --write",
  "apps/api/**/*.cs": (filenames) => {
    // Convert absolute paths to relative paths from the repo root
    const relativePaths = filenames.map(f => f.replace(/^\/.*\/trendweight\//, ''));
    return `dotnet format apps/api/TrendWeight.sln --include ${relativePaths.join(' ')}`;
  }
};