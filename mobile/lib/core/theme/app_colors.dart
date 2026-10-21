import 'package:flutter/material.dart';

/// Cinematic streaming palette — blue accent for dark & light stages.
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.background,
    required this.bgElevated,
    required this.surface,
    required this.surfaceHover,
    required this.border,
    required this.hairline,
    required this.accent,
    required this.accentMuted,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.success,
    required this.warning,
    required this.danger,
    required this.overlay,
    required this.glass,
    required this.skeletonBase,
    required this.skeletonHighlight,
    required this.divider,
  });

  final Color background;
  final Color bgElevated;
  final Color surface;
  final Color surfaceHover;
  final Color border;
  final Color hairline;
  final Color accent;
  final Color accentMuted;
  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;
  final Color success;
  final Color warning;
  final Color danger;
  final Color overlay;
  final Color glass;
  final Color skeletonBase;
  final Color skeletonHighlight;
  final Color divider;

  Color get accentSoft => accentMuted;
  Color get textMuted => textTertiary;
  Color get glassBorder => border;
  Color get surfaceElevated => bgElevated;

  /// Premium blue — shared across both themes (not Material purple).
  static const Color brandAccent = Color(0xFF2F6BFF);
  static const Color brandAccentMuted = Color(0x292F6BFF);
  static const Color brandDanger = Color(0xFFFF453A);
  static const Color brandSuccess = Color(0xFF30D158);
  static const Color brandWarning = Color(0xFFFFD60A);

  static const AppColors dark = AppColors(
    background: Color(0xFF070708),
    bgElevated: Color(0xFF111114),
    surface: Color(0xFF18181C),
    surfaceHover: Color(0xFF222228),
    border: Color(0xFF2A2A32),
    hairline: Color(0x14FFFFFF),
    accent: brandAccent,
    accentMuted: brandAccentMuted,
    textPrimary: Color(0xFFF5F5F7),
    textSecondary: Color(0xFFA1A1A6),
    textTertiary: Color(0xFF6E6E73),
    success: brandSuccess,
    warning: brandWarning,
    danger: brandDanger,
    overlay: Color(0xB8000000),
    glass: Color(0xCC18181C),
    skeletonBase: Color(0xFF18181C),
    skeletonHighlight: Color(0xFF222228),
    divider: Color(0xFF2A2A32),
  );

  static const AppColors light = AppColors(
    background: Color(0xFFF5F5F7),
    bgElevated: Color(0xFFFFFFFF),
    surface: Color(0xFFFFFFFF),
    surfaceHover: Color(0xFFEEEEF0),
    border: Color(0xFFE2E2E6),
    hairline: Color(0x14000000),
    accent: brandAccent,
    accentMuted: brandAccentMuted,
    textPrimary: Color(0xFF1C1C1E),
    textSecondary: Color(0xFF636366),
    textTertiary: Color(0xFF8E8E93),
    success: brandSuccess,
    warning: brandWarning,
    danger: brandDanger,
    overlay: Color(0x66000000),
    glass: Color(0xF2FFFFFF),
    skeletonBase: Color(0xFFE8E8EC),
    skeletonHighlight: Color(0xFFF2F2F4),
    divider: Color(0xFFE2E2E6),
  );

  static AppColors of(BuildContext context) {
    return Theme.of(context).extension<AppColors>() ?? dark;
  }

  @override
  AppColors copyWith({
    Color? background,
    Color? bgElevated,
    Color? surface,
    Color? surfaceHover,
    Color? border,
    Color? hairline,
    Color? accent,
    Color? accentMuted,
    Color? textPrimary,
    Color? textSecondary,
    Color? textTertiary,
    Color? success,
    Color? warning,
    Color? danger,
    Color? overlay,
    Color? glass,
    Color? skeletonBase,
    Color? skeletonHighlight,
    Color? divider,
  }) {
    return AppColors(
      background: background ?? this.background,
      bgElevated: bgElevated ?? this.bgElevated,
      surface: surface ?? this.surface,
      surfaceHover: surfaceHover ?? this.surfaceHover,
      border: border ?? this.border,
      hairline: hairline ?? this.hairline,
      accent: accent ?? this.accent,
      accentMuted: accentMuted ?? this.accentMuted,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textTertiary: textTertiary ?? this.textTertiary,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      danger: danger ?? this.danger,
      overlay: overlay ?? this.overlay,
      glass: glass ?? this.glass,
      skeletonBase: skeletonBase ?? this.skeletonBase,
      skeletonHighlight: skeletonHighlight ?? this.skeletonHighlight,
      divider: divider ?? this.divider,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    return AppColors(
      background: Color.lerp(background, other.background, t)!,
      bgElevated: Color.lerp(bgElevated, other.bgElevated, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceHover: Color.lerp(surfaceHover, other.surfaceHover, t)!,
      border: Color.lerp(border, other.border, t)!,
      hairline: Color.lerp(hairline, other.hairline, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      accentMuted: Color.lerp(accentMuted, other.accentMuted, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textTertiary: Color.lerp(textTertiary, other.textTertiary, t)!,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      overlay: Color.lerp(overlay, other.overlay, t)!,
      glass: Color.lerp(glass, other.glass, t)!,
      skeletonBase: Color.lerp(skeletonBase, other.skeletonBase, t)!,
      skeletonHighlight:
          Color.lerp(skeletonHighlight, other.skeletonHighlight, t)!,
      divider: Color.lerp(divider, other.divider, t)!,
    );
  }
}