export type LanguageType = "zh" | "en" | "ko";

export interface TranslationSet {
  gameName: string;
  gameSubtitle: string;
  satisfactionLabel: string;
  criticalThreshold: string;
  normalThreshold: string;
  recommendedThreshold: string;
  bgmGold: string;
  bgmBankruptcy: string;
  bgmCozy: string;
  bgmMuted: string;
  viewSheet: string;
  syncItems: string;
  resetStore: string;
  resetConfirm: string;
  alertSatisfactionUnder30: string;
  warningAlertMessage: string;
  dangerAlertLabel: string;
  successTitle: string;
  successSubtitle: string;
  successDesc: string;
  successNextBtn: string;
  failedTitle: string;
  failedSubtitle: string;
  failedDesc: string;
  failedRetryBtn: string;
  currentGuestLabel: string;
  switchLin: string;
  switchTaozi: string;
  switchAhao: string;
  switchLaozhang: string;
  randomGuest: string;
  itemShelfHeader: string;
  clearTray: string;
  quickRepliesHeader: string;
  customRepliesHeader: string;
  customPlaceholder: string;
  noItemsPacked: string;
  packedLabel: string;
  serveBtn: string;
  enterGuidance: string;
  hintGuidance: string;
  footerLine1: string;
  footerLine2: string;
  toastNoInput: string;
  toastSyncing: string;
  toastSyncSuccess: string;
  toastSyncFail: string;
  toastSatisfactionDecreased: string;
  toastSatisfactionIncreasedMajor: string;
  toastSatisfactionIncreasedNormal: string;
  toastSatisfactionIncreasedSimple: string;
  toastInteractDecreased: string;
  toastInteractIncreased: string;
  toastInteractNormal: string;
  sceneLabel: string;
  sceneNormal: string;
  sceneNight: string;
  sceneCrisis: string;
  bgmPaused: string;
  bgmPlayingSuccess: string;
  bgmBypassHint: string;
  statusOnline: string;
  offlineStatusBanner: string;
}

