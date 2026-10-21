import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Flat surface block — hairline border, no elevation, no heavy glass blur.
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius = 16,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final radius = BorderRadius.circular(borderRadius);
    return Material(
      color: c.surface,
      borderRadius: radius,
      child: InkWell(
        onTap: onTap,
        borderRadius: radius,
        hoverColor: c.surfaceHover,
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            borderRadius: radius,
            border: Border.all(color: c.border),
          ),
          child: child,
        ),
      ),
    );
  }
}