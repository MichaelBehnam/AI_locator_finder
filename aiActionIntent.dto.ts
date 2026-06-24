/**
 * The set of automation actions that {@link AISmartActions} can infer from a
 * natural-language instruction. Every value maps 1:1 to a method on
 * {@link AIActions}.
 */
export type AIActionType =
    | "click"
    | "doubleClick"
    | "fill"
    | "type"
    | "clear"
    | "getText"
    | "getAttribute"
    | "getInputValue"
    | "check"
    | "uncheck"
    | "selectOption"
    | "hover"
    | "press"
    | "isVisible"
    | "isChecked"
    | "waitFor";

/**
 * Structured intent the AI extracts from a free-form instruction such as
 * "type standard_user into the username field".
 */
export interface AIActionIntentDTO {
    /** The automation action inferred from the instruction. */
    action: AIActionType;
    /** Natural-language description of the element to act on (no verbs). */
    target: string;
    /**
     * Optional value the action needs:
     * - `fill` / `type`: the text to enter
     * - `selectOption`: the option value/label
     * - `press`: the key, e.g. "Enter"
     * - `getAttribute`: the attribute name, e.g. "href"
     * - `waitFor`: the desired state ("attached" | "visible" | "hidden")
     */
    value?: string;
}
