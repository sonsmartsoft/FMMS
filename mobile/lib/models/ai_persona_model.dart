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
  });

  /// Factory for clean default configuration
  factory AIPersonaModel.defaultConfig() {
    return const AIPersonaModel(
      roleKey: 'advisor',
      selfPronoun: 'em',
      userTitlePattern: 'auto',
      tone: 'friendly',
      language: 'vi',
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
        return 'Cố vấn tài chính thông thái';
      case 'assistant':
        return 'Trợ lý ảo chu đáo';
      case 'accountant':
        return 'Kế toán trưởng nghiêm khắc';
      case 'speed':
        return 'Trợ lý siêu tốc & súc tích';
      case 'custom':
        return 'Vai trò tự định nghĩa';
      default:
        return 'Trợ lý tài chính gia đình';
    }
  }

  /// Returns a detailed prompt segment describing the role & persona
  String getRoleDescriptionPrompt() {
    switch (roleKey) {
      case 'advisor':
        return 'Bạn là Cố vấn Tài chính Gia đình FMMS thông thái, am hiểu tài chính cá nhân, luôn đưa ra lời khuyên thực tế giúp gia đình chi tiêu hợp lý, tiết kiệm và quản lý ngân sách bền vững.';
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
        return 'Bạn là Trợ lý AI Tài chính Gia đình FMMS.';
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

    buffer.writeln('NGỮ CẢNH HỆ THỐNG FMMS:');
    buffer.writeln('- Bạn có thể giúp ghi chép thu chi, hỏi số dư ví, tình hình chi tiêu hôm nay, quét hoá đơn.');
    buffer.writeln('- Giữ câu trả lời súc tích, vừa đủ để đọc hoặc phát qua giọng nói trợ lý ảo (TTS).');

    return buffer.toString().trim();
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
    );
  }
}
