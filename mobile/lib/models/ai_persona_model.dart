/// AI Persona, Role, Language, and Addressing configuration for FMMS AI Assistant
class AIPersonaModel {
  final String roleKey; // 'advisor', 'assistant', 'accountant', 'speed', 'custom'
  final String customRolePrompt;
  final String selfPronoun; // 'em', 'tôi', 'mình', 'trợ lý', 'cháu', 'custom'
  final String customSelfPronoun;
  final String userTitlePattern; // 'auto', 'Anh {name}', 'Chị {name}', 'Sếp {name}', 'Bạn {name}', 'Bác {name}', '{name}', 'custom'
  final String customUserTitle;
  final String tone; // 'friendly', 'concise', 'humorous', 'strict'
  final String language; // 'vi', 'en', 'auto'
  final String customInstructions;
  final String wakeWord; // e.g. 'FMMS ơi', 'Trợ lý ơi', 'Sơn ơi', 'Jarvis ơi'
  final bool enableWakeWord;

  const AIPersonaModel({
    this.roleKey = 'advisor',
    this.customRolePrompt = '',
    this.selfPronoun = 'em',
    this.customSelfPronoun = '',
    this.userTitlePattern = 'auto',
    this.customUserTitle = '',
    this.tone = 'friendly',
    this.language = 'vi',
    this.customInstructions = '',
    this.wakeWord = 'FMMS ơi',
    this.enableWakeWord = true,
  });

  /// Factory for clean default configuration
  factory AIPersonaModel.defaultConfig() {
    return const AIPersonaModel(
      roleKey: 'advisor',
      selfPronoun: 'em',
      userTitlePattern: 'auto',
      tone: 'friendly',
      language: 'vi',
      wakeWord: 'FMMS ơi',
      enableWakeWord: true,
    );
  }

  /// Extracts the individual first name from a full name string, stripping suffixes like "(SmartSoft)"
  static String extractFirstName(String fullName) {
    var clean = fullName.replaceAll(RegExp(r'\s*\([^)]*\)'), '').trim();
    if (clean.isEmpty) return 'bạn';
    final parts = clean.split(RegExp(r'\s+'));
    return parts.last;
  }

  /// Resolves the actual AI self-pronoun
  String resolveSelfPronoun() {
    if (selfPronoun == 'custom' && customSelfPronoun.trim().isNotEmpty) {
      return customSelfPronoun.trim();
    }
    return selfPronoun;
  }

  /// Resolves the personalized salutation for the logged-in user
  String resolveUserSalutation(String memberFullName) {
    final firstName = extractFirstName(memberFullName);

    if (userTitlePattern == 'custom' && customUserTitle.trim().isNotEmpty) {
      if (customUserTitle.contains('{name}')) {
        return customUserTitle.replaceAll('{name}', firstName).trim();
      }
      return customUserTitle.trim();
    }

    if (userTitlePattern == 'auto') {
      if (memberFullName.contains('Thuý') || memberFullName.contains('Thúy')) {
        return 'chị Thúy';
      }
      if (memberFullName.contains('Tuấn')) {
        return 'anh Tuấn';
      }
      if (memberFullName.contains('Sơn')) {
        return 'anh Sơn';
      }
      return 'bạn $firstName';
    }

    if (userTitlePattern == '{name}') {
      return firstName;
    }

    return userTitlePattern.replaceAll('{name}', firstName);
  }

  /// Returns user-friendly title of the active role
  String getRoleTitle() {
    switch (roleKey) {
      case 'advisor':
        return language == 'en'
            ? 'Senior AI Wealth & Fleet Strategist'
            : 'Cố Vấn Tài Chính Cấp Cao & Quản Trị Đội Xe';
      case 'assistant':
        return language == 'en' ? 'Smart Family Assistant' : 'Trợ lý ảo chu đáo';
      case 'accountant':
        return language == 'en' ? 'Chief Financial Controller' : 'Kế toán trưởng nghiêm khắc';
      case 'speed':
        return language == 'en' ? 'Ultra-Fast Practical Assistant' : 'Trợ lý siêu tốc & súc tích';
      case 'custom':
        return language == 'en' ? 'Custom AI Role' : 'Vai trò tự định nghĩa';
      default:
        return language == 'en' ? 'Wealth & Fleet Advisor' : 'Cố vấn tài chính & phương tiện';
    }
  }

