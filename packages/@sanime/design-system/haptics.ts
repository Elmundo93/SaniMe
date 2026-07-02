import * as Haptics from 'expo-haptics';

// Jede Aktion bekommt genau eine Haptic-Definition.

export const haptics = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
} as const;

/** `selection` nutzt expo-haptics' eigenen Feedback-Typ (kein Impact/Notification-Enum-Wert). */
export const selectionHaptic = Haptics.selectionAsync;
