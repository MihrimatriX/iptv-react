import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _apiBaseCtrl = TextEditingController();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _userAgentCtrl = TextEditingController();
  bool _obscure = true;
  bool _showAdvanced = false;

  @override
  void dispose() {
    _apiBaseCtrl.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _userAgentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final ok = await ref.read(authProvider.notifier).login(
          apiBase: _apiBaseCtrl.text,
          username: _usernameCtrl.text,
          password: _passwordCtrl.text,
          userAgent: _userAgentCtrl.text,
        );
    if (!ok && mounted) {
      final error = ref.read(authProvider).error;
      if (error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error)),
        );
      }
    }
  }

  Future<void> _enterDemo() async {
    await ref.read(authProvider.notifier).enterDemo();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final c = AppColors.of(context);

    return Scaffold(
      backgroundColor: c.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),
                  Text(
                    'AFU IPTV Player',
                    style: Theme.of(context).textTheme.displayMedium?.copyWith(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.8,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Xtream Codes ile kişisel canlı TV deneyimi',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: c.textSecondary,
                        ),
                  ),
                  const SizedBox(height: 32),
                  Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextFormField(
                          controller: _apiBaseCtrl,
                          keyboardType: TextInputType.url,
                          autocorrect: false,
                          decoration: const InputDecoration(
                            labelText: 'API Base URL',
                            hintText: 'http://host:port',
                            prefixIcon: Icon(Icons.link_rounded, size: 20),
                          ),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) {
                              return 'API Base URL gerekli';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _usernameCtrl,
                          autocorrect: false,
                          decoration: const InputDecoration(
                            labelText: 'Kullanıcı adı',
                            prefixIcon:
                                Icon(Icons.person_outline_rounded, size: 20),
                          ),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) {
                              return 'Kullanıcı adı gerekli';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _passwordCtrl,
                          obscureText: _obscure,
                          decoration: InputDecoration(
                            labelText: 'Şifre',
                            prefixIcon:
                                const Icon(Icons.lock_outline_rounded, size: 20),
                            suffixIcon: IconButton(
                              onPressed: () =>
                                  setState(() => _obscure = !_obscure),
                              icon: Icon(
                                _obscure
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                                size: 20,
                              ),
                            ),
                          ),
                          validator: (v) {
                            if (v == null || v.isEmpty) {
                              return 'Şifre gerekli';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton(
                            onPressed: () => setState(
                              () => _showAdvanced = !_showAdvanced,
                            ),
                            child: Text(
                              _showAdvanced
                                  ? 'Gelişmiş ayarları gizle'
                                  : 'Gelişmiş (User-Agent)',
                              style: TextStyle(
                                color: c.textTertiary,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ),
                        if (_showAdvanced) ...[
                          TextFormField(
                            controller: _userAgentCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Özel User-Agent (opsiyonel)',
                              prefixIcon:
                                  Icon(Icons.smartphone_rounded, size: 20),
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            onPressed: auth.isBusy ? null : _submit,
                            child: auth.isBusy
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.4,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('Bağlan'),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextButton(
                          onPressed: auth.isBusy ? null : _enterDemo,
                          child: Text(
                            'Demo ile dene',
                            style: TextStyle(
                              color: c.textSecondary,
                              fontWeight: FontWeight.w500,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Kimlik bilgisi olmadan arayüzü keşfet',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: c.textTertiary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'Kimlik bilgileriniz cihazınızda güvenli depolamada saklanır. '
                    'Yalnızca yasal ve kişisel IPTV abonelikleri için kullanın.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: c.textTertiary,
                      fontSize: 12,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}