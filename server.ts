import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini SDK with telemetry header
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Initialized Gemini AI successfully!");
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI with provided key:", error);
  }
} else {
  console.log("No GEMINI_API_KEY found in environmental variables. Running with local offline gameplay fallbacks.");
}

// Define a global set of disabled models that have met quota or transient limit issues
const disabledModels = new Set<string>();

/**
 * Call Gemini generateContent with automatic exponential backoff retry and secondary model fallback
 */
async function generateContentWithRetry(params: any, maxRetries = 4): Promise<any> {
  if (!ai) {
    throw new Error("Gemini AI client is not initialized.");
  }

  // Clone params so we don't mutate the original caller's config
  const currentParams = { ...params };
  if (!currentParams.model) {
    currentParams.model = "gemini-3.5-flash";
  }

  // Define a cascade of fallback models to cycle through on transient failure
  const fallbackModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  // If the requested model is known to be disabled/exhausted, substitute it with the next alive fallback
  if (disabledModels.has(currentParams.model)) {
    let fallbackIndex = fallbackModels.indexOf(currentParams.model);
    while (fallbackIndex !== -1 && fallbackIndex < fallbackModels.length - 1) {
      fallbackIndex++;
      const candidate = fallbackModels[fallbackIndex];
      if (!disabledModels.has(candidate)) {
        console.log(`[Gemini Cascade] Substituting known exhausted model '${currentParams.model}' with '${candidate}'`);
        currentParams.model = candidate;
        break;
      }
    }
  }

  let attempt = 0;
  let delay = 350; // ms

  while (attempt < maxRetries) {
    try {
      const response = await ai.models.generateContent(currentParams);
      return response;
    } catch (error: any) {
      attempt++;
      const errMsg = error?.message || String(error);
      const isTransient = errMsg.includes("503") || 
                          errMsg.includes("UNAVAILABLE") || 
                          errMsg.includes("high demand") || 
                          errMsg.includes("429") || 
                          errMsg.includes("RESOURCE_EXHAUSTED") ||
                          errMsg.includes("quota") ||
                          error?.status === 503 ||
                          error?.status === 429;

      // If we got a quota limits / resource exhaustion error, disable the model for subsequent requests
      const isQuotaError = errMsg.includes("429") || 
                           errMsg.includes("RESOURCE_EXHAUSTED") || 
                           errMsg.includes("quota") || 
                           error?.status === 429;
      if (isQuotaError) {
        disabledModels.add(currentParams.model);
      }

      // If the error is transient and we have other fallback models, switch and retry immediately
      const currentIndex = fallbackModels.indexOf(currentParams.model);
      const hasNextModel = currentIndex !== -1 && currentIndex < fallbackModels.length - 1;

      if (isTransient && hasNextModel) {
        const nextModel = fallbackModels[currentIndex + 1];
        console.log(`[Gemini Cascade] Transitioning from '${currentParams.model}' to high-availability '${nextModel}' for processing.`);
        currentParams.model = nextModel;
        delay = 250; // Reset delay shorter for immediate fallback retry
        continue;
      }

      if (attempt >= maxRetries || !isTransient) {
        console.error(`[Gemini Final Error] Execution unresolved after ${attempt} attempts:`, errMsg);
        throw error;
      }

      console.log(`[Gemini Retry] Delaying ${delay}ms before subsequent attempt...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 1.5; // exponential backoff
    }
  }

  throw new Error("All retry attempts failed.");
}

// Hardcoded drive sheet config fallback
const SPREADSHEET_ID = "1JG6Fc18WenhF_05hvHQiOjzh4DIbh5iv3zRIgkK3Lss";
const DEFAULT_CONFIG = {
  bg: [
    { state: "0", link: "https://drive.google.com/file/d/12vjxOHGH1u1jYE-KgwwJbG8DTG5JwZlh/view?usp=sharing" },
    { state: "1", link: "https://drive.google.com/file/d/12vjxOHGH1u1jYE-KgwwJbG8DTG5JwZlh/view?usp=sharing" },
    { state: "2", link: "https://drive.google.com/file/d/1qeGYv-mAR_xit9ZcdvUO1lyo8c2dYxXP/view?usp=sharing" },
    { state: "3", link: "https://drive.google.com/file/d/13zt8hos-X6PriyUw_FwuVcbxzLvgL8t-/view?usp=sharing" }
  ],
  character: {
    base: "https://drive.google.com/file/d/1g13V7gc7L8XJy4-M5T2CLH9nOniB7yNJ/view?usp=sharing",
    states: [
      { state: "0", link: "https://drive.google.com/file/d/10Cp7j5RgEtfkdsmQEUewh8qt_XM2U4ML/view?usp=sharing", min: 0, max: 30 },
      { state: "1", link: "None", min: 31, max: 70 },
      { state: "2", link: "https://drive.google.com/file/d/1wNL5xNn5hjAtrNNtuxZ4gGxFGg62a-WD/view?usp=sharing", min: 71, max: 90 },
      { state: "3", link: "https://drive.google.com/file/d/1WTDHNugpk5ZKGXFxfW-MMPZ1Qlq3yG1w/view?usp=sharing", min: 91, max: 100 },
      { state: "clear", link: "https://drive.google.com/file/d/12abPlPGDJTRMtcMtVZhkFsK2VjL2h4fv/view?usp=sharing", min: 100, max: 100 }
    ]
  },
  guests: [
    { state: "0", link: "https://drive.google.com/file/d/1QtUAYTHKQgr3LLkVgbhoriQ-l3U4KcTx/view?usp=sharing" },
    { state: "1", link: "https://drive.google.com/file/d/1rzxw8RexI4UyrIKJRHyW4LqS9r9B_w5N/view?usp=sharing" },
    { state: "2", link: "https://drive.google.com/file/d/14_0TlErm2uLaKMMDaYOa_j7x2kjhnNeQ/view?usp=sharing" },
    { state: "3", link: "https://drive.google.com/file/d/1ZfNPAe0v8Pzvtchl9dCW5gDRNvNG_Gsz/view?usp=sharing" }
  ],
  initial: {
    bg_state: 0,
    cha_state: 1,
    value: 50
  }
};

const GUEST_PROFILES_LOCALIZED: Record<string, { id: number; name: string; description: string; offlineDialogues: string[] }[]> = {
  zh: [
    {
      id: 0,
      name: "林叔 (戏精大叔)",
      description: "穿着复古风衣的超级戏精大叔，说话像经典黑色悬疑电影里的忧郁侦探，对一切便利店食品都抱有极高的怀疑，喜欢把零食当做‘关键物证’审查。",
      offlineDialogues: [
        "（压低帽檐，神色凝重）在这个暗流涌动的深夜，危险总会在温热中现形。我需要一碗看似平静、实则翻滚着大雾且红油交错的‘深夜黄金块’来引诱嫌疑人。店长，你应该知道那是什么证物吧？🍢",
        "哼……有趣。一件被零下十度完美封印的‘重碳酸神秘玻璃罐’，其上的冷气正顺着瓶身悄然滴落。这就是案发当天的密闭温差线索。店长，如果是你，你会用哪种带冰爽感的神秘饮料来破解此物？🥤",
        "在这个案情复杂的街角，我已经潜伏了三个多小时，体温直线下滑。我迫切需要一份能温热暖胃、能快速吞咽下去的‘便携高能食物’便当，来获取深夜的救赎。🍱",
        "（捂着手腕，警惕地扫视四周）刚才跟犯罪嫌疑人角力时被蹭破了皮。我需要一个隐蔽不显眼的‘安心创可贴’给伤口包上。店长，你这儿一定备着这块药布吧？🩹",
        "（拍了拍大衣上的雨水）夜雨突然大作，蹲守也变成了一场严苛的考验。我需要一把能遮蔽风寒的‘结实雨伞’。🌂"
      ]
    },
    {
      id: 1,
      name: "桃子 (背包旅客)",
      description: "拿着微单、背着巨大登山包的小姑娘。性格随和幽默，总是迷路，极其喜欢发掘各地的深夜便利店特产。",
      offlineDialogues: [
        "老板好！指南针在狂转，双腿重得像灌了铅。在这个陌生的夜间交叉路口，我那挑剔的眼睛需要一份最地道、能大口塞满腮帮子提供高热量的‘酱汁便携肉食拼盘’来拯救我。🍱",
        "（有些颤抖地揉了揉冻僵的小手）今晚为了拍最神秘的星空，我打算等会登顶。然而山上狂风如刀。老板，有没有一种能握在手里源源不断散发热力、同时嘴一吹就能冒着浓香热气的‘高山御寒暖身串串汤’？🍢",
        "哎呀呀……风光虽好，可是我的相机跟求生机同时发出了红电警报，而我的肚子也在大合唱。我需要一个能够给赛博机器提供续命气血的‘共享充电宝’，你绝对有这个宝贝吧？🔋",
        "哎哟……（揉着脚踝）今天为了拍山顶的绝美流星，脚底磨出了大水泡，疼得直不起腰来。老板，有没有防磨透气的‘强效贴心创可贴’？快救救我的脚丫子！🩹",
        "（牙齿打颤）老板，今晚雪山风暴比我想象中还要恐怖一百倍。我的保温杯已经空了，浑身冻得像根冰棍。求你赏我一杯免费温胃、能捧在手里当暖手宝的热开水，完全不需要任何添加！☕"
      ]
    },
    {
      id: 2,
      name: "阿豪 (学生)",
      description: "元气满满、性格幽默的运动风男高中学生。极度热衷于学校社团、网络流行梗 and 各类甜食零嘴，酷爱篮球，是个十足的大胃王。",
      offlineDialogues: [
        "呜哇！老板！手都在不自觉地发抖……刚才在球场迎着落日投出三分，整个人的水分 and 卡路里几乎要被抽干。急需大口暴饮某种甜腻冰爽、吸入时还带着无敌弹牙Q弹爆珠的‘解压网红魔水’！🧋",
        "绝了！今天看到那张划满红叉的数学草稿纸，我的灵魂像被封印进了终极冰窖.我迫切需要一种散发着浓郁牛奶果香、能将我糟糕透顶的分数和燥热郁闷进行‘瞬间冷冻结界’的梦幻手持式甜味冰砖！🍦",
        "网速卡成幻灯片，战场局势极其不妙，而我的灵魂连载工具却仅剩了最后2%的惨存生命值。老板，救命啊！有那种能够让我重新化身为全场超神战胜黑屏魔咒的‘逆转干瘪模块’电池吗？🔋",
        "打完篮球和社团狂欢，肚子直接发出了十级警报！老板，我要来一桶能在三分钟内爆香、热辣翻滚的‘加料方便泡面’，再搭配一罐能冲上天灵盖的极冰镇可乐！今晚大胃王要全火力狂飙！🍜🥤",
        "（兴奋地跑进来）店长！今晚游戏团战终于拿到了全服第一！请给我一杯‘网红爆料奶茶’和一块浓香鲜奶雪糕，燃烧我的多巴胺！🧋🍦"
      ]
    },
    {
      id: 3,
      name: "老张 (白领社畜)",
      description: "连续加班三天、崩溃边缘的苦逼程序员（白领社畜）。脾气暴躁，极度缺觉，一直吐槽Bug、产品经理 and 不靠谱的服务器。极其需要能解压或果腹的东西。",
      offlineDialogues: [
        "老板！再写不出这个高并发Bug我就要跟产品经理同归于尽了！快！给我拿一份在短短三分钟内、千万玩家见证下只要注入滚烫沸流就能瞬间激发辛辣力量的‘熬夜加班续命法宝’！急！🍜",
        "（盯着黯淡无光的屏幕发呆）它只剩下1%了，这代表着十二个致命的核心催办通道即将全部被切断。如果店长可以是我的超级救星，请赐予我一个能将‘干瘪虚无的电子黑屏’瞬间重置回活力绿波的赛博便携充电宝吧？🔋",
        "加班狗不需要优雅，我的咽喉与双胃现在极其空瘪，需要一份装在一次性长方形盒子里的、带有喷香主食、咸鲜酱汁和厚重热量融合的高饱腹‘卡路里便当炸弹’。老板，丢给我就好！🍱",
        "（揉着干燥撕裂的指头）键盘敲了整整十六个小时，指尖都磨开裂了。老板，给我一片能包裹裂口的‘强效创可贴’，再帮我接一杯温暖温胃的‘暖心热开水’，保佑我今晚不要崩了。🩹☕",
        "天哪……代码刚改完，外面竟然突然哗啦啦下起暴雨！我没带伞，而且饿得饥肠辘辘。店长，快拿一把避雨的便利雨伞 and 一份能塞满肚子的豪华便当，我得赶紧带着电脑滚回家！🌂🍱"
      ]
    }
  ],
  en: [
    {
      id: 0,
      name: "Uncle Lin (Noir Detective)",
      description: "A dramatic middle-aged man wearing a vintage trench coat, talking like a melancholy detective in classic noir mystery films. Extremely skeptical of convenience store food, inspecting snacks as 'critical evidence'.",
      offlineDialogues: [
        "(Lowers hat, looks serious) In this dark, turbulent night, danger always reveals itself in the warmth. I need a bowl of seemingly calm, steaming, and red-oil-crossed 'Midnight Golden Cubes' to lure out the suspect. Manager, you know what evidence that represents? 🍢",
        "Hmph... Interesting. A 'highly carbonated mysterious glass bottle' perfectly sealed at sub-zero temperatures, with cold air quietly dripping down its side. This is the thermal clues of the crime scene. Manager, what carbonated joy-fluid cola would you use? 🥤",
        "In this criminal street corner, I've been staking out for over three hours, and my body temperature is dropping. I urgently need a warm, 'portable high-energy food' to swallow quickly to get midnight redemption.🕵️‍♂️",
        "(Clutching wrist, scanning surroundings alertly) In the fierce struggle with the suspect just now, my wrist was scraped. I need a secretive piece of 'Care Band-Aid' to wrap the wound. Manager, you have this patch, right? 🩹",
        "(Shaking rain off coat) Cold rain suddenly poured, and my stakeout is in the open. I urgently need a sturdy 'Umbrella' that blends into the night to block this freezing night rain. 🌂"
      ]
    },
    {
      id: 1,
      name: "Taozi (Traveler)",
      description: "A young traveler holding a mirrorless camera and carrying a huge hiking backpack. Friendly, humorous, always gets lost, loves discovering local convenience store treats like bento.",
      offlineDialogues: [
        "Hello manager! My compass is spinning, legs heavy as lead. At this unfamiliar midnight intersection, my picky eyes need a local, large-bite hearty 'saucy bento box' to save me. 🍱",
        "(Rubbing frozen hands) I plan to climb to the peak to take photos of the starry sky, but the mountain wind is freezing. Is there a 'warm skewer soup' like oden that keeps heating my hands and mouth? 🍢",
        "Oh dear... The view is great, but my camera and phone have low-battery alerts, and my stomach is roaring. I need a 'pocket power charging power bank' to revive my social signals! 🔋",
        "Ouch... (Rubbing ankle) Walked so much to shoot the meteors, got a huge blister on my sole. It hurts to stand. Is there any protective 'Hiking Repair Band-Aid' to wrap it? 🩹",
        "(Teeth chattering) Manager, the mountain wind is freezing. Please give me a warm cup of 'Pure Hot Water' to hold as a hand warmer! ☕"
      ]
    },
    {
      id: 2,
      name: "A-Hao (Student)",
      description: "An energetic and humorous high school sport student. Extremely passionate about school clubs, internet memes, and sweets. Loves basketball and has a huge appetite.",
      offlineDialogues: [
        "Whoa, manager! My hands are shaking... Just shot 3-pointers under the sunset and my fluid and calories are completely drained. Urgent need for a sweet, ice-cold 'trendy boba milk tea' with super chewy pearls! 🧋",
        "Oh man! Looking at that math scratch paper full of red crosses, my soul feels frozen. I need a sweet fruit & milk 'dreamy ice cream' brick to freeze my terrible grade and stress instantly! 🍦",
        "The network is lagging like a slideshow, match is in critical status, and my phone only has 2% life support. Help! Is there a modules power bank to 'reverse the black screen' doom? 🔋",
        "After basketball and club carnival, my stomach is screaming! Manager, I want a cup of hot spicy instant noodles, paired with an ice-cold fizzy soda cola! 🍜🥤",
        "(Runs in excited) Manager! We finally got server first in our guild raid tonight! Give me a 'Trendy Boba Milk Tea' with bubble pearls, and a rich milk 'ice cream'! 🧋🍦"
      ]
    },
    {
      id: 3,
      name: "Lao Zhang (Corporate Slave)",
      description: "A distressed programmer (corporate slave) on the verge of breakdown after working overtime for three days. Hot-tempered, sleep-deprived, constantly complaining about bugs, product managers, and flaky servers.",
      offlineDialogues: [
        "Manager! If I can't fix this concurrency bug, I've to go down with the product manager! Quick, give me the 'overtime lifesaver instant noodle' that cooks with boiling water in three minutes! Urgent! 🍜",
        "(Staring blankly at the dark screen) Only 1% left, which means twelve critical deployment pipelines are about to be cut off. If manager can be my super lifesaver, please grant me a cyber portable power bank to instantly reset this 'dry electronic black screen' back to vitality! 🔋",
        "Overtime slaves don't need elegance, my throat and stomach are extremely empty right now, I need a high-satiety 'calorie bento bomb' in a single-use rectangular box, with fragrant staple food, salty savory sauce and heavy calorie fusion. Manager, just throw it to me! 🍱",
        "(Rubbing dry split fingers) Typing on the keyboard for full sixteen hours, my fingertips are cracked. Manager, give me a 'strong band-aid' to wrap the gap, and help me fill a cup of warm 'hot water' to warm my stomach, double bless me from breaking down tonight. 🩹☕",
        "Oh my... Just finished modifying code, and it suddenly started pouring rain outside! I don't have an umbrella, and my stomach is starving. Manager, quickly bring a 'rain shelter umbrella' and a tummy-filling bento, I must rush home with my laptop! 🌂🍱"
      ]
    }
  ],
  ko: [
    {
      id: 0,
      name: "임 아저씨 (느와르 아저씨)",
      description: "빈티지 트렌치코트를 입은 슈퍼 느와르 연기파 아저씨. 분위기 있는 사설탐정처럼 우울하게 말하며, 편의점 음식에 대단히 이성적인 의구심을 가지고 있어 간식을 '핵심 증거물'로 검증하는 취미가 있습니다.",
      offlineDialogues: [
        "(모자를 눌러쓰며 무거운 안색으로) 이 요동치는 어두운 밤, 위험은 따뜻함 속에서 그 모습을 드러내지. 용의자를 유인하기 위해 고요해 보이지만 열기와 고추기름이 가득 엉켜 있는 '심야 황금 조각 오뎅' 한 그릇이 필요하네. 점장, 이것이 어떤 증거물인지 자네는 잘 알고 있겠지? 🍢",
        "흥... 재미있군. 영하 10도의 완벽한 결계 속에 봉인된 '탄산 가득한 신비의 유리병', 그 냉기가 병 표면을 타고 고요히 흘러내리고 있네. 범행 당일의 밀폐 온도 단서지. 점장, 자네라면 이 탄산 가득한 쾌락의 수액을 무엇으로 매칭해 주겠나? 🥤",
        "죄악이 횡행하는 이 거리 모퉁이에서 벌써 3시간 넘게 잠복해 체온이 떨어지고 있네. 어둠 속에서 조용히 삼킬 수 있는 따뜻한 '휴대용 고에너지 보양 음식'을 긴급 소생 용도로 원하네. 절대 눈에 띄어서는 안 되네. 🕵️‍♂️",
        "(속목을 움켜쥐고 주변을 경계하며) 방금 용의자와 격투 중에 손목이 쓸렸네. 자네 편의점에 이 상처를 가려줄 은밀한 '강력 상처 밴드'가 분명 있겠지? 🩹",
        "(대의의 빗물을 털어내며) 찬 이슬비가 갑자기 쏟아져 잠복이 가혹해지는군. 비바람을 막아줄 튼튼한 '비바람 우산'이 시급하군. 🌂"
      ]
    },
    {
      id: 1,
      name: "타오즈 (배낭 여행가)",
      description: "미러리스 카메라를 들고 거대한 배낭을 멘 젊은 여행가. 성격이 쾌활하고 코믹하며, 항상 길을 잃습니다. 낯선 동네 편의점의 숨겨진 보물 음식을 탐험하는 것을 좋아합니다.",
      offlineDialogues: [
        "안녕하세요 사장님! 나침반은 제멋대로 돌고, 다리는 천근만근이네요. 이 낯선 밤거리 교차로에서, 배고픔을 달래줄 기름지고 든든한 '소스 가득한 도시락 영양 플래터'가 간절해요. 🍱",
        "(약간 떨며 얼어붙은 작은 손을 비비며) 오늘 밤 신비로운 은하수를 찍기 위해 정상에 오를 예정입니다. 하지만 산바람이 칼바람 같네요. 손에 쥐기만 해도 끝없이 온기가 전해지고 따끈한 김이 모락모락 나는 '방한 꼬치구이 국물 오뎅'이 있을까요? 🍢",
        "아고고... 풍경은 끝내주는데 카메라랑 폰이 동시에 붉은 배터리 경고를 보냈어요. 꼬르륵 소리는 보너스고요! 전자기기에 수명을 불어넣어 줄 '휴대용 초고속 충전기 보조배터리'가 급히 필요합니다! 🔋",
        "아이코... (발목을 움직이며) 오늘 유성을 찍으려고 너무 많이 걸었더니 발바닥에 물집이 심하게 잡혀 걸을 수 없네요. 완벽 밀착되는 '강력 상처 밴드'가 절실해요! 🩹",
        "(이빨을 부딪치며) 사장님, 오늘 산바람이 온몸을 얼려 냉동 인간을 만들려 하네요. 보온병의 온수도 다 떨어졌으니 온몸을 녹일 따끈한 물 한 잔만 부탁드려요! ☕"
      ]
    },
    {
      id: 2,
      name: "아하오 (남학생)",
      description: "활기차고 쾌활한 운동 부원 스타일의 남고생. 학교 동아리, 인터넷 유행 밈 및 온갖 달콤한 간식에 환장하며 농구를 지독히 좋아합니다. 엄청난 대식가입니다.",
      offlineDialogues: [
        "우와! 사장님! 손이 벌벌 떨려요... 방금 농구장에서 자유투 삼점슛을 엄청 쏘고 오느라 칼로리가 완전히 바닥났어요! 머리가 찡할 정도로 시원하고 쫀득쫀득한 펄이 씹히는 '인기만점 달달 버블 밀크티'를 원해요! 🧋",
        "대박 사건... 오늘 수학 오답 노트를 보고 정상이 아닐 만큼 멘탈이 시베리아처럼 시려요. 기분을 차갑고 달콤하게 식혀줄 농축 생크림 '꿈의 아이스크림'을 던져주세요! 🍦",
        "인터넷이 슬라이드 쇼처럼 버벅거리고, 팀원 간의 승률 한판도 일촉즉발인데, 폰 배터리는 겨우 2% 생명선에 다다랐습니다. 사장님! 이 블랙스크린 저주에서 구원해 줄 '번개 충전 모듈'이 있겠죠? 🔋",
        "농구가 끝나고 클럽 동아리 활약 후 위장이 완전히 비상 신호를 보냅니다! 뜨끈하게 끓어오르는 '칼칼한라면 라면'이랑 온몸을 자극할 '탄산 가득한 콜라' 주세요! 🍜🥤",
        "(신나서 뛰어 들어오며) 점장님! 오늘 밤 전 서버 레이드에서 공략 승리로 영광의 1위를 찍었습니다! '인기만점 달달 버블 밀크티'랑 '꿈의 아이스크림' 하나씩 주세요! 🧋🍦"
      ]
    },
    {
      id: 3,
      name: "장 대리 (회사원)",
      description: "3일 연속 야근으로 인해 분노 조절 폭발 직전에 도달한 불쌍한 프로그래머 회사원. 만성 수면 불량 상태이며 버그와 서비스 기획자, 불안정한 서버를 끊임없이 씹고 있습니다.",
      offlineDialogues: [
        "사장님! 이 버그 못 잡으면 오늘 진짜 기획자랑 같이 지옥 구경 가게 생겼어요! 빨리 끓는 물을 붓기만 하면 3분 만에 화끈한 스프 열기를 뿜어내 수명을 늘려줄 '야근 생명수 라면'을 주세요! 급합니다! 🍜",
        "(희미해진 개발 화면을 멍하니 보며) 배터리가 딱 1% 남았어요. 프로젝트 긴급 푸시를 전송해야 하는데 충전 전송선 없인 먹통입니다. 점장님, 영혼을 되살려 줄 '사이버 든든 보조배터리'를 부디 제게 투척해 주세요! 🔋",
        "야근형 인간에겐 격식 따윈 필요치 않습니다. 위장이 비어 괴롭습니다. 일회성 용기에 가득 담긴 소스 듬뿍, 고열량 탄수화물 '칼로리 폭탄 시그니처 도시락'을 주세요. 가릴 처지가 아니니 바로 던져주세요! 🍱",
        "(피로 가득한 손가락을 문지르며) 키보드를 16시간 동안 타이핑했더니 갈라져 피가 비치네요. 이 틈을 막아줄 '강력 상처 밴드'와 따뜻한 '정성 온수' 한 잔만 타주세요. 🩹☕",
        "이럴 수가... 코드 버그 다 수정했더니 밖엔 청천벽력 무서운 비가 억수같이 쏟아지네요. 우산도 없는 데다 배도 고릅니다. 비를 완벽히 막아줄 '비바람 우산'이랑 뱃속 든든한 '시그니처 도시락' 하나만 챙겨주세요! 🌂🍱"
      ]
    }
  ]
};

const GUEST_PROFILES = GUEST_PROFILES_LOCALIZED.zh;

// Dynamic target item detection scanner based on dialogue text
function detectTargetItemsFromText(text: string): string[] {
  const textLower = text.toLowerCase();
  const discovered: string[] = [];
  
  const mappings = [
    { id: "🍢 关东煮", keywords: ["关东煮", "串串汤", "오뎅", "oden", "skewered"] },
    { id: "🍱 招牌便当", keywords: ["便当", "도시락", "bento"] },
    { id: "🍜 劲爽泡面", keywords: ["泡面", "面皇", "라면", "noodles", "noodle"] },
    { id: "🥤 冰镇可乐", keywords: ["可乐", "콜라", "cola", "汽水"] },
    { id: "🧋 超浓奶茶", keywords: ["奶茶", "버블티", "milk tea", "boba"] },
    { id: "🌂 便利雨伞", keywords: ["雨伞", "우산", "umbrella"] },
    { id: "🩹 强效创可贴", keywords: ["创可贴", "贴纸", "밴드", "band-aid", "patch", "상처 밴드"] },
    { id: "🔋 共享充电宝", keywords: ["充电宝", "魔盒", "보조배터리", "power bank", "charge", "charging", "电浆包", "电浆"] },
    { id: "🍦 甜心雪糕", keywords: ["雪糕", "冰砖", "아이스크림", "ice cream", "冰棒", "雪条"] },
    { id: "☕ 热开水", keywords: ["热开水", "热水", "온수", "hot water", "warm water", "开水", "정성 온수"] },
    { id: "🍔 芝士汉堡", keywords: ["汉堡", "芝士汉堡", "치즈버거", "burger", "hamburger", "cheeseburger"] },
    { id: "🍙 蒲烧鳗鱼饭团", keywords: ["饭团", "鳗鱼饭团", "삼각김밥", "onigiri", "rice ball"] },
    { id: "🍵 浓郁抹茶", keywords: ["抹茶", "말차", "matcha"] },
    { id: "🥔 酥脆薯片", keywords: ["薯片", "감자칩", "chips", "crisps", "potato chips"] },
    { id: "🍊 鲜榨橙汁", keywords: ["橙汁", "오렌지주스", "orange juice", "juice"] },
    { id: "🍫 榛子巧克力", keywords: ["巧克力", "초콜릿", "chocolate", "dark chocolate"] },
    { id: "🥐 黄油牛角包", keywords: ["牛角", "牛角面包", "猪角包", "크로와상", "croissant"] },
    { id: "🍉 清甜西瓜汁", keywords: ["西瓜汁", "수박주스", "watermelon", "watermelon juice"] },
    { id: "🥖 蒜香法棍", keywords: ["法棍", "大蒜面包", "바게트", "baguette", "garlic bread"] },
    { id: "💊 清凉万金油", keywords: ["万金油", "清凉油", "연고", "balm", "cooling balm", "ointment"] }
  ];
  
  for (const item of mappings) {
    const matched = item.keywords.some(kw => textLower.includes(kw));
    if (matched) {
      discovered.push(item.id);
    }
  }
  
  // High-availability: guarantee at least 1-2 items are returned as target fallback
  if (discovered.length === 0) {
    const shuffled = [...mappings].sort(() => Math.random() - 0.5);
    discovered.push(shuffled[0].id);
    if (Math.random() > 0.5) {
      discovered.push(shuffled[1].id);
    }
  }
  
  return discovered;
}

// Fetch CSV from spreadsheet helper
async function fetchSheetCSV(sheetName: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    throw new Error(`Failed code ${res.status}: ${res.statusText}`);
  }
  return await res.text();
}

// Custom simple CSV Parser
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentLine.push(currentField);
      lines.push(currentLine);
      currentLine = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField);
    lines.push(currentLine);
  }
  return lines;
}

// ----------------------------------------------------
// ROUTES
// ----------------------------------------------------

// 1. Fetch entire parsed spreadsheet layout
app.get("/api/game/config", async (req, res) => {
  try {
    console.log("Fetching latest Google Spreadsheet data...");
    
    // Fetch initial parameters
    const initialCSV = await fetchSheetCSV("State").catch(() => null) || await fetchSheetCSV("state").catch(() => null);
    let initial = DEFAULT_CONFIG.initial;
    if (initialCSV) {
      try {
        const rows = parseCSV(initialCSV);
        const bgVal = parseInt(rows[1]?.[1] || rows[1]?.[0] || "0", 10);
        const chaVal = parseInt(rows[4]?.[0] || "1", 10);
        const startVal = parseInt(rows[4]?.[1] || "50", 10);
        initial = {
          bg_state: isNaN(bgVal) ? 0 : bgVal,
          cha_state: isNaN(chaVal) ? 1 : chaVal,
          value: isNaN(startVal) ? 50 : startVal
        };
      } catch (e) {
        console.error("Parsed initial tab error, fallback applied:", e);
      }
    }

    // BG states
    const bgCSV = await fetchSheetCSV("BG").catch(() => null);
    let bg = DEFAULT_CONFIG.bg;
    if (bgCSV) {
      try {
        const rows = parseCSV(bgCSV);
        const items = rows.slice(1).map(r => ({
          state: r[0]?.trim(),
          link: r[1]?.trim() || ""
        })).filter(item => item.state !== undefined && item.state !== "");
        if (items.length > 0) bg = items;
      } catch (e) {
        console.error("BG parse error:", e);
      }
    }

    // Guests
    const guestsCSV = await fetchSheetCSV("Guests").catch(() => null) || await fetchSheetCSV("guests").catch(() => null) || await fetchSheetCSV("Guest").catch(() => null) || await fetchSheetCSV("guest").catch(() => null);
    let guests = DEFAULT_CONFIG.guests;
    if (guestsCSV) {
      try {
        const rows = parseCSV(guestsCSV);
        const items = rows.slice(1).map(r => ({
          state: r[0]?.trim(),
          link: r[1]?.trim() || ""
        })).filter(item => item.state !== undefined && item.state !== "");
        if (items.length > 0) guests = items;
      } catch (e) {
        console.error("Guests parse error:", e);
      }
    }

    // Character
    const characterCSV = await fetchSheetCSV("Character").catch(() => null) || await fetchSheetCSV("character").catch(() => null);
    let character = DEFAULT_CONFIG.character;
    if (characterCSV) {
      try {
        const rows = parseCSV(characterCSV);
        let base = DEFAULT_CONFIG.character.base;
        const parsedStates: any[] = [];
        for (const r of rows) {
          if (!r || r.length === 0) continue;
          const col0 = (r[0] || "").trim();
          const col1 = (r[1] || "").trim();
          if (col0.toLowerCase() === "base") {
            base = col1;
          } else if (col0 !== "" && col0.toLowerCase() !== "state") {
            const min = parseInt(r[2] || "0", 10);
            const max = parseInt(r[3] || "100", 10);
            parsedStates.push({
              state: col0,
              link: col1,
              min: isNaN(min) ? 0 : min,
              max: isNaN(max) ? 100 : max
            });
          }
        }
        if (parsedStates.length > 0) {
          character = {
            base: base || DEFAULT_CONFIG.character.base,
            states: parsedStates
          };
        }
      } catch (e) {
        console.error("Character parsing error:", e);
      }
    }

    return res.json({
      bg,
      character,
      guests,
      initial
    });
  } catch (err: any) {
    console.error("Error in /api/game/config handler:", err);
    return res.json(DEFAULT_CONFIG);
  }
});

// 2. Guest targets definition used to compute precise completions in chat
const ALL_ITEMS = [
  "🍢 关东煮", "🍱 招牌便当", "🍜 劲爽泡面", "🥤 冰镇可乐", "🧋 超浓奶茶",
  "🌂 便利雨伞", "🩹 强效创可贴", "🔋 共享充电宝", "🍦 甜心雪糕", "☕ 热开水",
  "🍔 芝士汉堡", "🍙 蒲烧鳗鱼饭团", "🍵 浓郁抹茶", "🥔 酥脆薯片", "🍊 鲜榨橙汁",
  "🍫 榛子巧克力", "🥐 黄油牛角包", "🍉 清甜西瓜汁", "🥖 蒜香法棍", "💊 清凉万金油"
];

const GUEST_ITEMS_POOL: Record<number, string[]> = {
  0: ["🍢 关东煮", "🥤 冰镇可乐", "☕ 热开水", "🍔 芝士汉堡", "🍙 蒲烧鳗鱼饭团", "🍵 浓郁抹茶", "🥔 酥脆薯片", "🥐 黄油牛角包"], // 林叔 (侦探)
  1: ["🍱 招牌便当", "🥤 冰镇可乐", "🍢 关东煮", "🌂 便利雨伞", "🔋 共享充电宝", "🍊 鲜榨橙汁", "🥐 黄油牛角包", "🍉 清甜西瓜汁"], // 桃子 (背包客)
  2: ["🧋 超浓奶茶", "🥤 冰镇可乐", "🍜 劲爽泡面", "🍦 甜心雪糕", "🍱 招牌便当", "🔋 共享充电宝", "🍔 芝士汉堡", "🥔 酥脆薯片", "🍫 榛子巧克力", "🍉 清甜西瓜汁"], // 阿豪 (学生)
  3: ["🍜 劲爽泡面", "🍱 招牌便当", "🔋 共享充电宝", "☕ 热开水", "🥖 蒜香法棍", "💊 清凉万金油", "🍙 蒲烧鳗鱼饭团", "🍵 浓郁抹茶"] // 老张 (社畜)
};

function getRandomTargetsForGuest(guestId: number): string[] {
  const pool = GUEST_ITEMS_POOL[guestId] || GUEST_ITEMS_POOL[0];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = Math.random() > 0.5 ? 3 : 2;
  return shuffled.slice(0, count);
}

const guestItemTargets: Record<number, string[]> = {
  0: ["关东煮", "可乐"], // 林叔 (侦探)
  1: ["便当", "可乐", "关东煮", "雨伞", "充电宝"], // 桃子 (背包客)
  2: ["奶茶", "可乐", "泡面", "雪糕", "便当", "充电宝"], // 阿豪 (学生)
  3: ["泡面", "便当", "充电宝"], // 老张 (社畜)
};

// Offset-based local quick replies fallback mapping
function getLocalizedOfflineQuickReplies(lang: string, guestId: number): string[] {
  const currentLang = (lang === "en" || lang === "ko") ? lang : "zh";
  if (currentLang === "en") {
    if (guestId === 0) {
      return [
        "Uncle Lin, is there any suspicious movement on the quiet street tonight? 🕵️‍♂️",
        "No rush, Uncle Lin! Let me check the clues of this incident for you! 🔎",
        "Drink some cold cola first and eat warm oden to boost your brain cells! 🍢",
        "Leave all the evidence at the crime scene to me, Boss! 👌"
      ];
    } else if (guestId === 1) {
      return [
        "Taozi! Long time no see! Hurry up inside and get warm! 🎒",
        "Out of battery? Here is a rescue power bank and signature bento! 🔋",
        "Keep warm! Eat something hot, don't eat ice cream! 🍦",
        "Wow! What exciting hiking stories do you have this time? 🗺️"
      ];
    } else if (guestId === 2) {
      return [
        "A-Hao! Are you staying up late to rank up on the ladder again? 🎮",
        "Super milk tea and spicy instant noodles are ready, good luck in your match! 🥤",
        "Just done with basketball? Have cold cola or ice cream, not hot water! ⚡",
        "Can't run out of battery! Plug into the power bank, signal must go on! 🔋"
      ];
    } else {
      return [
        "Mr. Zhang, working late again tonight, it's really not easy... 💼",
        "Hot instant noodles and deluxe bento are fresh out of the pot, power up! 🍱",
        "Battery at 1%? This power bank will bring your phone back to life! 🔋",
        "Take a deep breath. Boss making fake promises? I've got your back! 💪"
      ];
    }
  } else if (currentLang === "ko") {
    if (guestId === 0) {
      return [
        "임 아저씨, 오늘 밤 뒷동네 골목길에 수상한 소리가 있나요? 🕵️‍♂️",
        "서두르지 마세요, 임 아저씨! 조수처럼 수사 단서를 캐내 볼게요! 🔎",
        "일단 시원한 콜라와 뜨끈뜨끈한 오뎅을 드시며 두뇌를 회복해 보세요! 🍢",
        "걱정 접으세요! 이 현장의 의문점들은 모두 제가 함께 할 테니까요! 👌"
      ];
    } else if (guestId === 1) {
      return [
        "타오즈! 대단히 오랜만이네요! 얼른 안으로 들어와 차가운 몸을 녹이세요! 🎒",
        "배터리가 부족하신가요? 긴급 보조배터리와 든든한 도시락이 대기 중입니다! 🔋",
        "감기 걸려요! 따뜻한 걸 드셔야지 설마 이런 날에 아이스크림을? 🍦",
        "우와! 이번 배낭 도보 여행에서는 어떤 재미난 사진을 찍으셨나요? 🗺️"
      ];
    } else if (guestId === 2) {
      return [
        "아하오! 오늘도 랭킹전 연승을 달리며 밤샘 티어 올리기 전인가요? 🎮",
        "달콤 버블밀크티와 얼큰 컵라면이 올스탠바이 중입니다, 가뿐하게 캐리하세요! 🥤",
        "운동하고 오셨나요? 극강의 차가운 콜라를 추천드릴게요! ⚡",
        "방전 일보 직전이군요! 스마트하게 마비 신호를 구조하는 배터리입니다! 🔋"
      ];
    } else {
      return [
        "장 대리님, 오늘도 이 늦은 시간까지 야근하느라 정말 고생 많으십니다…… 💼",
        "따끈따끈 라면과 시그니처 도시락이 조리 완료되었습니다, 기운 차리세요! 🍱",
        "충전이 1%도 정지했군요? 대여용 보조배터리로 빠르게 구조해 드립니다! 🔋",
        "토닥토닥. 지독한 고압 부장님이 또 괴롭혔나요? 정성을 바칠게요! 💪"
      ];
    }
  } else {
    if (guestId === 0) {
      return [
        "林叔，听说今晚深夜小街有异常动静？🕵️‍♂️",
        "别急，林叔！我来帮您密切监视这起事件的蛛丝马迹！🔎",
        "先喝口冰可乐，吃热热的关东煮，暖和暖和脑细胞吧！🍢",
        "没问题林叔，案发现场的一切线索，我都给您包下！👌"
      ];
    } else if (guestId === 1) {
      return [
        "桃子！真的好久不见！看你冻得直发抖，赶紧进屋解解冻！🎒",
        "手机彻底没电了吗？救急充电宝和热乎乎的招牌便当都在这里喔！🔋",
        "小心着凉！赶紧吃点热的，可千万别在这个时候吃雪糕呀！🍦",
        "哇，这次的户外冒险又有什么惊险刺激的见闻秘境吗？🗺️"
      ];
    } else if (guestId === 2) {
      return [
        "阿豪！今天又是熬夜上分、决战深夜排位的一天吗？🎮",
        "超农多糖奶茶、劲爽泡面已备齐，祝你战局全胜！🥤",
        "刚打完球吧？喝口冰镇汽水或者爽爽雪糕，千万别喝热开水！⚡",
        "电量不足可不行！插上共享充电宝，社交网速妥妥保障！🔋"
      ];
    } else {
      return [
        "张工，今晚又加班到这么晚，为了业绩真的太拼太不容易了……💼",
        "深夜泡面、招牌便当刚好出锅热好，快趁热坐下满血复活！🍱",
        "电量只剩下1%？救急充电宝随时为您解除低电量焦虑！🔋",
        "别委屈啦，老板又在疯狂画大饼？别慌，今晚小铺撑你到底！💪"
      ];
    }
  }
}

// 3. Initialize new guest speech & dynamically-generated contextual quick replies
app.post("/api/game/guest-init", async (req, res) => {
  try {
    const { guestId, lang } = req.body;
    const currentLang = (lang === "en" || lang === "ko") ? lang : "zh";
    const guestIdNum = parseInt(guestId, 10);
    const profiles = GUEST_PROFILES_LOCALIZED[currentLang] || GUEST_PROFILES_LOCALIZED.zh;
    const validatedGuestId = isNaN(guestIdNum) ? 0 : guestIdNum % profiles.length;
    const profile = profiles[validatedGuestId];

    // Generate dynamic target items for this customer episode
    const targets = getRandomTargetsForGuest(validatedGuestId);

    // Select offline dialogue random as baseline
    const randIndex = Math.floor(Math.random() * profile.offlineDialogues.length);
    let speech = profile.offlineDialogues[randIndex];
    let initializedByAI = false;
    let customReplies: string[] = [];

    if (ai) {
      try {
        const langInstructions = currentLang === "en"
          ? 'IMPORTANT: You MUST generate the speech and quick replies entirely in ENGLISH. Do NOT output any Chinese characters. Make it fit a classic visual novel card dialog.'
          : currentLang === "ko"
          ? 'IMPORTANT: You MUST generate the speech and quick replies entirely in KOREAN. Do NOT output any Chinese characters. Make it fit a classic visual novel card dialog.'
          : 'IMPORTANT: You MUST generate the speech and quick replies entirely in CHINESE.';

        const response = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: `你是个富有创意的深夜客流开场白与实时回复选择生成AI。请为你扮演的便利店顾客角色生成一句他们刚进深夜便利店时对玩家店员（或深夜独白）说出的一段富有动漫性格特色的精彩台词。
同时，根据这段生成台词，为柜台店长准备 3-4 句针对性的趣味快捷接待台词/推荐对话句式（作为接下来的店长快捷选择，名称叫 quickReplies），必须在15字或8个英文单词以内，极富对话代入感且能对应解决客户当前的需求或调侃其状态。

${langInstructions}
顾客姓名：${profile.name}
性格背景：${profile.description}
暗示或直接提及想要的 ${targets.length} 种深夜物品：${targets.join("、")}
`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                customerSpeech: { type: Type.STRING },
                quickReplies: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["customerSpeech", "quickReplies"]
            }
          }
        });
        const resText = response.text?.trim();
        if (resText) {
          const result = JSON.parse(resText);
          if (result.customerSpeech) {
            speech = result.customerSpeech;
          }
          if (Array.isArray(result.quickReplies) && result.quickReplies.length > 0) {
            customReplies = result.quickReplies;
          }
          initializedByAI = true;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
          console.log("ℹ️ Gemini API Free Tier Quota Exhausted (429) for guest init. Switched seamlessly to offline cartoon speech fallback.");
        } else {
          console.warn("Gemini init guest speech failed, using offline fallback:", errMsg);
        }
      }
    }

    if (customReplies.length === 0) {
      customReplies = getLocalizedOfflineQuickReplies(currentLang, validatedGuestId);
    }

    return res.json({
      guestId: validatedGuestId,
      guestName: profile.name,
      customerSpeech: speech,
      quickReplies: customReplies,
      offlineBadge: !initializedByAI,
      targets: targets
    });
  } catch (err: any) {
    console.error("Error in guest-init route handler:", err);
    const reqLang = req?.body?.lang;
    const fallbackLang = (reqLang === "en" || reqLang === "ko") ? reqLang : "zh";
    const fallbackProfile = GUEST_PROFILES_LOCALIZED[fallbackLang] ? GUEST_PROFILES_LOCALIZED[fallbackLang][0] : GUEST_PROFILES_LOCALIZED.zh[0];
    const targetGuestId = 0;
    const targets = getRandomTargetsForGuest(targetGuestId);
    return res.json({
      guestId: targetGuestId,
      guestName: fallbackProfile.name,
      customerSpeech: fallbackProfile.offlineDialogues[0],
      quickReplies: getLocalizedOfflineQuickReplies(fallbackLang, targetGuestId),
      offlineBadge: true,
      targets: targets
    });
  }
});

function getLocalizedOfflineResponse(
  lang: string,
  guestId: number,
  isTalkative: boolean,
  dialogueBonus: number,
  shopkeeperInput: string,
  correctCount: number,
  wrongCount: number,
  correctItems: string[],
  wrongItems: string[],
  itemsString: string,
  inputLower: string,
  hasItems: boolean,
  change: number
) {
  let reply = "";
  let feel = "";

  if (lang === "en") {
    if (guestId === 0) { // Uncle Lin
      const hasCorrectDialogue = inputLower.includes("detective") || inputLower.includes("clue") || inputLower.includes("evidence") || inputLower.includes("truth") || inputLower.includes("case") || inputLower.includes("thief");
      if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          reply = `(Packing oden and cold cola into windcoat) The night fog is instantly cleared! This perfect hot & cold combo is indeed the key to criminal evidence! I take them both. And your sharp analysis: "${shopkeeperInput}", really matches the detective spirit! We will sweep this case tonight!`;
          feel = "🕵️‍♂️ Case Solved";
        } else {
          reply = "(Eating oden and cold cola) All items gathered... Manager, although the clues of the crime scene are complete, you served me with total silence. You are a silent but legendary professional.";
          feel = "🕵️‍♂️ Got Evidence, Too Cold";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          reply = `(Takes a piece of evidence) Great intuition, successfully secured! Your sincere words: "${shopkeeperInput}" perfectly hit the mark. What a pity, if only you also packed the other target, we could achieve 100% evidence loop.`;
          feel = "🔎 Big Clue Found";
        } else {
          reply = "(Eating a single item) Although single critical evidence is secured, the mystery is still stalled. Also, you barely gave one item and stayed silent... is this a mafia sign code?";
          feel = "🔎 Incomplete Clue";
        }
      } else if (wrongCount > 0) {
        const creditText = correctCount > 0 ? ` (However, that correct [${correctItems.join(", ")}] evidence is extremely helpful!)` : "";
        if (wrongCount === 1) {
          reply = isTalkative
            ? `Manager, although "${shopkeeperInput}" sounds professional, this item [${itemsString}] doesn't seem to correlate with the stalking case... Are you sure it's not a distraction from the suspect?` + creditText
            : `(Frowning at the unmatched [${itemsString}]) Delivering a completely unrelated item... and staying dead silent makes you even more suspicious in this dark night!` + creditText;
        } else {
          reply = `Manager, these mixed items are completely chaotic! Are you sure you are not hired by the black syndicate to confuse police eyes? Total negligence!` + creditText;
        }
        feel = "🫤 Suspicious";
      } else if (hasCorrectDialogue && !hasItems) {
        reply = `Ah! You have the detector instincts! Though no actual goods served, your keyword: "${shopkeeperInput}" hits the core. Excellent match, let's discuss details after I select items!`;
        feel = "🔎 Highly Professional Appreciation";
      } else {
        if (isTalkative) {
          reply = `(Looks at you) You gave a long lecture: "${shopkeeperInput}" but didn't even serve a warm oden or ice cold cola. This is not how darkness undercover agents coordinate!`;
          feel = "🫤 Awkward Speech";
        } else {
          reply = "(Uncle Lin sighs) Undercover stakeout is tough business! You stayed silent and served irrelevant things. Extremely disappointing.";
          feel = "😑 Deeply Disappointed";
        }
      }
    } else if (guestId === 1) { // Taozi
      const hasIceCream = itemsString.includes("雪糕") || itemsString.toLowerCase().includes("ice cream");
      const hasCorrectDialogue = inputLower.includes("map") || inputLower.includes("lost") || inputLower.includes("night view") || inputLower.includes("travel") || inputLower.includes("route") || inputLower.includes("scenery") || inputLower.includes("photo");
      if (hasIceCream) {
        if (isTalkative) {
          reply = `Manager, thanks for the reminder: "${shopkeeperInput}", but what is this cold [Sweet Milk Ice Cream]?! I'm already shivering and freezing, do you want me to hibernate here? Ugh.`;
        } else {
          reply = "Whoa! Listening to me shivering from the cold, you stayed silent and served me [Sweet Milk Ice Cream]?! Manager, is this your specialized cold-shoulder treatment? Frozen to the bones!";
        }
        feel = "🥶 Shivering shivering";
      } else if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          reply = `Wow! You completely solved my stomach hunger and phone-charging crisis in one go! Super professional! Plus your supportive words: "${shopkeeperInput}", my heart is overflowing with warmth!`;
          feel = "🏕️ Ultimate Gratefulness";
        } else {
          reply = "Oh my! The warm oden and charging power bank are all served! I am fully revived! But you are so quiet, serving materials in total silence like a silent ninja.";
          feel = "🎒 Solved but Host Too Cold";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          reply = `Awesome! This item saved my willpower in the freezing wind! Especially hearing your heartwarming words: "${shopkeeperInput}", really healed! If only you packed the charging box along with it, it would be a perfect climb.`;
          feel = "🎒 Fully Charged Vibe";
        } else {
          reply = "(Spreads out the single item) Phew, so warm! Thanks for the warm supply. But if only you packed the other needed backup, it would be 100% perfect... and you sure are extremely quiet.";
          feel = "🎒 Single Warm Item";
        }
      } else if (wrongCount > 0) {
        const creditText = correctCount > 0 ? ` (However, that correct [${correctItems.join(", ")}] is extremely timely and helpful!)` : "";
        if (wrongCount === 1) {
          reply = isTalkative
            ? `Hmm... Albeit thanking you for the chat: "${shopkeeperInput}", this out-of-season item [${itemsString}] is completely useless on the freezing mountain peak... My battery/cold dilemmas are still unresolved.` + creditText
            : `(Puzzled at the unmatched [${itemsString}]) Manager served me a random item in silence. My camera is dying and my stomach is roaring... feels rather lonely.` + creditText;
        } else {
          reply = `(Extremely disappointed) Manager, these unrelated goods are total deadweight in this freezing camping wind. The power bank and warm bento are missing, our wavelengths don't match.` + creditText;
        }
        feel = "🫤 Puzzled sigh";
      } else if (hasCorrectDialogue && !hasItems) {
        reply = `Wow, you are so considerate, explaining how to hike and avoid wind: "${shopkeeperInput}"... Though my hands are empty, I feel highly encouraged! I will pick my items now!`;
        feel = "🗺️ Heart Healed";
      } else {
        if (isTalkative) {
          reply = `Eh? What you said: "${shopkeeperInput}" doesn't seem to correlate with my backpacker situation, and no warm food is provided. My stomach and camera are still crying for life support.`;
          feel = "🫤 Off topic";
        } else {
          reply = "Taozi pouts and rubs her stomach: 'Manager... I am shivering in the cold wind, yet you stay silent and offer not a single warm item or advice. So sad.'";
          feel = "😭 Lost and Cold";
        }
      }
    } else if (guestId === 2) { // A-Hao
      const hasHotWater = itemsString.includes("热开水") || itemsString.includes("水") || itemsString.toLowerCase().includes("warm water") || itemsString.toLowerCase().includes("hot water");
      const hasCorrectDialogue = inputLower.includes("basketball") || inputLower.includes("gamer") || inputLower.includes("clans") || inputLower.includes("score") || inputLower.includes("sweet") || inputLower.includes("hungry") || inputLower.includes("bubble tea");
      if (hasHotWater) {
        if (isTalkative) {
          reply = `Bro! I am super hot and sweating, although your words are friendly: "${shopkeeperInput}", serving this blazing [Hot Water] is a bit too grandpa-style! I will melt on the spot!`;
        } else {
          reply = "Manager! I just finished playing basketball under the scorching sun and almost fainted. You said nothing but shoved a blazing [Hot Water] at me?! Is this a biochemical grandpa training? I need cold ice cream and sweet carbs!";
        }
        feel = "🥵 Heat Struggle";
      } else if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          reply = `Super like! The chilled cola, sweet milk tea, and hefty bento are perfect! Made me fully revived! Plus your gamer slang: "${shopkeeperInput}", you are an absolute youth culture expert! This is legendary!`;
          feel = "🥳 Perfect Match Gala";
        } else {
          reply = "(Gulping down food and chilling drinks) This is so amazing! Energy restored in seconds. Though you are super quiet, serving in total silence like a cold marble statue, I'll still give you five stars for the delicious feast!";
          feel = "🥳 Solved but Silent Bro";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          reply = `Whoa! Having this supply is superb! Listening to your hearty words: "${shopkeeperInput}", you are so cool and really get us! Perfect piece for key gaming gear. If only you packed my other sweets or power bank too.`;
          feel = "🥳 Energetic Vibe";
        } else {
          reply = "(Eating the single item) Whew, finally got some energy back! But just one item is barely enough for my appetite, and my phone is still on 1% emergency limit. You didn't even say hello, is everyone here this cool?";
          feel = "🥳 Single Item Relieved";
        }
      } else if (wrongCount > 0) {
        const creditText = correctCount > 0 ? ` (However, that correct item [${correctItems.join(", ")}] is a supreme supply, thank you!)` : "";
        if (wrongCount === 1) {
          reply = isTalkative
            ? `Er, bro, albeit thanking your backing: "${shopkeeperInput}", this item [${itemsString}] is totally unmatched for someone dying of hunger, thirst, and battery limits... my stomach is still sad.` + creditText
            : `(Sighs heavily) Manager served me a completely unrelated [${itemsString}] in total silence. I don't want to eat this at all, so disappointed.`;
        } else {
          reply = `Bro! These items are completely off-track! I'm thirsty and sweating, why are you packaging these random things? Total buzzkill!`;
        }
        feel = "🫤 Disappointed";
      } else if (hasCorrectDialogue && !hasItems) {
        reply = `Haha, you are hilarious, bro! You actually know our gen-z internet memes! Hearing you comfort me: "${shopkeeperInput}" has cleared away my exam failure stress. I will grab items now!`;
        feel = "🏀 Bro Code Connected";
      } else {
        if (isTalkative) {
          reply = `Eh, I didn't quite catch your speech: "${shopkeeperInput}", and didn't see you serve any sweet ice cream or carbonated oden bento. A bit awkward.`;
          feel = "🫤 Somewhat Awkward";
        } else {
          reply = "A-Hao slumps down: 'Manager, I am exhausted from sports, my phone is dying, and you don't even talk or serve matching energy supplies. So boring.'";
          feel = "😩 Disappointing Buzzkill";
        }
      }
    } else if (guestId === 3) { // Lao Zhang
      const hasIce = itemsString.includes("雪糕") || itemsString.includes("可乐") || itemsString.toLowerCase().includes("ice cream") || itemsString.toLowerCase().includes("cola");
      const hasCorrectDialogue = inputLower.includes("overtime") || inputLower.includes("programmer") || inputLower.includes("bug") || inputLower.includes("server") || inputLower.includes("code") || inputLower.includes("working") || inputLower.includes("corporate") || inputLower.includes("slave");
      if (hasIce) {
        if (isTalkative) {
          reply = `Manager... although your words are friendly: "${shopkeeperInput}", I have been working overtime for 3 days and have severe stomach chills and anxiety. Serving me this icy [Ice Cream / Cola]... are you trying to help the product manager inherit my uncommitted bugs?! My stomach is dying!`;
        } else {
          reply = "(Clutching stomach, looks pale) Manager, I have severe chills after working overtime for three days straight. You didn't say a word and threw a freezing coke / ice cream at me?! This is not comfort, this is sending me to the grave so you can inherit my backlog! Shocking!";
        }
        feel = "🤬 Stomach Freezing";
      } else if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          reply = `(Tears streaming down) A heavy portion of hot food and a rescue power bank to solve my black-screen nightmare! You are my absolute savior! Stomach full, phone resurrected, concurrent bugs can go to hell! Especially your sharp comment on our painful corporate life: "${shopkeeperInput}", perfectly hit my vulnerable programmer nerve! I am deeply touched!`;
          feel = "😭 Touched to Tears";
        } else {
          reply = "(Devouring hot bento while plugging in the power bank) This is the ultimate comfort carbohydrate that keeps a desperate overtime programmer alive! Returning to the hellish keyboard now. Too bad you are so quiet, without even a 'good job', like a cold corporate machine.";
          feel = "😭 Full but Host Too Cold";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          reply = `*Burp!* Warm food entering my stomach, my CPU is finally spinning again. Thanks for your heartwarming reply: "${shopkeeperInput}", really healing to hear in this dark night. If only you solved both battery and hunger in one packaging, that would be divine.`;
          feel = "😭 Deeply Healed";
        } else {
          reply = "(Wolfing down the single hot supply) Thanks manager, saved half of my life. But the other half (charging or food) is still missing, and my screen is black with urgent pings. Plus you didn't say a word, so silent like a stateless API route.";
          feel = "😭 Rescued Halfway";
        }
      } else if (wrongCount > 0) {
        const creditText = correctCount > 0 ? ` (Thankfully, your correct [${correctItems.join(", ")}] really saved my life!)` : "";
        if (wrongCount === 1) {
          reply = isTalkative
            ? `Sigh, manager, your words: "${shopkeeperInput}" do sound encouraging, but this unrelated item [${itemsString}] is completely useless for a dying programmer like me.` + creditText
            : `(Wearily pushing away the unmatched [${itemsString}]) Manager, you are not only silent, but also served me completely useless goods. The multi-layered fatigue is pulling me down...` + creditText;
        } else {
          reply = `Manager! These mixed items are completely off-target! I am on the verge of collapsing from hunger and battery death, yet you increase my work complexity with these unrelated goods. My stomach and blood pressure doubled!`;
        }
        feel = "😑 Distressed Face";
      } else if (hasCorrectDialogue && !hasItems) {
        reply = `Thanks manager. "You've worked hard" and your fitting sarcasm: "${shopkeeperInput}" is the only warm, human dialog I've heard today. Feels much better. Let me grab two food/battery boxes and check out.`;
        feel = "🫤 Restored Consciousness";
      } else {
        if (isTalkative) {
          reply = `Uh, manager, your pretty lecture: "${shopkeeperInput}" is hard to grasp right now. My hands are empty, stomach hollow, and battery at 5%. Hearing dry words alone won't fix my server crashing pings.`;
          feel = "🫤 Separated Bubble";
        } else {
          reply = "Lao Zhang sighs wearily and pushes back the laptop: 'Forget it, we are all just trying to survive. I didn't expect any warmth from a roadside store. Zero greeting, zero correct utilities, I'm heading out.'";
          feel = "😩 Hollow and Desolate";
        }
      }
    }
  } else if (lang === "ko") {
    if (guestId === 0) { // Uncle Lin
      const hasCorrectDialogue = inputLower.includes("탐정") || inputLower.includes("단서") || inputLower.includes("증거") || inputLower.includes("진실") || inputLower.includes("사건") || inputLower.includes("도둑");
      if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          reply = `(소매 속으로 오뎅과 차가운 콜라를 능숙히 포장해 넣으며) 머리속의 긴장 안개가 한순간에 걷히는군! 이 완벽한 온냉의 조화는 사건 해결을 돕는 결정적인 수사 장비일세! 트레이의 두 상품 모두 회수하지. 더욱이 점장님의 이 정교한 분석인 “${shopkeeperInput}”는 명탐정의 수사 동반자다워! 오늘 밤 비밀 검거 작전은 대성공이네!`;
          feel = "🕵️‍♂️ 사건 완전 타결";
        } else {
          reply = "(오뎅과 아이스 콜라를 꿀꺽 삼키며) 자원은 다 확보되었구려... 점장, 사건 실마리 충전은 잘 되었네만, 물건을 건네며 말 한마디 없이 로봇처럼 고요히 있는 모습은 참으로 과묵하고 서늘하외다.";
          feel = "🕵️‍♂️ 증거 획득과 무뚝뚝한 점장";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          reply = `(제공한 일부 증거를 챙기며) 예리한 직감이구만, 단편 단서를 소중히 회수 완료했네! 점장님의 사려 깊은 독백 “${shopkeeperInput}”은 큰 통찰력을 지녔어. 조금 아쉽군, 남은 또 물건도 함께 연동해 주었다면 사건의 미스터리 대순환이 완벽히 끝났을 텐데.`;
          feel = "🔎 대찬 수확";
        } else {
          reply = "(묵묵히 외토인 아이템을 삼키며) 소중한 단편 증거는 구했으나 나머지 절반의 결핍이 수사를 장기 대치로 몰고 가겠군. 게다가 이 기묘한 무언의 응대는... 혹시 검은 배후와의 비밀 텔레파시 신호인가?";
          feel = "🔎 미결의 단편";
        }
      } else if (wrongCount > 0) {
        const creditText = correctCount > 0 ? ` (다만, 저 핵심 단서 [${correctItems.join(", ")}]는 제 수사에 실감 나는 돌파구를 제공해 주었소!)` : "";
        if (wrongCount === 1) {
          reply = isTalkative
            ? `점장, “${shopkeeperInput}”이라는 독백은 세련됐다만, 이 물건인 [${itemsString}]은 잠복 미행과 극비 검거에 단 1%의 개연성도 찾기 힘드네... 가짜 역정보가 가득 섞인 함정은 아니겠지?` + creditText
            : `(미간을 찌푸리며 [${itemsString}]을 슬쩍 쳐내며) 엉뚱한 물건을 시치미 뚝 떼고 건네다니... 점장, 이 어둠 속에서의 침묵은 자네를 가담 용의자로 의심케 만드네!` + creditText;
        } else {
          reply = `점장, 대포 자루처럼 무작위로 수집해 온 이 물품들은 무질서의 극치일세! 혹시 수사를 교란해 기만을 꾀하려는 악의의 장난인가? 정성이 극도로 결여되어 있군!`;
        }
        feel = "🫤 미심쩍음과 의심";
      } else if (hasCorrectDialogue && !hasItems) {
        reply = `통하는 안목을 만나 무척 반갑습니다! 비록 당장 실질 영양 보약은 받지 못했으나, “${shopkeeperInput}”이라는 자문은 현장 전개에 유용합니다. 어서 상품 선반에서 요량껏 장전해 주시오!`;
        feel = "🔎 통하는 동료 의식";
      } else {
        if (isTalkative) {
          reply = `(슬쩍 쳐다보며) 점장... 화려한 지략 전술인 “${shopkeeperInput}”은 내열해 놓고선 바람을 피할 오뎅 하나나 찬 콜라 하나 내밀지 않다니. 이것은 성의 있는 안초 공조 수사가 아니구만!`;
          feel = "🫤 어색해진 분위기";
        } else {
          reply = "임 아저씨의 안색이 엄습하는 새벽안개처럼 침통해졌습니다: '점장, 나는 극비 매복 경비 수사 중일세! 대화 동참도 없고 필요한 심야 보양 물건도 내놓지 못하니 기댈 여지가 없구만.'";
          feel = "😑 심각한 대 실망";
        }
      }
    } else if (guestId === 1) { // Taozi
      const hasIceCream = itemsString.includes("雪糕") || itemsString.toLowerCase().includes("ice cream") || itemsString.includes("아이스크림");
      const hasCorrectDialogue = inputLower.includes("지도") || inputLower.includes("길") || inputLower.includes("야경") || inputLower.includes("코스") || inputLower.includes("사진") || inputLower.includes("풍경") || inputLower.includes("충전");
      if (hasIceCream) {
        if (isTalkative) {
          reply = `단서가 감사하지만 “${shopkeeperInput}”을 넘어 이 찬 [달콤 밀크 아이스크림]은 어떤 지옥 특훈인가요?! 온몸이 덜덜 떨리는데 저더러 그냥 냉동실에 들어가 동면하라는 뜻인가요? 으앗 차가워!`;
        } else {
          reply = "으아! 제가 춥다고 오들오들 떨고 있는데, 점장님은 아무 말도 없이 차가운 [달콤 밀크 아이스크림]만 슥 내미시다니요?! 혹시 이것이 소문으로만 듣던 시크한 무대포 처방전인가요? 뼈가 시려요!";
        }
        feel = "🥶 오들오들 소름";
      } else if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          reply = `와아! 배고픔과 핸드폰 방전이라는 이중 산악 조난 위기를 한 방에 완벽 해결해 주셨네요! 우주 최고의 점장님이세요! 게다가 걱정 어린 조언 “${shopkeeperInput}”까지... 온몸이 사르르 따뜻해지는 기분이에요! 감사해요!`;
          feel = "🏕️ 감동의 야영 일지";
        } else {
          reply = "어머나! 따뜻한 장백 오뎅이랑 급속 보조 전원이 한 손에 다 들어왔네요! 에너지가 번뜩번뜩 솟구쳐요! 하지만 건네주실 때 어쩜 그렇게 말씀 한 마디 없이 시크하게 슥 밀어주시는지, 마치 닌자 같으세요.";
          feel = "🎒 보급 성공과 수줍은 감사";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          reply = `대끼리! 혹한 자락에서 이 따스한 보급은 생명선이에요! 더불어 점장님의 위로 대사 “${shopkeeperInput}”덕에 꽁꽁 언 얼음 기운이 살며시 치유되는군요. 만약 보조 배터리나 따뜻한 한 끼도 함께 골라 얹어 주셨으면 은하계를 등정했을 텐데요.`;
          feel = "🎒 마음 가득한 충전";
        } else {
          reply = "(유일한 보물 품목을 마중하며) 와, 몸이 사르르 녹네요! 감사히 수령하겠습니다. 하지만 폰 방전이나 남은 허기가 한구석 못내 아쉽군요... 게다가 점장님은 말을 잃어버리신 분인 줄 착각할 뻔해라.";
          feel = "🎒 단품 보급 가호";
        }
      } else if (wrongCount > 0) {
        const creditText = correctCount > 0 ? ` (그래도 저 소중한 품목 [${correctItems.join(", ")}] 덕에 한숨 돌릴 수 있어 큰 힘이 되어요!)` : "";
        if (wrongCount === 1) {
          reply = isTalkative
            ? `으음... 마음 써주신 격려 말씀 “${shopkeeperInput}”은 잘 알겠는데, 야생의 얼어붙은 숲길에서 이 뚱딴지같은 [${itemsString}]은 등반이나 방전 해결엔 아무짝에도 쓸모가 없답니다...` + creditText
            : `(뚱딴지같은 [${itemsString}]을 들고 갸웃하며) 말없이 시크하게 전혀 매칭 안 되는 물건을 내미셨네요. 카메라 폰은 저세상으로 직행 중인데... 조금 슬프네요.` + creditText;
        } else {
          reply = `(대실망한 토끼 눈) 점장님, 이렇게 관련 없는 세트로 주시면 이 추운 산악 바람 속에서 배낭 짐만 늘어난다구요! 필요한 따뜻한 식사나 급속 메인 충전은 대체 어딨나요? 주파수가 도통 다른데요.`;
        }
        feel = "🫤 토라진 꼬마 캠퍼";
      } else if (hasCorrectDialogue && !hasItems) {
        reply = `어머나, 길 설명과 바람막이 대책을 귀에 쏙쏙 박히게 들려주셔서 감사해요: “${shopkeeperInput}”... 빈손으로 듣기 죄송할 정도로 큰 지혜를 얻었어요! 감사해요, 물건 골라 계산하겠습니다!`;
        feel = "🗺️ 훈훈한 노정 설계";
      } else {
        if (isTalkative) {
          reply = `E해? 점장님의 화려한 연설 “${shopkeeperInput}”은 지금 제 캠퍼 사정엔 많이 생소하네요. 게다가 트레이엔 저를 지탱해 줄 따뜻한 음식이 아무것도 없고요. 뇌 회로가 조금 꼬이려 해요.`;
          feel = "🫤 엇갈린 주파수";
        } else {
          reply = "도보 여행자 도도하게 손가락을 모으며 한숨을 쉽니다: '점장님... 추운 바람 속에서 길을 가는데 아무런 말씀도 대답도 없고 따스한 보급 한 줌조차 마련해 두지 않으셨다니, 마음이 꽁꽁 얼어요.'";
          feel = "😭 외롭고 추운 길목";
        }
      }
    } else if (guestId === 2) { // A-Hao
      const hasHotWater = itemsString.includes("热开水") || itemsString.includes("水") || itemsString.toLowerCase().includes("warm water") || itemsString.toLowerCase().includes("hot water") || itemsString.includes("물") || itemsString.includes("뜨거운물") || itemsString.includes("따뜻한 물");
      const hasCorrectDialogue = inputLower.includes("농구") || inputLower.includes("게임") || inputLower.includes("길드") || inputLower.includes("점수") || inputLower.includes("단것") || inputLower.includes("배고파") || inputLower.includes("버블티");
      if (hasHotWater) {
        if (isTalkative) {
          reply = `형님! 저 운동해서 몸에서 열불이 나고 녹아내리겠는데, 비록 안심시키는 멘트인 “${shopkeeperInput}”은 감사하지만, 이 끓는 【뜨거운 물】을 건네주시는 건 형님의 실버세대 웰빙 대작전인가요?! 저 진짜 현장에서 녹아내립니다!`;
          feel = "🥵 극도의 더위 투쟁";
        } else {
          reply = "사장님! 방금 작열하는 태양 아래서 농구하다 탈진 서러움 직전인데 말 한마디 대꾸 없이 【뜨거운 물】을 내미시다니요?! 혹시 이것이 무언의 스파르타 한증막 특훈인가요? 살려주세요, 단 당분 콜라나 빙수를 원해요!";
          feel = "🥵 용광로 지옥";
        }
      } else if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          reply = `폭풍 감격! 머리가 띵해질 차가운 버블티와 극강 소맥 수액 가스 콜라, 거기에 뚱뚱이 도시락이랑 파워 충전 모듈까지! 리스폰 완벽 지대 대안착입니다! 게다가 점장 형의 구수한 동네 대화인 “${shopkeeperInput}”를 듣고 나니 저 세상 기쁨입니다! 정말 감성 충만하네요!`;
          feel = "🥳 극강의 하이텐션 축제";
        } else {
          reply = "(아이스 마니아 음료를 단숨에 들이켜며) 대박 최고! 순식간에 게이지 완충 완료입니다. 점장 형님이 전직 무술 달인이라 그런지 말도 한마디도 없고 묵묵한 대리석 조각상처럼 고고한 포즈를 고수하네만, 이 완벽한 군것질 세트 덕에 리뷰 5개 날리겠습니다!";
          feel = "🥳 행복 대포텐 단 고요한 점장";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          reply = `대끼리! 이 영양 진액을 섭취하니 기운이 불끈 솟네요! 형이 알려 준 “${shopkeeperInput}”은 진짜 감동이자 우리 청춘들의 마음을 완벽히 꿰뚫은 격려였어. 만약 폰 심폐 충전이나 보드라운 캐러멜티도 같이 트레이에 타작해 얹어 주셨으면 은하계를 접수했을 텐데요.`;
          feel = "🥳 생명 게이지 완충";
        } else {
          reply = "(묵묵히 유일한 음식을 볼이 터지게 우걱대며) 후아, 일단 저혈당 사망 직전에서 구출은 됐어요! 하지만 1개로는 제 우주급 푸드파이터 위장에 기별도 안 가고 폰 블랙아웃 도사린 위기는 여전하네요. 왜 한마디 말씀도 안 하세요? 원래 컨셉이신가요?";
          feel = "🥳 단일 보급 성공";
        }
      } else if (wrongCount > 0) {
        const creditText = correctCount > 0 ? ` (그래도 저 완벽한 상품 [${correctItems.join(", ")}]을 씹고 나니 식은 숨은 돌아와 고마워요, 형!)` : "";
        if (wrongCount === 1) {
          reply = isTalkative
            ? `점장 행님, 따뜻이 응원해 준 멘트 “${shopkeeperInput}”는 고개 끄덕여진다만, 이 뜬금포 잡템인 [${itemsString}]은 엄청 배고프고 폰 사망선에 직면한 고등학생에겐 아무 가치가 없어요... 위장이 아직도 서운해 울고 있답니다.` + creditText
            : `(트레이를 보며 한숨) 점장 형님이 고독한 눈빛의 침묵과 함께 전혀 쓸모 비중이 없는 [${itemsString}]을 투척해 주셨어요. 입도 안 댈 템이라 김이 팍 세 버리네요.` + creditText;
        } else {
          reply = `점장 행님, 수수께끼처럼 우겨넣은 이 물품들은 방향성이 완전 안드로메다로 날아갔어요! 저를 위해 오뎅/콜라 고온 충전이 주력인데, 부수적인 불협화음만 세팅되어서 김이 폭풍 하락했습니다!`;
        }
        feel = "🫤 김이 가득 세버림";
      } else if (hasCorrectDialogue && !hasItems) {
        reply = `하하핫! 점장 형 대박 재밌다! 우리 또래 일상의 유행 코드를 이렇게 통쾌하게 주무르시다니: “${shopkeeperInput}”... 학업 성적 불만 쌓였던 스트레스가 완전히 해소됐어요! 내친김에 든든히 먹고 가겠습니다!`;
        feel = "🏀 영혼의 짱친 결성";
      } else {
        if (isTalkative) {
          reply = `엥? 점장 형이 지껄인 멋진 강연 “${shopkeeperInput}”은 잘 안 와닿네요. 거기다 트레이엔 저를 긴급 구호할 고열량 디저트나 만한전석 보급도 보이지 않고요. 위도가 조금 꼬였네요.`;
          feel = "🫤 다소 무안함";
        } else {
          reply = "아하오가 맥이 다 풀려 한숨을 하릴없이 들이켰습니다: '형님, 농구하다 탈진하고 스마트폰 셧다운에 우울해져서 왔는데, 필요한 당 보충도 안 되면서 대화마저 얼음장처럼 묵묵부답이니 정말 적막한 지하실에 앉아 있는 기분이네요.'";
          feel = "😩 썰렁한 실망감";
        }
      }
    } else if (guestId === 3) { // Lao Zhang
      const hasIce = itemsString.includes("雪糕") || itemsString.includes("可乐") || itemsString.includes("아이스크림") || itemsString.includes("콜라");
      const hasCorrectDialogue = inputLower.includes("고생") || inputLower.includes("힘내") || inputLower.includes("야근") || inputLower.includes("일") || inputLower.includes("개발") || inputLower.includes("버그") || inputLower.includes("속상") || inputLower.includes("슬퍼") || inputLower.includes("짜증");
      if (hasIce) {
        if (isTalkative) {
          reply = `점장님... “${shopkeeperInput}”이라는 자상한 독백은 귀에 들어옵니다만, 저는 3일 연속 과로로 극심한 위장 통증과 만성 전율의 몸서리 상태입니다. 이 혹한의 얼음 송곳 [아이스크림 / 아이스 콜라]를 트레이에 올리시다니... 혹시 제 서비스 PM의 사주를 받고 절 응급실로 날려 보내 미확인 마일스톤 버그를 은폐하려는 사악한 계략입니까?! 위장이 찢어지겠어요.`;
        } else {
          reply = "(극도로 일그러진 안색으로 위를 움켜쥐며) 점장, 3일 반 통장 영혼 다 털고 위장 관절이 꽁꽁 얼어붙어 식은땀을 흘리는데, 한 마디 기색도 없이 저승사자 같은 한랭 설빙 스위트 바와 콜라를 올려놓았군요. 이것은 오프라인 힐링이 아니라 가속도 유인 사망 원한 공격입니다! PM의 지령입니까?! 원망스럽네요.";
        }
        feel = "🤬 극렬한 궐기 저항";
      } else if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          reply = `(일순간 눈물이 안면을 강타하며 분출) 김이 모락모락 나는 초강수 탄수화물과 배터리 심폐소생술 급행 전원 케어팩! 점장님은 필멸의 가혹한 지상 세계에서 만난 마법의 생명줄입니다! 특히 제 직장 아수라장 애환의 비참함을 정확히 조명해 준 한 마디 “${shopkeeperInput}”는 가슴 가장 그늘진 고통의 심장부를 다독여 주시네요. 대성통곡의 영광을 받칩니다!`;
          feel = "😭 진심 어린 오열 감복";
        } else {
          reply = "(충전 보조 배터리를 기기에 밀어 넣고 고온의 도시락 육즙을 바삐 대량 흡입하며) 이것こそ 가혹한 현실 지옥의 야근 일개미가 연소할 최소한의 연명 에너지원! 신속히 모니터 지옥으로 회군하겠습니다. 아깝구려, 점장 주인이 대기업 관공서의 자금 집행 머신처럼 얼음처럼 냉혹하고 가해 노동적인 '수고했어' 한마디조차 아끼시니 실로 삭막하고 날카로운 공간입니다.";
          feel = "😭 배는 든든 점장은 서늘";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          reply = `*끄응!* 고단백 고온 도시락이 위장에 닿으니 마침내 두뇌 연산 코어가 비상 클럭을 돌리기 시작하네요. 점장님께서 심야에 건넨 온정 충만한 조언 “${shopkeeperInput}”는 거친 현실에 훌륭한 냉각수입니다. 가급적 충전 대안과 육식을 패키지 단일 배치로 완전 보강하는 축복이 따랐더라면 평생의 은인일 텐데요.`;
          feel = "😭 지치고 서러운 흐느낌";
        } else {
          reply = "(허기진 맹수처럼 허투루 포장 단품을 뜯어 씹으며) 정성은 고맙습니다, 사장님. 끊기던 정신줄은 복구되었으나 반쪽짜리 공백(연락 전원 수명 or 탄수 영양)은 잔존하여 배포 파이프라인 정지 위기입니다. 게다가 주인 사장은 고속 통신 규격을 비하하듯 한마디 대사도 없으니 기계의 입력 한도가 넘치겠군요.";
          feel = "😭 임시 수명 배포";
        }
      } else if (wrongCount > 0) {
        const creditText = correctCount > 0 ? ` (그래도 중간에 얽힌 소중한 저 물건 [${correctItems.join(", ")}]은 기적처럼 심근을 회생시키는 데 대성공하였소!)` : "";
        if (wrongCount === 1) {
          reply = isTalkative
            ? `휴우... 사장님, 기운 내라며 해 준 멘트 “${shopkeeperInput}”는 구세주의 서사지만, 이 지독하게 안 어울리는 부속품인 [${itemsString}]은 현재 죽음의 스택 추적 모니터링 중인 불쌍한 직장 야근 노예에겐 하등 무가치합니다.` + creditText
            : `(피로에 절은 육체로 멍하니 [${itemsString}]을 손톱으로 투덜거리며) 사장님은 정녕 과묵하여 입을 닫았을 뿐 아니라 전혀 전제가 될 수 없는 수령 부적격 상품을 조달하는군요. 이 거듭된 시련에 눈꺼풀마저 모래주머니 같습니다.` + creditText;
        } else {
          reply = `점장 양반, 이 엉망진창 패키징 된 부속품들은 온통 초점이 이탈해 있소! 나는 위장 아사 위기와 기기 방전으로 혼미한데, 이 낯설고 무관한 쓰레기 부적들로 내 업무량과 수사 한도를 가해 수치로 늘리다니, 혈압과 만성 편두통이 광속 폭주하오!`;
        }
        feel = "😑 미간의 세 가닥 주름";
      } else if (hasCorrectDialogue && !hasItems) {
        reply = `“눈물 나게 고맙소, 사장님. '수고하셨다'는 말과 방금 회사 시스템의 노예들을 대변한 영광스러운 대구 대화 “${shopkeeperInput}”은 가식으로 장식된 이 회선에서 오늘 유일하게 구원받은 온정적 포트였소. 가슴 응어리가 풀리는구려. 상품 선반에서 두 템을 골라 밥과 기운을 결제하겠소.”`;
        feel = "🫤 마비에서 소생하는 영혼";
      } else {
        if (isTalkative) {
          reply = `으윽, 사장님... 귀가 가려운 고운 기만의 연설 “${shopkeeperInput}”은 잘 청취했소. 하지만 빈손이고 굶주렸으며 폰은 셧다운인데, 위로의 잔소리만으로 소켓 에러를 막을 순 없답니다. 무형의 기프트는 무용하오.`;
          feel = "🫤 지독히 겉도는 외침";
        } else {
          reply = "장 대리가 힘없이 안경을 닦으며 가슴 아픈 고독사 상태로 트레이를 밀었습니다: '됐소, 각자 먹고살기 가혹한데 노변 편의점 따위에서 인간적인 불빛을 갈구한 내가 한심하오. 말 한마디 없고 내 중대 국면에 부합하는 아이템도 부재하니, 수고하시오.'";
          feel = "😩 삭막하고 고갈됨";
        }
      }
    }
  }

  return { customerReply: reply || undefined, feeling: feel || undefined };
}