export const translations: Record<LanguageType, TranslationSet> = {
  zh: {
    gameName: "AI 萌萌便利店",
    gameSubtitle: "基于谷歌数据表驱动的AI顾客卡通模拟经营游戏",
    satisfactionLabel: "店面整体好感满意度: ",
    criticalThreshold: "💔 危急 30%以下",
    normalThreshold: "普通 31%~89%",
    recommendedThreshold: "💖 推荐 90%以上",
    bgmGold: "BGM: 黄金盛典🎺",
    bgmBankruptcy: "BGM: 破产悲歌🎻",
    bgmCozy: "BGM: 治愈电台📻",
    bgmMuted: "BGM: 已静音🔇",
    viewSheet: "查看底表",
    syncItems: "同步货品",
    resetStore: "全新重置开店",
    resetConfirm: "确定要重置当前便利店和满意度，驱离所有顾客重新开始吗？",
    alertSatisfactionUnder30: "⚠️ 警报：便利店满意度已跌破30%危急线！小店工期告急，背景音乐已自动切换为凄惨悲歌！",
    warningAlertMessage: "客流危险警报！小店处于破产倒闭边缘！",
    dangerAlertLabel: "⚠️ 店铺危机！请认真回复下一名顾客来挽回口碑！🚨",
    successTitle: "✨ 通关大胜利 ✨",
    successSubtitle: "便利店名利双收！",
    successDesc: "恭喜店长，萌萌便利店整体满意度已达到不可思议的 100% 极限！你完美招待了所有古怪而有个性的顾客们，达成了梦幻经营结局。",
    successNextBtn: "解锁下一轮游戏 ⟲",
    failedTitle: "破产倒闭了",
    failedSubtitle: "满意度已被扣完！",
    failedDesc: "惨遭客人们集体暴怒投诉！店主已经被驱离开了萌萌街，便利店被列入不合格经营。快点击重试按钮再次重头挑战吧！",
    failedRetryBtn: "立刻重新开店挑战 ⟲",
    currentGuestLabel: "当前接待顾客:",
    switchLin: "换林叔 (大叔) 🕵️‍♂️",
    switchTaozi: "换桃子 (旅客) 🎒",
    switchAhao: "换阿豪 (学生) 👦",
    switchLaozhang: "换老张 (社畜) 💼",
    randomGuest: "随机换人 🎲",
    itemShelfHeader: "🛒 柜台货上架 (点击选取提供给顾客的商品):",
    clearTray: "清空托盘",
    quickRepliesHeader: "⚡ 快捷店长台词:",
    customRepliesHeader: "💬 自定义发言与打包包装:",
    customPlaceholder: "在此输入你想向顾客说的小铺回复。点击下方商品卡片，可在招待时递上实物伴手礼！",
    noItemsPacked: "未打包货品（纯语言回复）",
    packedLabel: "打包提供:",
    serveBtn: "招呼接待",
    enterGuidance: "⌨️ 支持 Enter 键快速自动提交招待",
    hintGuidance: "💡 契合顾客面临的刁钻/搞笑处境可多增加满意度得分喔",
    footerLine1: "© 2026 萌萌AI便利店小铺. 遵循 Google AI Studio 经典 Vibrant Palette 主题运行规范发布.",
    footerLine2: "Database Driver Sheet: 1JG6Fc18WenhF_05hvHQiOjzh4DIbh5iv3zRIgkK3Lss | Render: iFrame sandboxed port 3000",
    toastNoInput: "请至少说句话，或者在下边货架选上1件礼物吧！",
    toastSyncing: "正在同步谷歌表格配置...",
    toastSyncSuccess: "表格数据同步成功！",
    toastSyncFail: "同步出错，启用本地离线备份",
    toastSatisfactionDecreased: "😭 顾客很不满意离店：满意度 ${delta}!",
    toastSatisfactionIncreasedMajor: "🎉 交易大胜利！顾客心满意足离店：满意度 +${delta}!",
    toastSatisfactionIncreasedNormal: "🧉 交易完毕！顾客普普通通结账离店：满意度 +${delta}",
    toastSatisfactionIncreasedSimple: "🧉 交易完毕：满意度 +${delta}",
    toastInteractDecreased: "💥 打击！挑剔的顾客很不满：满意度 ${delta}",
    toastInteractIncreased: "✨ 太对胃口了！常客好感度激增：满意度 +${delta}",
    toastInteractNormal: "💬 接待互动进行中：满意度 +${delta}",
    sceneLabel: "当前场景:",
    sceneNormal: "0 (普通夜晚商店)",
    sceneNight: "2 (热闹温馨深夜商店)",
    sceneCrisis: "3 (冰封营业危机)",
    bgmPaused: "背景音乐已暂停 ⏸️",
    bgmPlayingSuccess: "背景音乐开启成功 🎵",
    bgmBypassHint: "请先点击页面任意区域激活，再播放BGM喔！",
    statusOnline: "营业中",
    offlineStatusBanner: "安全离线剧情模式已激活（云端 AI 额度超出限额 429 或未配置秘钥）：系统已自动无缝切换到本地精心编排的趣味人物对白与分支结算剧本。这完美保障了您的游戏流畅度及顾客攻略成就！您也可以在 Settings > Secrets 面板中，检查配置或更换您的 GEMINI_API_KEY 秘钥。"
  },
  en: {
    gameName: "AI Moe Convenience Store",
    gameSubtitle: "An AI-powered cartoon convenience store simulation game driven by Google Sheets",
    satisfactionLabel: "Store's Overall Satisfaction: ",
    criticalThreshold: "💔 Critical Under 30%",
    normalThreshold: "Normal 31%~89%",
    recommendedThreshold: "💖 Recommended Over 90%",
    bgmGold: "BGM: Gold Festival🎺",
    bgmBankruptcy: "BGM: Bankruptcy Elegy🎻",
    bgmCozy: "BGM: Cozy Radio📻",
    bgmMuted: "BGM: Muted🔇",
    viewSheet: "View Sheet",
    syncItems: "Sync Items",
    resetStore: "Reset Store",
    resetConfirm: "Are you sure you want to reset the current store and satisfaction level, clear all customers and restart?",
    alertSatisfactionUnder30: "⚠️ Alarm: Store satisfaction has fallen below the 30% critical line! Urgent crisis, BGM automatically switched to bankruptcy elegy!",
    warningAlertMessage: "Traffic Danger! The store is on the brink of bankruptcy!",
    dangerAlertLabel: "⚠️ Store Crisis! Please reply carefully to the next customer to regain reputation! 🚨",
    successTitle: "✨ Victory ✨",
    successSubtitle: "Fame and Fortune Obtained!",
    successDesc: "Congratulations, Manager! The overall satisfaction of Moe Convenience Store has reached an incredible 100%! You have perfectly entertained all quirky customers and achieved the dream ending.",
    successNextBtn: "Unlock Next Round ⟲",
    failedTitle: "Bankrupt & Closed",
    failedSubtitle: "Satisfaction fully depleted!",
    failedDesc: "Severe customer complaints received! The store manager has been driven away from Moe Street, and the store is deemed poorly run. Click the retry button to try again from scratch!",
    failedRetryBtn: "Restart Store Challenge Immediately ⟲",
    currentGuestLabel: "Current Customer:",
    switchLin: "Switch to Uncle Lin 🕵️‍♂️",
    switchTaozi: "Switch to Taozi 🎒",
    switchAhao: "Switch to A-Hao 👦",
    switchLaozhang: "Switch to Lao Zhang 💼",
    randomGuest: "Random Guest 🎲",
    itemShelfHeader: "🛒 Counter Shelf (click to select items for the customer):",
    clearTray: "Clear Tray",
    quickRepliesHeader: "⚡ Quick Lines:",
    customRepliesHeader: "💬 Custom Reply & Packaging:",
    customPlaceholder: "Type your store response here. Click item cards below to pack them as gifts!",
    noItemsPacked: "No items packed (verbal reply only)",
    packedLabel: "Packed Items:",
    serveBtn: "Serve & Chat",
    enterGuidance: "⌨️ Press Enter to submit response quickly",
    hintGuidance: "💡 Fitting the customer's tricky/funny situation gains extra satisfaction points!",
    footerLine1: "© 2026 Moe AI Convenience Store. Published under Google AI Studio Classic Vibrant Palette guidelines.",
    footerLine2: "Database Driver Sheet: 1JG6Fc18WenhF_05hvHQiOjzh4DIbh5iv3zRIgkK3Lss | Render: iFrame sandboxed port 3000",
    toastNoInput: "Please say something, or select at least 1 gift from the shelf below!",
    toastSyncing: "Syncing Google Sheets configuration...",
    toastSyncSuccess: "Sheets data synced successfully!",
    toastSyncFail: "Sync error, enabling local offline backup",
    toastSatisfactionDecreased: "😭 Customer unsatisfied and left: Satisfaction ${delta}!",
    toastSatisfactionIncreasedMajor: "🎉 Major Success! Customer left happy: Satisfaction +${delta}!",
    toastSatisfactionIncreasedNormal: "🧉 Deal done! Customer paid and left: Satisfaction +${delta}",
    toastSatisfactionIncreasedSimple: "🧉 Deal done: Satisfaction +${delta}",
    toastInteractDecreased: "💥 Disappointing! The picky customer is unsatisfied: Satisfaction ${delta}",
    toastInteractIncreased: "✨ Perfect match! Friendly vibes boosted: Satisfaction +${delta}",
    toastInteractNormal: "💬 Conversation in progress: Satisfaction +${delta}",
    sceneLabel: "Current Scene:",
    sceneNormal: "0 (Normal Night Store)",
    sceneNight: "2 (Bustling Cozy Late-Night Store)",
    sceneCrisis: "3 (Frozen Store Crisis)",
    bgmPaused: "BGM paused ⏸️",
    bgmPlayingSuccess: "BGM started successfully 🎵",
    bgmBypassHint: "Please click anywhere on the page to activate before playing BGM!",
    statusOnline: "Open",
    offlineStatusBanner: "Safe Offline Story Mode Activated (Cloud AI quota exceeded 429 or key unconfigured): The system has seamlessly switched to built-in humorous characters' dialogs and branching resolution scripts. This guarantees smooth gameplay! You can also check or change your GEMINI_API_KEY inside Settings > Secrets."
  },
  ko: {
    gameName: "AI 모에 편의점",
    gameSubtitle: "구글 스프레드시트 데이터로 연동되는 소소한 카툰 AI 고객 시뮬레이션 경영 게임",
    satisfactionLabel: "편의점 전체 만족도: ",
    criticalThreshold: "💔 위기 30% 이하",
    normalThreshold: "보통 31%~89%",
    recommendedThreshold: "💖 추천 90% 이상",
    bgmGold: "BGM: 황금 축제🎺",
    bgmBankruptcy: "BGM: 파산 엘레지🎻",
    bgmCozy: "BGM: 힐링 라디오📻",
    bgmMuted: "BGM: 음소거🔇",
    viewSheet: "스프레드시트 보기",
    syncItems: "아이템 동기화",
    resetStore: "인수 및 매장 리셋",
    resetConfirm: "정말 현재 매장 통계와 만족도를 리셋하고 다른 고객을 불러와 새로 시작하시겠습니까?",
    alertSatisfactionUnder30: "⚠️ 경보: 편의점 만족도가 30% 미만으로 떨어졌습니다! 경비 초비상, 배경음악이 슬픈 파산 비가곡으로 자동 교체되었습니다!",
    warningAlertMessage: "매장 위험 경보! 가게가 파산 위기에 시달리고 있습니다!",
    dangerAlertLabel: "⚠️ 매장 위기 돌발! 다음 손님에게 신중하게 답변하여 평판을 회복하세요! 🚨",
    successTitle: "✨ 대성공 클리어 ✨",
    successSubtitle: "명성과 재물을 모두 획득!",
    successDesc: "축하합니다, 점장님! 모에 편의점의 전체 호감도 만족도가 꿈의 100% 한계치에 드디어 편입되었습니다! 까다롭고 개성 만점인 심야 손님들을 완벽히 대접하며 전설적인 해피엔딩을 맞추었습니다.",
    successNextBtn: "다음 라운드 도전 ⟲",
    failedTitle: "파산 폐업",
    failedSubtitle: "만족도가 모두 소진되었습니다!",
    failedDesc: "손님들의 뜨거운 불만과 폭풍 악성 리뷰가 접수되었습니다! 점장은 모에 스트리트에서 일방적으로 퇴출되었으며, 편의점은 경영 부적격 판정을 받았습니다. 처음부터 다시 도전해 보세요!",
    failedRetryBtn: "즉시 편의점 정상화 재도전 ⟲",
    currentGuestLabel: "현재 접대 고객:",
    switchLin: "임 아저씨(탐정)로 변경 🕵️‍♂️",
    switchTaozi: "타오즈(여행가)로 변경 🎒",
    switchAhao: "아하오(학생)로 변경 👦",
    switchLaozhang: "장 대리(회사원)로 변경 💼",
    randomGuest: "랜덤 변경 🎲",
    itemShelfHeader: "🛒 계산대 물건 상차 (클릭 선택하여 전달하기):",
    clearTray: "트레이 비우기",
    quickRepliesHeader: "⚡ 점장 추천 멘트:",
    customRepliesHeader: "💬 손님 응대 직접 입력 및 포장:",
    customPlaceholder: "여기에 손님에게 건넬 답변을 적어 주세요. 아래 아이템을 선선히 터치하여 보너스 선물로 건넬 수도 있습니다!",
    noItemsPacked: "포장된 아이템 없음 (말재주 대화만 전송)",
    packedLabel: "포장된 선물:",
    serveBtn: "대화 전송",
    enterGuidance: "⌨️ Enter 키로도 응답을 간편하게 바로 송신할 수 있습니다",
    hintGuidance: "💡 손님의 기막히거나 유쾌한 돌발 상황에 맞는 대화를 유도하면 평판 향상에 유리합니다!",
    footerLine1: "© 2026 모에 AI 편의점. Google AI Studio Classic Vibrant Palette 표준 설계 규칙에 따라 제공됩니다.",
    footerLine2: "데이터베이스 드라이버 시트: 1JG6Fc18WenhF_05hvHQiOjzh4DIbh5iv3zRIgkK3Lss | 렌더: iFrame 샌드박스 포트 3000",
    toastNoInput: "한 마디 말을 걸거나 계산대에서 선물할 물건을 1개 이상 콕 집어 골라 주세요!",
    toastSyncing: "구글 스프레드시트 설정을 업데이트하는 중...",
    toastSyncSuccess: "데이터 스프레드시트 동기화가 성사되었습니다!",
    toastSyncFail: "동기화에 실패하여 준비된 로컬 오프라인 데이터를 반영합니다.",
    toastSatisfactionDecreased: "😭 불만족한 고객이 퇴장했습니다: 만족도 ${delta}!",
    toastSatisfactionIncreasedMajor: "🎉 대성공! 아주 흡족한 표정으로 계산하고 퇴장했습니다: 만족도 +${delta}!",
    toastSatisfactionIncreasedNormal: "🧉 정산 성료! 고객이 물건을 챙겨 퇴장했습니다: 만족도 +${delta}",
    toastSatisfactionIncreasedSimple: "🧉 거래 정산 성료: 만족도 +${delta}",
    toastInteractDecreased: "💥 기분 하락! 까다로운 고객이 대답에 탐탁지 않아 합니다: 만족도 ${delta}",
    toastInteractIncreased: "✨ 완벽한 매칭! 소통의 활기로 호감도가 부쩍 상승했습니다: 만족도 +${delta}",
    toastInteractNormal: "💬 대면 접대 대화 계속 진행 중: 만족도 +${delta}",
    sceneLabel: "현재 뷰 장면:",
    sceneNormal: "0 (일반 야간 상점)",
    sceneNight: "2 (시끌벅적 정겨운 야간 상점)",
    sceneCrisis: "3 (겨울철 임시 영업 위기)",
    bgmPaused: "배경음악 사용 임시 일시 정지 ⏸️",
    bgmPlayingSuccess: "배경음악 재생이 시작되었습니다 🎵",
    bgmBypassHint: "브라우저 보안 규칙에 따라 화면을 먼저 가볍게 터치한 뒤 사용 가능합니다!",
    statusOnline: "영업 중",
    offlineStatusBanner: "오프라인 특별 시나리오 모드가 즉시 연결되었습니다 (클라우드 AI 할당량이 초과되었거나 API 인증키가 누락됨): 게임 안정성을 위해 내장된 유머러스한 로컬 시나리오 대사집과 분기 계산 스크립트로 자동 안착되었습니다. 쾌적한 플레이가 보장됩니다! 언제든 Settings > Secrets 코너에서 GEMINI_API_KEY를 상세 점검해 보세요."
  }
};