  /// Returns a detailed prompt segment describing the role & persona
  String getRoleDescriptionPrompt() {
    switch (roleKey) {
      case 'advisor':
        return '''Bạn là "FMMS Senior AI Wealth & Fleet Strategist" — Cố Vấn Tài Chính Cấp Cao & Chuyên Gia Quản Trị Vòng Đời Phương Tiện của hệ thống FMMS.

NHIỆM VỤ CHÍNH:
1. Quản trị Tài chính & Dòng tiền: Phân tích chi tiết dư nợ vay ngân hàng, tiền gốc, tiền lãi hàng kỳ theo phương pháp dư nợ giảm dần. Luôn tư vấn chiến lược tất toán trước hạn để tiết kiệm tối đa tiền lãi.
2. Kiểm toán Chi phí Vận hành: Tính toán chi phí sở hữu trên mỗi km (TCO/km). So sánh mức tiêu hao nhiên liệu thực tế (L/100km) với định mức nhà sản xuất để cảnh báo lãng phí.
3. Kỹ thuật & Bảo dưỡng Chủ động: Nắm rõ các mốc bảo dưỡng lớn (5.000km, 10.000km, 20.000km, 40.000km) để dự toán kinh phí phụ tùng cần thay thế.

QUY TẮC TRÌNH BÀY (BẮT BUỘC):
- Luôn dùng bảng Markdown chuẩn (| Hạng mục | Số liệu | Đánh giá |) khi có từ 2 số liệu trở lên.
- In đậm toàn bộ số tiền (₫) và số km ODO.
- Bố cục gồm 3 phần:
  📌 Tóm tắt nhanh
  📊 Bảng số liệu chi tiết
  💡 Khuyến nghị tối ưu dòng tiền/bảo dưỡng.''';
      case 'assistant':
        return 'Bạn là Trợ lý ảo gia đình FMMS tận tâm, ân cần, chu đáo, luôn sẵn lòng hỗ trợ ghi chép chi tiêu, nhắc nhở việc gia đình và quản lý ví tiền nhanh chóng.';
      case 'accountant':
        return 'Bạn là Kế toán trưởng của gia đình FMMS, cực kỳ kỷ luật, nghiêm túc, thẳng thắn nhắc nhở khi phát hiện chi tiêu lãng phí, giúp gia đình bảo toàn dòng tiền và đạt mục tiêu tài chính.';
      case 'speed':
        return 'Bạn là Trợ lý AI thực dụng và siêu tốc độ, phản hồi ngắn gọn, súc tích, chỉ tập trung vào số liệu, danh mục và xác nhận giao dịch mà không dài dòng.';
      case 'custom':
        if (customRolePrompt.trim().isNotEmpty) {
          return customRolePrompt.trim();
        }
        return 'Bạn là Trợ lý AI Tài chính Gia đình FMMS cá nhân hóa.';
      default:
        return 'Bạn là Cố vấn Tài chính Cấp cao & Quản trị Phương tiện FMMS.';
    }
  }

  /// Returns tone description prompt
  String getToneDescriptionPrompt() {
    switch (tone) {
      case 'friendly':
        return 'Giọng điệu: Thân thiện, gần gũi, ấm áp, tích cực và lịch sự.';
      case 'concise':
        return 'Giọng điệu: Ngắn gọn, chuyên nghiệp, rõ ràng, đi thẳng vào trọng tâm.';
      case 'humorous':
        return 'Giọng điệu: Hài hước, dí dỏm, thông minh, mang lại niềm vui khi quản lý tài chính.';
      case 'strict':
        return 'Giọng điệu: Nghiêm túc, kỷ luật, chặt chẽ, luôn đề cao tính tiết kiệm.';
      default:
        return 'Giọng điệu: Tự nhiên, lịch thiệp và tôn trọng.';
    }
  }

  /// Returns language instruction prompt
  String getLanguageInstructionPrompt() {
    switch (language) {
      case 'en':
        return 'Language: Always reply in English.';
      case 'auto':
        return 'Ngôn ngữ: Phản hồi tự động theo ngôn ngữ mà người dùng vừa sử dụng (Tiếng Việt hoặc Tiếng Anh).';
      case 'vi':
      default:
        return 'Ngôn ngữ: Luôn phản hồi bằng Tiếng Việt chuẩn mực, tự nhiên.';
    }
  }

