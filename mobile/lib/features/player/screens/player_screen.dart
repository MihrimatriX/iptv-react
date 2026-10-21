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
import '../../auth/providers/auth_provider.dart';
import '../../browse/providers/recents_provider.dart';
import '../../browse/widgets/channel_tile.dart';

/// How long the player may sit in "buffering" before we treat it as a stall
/// and reopen the stream ourselves.
const _stallTimeout = Duration(seconds: 12);

/// Backoff policy for automatic reconnects. [attempt] is 0 for the first
/// retry after a failure, 1 for the second, and so on. Returning null gives
/// up and shows the error overlay with a manual "Tekrar dene" button.
Duration? reconnectDelay(int attempt) {
  // Same budget as the web player: 1, 2, 4, 8, 10 s, then give up.
  const delays = [1, 2, 4, 8, 10];
  return attempt < delays.length ? Duration(seconds: delays[attempt]) : null;
}

class PlayerScreen extends ConsumerStatefulWidget {
  const PlayerScreen({super.key, required this.args});

  final PlayerRouteArgs args;

  @override
  ConsumerState<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends ConsumerState<PlayerScreen>
    with WidgetsBindingObserver {
  late final Player _player;
  late final VideoController _controller;
  late ChannelStream _current;
  late List<ChannelStream> _playlist;

  bool _showControls = true;
  bool _isFullscreen = false;
  bool _buffering = true;
  bool _reconnecting = false;
  int _attempt = 0;
  String? _error;
  Timer? _hideTimer;
  Timer? _stallTimer;
  Timer? _retryTimer;
  final _subs = <StreamSubscription<Object>>[];

  bool get _isLive => _current.streamType == 'live';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _current = widget.args.stream;
    _playlist = widget.args.playlist;
    _player = Player();
    _controller = VideoController(_player);
    _tuneNetworking();
    _subs.addAll([
      _player.stream.playing.listen((_) {
        if (mounted) setState(() {});
      }),
      _player.stream.buffering.listen(_onBuffering),
      _player.stream.completed.listen((done) {
        // A live stream never "ends": completion means the server dropped us
        // and keep-open would otherwise freeze on the last frame.
        if (done && _isLive) _recover();
      }),
      _player.stream.error.listen(_onError),
    ]);
    _openCurrent();
    _armHideTimer();
    _syncWakeLock();
  }

  /// media_kit ships `network-timeout=5`; slow IPTV panels routinely exceed
  /// that, mpv gives up and the picture freezes. Give it room and let ffmpeg
  /// reconnect dropped HTTP connections on its own first.
  void _tuneNetworking() {
    final native = _player.platform;
    if (native is! NativePlayer) return;
    native.setProperty('network-timeout', '20');
    native.setProperty(
      'stream-lavf-o',
      'reconnect=1,reconnect_streamed=1,reconnect_on_network_error=1,'
          'reconnect_delay_max=4',
    );
    native.setProperty('demuxer-readahead-secs', '20');
  }

  void _onBuffering(bool buffering) {
    if (!mounted) return;
    _stallTimer?.cancel();
    if (buffering) {
      _stallTimer = Timer(_stallTimeout, _recover);
    } else if (_player.state.playing) {
      // Healthy again: forget earlier failures.
      _attempt = 0;
      _reconnecting = false;
      _error = null;
    }
    setState(() => _buffering = buffering);
  }

  void _onError(String message) {
    if (!mounted || message.isEmpty) return;
    // Decoder hiccups on a live TS stream are logged as errors while the
    // picture keeps going; only act when playback has actually stopped.
    final s = _player.state;
    if (s.playing && !s.buffering) return;
    _recover(message);
  }

  /// Schedules an automatic reopen, or surfaces the error once the backoff
  /// policy gives up.
  void _recover([String? reason]) {
    if (!mounted || _retryTimer?.isActive == true) return;
    _stallTimer?.cancel();
    final delay = reconnectDelay(_attempt);
    if (delay == null) {
      setState(() {
        _reconnecting = false;
        _error = reason ?? 'Yayın akışı durdu. Bağlantını kontrol et.';
        _showControls = true;
      });
      return;
    }
    setState(() => _reconnecting = true);
    _retryTimer = Timer(delay, () {
      _attempt++;
      _open();
    });
  }