export const LOCALIZED_ITEMS: Record<LanguageType, { id: string; name: string; emoji: string; desc: string; cost: string }[]> = {
  zh: [
    { id: "🍢 关东煮", name: "温暖关东煮", emoji: "🍢", desc: "暖洋洋的热汤和香气四溢的各种经典烤串", cost: "¥8" },
    { id: "🍱 招牌便当", name: "元气招牌便当", emoji: "🍱", desc: "主打荤素搭配，热量炸弹，瞬间扫空饥饿", cost: "¥18" },
    { id: "🍜 劲爽泡面", name: "深夜加料泡面", emoji: "🍜", desc: "浓汤热辣，即刻出锅，熬夜修仙的最佳伴侣", cost: "¥5" },
    { id: "🥤 冰镇可乐", name: "极冰可乐汽水", emoji: "🥤", desc: "快乐肥宅专属，冰镇气泡带给你极致刺激", cost: "¥3" },
    { id: "🧋 超浓奶茶", name: "爆料多糖奶茶", emoji: "🧋", desc: "多椰果多珍珠，高热能量快乐，年轻社交神器", cost: "¥12" },
    { id: "🌂 便利雨伞", name: "结实雨伞", emoji: "🌂", desc: "抵挡狂风暴雨，防止你出门变成‘落汤鸡’", cost: "¥15" },
    { id: "🩹 强效创可贴", name: "安心创可贴", emoji: "🩹", desc: "防尘透气，温柔包裹大大小小的淘气创口", cost: "¥2" },
    { id: "🔋 共享充电宝", name: "救急充电宝", emoji: "🔋", desc: "手机1%电量救星，让社交信号即刻复活", cost: "¥1.5" },
    { id: "🍦 甜心雪糕", name: "浓香鲜奶雪糕", emoji: "🍦", desc: "一口奶油甜化冰爽，浇灭心中一切无端怒火", cost: "¥4" },
    { id: "☕ 热开水", name: "爱心热开水", emoji: "☕", desc: "完全免费，暖胃又暖心，最朴实的善意回赠", cost: "免费" }
  ],
  en: [
    { id: "🍢 关东煮", name: "Warm Oden", emoji: "🍢", desc: "Heartwarming hot soup and highly aromatic classic skewered items", cost: "$1.5" },
    { id: "🍱 招牌便当", name: "Signature Bento", emoji: "🍱", desc: "Perfect blend of meat and veggies, a calorie bomb to destroy hunger", cost: "$3.5" },
    { id: "🍜 劲爽泡面", name: "Gourmet Noodles", emoji: "🍜", desc: "Spicy dense soup, straight from pot - a stay-up-late programmer's gold buddy", cost: "$1.0" },
    { id: "🥤 冰镇可乐", name: "Shining Chilled Cola", emoji: "🥤", desc: "Exquisite sparkling soda to deliver instant joy and extreme refreshment", cost: "$0.8" },
    { id: "🧋 超浓奶茶", name: "Supreme Milk Tea", emoji: "🧋", desc: "Generous jelly and pearls, a sweetness potion and social ice-breaker", cost: "$2.5" },
    { id: "🌂 便利雨伞", name: "Sturdy Umbrella", emoji: "🌂", desc: "Shield from heavy downpours, stopping you from looking like a drenched chicken", cost: "$3.0" },
    { id: "🩹 强效创可贴", name: "Care Band-Aid", emoji: "🩹", desc: "Dustproof, breathable; gently wrapping all sizes of minor clumsy wounds", cost: "$0.4" },
    { id: "🔋 共享充电宝", name: "Rescue Power Bank", emoji: "🔋", desc: "Saves mobile phones on 1% battery, bringing social signals back to life", cost: "$0.3" },
    { id: "🍦 甜心雪糕", name: "Sweet Milk Ice Cream", emoji: "🍦", desc: "One rich creamy bite to extinguish any rising irritation or fire", cost: "$0.9" },
    { id: "☕ 热开水", name: "Free Hot Water", emoji: "☕", desc: "Warms both your belly and soul, the simplest gesture of care", cost: "Free" }
  ],
  ko: [
    { id: "🍢 关东煮", name: "따끈 따끈 오뎅", emoji: "🍢", desc: "몸을 녹이는 시원한 수제 육수와 향긋 가득한 한입 어묵 꼬치", cost: "1,500원" },
    { id: "🍱 招牌便当", name: "시그니처 영양 도시락", emoji: "🍱", desc: "엄선된 영양의 고기와 야채 조합 - 즉각 빈속을 든든하게 채우는 갓성비 팩", cost: "3,800원" },
    { id: "🍜 劲爽泡面", name: "심야 야식 얼큰 라면", emoji: "🍜", desc: "매콤하고 진핫 수프와 쫄깃한 면발, 밤을 지새우는 청춘들의 원픽 동반자", cost: "1,000원" },
    { id: "🥤 冰镇可乐", name: "아이스 탄산 콜라", emoji: "🥤", desc: "시원함과 톡 쏘는 청량감이 환상적인 밸런스를 자랑하는 피로 회복제", cost: "900원" },
    { id: "🧋 超浓奶茶", name: "밀크 버블티", emoji: "🧋", desc: "타피오카 펄 듬뿍, 넘치는 극강의 달콤함으로 청년 사회화 소통 가속화", cost: "2,500원" },
    { id: "🌂 便利雨伞", name: "내구성 비바람 우산", emoji: "🌂", desc: "비바람을 단단하게 막아 빗속에서 물에 빠진 생쥐 신세를 면케 해줄 우산", cost: "3,500원" },
    { id: "🩹 强效创可贴", name: "보드라운 상처 밴드", emoji: "🩹", desc: "방수방진 및 우수한 통풍성 - 자잘한 일상 속 귀여운 찰과상 안심 케어", cost: "500원" },
    { id: "🔋 共享充电宝", name: "비상 보조배터리 대여", emoji: "🔋", desc: "스마트폰 배터리 1% 마비 직전 상황을 구조하여 활력을 되찾는 열쇠", cost: "300원" },
    { id: "🍦 甜心雪糕", name: "달콤 생크림 하드형 바", emoji: "🍦", desc: "부드러운 캐러멜 우유 풍미 한 조각 - 복잡했던 스트레스를 사르르 녹입니다", cost: "1,000원" },
    { id: "☕ 热开水", name: "정성 가득 온수", emoji: "☕", desc: "위장을 보호하며 기운을 감짜 안아 줄 온화한 기운 - 완전 무료 배포", cost: "무료" }
  ]
};

