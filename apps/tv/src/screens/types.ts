export interface ScreenProps {
  /** The screen owns the remote (rail closed, no detail page on top). */
  active: boolean;
  /** Focus moved off the left edge: hand it to the rail. */
  onExitLeft(): void;
}