  /// Builds a complete System Prompt for Gemini LLM
  String buildSystemPrompt({
    required String memberFullName,
    double todaySpent = 0,
    int txCount = 0,
    double totalBalance = 0,
    String? monthlyFinancialContext,
  }) {
    final aiSelf = resolveSelfPronoun();
    final userSalutation = resolveUserSalutation(memberFullName);
    final rolePrompt = getRoleDescriptionPrompt();
    final tonePrompt = getToneDescriptionPrompt();
    final langPrompt = getLanguageInstructionPrompt();

    final buffer = StringBuffer();
    buffer.writeln(rolePrompt);
    buffer.writeln();
    buffer.writeln('QUY TẮC XƯNG HÔ (RẤT QUAN TRỌNG):');
    buffer.writeln('- Bạn luôn tự xưng là: "$aiSelf".');
    buffer.writeln('- Bạn luôn gọi người dùng đang trò chuyện là: "$userSalutation".');
    buffer.writeln('- Tuyệt đối tôn trọng cách xưng hô này trong mọi câu phản hồi.');
    buffer.writeln();
    buffer.writeln('PHONG CÁCH & NGÔN NGỮ:');
    buffer.writeln('- $tonePrompt');
    buffer.writeln('- $langPrompt');
    buffer.writeln();

    if (customInstructions.trim().isNotEmpty) {
      buffer.writeln('YÊU CẦU ĐẶC BIỆT TỪ NGƯỜI DÙNG:');
      buffer.writeln(customInstructions.trim());
      buffer.writeln();
    }

    if (monthlyFinancialContext != null && monthlyFinancialContext.trim().isNotEmpty) {
      buffer.writeln('SỐ LIỆU TÀI CHÍNH THỰC TẾ TRONG HỆ THỐNG FMMS (BẮT BUỘC DỰA TRÊN SỐ LIỆU NÀY KHI TRẢ LỜI, TUYỆT ĐỐI KHÔNG BỊA RA CON SỐ KHÁC):');
      buffer.writeln(monthlyFinancialContext.trim());
      buffer.writeln();
    }

    buffer.writeln('NGỮ CẢNH HỆ THỐNG FMMS:');
    buffer.writeln('- Bạn có thể giúp ghi chép thu chi, hỏi số dư ví, tình hình chi tiêu hôm nay, kiểm toán chi phí tháng và quản trị xe cộ.');
    buffer.writeln('- Nếu người dùng yêu cầu bảng biểu hoặc có từ 2 số liệu trở lên, hãy dùng bảng Markdown chuẩn.');

    return buffer.toString().trim();
  }

  /// Resolves the active wake word (e.g. 'FMMS ơi', 'Trợ lý ơi', 'Sơn ơi')
  String resolveWakeWord() {
    if (wakeWord.trim().isNotEmpty) {
      return wakeWord.trim();
    }
    return 'FMMS ơi';
  }

  /// Serialization to JSON
  Map<String, dynamic> toJson() {
    return {
      'roleKey': roleKey,
      'customRolePrompt': customRolePrompt,
      'selfPronoun': selfPronoun,
      'customSelfPronoun': customSelfPronoun,
      'userTitlePattern': userTitlePattern,
      'customUserTitle': customUserTitle,
      'tone': tone,
      'language': language,
      'customInstructions': customInstructions,
      'wakeWord': wakeWord,
      'enableWakeWord': enableWakeWord,
    };
  }

  /// Deserialization from JSON
  factory AIPersonaModel.fromJson(Map<String, dynamic> json) {
    return AIPersonaModel(
      roleKey: json['roleKey']?.toString() ?? 'advisor',
      customRolePrompt: json['customRolePrompt']?.toString() ?? '',
      selfPronoun: json['selfPronoun']?.toString() ?? 'em',
      customSelfPronoun: json['customSelfPronoun']?.toString() ?? '',
      userTitlePattern: json['userTitlePattern']?.toString() ?? 'auto',
      customUserTitle: json['customUserTitle']?.toString() ?? '',
      tone: json['tone']?.toString() ?? 'friendly',
      language: json['language']?.toString() ?? 'vi',
      customInstructions: json['customInstructions']?.toString() ?? '',
      wakeWord: json['wakeWord']?.toString() ?? 'FMMS ơi',
      enableWakeWord: json['enableWakeWord'] != false,
    );
  }

  AIPersonaModel copyWith({
    String? roleKey,
    String? customRolePrompt,
    String? selfPronoun,
    String? customSelfPronoun,
    String? userTitlePattern,
    String? customUserTitle,
    String? tone,
    String? language,
    String? customInstructions,
    String? wakeWord,
    bool? enableWakeWord,
  }) {
    return AIPersonaModel(
      roleKey: roleKey ?? this.roleKey,
      customRolePrompt: customRolePrompt ?? this.customRolePrompt,
      selfPronoun: selfPronoun ?? this.selfPronoun,
      customSelfPronoun: customSelfPronoun ?? this.customSelfPronoun,
      userTitlePattern: userTitlePattern ?? this.userTitlePattern,
      customUserTitle: customUserTitle ?? this.customUserTitle,
      tone: tone ?? this.tone,
      language: language ?? this.language,
      customInstructions: customInstructions ?? this.customInstructions,
      wakeWord: wakeWord ?? this.wakeWord,
      enableWakeWord: enableWakeWord ?? this.enableWakeWord,
    );
  }
}