  /// User-initiated open (new channel / "Tekrar dene"): fresh retry budget.
  Future<void> _openCurrent() {
    _attempt = 0;
    _reconnecting = false;
    final id = _current.id;
    // Deferred: providers can't be modified while initState is building.
    Future.microtask(() => ref.read(recentsProvider.notifier).add(id));
    return _open();
  }

  Future<void> _open() async {
    _retryTimer?.cancel();
    _stallTimer?.cancel();
    setState(() {
      _error = null;
      _buffering = true;
    });
    final ua = ref.read(authProvider).credentials?.userAgent?.trim();
    try {
      await _player.open(
        Media(
          _current.streamUrl,
          httpHeaders: (ua?.isNotEmpty ?? false) ? {'User-Agent': ua!} : null,
        ),
      );
    } catch (e) {
      _recover('Oynatma başlatılamadı: $e');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
        _player.pause();
      case AppLifecycleState.resumed:
        // Android drops the video surface in background; reopening a live
        // stream also jumps back to the live edge instead of stale buffer.
        if (_isLive) {
          _open();
        } else {
          _player.play();
        }
      default:
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
    final i = _playlist.indexWhere((s) => s.id == _current.id);
    return i < 0 ? 0 : i;
  }

  Future<void> _switchTo(ChannelStream stream) async {
    if (stream.id == _current.id) return;
    HapticFeedback.selectionClick();
    // Flash the overlay so the new channel name is visible.
    setState(() {
      _current = stream;
      _showControls = true;
    });
    await _openCurrent();
    _armHideTimer();
  }

  Future<void> _step(int delta) async {
    if (_playlist.length < 2) return;
    final i = (_index + delta + _playlist.length) % _playlist.length;
    await _switchTo(_playlist[i]);
  }

  Future<void> _showChannels() async {
    _hideTimer?.cancel();
    final picked = await showModalBottomSheet<ChannelStream>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (context) =>
          _ChannelSheet(playlist: _playlist, currentId: _current.id),
    );
    if (!mounted) return;
    if (picked != null) await _switchTo(picked);
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
      await _restoreSystemUi();
    }
    _armHideTimer();
  }

  Future<void> _restoreSystemUi() async {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    await SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
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
    WidgetsBinding.instance.removeObserver(this);
    _hideTimer?.cancel();
    _stallTimer?.cancel();
    _retryTimer?.cancel();
    for (final sub in _subs) {
      sub.cancel();
    }
    _restoreSystemUi();
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
          onDoubleTap: _toggleFullscreen,
          // Swipe up → next channel, swipe down → previous (TV remote feel).
          onVerticalDragEnd: (d) {
            final v = d.primaryVelocity ?? 0;
            if (v.abs() < 400) return;
            _step(v < 0 ? 1 : -1);
          },
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
              if (_error == null && (_buffering || _reconnecting))
                Center(
                  child: _StatusChip(
                    label: _reconnecting ? 'Yeniden bağlanıyor…' : null,
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
                      Icon(Icons.wifi_off_rounded,
                          color: colors.danger, size: 40),
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: colors.textPrimary),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 12,
                        runSpacing: 8,
                        alignment: WrapAlignment.center,
                        children: [
                          FilledButton.icon(
                            onPressed: _openCurrent,
                            icon: const Icon(Icons.refresh_rounded),
                            label: const Text('Tekrar dene'),
                          ),
                          if (_playlist.length > 1)
                            OutlinedButton.icon(
                              onPressed: () => _step(1),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                minimumSize: const Size(0, 40),
                              ),
                              icon: const Icon(Icons.skip_next_rounded),
                              label: const Text('Sonraki kanal'),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              AnimatedOpacity(
                opacity: _showControls ? 1 : 0,
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOut,
                child: IgnorePointer(
                  ignoring: !_showControls,
                  child: _ControlsOverlay(
                    title: _current.name,
                    position: '${_index + 1} / ${_playlist.length}',
                    isLive: _isLive,
                    isPlaying: _player.state.playing,
                    isFullscreen: _isFullscreen,
                    onBack: () => Navigator.of(context).maybePop(),
                    onPlayPause: _togglePlay,
                    onNext: () => _step(1),
                    onPrev: () => _step(-1),
                    onFullscreen: _toggleFullscreen,
                    onChannels: _showChannels,
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

class _StatusChip extends StatelessWidget {
  const _StatusChip({this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: label == null ? 12 : 16,
        vertical: 12,
      ),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              color: Colors.white,
            ),
          ),
          if (label != null) ...[
            const SizedBox(width: 10),
            Text(
              label!,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ControlsOverlay extends StatelessWidget {
  const _ControlsOverlay({
    required this.title,
    required this.position,
    required this.isLive,
    required this.isPlaying,
    required this.isFullscreen,
    required this.onBack,
    required this.onPlayPause,
    required this.onNext,
    required this.onPrev,
    required this.onFullscreen,
    required this.onChannels,
  });

  final String title;
  final String position;
  final bool isLive;
  final bool isPlaying;
  final bool isFullscreen;
  final VoidCallback onBack;
  final VoidCallback onPlayPause;
  final VoidCallback onNext;
  final VoidCallback onPrev;
  final VoidCallback onFullscreen;
  final VoidCallback onChannels;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xB8000000), Color(0x00000000), Color(0xB8000000)],
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
                  tooltip: 'Geri',
                  onPressed: onBack,
                  icon: const Icon(
                    Icons.arrow_back_rounded,
                    color: Colors.white,
                  ),
                ),
                Expanded(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: Text(
                      title,
                      key: ValueKey(title),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 17,
                      ),
                    ),
                  ),
                ),
                if (isLive)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: colors.danger,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      'CANLI',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran',
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
              _RoundButton(
                icon: Icons.skip_previous_rounded,
                tooltip: 'Önceki kanal',
                onTap: onPrev,
              ),
              const SizedBox(width: 24),
              _RoundButton(
                icon: isPlaying
                    ? Icons.pause_rounded
                    : Icons.play_arrow_rounded,
                tooltip: isPlaying ? 'Duraklat' : 'Oynat',
                large: true,
                accent: true,
                onTap: onPlayPause,
              ),
              const SizedBox(width: 24),
              _RoundButton(
                icon: Icons.skip_next_rounded,
                tooltip: 'Sonraki kanal',
                onTap: onNext,
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 12, 12),
            child: Row(
              children: [
                Text(
                  position,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(width: 10),
                const Flexible(
                  child: Text(
                    'Kaydır: kanal değiştir · Çift dokun: tam ekran',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.white54, fontSize: 11),
                  ),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: onChannels,
                  style: TextButton.styleFrom(foregroundColor: Colors.white),
                  icon: const Icon(Icons.format_list_bulleted_rounded),
                  label: const Text('Kanallar'),
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
    required this.tooltip,
    required this.onTap,
    this.large = false,
    this.accent = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool large;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final size = large ? 64.0 : 44.0;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: accent ? colors.accent : Colors.white.withValues(alpha: 0.12),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(
            width: size,
            height: size,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 150),
              transitionBuilder: (child, a) =>
                  ScaleTransition(scale: a, child: child),
              child: Icon(
                icon,
                key: ValueKey(icon),
                color: Colors.white,
                size: large ? 32 : 24,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ChannelSheet extends StatelessWidget {
  const _ChannelSheet({required this.playlist, required this.currentId});

  final List<ChannelStream> playlist;
  final int currentId;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      maxChildSize: 0.95,
      builder: (context, controller) => ListView.separated(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        itemCount: playlist.length,
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final stream = playlist[i];
          return ChannelTile(
            stream: stream,
            selected: stream.id == currentId,
            onTap: () => Navigator.pop(context, stream),
          );
        },
      ),
    );
  }
}
