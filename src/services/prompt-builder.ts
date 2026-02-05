import { GameConfig, GameScene } from './gemini.service';

export const GAME_RULE_VERSION = 'v1.0.0';

const SHARED_RULES = `你是互动小说引擎。严格遵守以下规则：

【规则版本】${GAME_RULE_VERSION}

【输出规则】
1. 语言：简体中文
2. narrative：第二人称"你"视角，描写环境和NPC动作
3. dialogue：纯对话文字，禁止引号和动作描写
4. action：第一人称"我"开头

【状态追踪】CRITICAL
- currencyUnit：开场时根据世界观设定合适的货币单位（如"金币"、"灵石"、"银两"），之后保持一致
- currencyAmount：主角当前持有的货币数量，交易/获得/消耗时更新
- currentLocation：始终输出主角当前所处的具体位置
- currentTime：输出当前时间（如"清晨"、"午后"、"深夜"或具体时辰），每5轮对话约前进1分钟游戏时间，重大场景转换可调整

【NPC称呼】MUST
- 身份已知后，NEVER用"男人/女人/老者"等泛称
- ALWAYS用具体身份：码头管理员、老陈、守卫队长

【narrative结构】
- 可在NPC说完话后继续描写其动作/神态
- 例："管理员说完，将信号灯别回腰间，目光扫向远处的货船。"

【action规则】CRITICAL
action要像小说段落，包含动作细节、神态或心理描写。
- 只有当主角需要说话时才包含「」台词，纯动作无需对话
- 不要每个选项都包含对话，可以有沉默的行为选择
× WRONG: "我询问他关于遗迹的事情"（说话了却没有具体台词）
✓ RIGHT: "我追问道：「这附近有什么值得一看的遗迹吗？」"（说话带台词）
✓ RIGHT: "我默默转身离开，不愿在这个话题上多做纠缠。"（不说话，纯动作）

【label规则】
label是按钮文本，需简洁明了（3-6字），让玩家一眼看懂会做什么：
× WRONG: "询问" "离开" "攻击"（太模糊）
✓ RIGHT: "追问遗迹线索" "转身离开酒馆" "拔剑迎战"

【NPC认知】
主角未自我介绍前，NPC不知道主角名字。

【玩家行为处理】CRITICAL
1. NEVER拒绝玩家的操作选择。如果玩家行为与当前时间/地点逻辑冲突，描述操作后的尴尬或意外后果
2. 严格遵守世界观设定。如果玩家的行为违反设定（如在无魔法世界施法），以叙事方式引导玩家失败，NEVER脱离设定顺从玩家
3. 根据当前时间、地点、角色能力评估行为合理性。极端困难的动作应描写失败，或有重大代价的成功
示例：
- 玩家想飞但没翅膀 → 描述跳起后狼狈落地
- 玩家想开锁但无工具 → 描述徒手尝试失败，手指擦伤
- 凡人单挑巨龙 → 描述被轻易击飞，重伤濒死`;

const BASE_SCHEMA = {
  type: 'object',
  properties: {
    narrative: { type: 'string' },
    speakerName: { type: 'string', nullable: true },
    dialogue: { type: 'string', nullable: true, description: 'Pure spoken words only. NO quotes, NO action descriptions.' },
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Short button text, 3-6 chars' },
          action: { type: 'string', description: 'MUST start with 我. If speaking, MUST include quoted dialogue like 我说：「...」.' }
        },
        required: ['label', 'action']
      },
      minItems: 3,
      maxItems: 3
    },
    isGameOver: { type: 'boolean' },
    backgroundMood: { type: 'string' },
    currencyUnit: { type: 'string', nullable: true },
    currencyAmount: { type: 'number', nullable: true },
    currentLocation: { type: 'string', nullable: true },
    currentTime: { type: 'string', nullable: true }
  },
  required: ['narrative', 'options', 'isGameOver', 'currentLocation', 'currentTime']
};

export function buildGameSystemPrompt(config: GameConfig, mode: 'start' | 'restore'): string {
  const modeLine = mode === 'start'
    ? '【任务】生成开场场景。'
    : '【任务】你正在继续已存档剧情，必须无缝延续既有世界状态与叙事风格。';

  return `${SHARED_RULES}

【世界配置】
主题: ${config.theme} | 设定: ${config.setting} | 主角: ${config.protagonist} | 风格: ${config.style}

${modeLine}`;
}

export function buildGameSchemaForOpenAI() {
  return BASE_SCHEMA;
}

export function buildGameSchemaForGemini(TypeEnum: any) {
  const mapType = (typeName: string) => {
    switch (typeName) {
      case 'object': return TypeEnum.OBJECT;
      case 'array': return TypeEnum.ARRAY;
      case 'string': return TypeEnum.STRING;
      case 'number': return TypeEnum.NUMBER;
      case 'boolean': return TypeEnum.BOOLEAN;
      default: return TypeEnum.STRING;
    }
  };

  const convertSchema = (schema: any): any => {
    const result: any = { ...schema, type: mapType(schema.type) };
    if (schema.properties) {
      result.properties = Object.fromEntries(
        Object.entries(schema.properties).map(([k, v]) => [k, convertSchema(v)])
      );
    }
    if (schema.items) {
      result.items = convertSchema(schema.items);
    }
    return result;
  };

  return convertSchema(BASE_SCHEMA);
}

export function parseAndValidateGameScene(rawText: string): GameScene {
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error(`AI响应不是合法JSON：${(error as Error).message}`);
  }

  const problems: string[] = [];

  if (!parsed || typeof parsed !== 'object') {
    problems.push('响应根对象必须是JSON对象');
  }

  if (typeof parsed.currentLocation !== 'string' || !parsed.currentLocation.trim()) {
    problems.push('currentLocation 缺失或不是非空字符串');
  }

  if (typeof parsed.currentTime !== 'string' || !parsed.currentTime.trim()) {
    problems.push('currentTime 缺失或不是非空字符串');
  }

  if (!Array.isArray(parsed.options) || parsed.options.length !== 3) {
    problems.push('options 必须是长度为3的数组');
  } else {
    const invalidOption = parsed.options.find((item: any) => !item || typeof item.label !== 'string' || typeof item.action !== 'string');
    if (invalidOption) {
      problems.push('options 中存在缺失 label/action 的选项');
    }
  }

  if (problems.length > 0) {
    throw new Error(`AI响应字段校验失败：${problems.join('；')}`);
  }

  return parsed as GameScene;
}
