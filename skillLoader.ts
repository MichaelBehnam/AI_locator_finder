import * as fs from "fs";
import * as path from "path";

/** Directory holding the markdown skill prompts, resolved relative to this module. */
const SKILLS_DIR: string = path.join(__dirname, "skills");

/**
 * Read a markdown skill prompt from the {@link SKILLS_DIR} directory.
 *
 * @param fileName Skill file name, e.g. "infer-action-intent.md".
 * @returns The file's UTF-8 contents.
 * @throws If the skill file cannot be read.
 */
export function loadSkill(fileName: string): string {
    try {
        return fs.readFileSync(path.join(SKILLS_DIR, fileName), "utf8");
    } catch (error: unknown) {
        throw new Error(`Could not read skills/${fileName} guidelines: ${error}`);
    }
}