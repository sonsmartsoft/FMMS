import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class CalculatorKeypadWidget extends StatefulWidget {
  final double initialAmount;
  final ValueChanged<double> onAmountChanged;
  final VoidCallback onDone;

  const CalculatorKeypadWidget({
    super.key,
    required this.initialAmount,
    required this.onAmountChanged,
    required this.onDone,
  });

  @override
  State<CalculatorKeypadWidget> createState() => _CalculatorKeypadWidgetState();
}

class _CalculatorKeypadWidgetState extends State<CalculatorKeypadWidget> {
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);
  
  String _expression = '';
  double _currentValue = 0.0;

  @override
  void initState() {
    super.initState();
    if (widget.initialAmount > 0) {
      _currentValue = widget.initialAmount;
      _expression = widget.initialAmount.toInt().toString();
    } else {
      _expression = '';
      _currentValue = 0.0;
    }
  }

  void _onKeyPress(String key) {
    setState(() {
      if (key == 'C') {
        _expression = '';
        _currentValue = 0.0;
      } else if (key == '⌫') {
        if (_expression.isNotEmpty) {
          _expression = _expression.trim();
          _expression = _expression.substring(0, _expression.length - 1).trim();
          _evaluateExpression();
        }
      } else if (key == '000') {
        if (_expression.isNotEmpty && RegExp(r'\d$').hasMatch(_expression)) {
          _expression += '000';
          _evaluateExpression();
        }
      } else if (key == '+' || key == '-' || key == '×' || key == '÷') {
        if (_expression.isEmpty) {
          if (key == '-') _expression = '-';
        } else {
          // If ends with an operator, replace it
          if (RegExp(r'[+\-×÷]$').hasMatch(_expression.trim())) {
            _expression = _expression.trim().substring(0, _expression.trim().length - 1) + ' $key ';
          } else {
            _evaluateExpression();
            _expression = '${_currentValue.toInt()} $key ';
          }
        }
      } else if (key == '=') {
        _evaluateExpression();
        _expression = _currentValue.toInt().toString();
      } else {
        // Digit 0-9
        _expression += key;
        _evaluateExpression();
      }
    });

    widget.onAmountChanged(_currentValue);
  }

  void _evaluateExpression() {
    try {
      final tokens = _expression.trim().split(RegExp(r'\s+'));
      if (tokens.isEmpty) {
        _currentValue = 0.0;
        return;
      }

      if (tokens.length == 1) {
        _currentValue = double.tryParse(tokens[0]) ?? 0.0;
        return;
      }

      // Simple left-to-right evaluation
      double result = double.tryParse(tokens[0]) ?? 0.0;
      for (int i = 1; i < tokens.length; i += 2) {
        if (i + 1 < tokens.length) {
          final op = tokens[i];
          final nextNum = double.tryParse(tokens[i + 1]);
          if (nextNum != null) {
            switch (op) {
              case '+':
                result += nextNum;
                break;
              case '-':
                result -= nextNum;
                break;
              case '×':
              case '*':
                result *= nextNum;
                break;
              case '÷':
              case '/':
                if (nextNum != 0) result /= nextNum;
                break;
            }
          }
        }
      }

      _currentValue = result.clamp(0.0, 999999999999.0);
    } catch (_) {
      // keep current value
    }
  }

  Widget _buildKey(String text, {Color? bg, Color? fg, int flex = 1, VoidCallback? customAction}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBg = bg ?? (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9));
    final defaultFg = fg ?? (isDark ? Colors.white : const Color(0xFF0F172A));

    return Expanded(
      flex: flex,
      child: Padding(
        padding: const EdgeInsets.all(3.0),
        child: Material(
          color: defaultBg,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: customAction ?? () => _onKeyPress(text),
            child: Container(
              height: 44,
              alignment: Alignment.center,
              child: Text(
                text,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: defaultFg,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Calculation display
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            margin: const EdgeInsets.only(bottom: 6),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _expression.isNotEmpty ? _expression : '0',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade600,
                          fontFamily: 'monospace',
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _currencyFmt.format(_currentValue),
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFFEF4444),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.backspace_outlined, size: 20, color: Colors.grey),
                  onPressed: () => _onKeyPress('⌫'),
                  tooltip: 'Xóa ký tự',
                ),
              ],
            ),
          ),

          // Row 1
          Row(
            children: [
              _buildKey('7'),
              _buildKey('8'),
              _buildKey('9'),
              _buildKey('÷', bg: const Color(0xFF0284C7).withValues(alpha: 0.15), fg: const Color(0xFF0284C7)),
              _buildKey('C', bg: const Color(0xFFEF4444).withValues(alpha: 0.15), fg: const Color(0xFFEF4444)),
            ],
          ),

          // Row 2
          Row(
            children: [
              _buildKey('4'),
              _buildKey('5'),
              _buildKey('6'),
              _buildKey('×', bg: const Color(0xFF0284C7).withValues(alpha: 0.15), fg: const Color(0xFF0284C7)),
              _buildKey('000', bg: Colors.amber.withValues(alpha: 0.15), fg: Colors.amber.shade800),
            ],
          ),

          // Row 3
          Row(
            children: [
              _buildKey('1'),
              _buildKey('2'),
              _buildKey('3'),
              _buildKey('-', bg: const Color(0xFF0284C7).withValues(alpha: 0.15), fg: const Color(0xFF0284C7)),
              _buildKey('=', bg: const Color(0xFF10B981).withValues(alpha: 0.15), fg: const Color(0xFF10B981)),
            ],
          ),

          // Row 4
          Row(
            children: [
              _buildKey('0', flex: 2),
              _buildKey('+'),
              _buildKey(
                'XONG ✓',
                flex: 2,
                bg: const Color(0xFF10B981),
                fg: Colors.white,
                customAction: widget.onDone,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
