import { DefaultChangelogNotes } from "release-please/build/src/changelog-notes/default.js";

const SUMMARY = "* Updated dependencies.";

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
    if (visible.length === commits.length) return notes;

    // A breaking dependency commit stays visible and already renders this
    // section; add the summary to it rather than emitting a second heading.
    const section =
      options.changelogSections?.find((entry) => entry.type === "deps")
        ?.section ?? "Dependencies";
    const heading = `### ${section}\n\n`;
    return notes.includes(heading)
      ? notes.replace(heading, `${heading}${SUMMARY}\n`)
      : `${notes}\n\n${heading}${SUMMARY}`;
  }
}
