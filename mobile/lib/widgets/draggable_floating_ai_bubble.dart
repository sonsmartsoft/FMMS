import 'package:flutter/material.dart';

class DraggableFloatingAIBubble extends StatefulWidget {
  final void Function(Offset position)? onTapWithPosition;
  final VoidCallback? onTap;

  const DraggableFloatingAIBubble({
    super.key,
    this.onTapWithPosition,
    this.onTap,
  });

  @override
  State<DraggableFloatingAIBubble> createState() => _DraggableFloatingAIBubbleState();
}

class _DraggableFloatingAIBubbleState extends State<DraggableFloatingAIBubble>
    with SingleTickerProviderStateMixin {
  Offset? _position;
  bool _isDragging = false;
  late AnimationController _pulseController;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);

    _glowAnimation = Tween<double>(begin: 4.0, end: 14.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _handleTap() {
    final currentPos = _position ?? const Offset(300, 550);
    if (widget.onTapWithPosition != null) {
      widget.onTapWithPosition!(currentPos);
    } else if (widget.onTap != null) {
      widget.onTap!();
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final topPadding = MediaQuery.of(context).padding.top;
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    // Default position: lower right corner, just above bottom bar
    _position ??= Offset(
      size.width - 68.0,
      size.height - bottomPadding - 145.0,
    );

    // Keep clamped inside screen bounds
    final clampedX = _position!.dx.clamp(12.0, size.width - 66.0);
    final clampedY = _position!.dy.clamp(topPadding + 20.0, size.height - bottomPadding - 130.0);

    return Positioned(
      left: clampedX,
      top: clampedY,
      child: GestureDetector(
        onPanStart: (_) {
          setState(() => _isDragging = true);
        },
        onPanUpdate: (details) {
          setState(() {
            _position = Offset(
              (_position!.dx + details.delta.dx).clamp(10.0, size.width - 66.0),
              (_position!.dy + details.delta.dy).clamp(topPadding + 10.0, size.height - bottomPadding - 110.0),
            );
          });
        },
        onPanEnd: (_) {
          setState(() => _isDragging = false);
        },
        onTap: _handleTap,
        child: AnimatedBuilder(
          animation: _pulseController,
          builder: (context, child) {
            return Transform.scale(
              scale: _isDragging ? 1.08 : 1.0,
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFF0284C7),
                      Color(0xFF6366F1),
                      Color(0xFFA855F7),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF6366F1).withValues(alpha: _isDragging ? 0.65 : 0.42),
                      blurRadius: _glowAnimation.value + (_isDragging ? 6.0 : 0.0),
                      spreadRadius: _isDragging ? 2.5 : 1.2,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    const Icon(
                      Icons.smart_toy_rounded,
                      color: Colors.white,
                      size: 28,
                    ),
                    Positioned(
                      top: 6,
                      right: 7,
                      child: Container(
                        width: 9,
                        height: 9,
                        decoration: BoxDecoration(
                          color: const Color(0xFF34D399),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
