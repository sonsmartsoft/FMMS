import 'package:flutter/material.dart';
import '../models/finance_model.dart';

class CategoryPickerModal extends StatefulWidget {
  final TransactionType initialType;
  final String? selectedCategoryId;
  final Function(TransactionCategoryModel category) onCategorySelected;

  const CategoryPickerModal({
    super.key,
    this.initialType = TransactionType.EXPENSE,
    this.selectedCategoryId,
    required this.onCategorySelected,
  });

  @override
  State<CategoryPickerModal> createState() => _CategoryPickerModalState();
}

class _CategoryPickerModalState extends State<CategoryPickerModal> {
  late TransactionType _currentType;
  String? _expandedParentId;

  // Rich hierarchical category list inspired by MISA MoneyKeeper
  final List<TransactionCategoryModel> _expenseCategories = [
    // 1. Ăn uống
    TransactionCategoryModel(id: 'cat-eat', name: 'Ăn uống', icon: 'restaurant', color: '#EF4444', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-eat-bf', name: 'Ăn sáng', icon: 'bakery_dining', color: '#EF4444', parentId: 'cat-eat', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-eat-lunch', name: 'Cơm trưa / Ăn trưa', icon: 'lunch_dining', color: '#EF4444', parentId: 'cat-eat', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-eat-dinner', name: 'Cơm tối gia đình', icon: 'dinner_dining', color: '#EF4444', parentId: 'cat-eat', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-eat-coffee', name: 'Cà phê & Đồ uống', icon: 'local_cafe', color: '#EF4444', parentId: 'cat-eat', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-eat-restaurant', name: 'Nhà hàng & Liên hoan', icon: 'liquor', color: '#EF4444', parentId: 'cat-eat', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-eat-market', name: 'Đi chợ & Siêu thị thực phẩm', icon: 'shopping_cart', color: '#EF4444', parentId: 'cat-eat', type: TransactionType.EXPENSE),

    // 2. Đi lại & Xe cộ
    TransactionCategoryModel(id: 'cat-trans', name: 'Đi lại & Xe cộ', icon: 'directions_car', color: '#0284C7', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-trans-fuel', name: 'Đổ xăng xe (Mazda/Xe máy)', icon: 'local_gas_station', color: '#0284C7', parentId: 'cat-trans', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-trans-park', name: 'Gửi xe & Vé qua trạm (BOT)', icon: 'local_parking', color: '#0284C7', parentId: 'cat-trans', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-trans-wash', name: 'Rửa xe & Vệ sinh', icon: 'local_car_wash', color: '#0284C7', parentId: 'cat-trans', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-trans-maint', name: 'Bảo dưỡng & Sửa chữa xe', icon: 'build', color: '#0284C7', parentId: 'cat-trans', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-trans-taxi', name: 'Taxi / Grab / Xe ôm', icon: 'local_taxi', color: '#0284C7', parentId: 'cat-trans', type: TransactionType.EXPENSE),

    // 3. Nhà cửa & Sinh hoạt
    TransactionCategoryModel(id: 'cat-home', name: 'Nhà cửa & Sinh hoạt', icon: 'home', color: '#F59E0B', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-home-electric', name: 'Tiền điện EVN', icon: 'bolt', color: '#F59E0B', parentId: 'cat-home', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-home-water', name: 'Tiền nước', icon: 'water_drop', color: '#F59E0B', parentId: 'cat-home', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-home-internet', name: 'Internet & Truyền hình', icon: 'wifi', color: '#F59E0B', parentId: 'cat-home', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-home-apt', name: 'Phí dịch vụ chung cư', icon: 'apartment', color: '#F59E0B', parentId: 'cat-home', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-home-repair', name: 'Sửa chữa & Đồ gia dụng', icon: 'handyman', color: '#F59E0B', parentId: 'cat-home', type: TransactionType.EXPENSE),

    // 4. Mua sắm
    TransactionCategoryModel(id: 'cat-shop', name: 'Mua sắm & Trang phục', icon: 'shopping_bag', color: '#EC4899', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-shop-clothes', name: 'Quần áo & Giày dép', icon: 'checkroom', color: '#EC4899', parentId: 'cat-shop', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-shop-tech', name: 'Đồ công nghệ & Điện tử', icon: 'devices', color: '#EC4899', parentId: 'cat-shop', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-shop-beauty', name: 'Mỹ phẩm & Chăm sóc cá nhân', icon: 'spa', color: '#EC4899', parentId: 'cat-shop', type: TransactionType.EXPENSE),

    // 5. Con cái & Giáo dục
    TransactionCategoryModel(id: 'cat-edu', name: 'Con cái & Giáo dục', icon: 'school', color: '#8B5CF6', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-edu-tuition', name: 'Học phí trường học / Bán trú', icon: 'menu_book', color: '#8B5CF6', parentId: 'cat-edu', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-edu-books', name: 'Sách vở & Đồ dùng học tập', icon: 'backpack', color: '#8B5CF6', parentId: 'cat-edu', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-edu-toys', name: 'Đồ chơi & Bỉm sữa', icon: 'toys', color: '#8B5CF6', parentId: 'cat-edu', type: TransactionType.EXPENSE),

    // 6. Sức khỏe & Y tế
    TransactionCategoryModel(id: 'cat-health', name: 'Sức khỏe & Y tế', icon: 'favorite', color: '#10B981', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-health-med', name: 'Thuốc men & Dược phẩm', icon: 'medication', color: '#10B981', parentId: 'cat-health', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-health-doctor', name: 'Khám chữa bệnh & Nha khoa', icon: 'medical_services', color: '#10B981', parentId: 'cat-health', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-health-ins', name: 'Bảo hiểm nhân thọ / Y tế', icon: 'shield', color: '#10B981', parentId: 'cat-health', type: TransactionType.EXPENSE),

    // 7. Giải trí & Du lịch
    TransactionCategoryModel(id: 'cat-play', name: 'Giải trí & Du lịch', icon: 'attractions', color: '#F97316', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-play-movie', name: 'Xem phim & Ca nhạc', icon: 'movie', color: '#F97316', parentId: 'cat-play', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-play-tour', name: 'Vé máy bay & Khách sạn', icon: 'flight', color: '#F97316', parentId: 'cat-play', type: TransactionType.EXPENSE),

    // 8. Nghĩa vụ & Tài chính
    TransactionCategoryModel(id: 'cat-debt', name: 'Trả nợ & Trả góp', icon: 'credit_card', color: '#64748B', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-debt-car', name: 'Trả góp xe ô tô Shinhan Bank', icon: 'directions_car', color: '#64748B', parentId: 'cat-debt', type: TransactionType.EXPENSE),
    TransactionCategoryModel(id: 'cat-debt-give', name: 'Biếu xén bố mẹ & Hiếu hỉ', icon: 'card_giftcard', color: '#64748B', parentId: 'cat-debt', type: TransactionType.EXPENSE),
  ];

  final List<TransactionCategoryModel> _incomeCategories = [
    TransactionCategoryModel(id: 'inc-salary', name: 'Lương & Thưởng', icon: 'payments', color: '#10B981', type: TransactionType.INCOME),
    TransactionCategoryModel(id: 'inc-salary-main', name: 'Lương chính hàng tháng', icon: 'account_balance', color: '#10B981', parentId: 'inc-salary', type: TransactionType.INCOME),
    TransactionCategoryModel(id: 'inc-salary-bonus', name: 'Thưởng KPI / Thưởng dự án', icon: 'stars', color: '#10B981', parentId: 'inc-salary', type: TransactionType.INCOME),

    TransactionCategoryModel(id: 'inc-invest', name: 'Đầu tư & Tiết kiệm', icon: 'trending_up', color: '#0284C7', type: TransactionType.INCOME),
    TransactionCategoryModel(id: 'inc-invest-interest', name: 'Lãi sổ tiết kiệm ngân hàng', icon: 'savings', color: '#0284C7', parentId: 'inc-invest', type: TransactionType.INCOME),
    TransactionCategoryModel(id: 'inc-invest-div', name: 'Cổ tức & Lợi nhuận', icon: 'pie_chart', color: '#0284C7', parentId: 'inc-invest', type: TransactionType.INCOME),

    TransactionCategoryModel(id: 'inc-other', name: 'Thu nhập khác', icon: 'redeem', color: '#F59E0B', type: TransactionType.INCOME),
    TransactionCategoryModel(id: 'inc-other-gift', name: 'Được tặng / Quà biếu', icon: 'card_giftcard', color: '#F59E0B', parentId: 'inc-other', type: TransactionType.INCOME),
    TransactionCategoryModel(id: 'inc-other-debt', name: 'Thu hồi nợ cho vay', icon: 'handshake', color: '#F59E0B', parentId: 'inc-other', type: TransactionType.INCOME),
  ];

  @override
  void initState() {
    super.initState();
    _currentType = widget.initialType;
    if (_currentType == TransactionType.TRANSFER) {
      _currentType = TransactionType.EXPENSE;
    }
  }

  IconData _getIconData(String? iconName) {
    switch (iconName) {
      case 'restaurant': return Icons.restaurant;
      case 'bakery_dining': return Icons.bakery_dining;
      case 'lunch_dining': return Icons.lunch_dining;
      case 'dinner_dining': return Icons.dinner_dining;
      case 'local_cafe': return Icons.local_cafe;
      case 'liquor': return Icons.liquor;
      case 'shopping_cart': return Icons.shopping_cart;
      case 'directions_car': return Icons.directions_car;
      case 'local_gas_station': return Icons.local_gas_station;
      case 'local_parking': return Icons.local_parking;
      case 'local_car_wash': return Icons.local_car_wash;
      case 'build': return Icons.build;
      case 'local_taxi': return Icons.local_taxi;
      case 'home': return Icons.home;
      case 'bolt': return Icons.bolt;
      case 'water_drop': return Icons.water_drop;
      case 'wifi': return Icons.wifi;
      case 'apartment': return Icons.apartment;
      case 'handyman': return Icons.handyman;
      case 'shopping_bag': return Icons.shopping_bag;
      case 'checkroom': return Icons.checkroom;
      case 'devices': return Icons.devices;
      case 'spa': return Icons.spa;
      case 'school': return Icons.school;
      case 'menu_book': return Icons.menu_book;
      case 'backpack': return Icons.backpack;
      case 'toys': return Icons.toys;
      case 'favorite': return Icons.favorite;
      case 'medication': return Icons.medication;
      case 'medical_services': return Icons.medical_services;
      case 'shield': return Icons.shield;
      case 'attractions': return Icons.attractions;
      case 'movie': return Icons.movie;
      case 'flight': return Icons.flight;
      case 'credit_card': return Icons.credit_card;
      case 'card_giftcard': return Icons.card_giftcard;
      case 'payments': return Icons.payments;
      case 'account_balance': return Icons.account_balance;
      case 'stars': return Icons.stars;
      case 'trending_up': return Icons.trending_up;
      case 'savings': return Icons.savings;
      case 'pie_chart': return Icons.pie_chart;
      case 'redeem': return Icons.redeem;
      case 'handshake': return Icons.handshake;
      default: return Icons.category;
    }
  }

  Color _parseColor(String? hexString) {
    if (hexString == null) return const Color(0xFF0284C7);
    final hex = hexString.replaceAll('#', '');
    if (hex.length == 6) {
      return Color(int.parse('FF$hex', radix: 16));
    }
    return const Color(0xFF0284C7);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final categories = _currentType == TransactionType.EXPENSE ? _expenseCategories : _incomeCategories;
    final parentList = categories.where((c) => c.isParent).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Chọn Hạng Mục Thu / Chi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Tabs: CHI TIỀN vs THU TIỀN
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _currentType = TransactionType.EXPENSE),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _currentType == TransactionType.EXPENSE ? const Color(0xFFEF4444) : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            'Chi Tiền',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: _currentType == TransactionType.EXPENSE ? Colors.white : Colors.grey,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _currentType = TransactionType.INCOME),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _currentType == TransactionType.INCOME ? const Color(0xFF10B981) : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            'Thu Tiền',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: _currentType == TransactionType.INCOME ? Colors.white : Colors.grey,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const Divider(height: 1),

          // List of Parent + Sub Categories
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: parentList.length,
              itemBuilder: (ctx, index) {
                final parent = parentList[index];
                final subCategories = categories.where((c) => c.parentId == parent.id).toList();
                final isExpanded = _expandedParentId == parent.id || (_expandedParentId == null && index == 0);
                final parentColor = _parseColor(parent.color);

                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B).withValues(alpha: 0.6) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Column(
                    children: [
                      // Parent Header Row
                      InkWell(
                        onTap: () {
                          setState(() {
                            _expandedParentId = isExpanded ? '' : parent.id;
                          });
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: parentColor.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(_getIconData(parent.icon), color: parentColor, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  parent.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                              // Direct select parent button
                              InkWell(
                                onTap: () {
                                  widget.onCategorySelected(parent);
                                  Navigator.pop(context);
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text('Chọn mục này', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                color: Colors.grey,
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Sub-categories Grid/List
                      if (isExpanded && subCategories.isNotEmpty) ...[
                        const Divider(height: 1),
                        Container(
                          padding: const EdgeInsets.all(8),
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: subCategories.map((sub) {
                              final isSelected = widget.selectedCategoryId == sub.id;

                              return InkWell(
                                onTap: () {
                                  widget.onCategorySelected(sub);
                                  Navigator.pop(context);
                                },
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? parentColor.withValues(alpha: 0.2)
                                        : (isDark ? const Color(0xFF0F172A) : Colors.white),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: isSelected ? parentColor : Colors.grey.withValues(alpha: 0.2),
                                      width: isSelected ? 1.5 : 1,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(_getIconData(sub.icon), size: 16, color: parentColor),
                                      const SizedBox(width: 6),
                                      Text(
                                        sub.name,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                          color: isDark ? Colors.white : Colors.black87,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
