import { DefaultChangelogNotes } from "release-please/build/src/changelog-notes/default.js";

// Only the presentation changes: Release Please receives all commits for versioning.
export class CompactDependencyNotes {
  async buildNotes(commits, options) {
    const isRoutineDependency = (commit) =>
      commit.type === "deps" && !commit.breaking && commit.notes.length === 0;
    const visible = commits.filter((commit) => !isRoutineDependency(commit));
    const notes = await new DefaultChangelogNotes().buildNotes(
      visible,
      options,
    );
    return visible.length === commits.length
      ? notes
      : `${notes}\n\n### Dependencies\n\n* Updated dependencies.`;
  }
}