export const LOCALIZED_QUIC_REPLIES: Record<LanguageType, string[]> = {
  zh: [
    "欢迎光临！请问有什么需要帮您的？🏪",
    "这可是我们店里的招牌极品，包您满意！✨",
    "太辛苦了！快热乎乎地塞一口补充满满元气吧！💪",
    "推荐您试试这个特色货，绝对是今天的顶峰搭配！😎",
    "不用急不用急，有小店在，一切事情都好办！👵"
  ],
  en: [
    "Welcome! How can I help you today? 🏪",
    "This is our store's elite signature item, guaranteed to satisfy! ✨",
    "You worked so hard! Quick, enjoy this hot bite to fully replenish your energy! 💪",
    "highly recommend trying this specialty, it's easily today's top match! 😎",
    "No rush, no rush. As long as this shop is open, everything is in good hands! 👵"
  ],
  ko: [
    "어서 오세요! 심야 쉼터 편의점입니다. 무엇을 도와드릴까요? 🏪",
    "이것이 저희 매장이 자랑하는 최고 인기 시그니처 템입니다, 정성을 담아 권해 드려요! ✨",
    "야근과 일상에 너무 힘드셨겠어요! 따끈하게 한 그릇 먹고 신명 나게 힘내세요! 💪",
    "특별 기획된 강력한 추천작입니다, 오늘의 기분 전환에 더없이 어울릴 것입니다! 😎",
    "급할 것 전혀 없으니 천천히 하셔요. 이 작은 가게가 있는 한 온정이 가득할 테니까요! 👵"
  ]
};
