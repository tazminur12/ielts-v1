/**
 * Exam Section Components
 * 
 * Individual components for each exam section type:
 * - ReadingSection: Split-pane layout with passage + questions
 * - WritingSection: Essay writing tasks
 * - ListeningSection: Audio player + questions
 * - SpeakingSection: Voice recording (managed separately)
 */

export { default as ReadingSection } from "./ReadingSection";
export { default as WritingSection } from "./WritingSection";
export { default as ListeningSection } from "./ListeningSection";

export type { default as ReadingSectionProps } from "./ReadingSection";
export type { default as WritingSectionProps } from "./WritingSection";
export type { default as ListeningSectionProps } from "./ListeningSection";
