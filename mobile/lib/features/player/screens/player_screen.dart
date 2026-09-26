import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/xtream/xtream_models.dart';

class PlayerScreen extends ConsumerStatefulWidget {
  const PlayerScreen({super.key, required this.args});

  final PlayerRouteArgs args;

  @override
  ConsumerState<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends ConsumerState<PlayerScreen> {
  late final Player _player;
  late final VideoController _controller;
  late ChannelStream _current;
  late List<ChannelStream> _playlist;

  bool _showControls = true;
  bool _isFullscreen = false;
  bool _buffering = true;
  String? _error;
  Timer? _hideTimer;
  StreamSubscription<bool>? _playingSub;
  StreamSubscription<bool>? _bufferingSub;
  StreamSubscription<String>? _errorSub;

  @override
  void initState() {
    super.initState();
    _current = widget.args.stream;
    _playlist = widget.args.playlist;
    _player = Player();
    _controller = VideoController(_player);
    _playingSub = _player.stream.playing.listen((_) {
      if (mounted) setState(() {});
    });
    _bufferingSub = _player.stream.buffering.listen((buf) {
      if (mounted) setState(() => _buffering = buf);
    });
    _errorSub = _player.stream.error.listen((message) {
      if (!mounted || message.isEmpty) return;
      setState(() => _error = message);
    });
    _openCurrent();
    _armHideTimer();
    _syncWakeLock();
  }

  Future<void> _openCurrent() async {
    setState(() {
      _error = null;
      _buffering = true;
    });
    try {
      await _player.open(Media(_current.streamUrl));
      await _player.play();
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Oynatma baÅŸlatÄ±lamadÄ±: $e');
      }
    }
  }

  void _armHideTimer() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _player.state.playing) {
        setState(() => _showControls = false);
      }
    });
  }

  void _toggleControls() {
    setState(() => _showControls = !_showControls);
    if (_showControls) _armHideTimer();
  }

  Future<void> _togglePlay() async {
    await _player.playOrPause();
    _armHideTimer();
  }

  int get _index {
    if (_playlist.isEmpty) return 0;
    final i = _playlist.indexWhere((s) => s.id == _current.id);
    if (i < 0) return 0;
    return i;
  }

  Future<void> _next() async {
    if (_playlist.isEmpty) return;
    final next = (_index + 1) % _playlist.length;
    setState(() => _current = _playlist[next]);
    await _openCurrent();
    _armHideTimer();
  }

  Future<void> _prev() async {
    if (_playlist.isEmpty) return;
    final prev = (_index - 1 + _playlist.length) % _playlist.length;
    setState(() => _current = _playlist[prev]);
    await _openCurrent();
    _armHideTimer();
  }

  Future<void> _toggleFullscreen() async {
    final next = !_isFullscreen;
    setState(() => _isFullscreen = next);
    if (next) {
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      await SystemChrome.setPreferredOrientations(const [
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    } else {
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
      await SystemChrome.setPreferredOrientations(const [
        DeviceOrientation.portraitUp,
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    }
    _armHideTimer();
  }


  Future<void> _syncWakeLock() async {
    final enabled = ref.read(wakeLockEnabledProvider);
    try {
      if (enabled) {
        await WakelockPlus.enable();
      } else {
        await WakelockPlus.disable();
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    _playingSub?.cancel();
    _bufferingSub?.cancel();
    _errorSub?.cancel();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    _player.dispose();
    WakelockPlus.disable();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        top: !_isFullscreen,
        bottom: !_isFullscreen,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: _toggleControls,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Center(
                child: Video(
                  controller: _controller,
                  controls: NoVideoControls,
                  fit: BoxFit.contain,
                ),
              ),
              // Top linear buffer indicator
              if (_buffering && _error == null)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(
                    minHeight: 2,
                    backgroundColor: Colors.transparent,
                    color: colors.accent,
                  ),
                ),
              if (_error != null)
                Container(
                  color: colors.overlay,
                  alignment: Alignment.center,
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.error_outline,
                          color: colors.danger, size: 40),
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: TextStyle(color: colors.textPrimary),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _openCurrent,
                        child: const Text('Tekrar dene'),
                      ),
                    ],
                  ),
                ),
              AnimatedOpacity(
                opacity: _showControls ? 1 : 0,
                duration: const Duration(milliseconds: 220),
                child: IgnorePointer(
                  ignoring: !_showControls,
                  child: _ControlsOverlay(
                    title: _current.name,
                    isPlaying: _player.state.playing,
                    isFullscreen: _isFullscreen,
                    onBack: () => Navigator.of(context).maybePop(),
                    onPlayPause: _togglePlay,
                    onNext: _next,
                    onPrev: _prev,
                    onFullscreen: _toggleFullscreen,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ControlsOverlay extends StatelessWidget {
  const _ControlsOverlay({
    required this.title,
    required this.isPlaying,
    required this.isFullscreen,
    required this.onBack,
    required this.onPlayPause,
    required this.onNext,
    required this.onPrev,
    required this.onFullscreen,
  });

  final String title;
  final bool isPlaying;
  final bool isFullscreen;
  final VoidCallback onBack;
  final VoidCallback onPlayPause;
  final VoidCallback onNext;
  final VoidCallback onPrev;
  final VoidCallback onFullscreen;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xB8000000),
            Color(0x00000000),
            Color(0xB8000000),
          ],
          stops: [0, 0.45, 1],
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 8, 8, 0),
            child: Row(
              children: [
                IconButton(
                  onPressed: onBack,
                  icon: const Icon(Icons.arrow_back_rounded,
                      color: Colors.white),
                ),
                Expanded(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 17,
                    ),
                  ),
                ),
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: colors.accent,
                    shape: BoxShape.circle,
                  ),
                ),
                Text(
                  'CANLI',
                  style: TextStyle(
                    color: colors.accent,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: onFullscreen,
                  icon: Icon(
                    isFullscreen
                        ? Icons.fullscreen_exit_rounded
                        : Icons.fullscreen_rounded,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _RoundButton(icon: Icons.skip_previous_rounded, onTap: onPrev),
              const SizedBox(width: 24),
              _RoundButton(
                icon: isPlaying
                    ? Icons.pause_rounded
                    : Icons.play_arrow_rounded,
                large: true,
                accent: true,
                onTap: onPlayPause,
              ),
              const SizedBox(width: 24),
              _RoundButton(icon: Icons.skip_next_rounded, onTap: onNext),
            ],
          ),
          // Accent scrubber rail (live â€” indeterminate scrub feel)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
            child: Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: 1.0,
                    minHeight: 3,
                    backgroundColor: const Color(0x33FFFFFF),
                    color: colors.accent,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.icon,
    required this.onTap,
    this.large = false,
    this.accent = false,
  });

  final IconData icon;
  final VoidCallback onTap;
  final bool large;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final size = large ? 64.0 : 44.0;
    return Material(
      color: accent
          ? colors.accent
          : Colors.white.withValues(alpha: 0.12),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: size,
          height: size,
          child: Icon(
            icon,
            color: Colors.white,
            size: large ? 32 : 24,
          ),
        ),
      ),
    );
  }
}
