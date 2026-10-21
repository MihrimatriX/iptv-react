import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

abstract final class AppTheme {
  static TextTheme _textTheme(Brightness brightness, AppColors colors) {
    final base = GoogleFonts.plusJakartaSansTextTheme(
      ThemeData(brightness: brightness).textTheme,
    );
    return base.copyWith(
      displayLarge: base.displayLarge?.copyWith(
        color: colors.textPrimary,
        fontSize: 32,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.6,
        height: 1.15,
      ),
      displayMedium: base.displayMedium?.copyWith(
        color: colors.textPrimary,
        fontSize: 28,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.4,
      ),
      titleLarge: base.titleLarge?.copyWith(
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.3,
      ),
      titleMedium: base.titleMedium?.copyWith(
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: FontWeight.w600,
      ),
      titleSmall: base.titleSmall?.copyWith(
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: FontWeight.w400,
      ),
      bodyMedium: base.bodyMedium?.copyWith(
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: FontWeight.w500,
      ),
      bodySmall: base.bodySmall?.copyWith(
        color: colors.textSecondary,
        fontSize: 12,
      ),
      labelLarge: base.labelLarge?.copyWith(
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: FontWeight.w600,
      ),
      labelSmall: base.labelSmall?.copyWith(
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.8,
      ),
    );
  }

  static ThemeData _build(Brightness brightness, AppColors colors) {
    final textTheme = _textTheme(brightness, colors);
    final isDark = brightness == Brightness.dark;

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: colors.background,
      textTheme: textTheme,
      primaryTextTheme: textTheme,
      extensions: [colors],
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: colors.accent,
        onPrimary: Colors.white,
        secondary: colors.accent,
        onSecondary: Colors.white,
        surface: colors.surface,
        onSurface: colors.textPrimary,
        error: colors.danger,
        onError: Colors.white,
        outline: colors.border,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        systemOverlayStyle: isDark
            ? SystemUiOverlayStyle.light
            : SystemUiOverlayStyle.dark,
        titleTextStyle: textTheme.titleLarge,
        iconTheme: IconThemeData(color: colors.textPrimary),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surface,
        hintStyle: textTheme.bodyLarge?.copyWith(color: colors.textTertiary),
        labelStyle: textTheme.bodySmall?.copyWith(color: colors.textSecondary),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colors.accent, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colors.danger),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colors.accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: colors.accent.withValues(alpha: 0.4),
          elevation: 0,
          minimumSize: const Size.fromHeight(48),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colors.textPrimary,
          side: BorderSide(color: colors.border),
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: colors.textSecondary,
          textStyle: textTheme.bodyMedium,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(foregroundColor: colors.textPrimary),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: colors.surface,
        selectedColor: colors.accentMuted,
        side: BorderSide(color: colors.border),
        showCheckmark: false,
        labelStyle: textTheme.bodySmall!.copyWith(
          color: colors.textSecondary,
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
        secondaryLabelStyle: textTheme.bodySmall!.copyWith(
          color: colors.accent,
          fontWeight: FontWeight.w700,
          fontSize: 13,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
      dividerTheme: DividerThemeData(
        color: colors.divider,
        thickness: 1,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: colors.surface,
        contentTextStyle: textTheme.bodyLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        behavior: SnackBarBehavior.floating,
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: colors.accent,
        linearTrackColor: colors.surface,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: colors.bgElevated,
        indicatorColor: colors.accentMuted,
        elevation: 0,
        height: 64,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return textTheme.labelSmall!.copyWith(
            color: selected ? colors.accent : colors.textTertiary,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? colors.accent : colors.textTertiary,
            size: 22,
          );
        }),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: colors.textSecondary,
        textColor: colors.textPrimary,
        titleTextStyle: textTheme.titleSmall,
        subtitleTextStyle: textTheme.bodySmall,
      ),
      cardTheme: CardThemeData(
        color: colors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: colors.border),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: colors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: colors.border),
        ),
      ),
    );
  }

  static ThemeData get dark => _build(Brightness.dark, AppColors.dark);

  static ThemeData get light => _build(Brightness.light, AppColors.light);
}