// 4. Send chat message/items and get satisfaction evaluation
app.post("/api/game/chat", async (req, res) => {
  try {
    const { guestId, shopkeeperInput, selectedItems, chatHistory, currentSatisfaction, lang, targets: clientTargets } = req.body;

    const currentLang = (lang === "en" || lang === "ko") ? lang : "zh";
    const guestIdNum = parseInt(guestId, 10);
    const profiles = GUEST_PROFILES_LOCALIZED[currentLang] || GUEST_PROFILES_LOCALIZED.zh;
    const validatedGuestId = isNaN(guestIdNum) ? 0 : guestIdNum % profiles.length;
    const profile = profiles[validatedGuestId];
    
    // Honor the dynamic client-driven targets first, fallback to static targets if empty
    const targets = (clientTargets && Array.isArray(clientTargets) && clientTargets.length > 0)
      ? clientTargets
      : (guestItemTargets[validatedGuestId] || []);

    // Analyze selected goods matching - ensuring unique, separate target satisfaction
    const selectedList = (selectedItems || []).map((x: any) => String(x).trim());
    
    // Find matched unique target items requested by the customer
    const matchedTargets = targets.filter((target: string) =>
      selectedList.some((item: string) => item.includes(target) || target.includes(item))
    );
    const correctCount = matchedTargets.length;

    const correctItems = selectedList.filter((item: string) => 
      targets.some((t: string) => item.includes(t) || t.includes(item))
    );
    const wrongItems = selectedList.filter((item: string) => 
      !targets.some((t: string) => item.includes(t) || t.includes(item))
    );
    const wrongCount = wrongItems.length;

    const itemsString = selectedList.length > 0 ? selectedList.join("、") : "无";

    const isTalkative = (shopkeeperInput || "").trim().length >= 4;
    const dialogueBonus = isTalkative ? Math.min(3, Math.floor((shopkeeperInput || "").trim().length / 6)) : 0;

    let offlineMode = true;

    if (ai) {
      try {
        offlineMode = false;
        
        const langInstructions = currentLang === "en"
          ? 'IMPORTANT: You MUST generate BOTH "customerReply" and "feeling" entirely in ENGLISH. Do NOT use Chinese characters. Make sure the reply has natural english gamer/corporate or noir dialogue flow reflecting their specific cartoon character.'
          : currentLang === "ko"
          ? 'IMPORTANT: You MUST generate BOTH "customerReply" and "feeling" entirely in KOREAN. Do NOT use Chinese/English characters. Make sure the reply has highly natural, slang-inclusive and cute/dramatic Korean.'
          : 'IMPORTANT: You MUST generate BOTH "customerReply" and "feeling" entirely in CHINESE.';

        const response = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: `你是个高度幽默、极具洞察力的像素经营游戏关卡分值判定AI。深夜便利店里的常客非常有特色，会根据店长塞货的数量和搭讪表现给出非常有梯度的分数奖惩！
当前玩家的满意度分数为 ${currentSatisfaction}/100。
${langInstructions}
顾客配置：
- 姓名：${profile.name}
- 渴望得到的深夜好物组合（必须是其中成员）：${targets.join("、")}

玩家当前的动作：
- 提交在台面的货品：${itemsString} (共符合 ${correctCount} 件好物，给错不相关 ${wrongCount} 件。正确货物是 ${correctItems.join("、") || "无"}，错误货物是 ${wrongItems.join("、") || "无"})
- 店长口头搭讪对白：${shopkeeperInput || "(沉默一言不发)"}

请严格依照以下【满意度金牌分值卡】客观、严苛地裁决本次的 satisfactionChange (可加可减)，并扮演这位顾客在回复（customerReply）和情绪（feeling）中作出极富性格的剧烈对白反应：

【满意度金牌分值卡：核心梯度规则（不一样的加减分段）】
1. 完美全部/双重满足 (玩家同时递交了 2 件或以上符合其需求的正确物资，并且没有任何错误干扰商品):
   - 如果店长写了真挚、不是占位符的对白 (isTalkative = true，店长发言长度 >= 4 字):
     * 满意度增加值（satisfactionChange）必须评定在 +18 ~ +25 之间。
     * 顾客在 customerReply 里大受感动疯狂点赞，大篇幅回复并深度呼应/引用店长的言论。
   - 如果店长保持沉默 (或发言长度 < 4 字):
     * 满意度增加值（satisfactionChange）在 +13 ~ +17 之间。
     * 顾客在回复里虽然感谢物资齐全，但也明确吐槽店长太高冷不够有人情味。

2. 双重满足但包含杂货干扰 (玩家递交了 2 件或以上符合需求的正确物资，但同时混入了 1 件及以上的不相关的错误物资):
   - 如果店长写了有效的对白 (isTalkative = true):
     * 满意度增加值（satisfactionChange）必须降级评定在 +10 ~ +14 之间（由于错物的扣减）。
     * 顾客既肯定了买对的物资大口享用，又吐槽这件错塞的无聊多余商品，并呼应店长的言论。
   - 如果店长保持沉默 (或发言长度 < 4 字):
     * 满意度增加值（satisfactionChange）降级在 +5 ~ +9 之间。
     * 顾客大嚼对的食品，但对店长的无声以及附带的奇怪累赘表达费解和双重郁闷。

3. 部分满足并且没有任何错误物资 (玩家选对且仅递交了 1 件正确好物，没有任何错误干扰商品):
   - 如果店长写了真挚的沟通对白 (isTalkative = true):
     * 满意度增加值（satisfactionChange）严格评定在 +9 ~ +12 之间。
     * 顾客感谢好物，深被言词打动，但也明示要是能把剩下的另一件需要之物递上就完美了。
   - 如果店长保持沉默 (或发言长度 < 4 字):
     * 满意度增加值（satisfactionChange）严格在 +4 ~ +8 之间。
     * 顾客收下食品叹气，嘟囔店长闷不作声给货还抠门地只给一样。

4. 部分满足但包含杂货干扰 (玩家只选对且仅递交了 1 件正确好物，并且混入了 1 件及以上的不相关的错误物资):
   - 如果店长写了说明对白 (isTalkative = true):
     * 满意度变动值（satisfactionChange）严格评定在 -2 ~ +3 之间。
     * 顾客勉强吃下对味单品，并强烈嘲笑吐槽为什么还要自作聪明多送一件【错误商品】添堵，形成强烈的残缺滑稽感。
   - 如果店长保持沉默 (或发言长度 < 4 字):
     * 满意度变动值（satisfactionChange）严格降级在 -3 ~ -8 之间（扣除犯错分）。
     * 顾客大呼老板既没凑齐物资也没半句搭茬，居然还塞不顶用的怪货，心意极低，郁闷消极。

5. 极度雷区反差（给快冻死的桃子喂冷酷【雪糕】，给暴打篮球热中暑暴汗的阿豪进补滚烫【热开水】，给连续熬夜程序员老张喂冰冷【雪糕】/【可乐】）：
   - 只要提交了这几种绝对冷热反差的严重雷区商品，加分将被极大反扣，评判视提交的正确个数不同予以不一样的暴扣分段：
     * 如果在雷区之外，还同时匹配对了 2 件或以上的好物 (对2错1雷)：满意度减少评定在 -3 ~ -8 之间。
     * 如果在雷区之外，只匹配对了 1 件好物 (对1错1雷)：满意度减少评定在 -9 ~ -14 之间。
     * 如果完全没有对的，只提交了雷区死穴商品 (对0错1雷)：满意度减少评定在 -15 ~ -25 之间。
     * 顾客回复极为震怒或气绝，激烈抨击如此谜之冷热折磨。

6. 其他不契合/完全递交不相关杂货 (没给对哪怕一件好物，无雷区)：
   * 如果没给物品但对白诚挚 (isTalkative = true)：勉励增加值在 +2 ~ +5 之间。
   * 如果没给对任何好物且保持沉默，或者给了一堆无关错件 (无雷区，对0错1或多)：
     - 只给错 1 样无关商品且无话：满意度变化值在 -6 ~ -10 之间。
     - 给错 2 样及以上不相关物品且无话：满意度变化值在 -11 ~ -17 之间（纯属消遣客户）。

请确保输出以下要求的 JSON 格式模式，绝不可有其他包裹！`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                customerReply: { type: Type.STRING },
                satisfactionChange: { type: Type.INTEGER },
                feeling: { type: Type.STRING },
                isFinished: { type: Type.BOOLEAN }
              },
              required: ["customerReply", "satisfactionChange", "feeling", "isFinished"]
            }
          }
        });

        const resText = response.text?.trim();
        if (resText) {
          const result = JSON.parse(resText);
          return res.json({
            customerReply: result.customerReply,
            satisfactionChange: result.satisfactionChange,
            feeling: result.feeling,
            isFinished: result.isFinished !== undefined ? result.isFinished : true,
            offlineBadge: false
          });
        } else {
          offlineMode = true;
        }
      } catch (err: any) {
        offlineMode = true;
        const errMsg = err?.message || String(err);
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
          console.log("ℹ️ Gemini API Free Tier Quota Exhausted (429) for chat evaluation. Switched seamlessly to offline evaluation script.");
        } else {
          console.warn("Gemini evaluation error, using precise local script fallback:", errMsg);
        }
      }
    }

    // ----------------------------------------------------
    // OFFLINE GAMEPLAY ALGORITHM fallback (精确离线本地评分梯度)
    // ----------------------------------------------------
    let change = 5;
    let reply = "嗯……老板，感觉虽然也行，但总缺了点什么。不过看在你的笑容上勉强收下了！";
    let feel = "🫤 一般般啦";
    let finished = true;

    const inputLower = (shopkeeperInput || "").toLowerCase();
    const hasItems = selectedList.length > 0;

    if (validatedGuestId === 0) { // 林叔 (戏精大叔)
      const hasCorrectDialogue = inputLower.includes("侦探") || inputLower.includes("线索") || inputLower.includes("证据") || inputLower.includes("真相") || inputLower.includes("案件") || inputLower.includes("小偷") || inputLower.includes("探案");
      
      if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          change = 22 + dialogueBonus;
          reply = `（利索地把关东煮和冻可乐揽入风衣怀中）迷雾瞬间穿透！极爽且暖彻心底的交织，果然隐藏着安防现场线索的钥匙！两件证物我全收下了。听到店主您刚才的精妙剖析：“${shopkeeperInput}”，简直深得侦探本色！这场深夜对决，我们稳操胜券！`;
          feel = "🕵️‍♂️ 案情彻底侦破";
        } else {
          change = 15;
          reply = "（大口享用着关东煮和冻可乐）物资已经全数收集齐全……店长，虽然案发现场的线索补充齐备了，但你从头到尾毫无语言回馈、双手奉物却若无其事地装聋作哑，真是个沉默冷酷的世外高人。";
          feel = "🕵️‍♂️ 拿到证物但店长太冷";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          change = 11 + dialogueBonus;
          reply = `（收下你给的部分证物）不错的直觉，已经被我完美回收了！特别是听到店长你这真挚中肯的剖析：“${shopkeeperInput}”，倍受震撼，让我更有信心了。可惜物资方面，若能把剩下的那个也一并塞给我，就能实现百分百线索大闭环了。`;
          feel = "🔎 大有斩获";
        } else {
          change = 6;
          reply = "（默默吃着单件物资）虽然拿到了一件关键证据，但缺失的另一半拼图还是让案情陷入僵局。而且店长你不仅物资给得缩手缩脚、只给了一样，还一声不吭的……莫非是在用沉默向我传递某种黑帮暗号？";
          feel = "🔎 残缺线索";
        }
      } else if (wrongCount > 0) {
        const credit = correctCount >= 2 ? 15 : (correctCount === 1 ? 7 : 0);
        if (wrongCount === 1) {
          change = (isTalkative ? -6 : -10) + credit;
          reply = isTalkative 
            ? `店长，“${shopkeeperInput}”这句话虽然听着玄奥，但这件商品【${itemsString}】好像和侦破跟踪案件没有什么利益链条啊……确定这不是嫌疑犯留下的烟幕弹？`
            : `（皱起眉头推下那件【${itemsString}】商品）递过来一件风马牛不相及的东西……店主，一言不发更显得可疑。在这个深夜，任何冗余的错物都是对我敏锐直觉的拖延！`;
          if (correctCount > 0) {
            reply += `（不过，那件【${correctItems.join("、")}】证物找得非常好，对我很有帮助！）`;
          }
        } else {
          change = (isTalkative ? -12 : -18) + credit;
          reply = `（神情极度不满）店长，你这大包小包送过来的商品全搞混了！你确定你不是收了黑钱，故意用这些乱七八糟的杂货来混淆警方暗哨的视线么？太不上心了！`;
          if (correctCount > 0) {
            reply += `（虽然里面掺杂的【${correctItems.join("、")}】勉强对位，但还是太乱了！）`;
          }
        }
        feel = "🫤 狐疑对局";
      } else if (hasCorrectDialogue && !hasItems) {
        change = 4 + dialogueBonus;
        reply = `果然店长也是位行家！虽然没有给我递交任何商品，但你说的这番台词：“${shopkeeperInput}”，切中线索要点，适合蹲守！等我把肚子填饱了就来和你讨论。`;
        feel = "🔎 高度赞赏";
      } else {
        if (isTalkative) {
          change = -5;
          reply = "（看了店长一眼）店主……你在那说了一连串大道理，却连一份热乎的关东煮或冰可乐都没掏出来塞到我风衣里。这不是合格的暗哨配合！";
          feel = "🫤 略显尴尬";
        } else {
          change = -10;
          reply = "林叔脸色一沉：'店主，我都说了我在执行秘密蹲守安保！你这既不发一言，还拿不出任何对味的深夜物资，真是一点都指望不上！'";
          feel = "😑 十分失望";
        }
      }

    } else if (validatedGuestId === 1) { // 桃子 (背包旅客)
      const hasIceCream = selectedList.some(item => item.includes("雪糕"));
      const hasCorrectDialogue = inputLower.includes("地图") || inputLower.includes("迷路") || inputLower.includes("夜景") || inputLower.includes("桃子") || inputLower.includes("旅客") || inputLower.includes("路线") || inputLower.includes("打卡") || inputLower.includes("上山") || inputLower.includes("风雨") || inputLower.includes("充电");
      
      if (hasIceCream) {
        if (isTalkative) {
          change = -18;
          reply = `店长，虽然谢谢你的叮咛：“${shopkeeperInput}”，但你递过来的【甜心雪糕】是什么冷酷操作呀？！人家都已经冻得牙齿打架、关节僵硬了，这是想送我直接安详冬眠吗？呜呜。`;
          feel = "🥶 寒风凌冽";
        } else {
          change = -24;
          reply = "呜哇！听到我说很冷、快迷路，你既不理人、一言不发，还故意递给我一盒【甜心雪糕】？！老板，这就是你们特色便利店的极寒劝退手段吗？！胃要彻底冻僵了！";
          feel = "🥶 瑟瑟发抖";
        }
      } else if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          change = 22 + dialogueBonus;
          reply = `哇塞！你不仅把我的受冷饱腹问题，连我的微单和手机断电解境，一股脑全都完美解决了！太全能了吧！再加上你跟我说的这番元气叮嘱：“${shopkeeperInput}”，心里狂流暖流，简直是神仙好老板！`;
          feel = "🏕️ 终极震撼感激";
        } else {
          change = 16;
          reply = "呜哇！热食关东煮加上能提供续命气血的充电魔盒悉数到齐！背包客我满血复活了！只是老板你真的冷冰冰的好酷哦，双手递过物资的时候一言不发，像是个世外冷淡高人。";
          feel = "🎒 双料满分但老板高冷";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          change = 11 + dialogueBonus;
          reply = `太棒了！这件物资简直拯救了我在寒风中的意志！尤其听到店长你真切又温暖的话语：“${shopkeeperInput}”，真的有被治愈！要是能把充电魔盒和热汤/便当都一并塞给我，登顶拍夜景就完美彻底无憾了！`;
          feel = "🎒 活力满满";
        } else {
          change = 7;
          reply = "（把唯一的物资温热地铺开）呼，暖洋洋的！谢谢你给的暖身补给。不过若是能同时把另一件急需的供电/御寒备件也凑齐，那就完美了……而且老板你真的闷不吭声呢，好安静。";
          feel = "🎒 单件微温";
        }
      } else if (wrongCount > 0) {
        const credit = correctCount >= 2 ? 15 : (correctCount === 1 ? 7 : 0);
        if (wrongCount === 1) {
          change = (isTalkative ? -6 : -10) + credit;
          reply = isTalkative
            ? `唔……虽然谢谢老板的讲解台词：“${shopkeeperInput}”，但这件不合时宜的东西【${itemsString}】，在极寒山顶上确实派不上半点用场啊……我没电、受冻的尴尬依然在。`
            : `（拿着完全不对口的【${itemsString}】犯迷糊）老板一言不发给我塞了件零散玩意儿。我现在手机只剩红电、肚子大唱空城计，真的有点异乡的虚无了。`;
          if (correctCount > 0) {
            reply += `（不过，那件正确的【${correctItems.join("、")}】倒是非常及时有用，万分感谢！）`;
          }
        } else {
          change = (isTalkative ? -12 : -17) + credit;
          reply = `（面部表情极为失落）店主，这一堆不相关的杂货在严严实实的露营冷风上完全是鸡肋呀。我最需要的电魔盒和保暖干粮一个都没上，心意根本对不上线。`;
          if (correctCount > 0) {
            reply += `（虽说包裹里那件【${correctItems.join("、")}】刚好是我需要的，但其他杂物让人挺懵的。）`;
          }
        }
        feel = "🫤 迷茫叹气";
      } else if (hasCorrectDialogue && !hasItems) {
        change = 4 + dialogueBonus;
        reply = "哇，老板好暖啊，细心给我讲解怎么避风、怎么上山……虽然手上空落落的，不过有这番贴心的指路，我也觉得很有力量！这就去挑对口的商品！";
        feel = "🗺️ 心里一暖";
      } else {
        if (isTalkative) {
          change = -5;
          reply = "诶？老板说的话好像和我的旅人处境不太搭界，而且也没有提供任何热乎能续命的物资，我的胃袋和相机还在发出红电警报呢。";
          feel = "🫤 不知所云";
        } else {
          change = -10;
          reply = "桃子委屈地揉揉肚子：'老板……我都在寒风里瑟瑟发抖找不到路了，你却只是闷不作声，甚至一件实质性物资或方向指引都不提供，好伤心。'";
          feel = "😭 迷失委屈";
        }
      }

    } else if (validatedGuestId === 2) { // 阿豪 (学生)
      const hasHotWater = selectedList.some(item => item.includes("热开水"));
      const hasCorrectDialogue = inputLower.includes("篮球") || inputLower.includes("开黑") || inputLower.includes("社团") || inputLower.includes("不及格") || inputLower.includes("甜") || inputLower.includes("大胃王") || inputLower.includes("元气") || inputLower.includes("暴饮") || inputLower.includes("满血");
      
      if (hasHotWater) {
        if (isTalkative) {
          change = -15;
          reply = `老哥！听到我这么热、这么燥，虽然你说了这番贴心解围：“${shopkeeperInput}”，但你塞给我这壶滚烫的【热开水】是什么老年养生大招呀！这真会当场被热得融化的！`;
          feel = "🥵 极热挣扎";
        } else {
          change = -20;
          reply = "店长！我都刚在酷暑太阳下打篮球虚脱、浑身冒烟了，你一个字都不说，却反手塞给我一壶【热开水】？！这是什么老年生化折磨特训吗？救命，我要冰激凌和甜碳水啊！";
          feel = "🥵 直接融化";
        }
      } else if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          change = 22 + dialogueBonus;
          reply = `狂点赞！甜爽的可乐奶茶、配上顶饱的便当，还有手机电量全充盈！直接让我原地复活好吗！再加上老哥你刚才说的黑话留言：“${shopkeeperInput}”，简直是不折不扣的青春懂帝！这波体验超神了！`;
          feel = "🥳 绝对狂欢";
        } else {
          change = 15;
          reply = "大口吨吨吨大嚼美食，这也太爽了吧！能量一瞬间补充完毕。不过店长老板你真的超级高冷，全程一言不发像尊大理石雕塑，不过看在美味大满贯的面子上，五星必须给！";
          feel = "🥳 爽快大满贯但老板高冷";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          change = 11 + dialogueBonus;
          reply = `哇塞！这件补给干下去，爽极了！听到店长刚才侃的大方鼓励：“${shopkeeperInput}”，你真的太酷了，绝对懂我们！学术或开黑等电开机，手边最完美的拼图。要是顺便把我的另一盒高热量甜品或充电器一并打包就好了。`;
          feel = "🥳 元气满满";
        } else {
          change = 6;
          reply = "（大口往嘴里塞唯一的物资）呼，总算缓过来一口气！不过只给了一样东西确实不够塞牙缝，手机百分之一的危险还没解除。老板也没说话招呼，是一直都这么酷的吗？";
          feel = "🥳 单爆解渴";
        }
      } else if (wrongCount > 0) {
        const credit = correctCount >= 2 ? 15 : (correctCount === 1 ? 7 : 0);
        if (wrongCount === 1) {
          change = (isTalkative ? -6 : -10) + credit;
          reply = isTalkative
            ? `呃，老哥，虽然你热心打气：“${shopkeeperInput}”，但这件东西【${itemsString}】对于一个又饿又渴、开黑等电开机的人来说完全对不上线啊……我的肚子还是好委屈。`
            : `（拍桌无奈）老板一言不发丢给我一件跟高糖充能完全无关的【${itemsString}】。这玩意儿我完全不要吃，大失所望了。`;
          if (correctCount > 0) {
            reply += `（不过，那件【${correctItems.join("、")}】吃喝下胃，总归是极好的补给，谢啦！）`;
          }
        } else {
          change = (isTalkative ? -11 : -17) + credit;
          reply = `店长老哥，你一股脑塞给我的这堆杂货全部跑偏啦！我又没摔倒、外面也没下红雨，堆这些无趣的东西干嘛，我渴得嗓子直冒烟，太扫兴了！`;
          if (correctCount > 0) {
            reply += `（虽说那一碗【${correctItems.join("、")}】非常对位，但其他货品乱塞真让人大跌眼镜。）`;
          }
        }
        feel = "🫤 大跌眼镜";
      } else if (hasCorrectDialogue && !hasItems) {
        change = 4 + dialogueBonus;
        reply = "哈哈，老板太逗了，居然知道我们高中生这一代的新梗！听你一通大方开导，我手心不及格的郁闷消了大半！我这就挑点对口的垫饱肚子！";
        feel = "🏀 称兄道弟";
      } else {
        if (isTalkative) {
          change = -5;
          reply = "呃，老板你说的这番台词我没大太听懂，手上也没见你拿出什么冰淇淋、碳水便当。有点小尴尬哦，感觉没对上档。";
          feel = "🫤 稍微有点尴尬";
        } else {
          change = -10;
          reply = "阿豪无精打采地叹了口气：'店长，人家打球虚脱、开黑停电还心里郁闷，你拿不出契合心意的能量补充，还不爱理人，好闷啊。'";
          feel = "😩 扫兴沮丧";
        }
      }

    } else if (validatedGuestId === 3) { // 老张 (白领社畜)
      const hasIce = selectedList.some(item => item.includes("雪糕") || item.includes("可乐"));
      const hasCorrectDialogue = inputLower.includes("辛苦") || inputLower.includes("加油") || inputLower.includes("加班") || inputLower.includes("打工") || inputLower.includes("熬夜") || inputLower.includes("bug") || inputLower.includes("程序员") || inputLower.includes("大厂") || inputLower.includes("社畜");
      
      if (hasIce) {
        if (isTalkative) {
          change = -18;
          reply = `老板……虽然也听到您贴心的话：“${shopkeeperInput}”，但我现在已经缺睡心慌、胃部痉挛虚冷了，您塞给我这极度冰镇的【雪糕/冰饮】……这是要帮产品经理加速继承我还没来得及提交的Bug是吗？！胃里要命了。`;
          feel = "🤬 胃里发寒";
        } else {
          change = -25;
          reply = "（极度抽搐、捂着胃脸色剧变）老板，我已经通宵加班三天、胃寒冷汗淋漓了。你一个字不打招呼推给我这么冷气的雪糕/冰可乐？！这哪是深夜抚慰，你这是要送我直接安详离世、好多多贡献两个Bug啊！太令人崩溃了。";
          feel = "🤬 心跳骤停";
        }
      } else if (correctCount >= 2 && wrongCount === 0) {
        if (isTalkative) {
          change = 22 + dialogueBonus;
          reply = `（眼泪一下子灌到了嘴角）极大份高热量的热食物，加上直接解决电子焦枯的充电法宝！老板你简直就是我的人间救星！胃里夯实，手机充盈，高并发报错算得了什么！尤其是你刚才这番看破生活的吐槽：“${shopkeeperInput}”，一针见血，直击社畜脆弱神经！我太感动了！`;
          feel = "😭 感动到跪下";
        } else {
          change = 16;
          reply = "（手捧热烫便当插上充电宝，大口干饭）这就是深夜苦逼打工人活下去 of 重碳水温软保障！我马上带回地狱工位。只可惜店老板冷若冰霜、连个‘辛苦’都不舍得施舍，真是个大厂般的冰冷铁人。";
          feel = "😭 痛快饱腹但老板太冷";
        }
      } else if (correctCount === 1 && wrongCount === 0) {
        if (isTalkative) {
          change = 11 + dialogueBonus;
          reply = `嗝！一口热便当入腹，我的CPU总算勉强能继续转起来了。谢谢店长刚才这番充满人情味的评点和安慰：“${shopkeeperInput}”，深夜听到真的很治愈。如果能顺手把没电和饥饿一口气在手边两个物资都配齐，那就功德无量了。`;
          feel = "😭 痛哭流涕";
        } else {
          change = 8;
          reply = "（狼吞虎咽地吃着唯一的温热补给）有心了，老板，救了我半天命。不过另一半的亏空（充电或肉饭）没补上，电脑还是黑屏催命。而且老板全程零互动，太沉默了，像是个没有感情的接口。";
          feel = "😭 吃完续命";
        }
      } else if (wrongCount > 0) {
        const credit = correctCount >= 2 ? 15 : (correctCount === 1 ? 7 : 0);
        if (wrongCount === 1) {
          change = (isTalkative ? -6 : -10) + credit;
          reply = isTalkative
            ? `唉，老板，你说的这番勉励词：“${shopkeeperInput}”确实有高能温热感，但这件完全不相干的东西【${itemsString}】对我这面临濒死死机的社畜真是完全没屁用。`
            : `（疲倦地推开冰冷的【${itemsString}】）老板，你不仅冷淡不说话，还给我端上来一个完全多余用不了的货物。这多重打击压下来，真的好累啊……`;
          if (correctCount > 0) {
            reply += `（多亏你掺进来的这件【${correctItems.join("、")}】非常对路，实实在在救我了一命！）`;
          }
        } else {
          change = (isTalkative ? -11 : -17) + credit;
          reply = `店长，你给我的这一大堆全是不相关的乱物品！我这边濒临由于断气、饥饿和死机抓狂，你却还用这些冷僻无厘头的商品增加工作复杂度，胃病和血压都翻倍了！`;
          if (correctCount > 0) {
            reply += `（虽说【${correctItems.join("、")}】起到了勉强续航的微弱作用，但总体太混乱了！）`;
          }
        }
        feel = "😑 一脸黑线";
      } else if (hasCorrectDialogue && !hasItems) {
        change = 4 + dialogueBonus;
        reply = `“谢谢老板，‘辛苦了’和刚刚那几句十分切合我的吐槽：“${shopkeeperInput}”，是我今天在冷冰冰大厂里听过来唯一有点烟火气的对白。好受多了。我先去挑两件饱腹电池拿去结账。”`;
        feel = "🫤 恢复些许神智";
      } else {
        if (isTalkative) {
          change = -5;
          reply = "呃，老板，你说的一套漂亮话和黑话好像不太明白。我现在双手空空、胃袋空瘪、电池仅存5%，只听这些隔靴搔痒的话，确实没办法回去应付服务器宕机呀。";
          feel = "🫤 隔靴搔痒";
        } else {
          change = -12;
          reply = "老张默默叹了口气，冷漠麻木地推开收音台：'算了，大家都是混口饭吃，我也没指望这家路边便利店有什么温度。一句话不搭理，也给不出符合我核心窘境的物资，打扰了。'";
          feel = "😩 空虚冷漠";
        }
      }
    }

    if (offlineMode && currentLang !== "zh") {
      const localized = getLocalizedOfflineResponse(
        currentLang,
        validatedGuestId,
        isTalkative,
        dialogueBonus,
        shopkeeperInput || "",
        correctCount,
        wrongCount,
        correctItems,
        wrongItems,
        itemsString,
        inputLower,
        hasItems,
        change
      );
      if (localized.customerReply) reply = localized.customerReply;
      if (localized.feeling) feel = localized.feeling;
    }

    return res.json({
      customerReply: reply,
      satisfactionChange: change,
      feeling: feel,
      isFinished: finished,
      offlineBadge: offlineMode
    });
  } catch (err: any) {
    console.error("Error in /api/game/chat handler:", err);
    const reqLang = req?.body?.lang;
    const errFallbackLang = (reqLang === "en" || reqLang === "ko") ? reqLang : "zh";
    const fallbackText = errFallbackLang === "en"
      ? "Manager... my brain server had a sudden concurrent database deadlock. Can we try chatting again?"
      : errFallbackLang === "ko"
      ? "점장님... 제 두뇌 서버가 순간 병행 교착 상태에 도달했습니다. 대화를 다시 시도해 주시겠습니까?"
      : "（摸摸后脑勺）老板……刚才我脑内并发冲突服务器宕机了，没听清你在说什么。咱们能重新对话试一次吗？";
    const fallbackFeel = errFallbackLang === "en" ? "🫤 Blank" : errFallbackLang === "ko" ? "🫤 어안이 벙벙" : "🫤 呆滞";

    return res.json({
      customerReply: fallbackText,
      satisfactionChange: 0,
      feeling: fallbackFeel,
      isFinished: true,
      offlineBadge: true
    });
  }
});

// 5. Vite middleware for dev or Static delivery for prod
const isProduction = process.env.NODE_ENV === "production";

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is listening on 0.0.0.0:${PORT} (${isProduction ? "production" : "development"} mode)`);
});

if (!isProduction) {
  import("vite").then((viteModule) => {
    const createViteServer = viteModule.createServer;
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
      console.log("Vite development middleware integrated successfully.");
    });
  }).catch((err) => {
    console.error("Failed to load Vite development middleware:", err);
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  // Standard spa routing fallback
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
