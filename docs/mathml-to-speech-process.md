# MathML 到语音字符串的转换过程

## 1. 概述

Speech Rule Engine (SRE) 将 MathML 转换为语音字符串的过程是一个复杂的多阶段过程。本文档详细记录了整个转换流程的每个步骤。

## 2. 核心组件

### 2.1 语义树 (SemanticTree)
```typescript
// ts/semantic_tree/semantic_tree.ts
export class SemanticTree {
  // MathML 解析器
  public parser: SemanticParser<Element> = new SemanticMathml();
  
  // 树的根节点
  public root: SemanticNode;
  
  // 语义收集器
  public collator: SemanticMeaningCollator;

  // 生成空语义树
  public static empty(): SemanticTree {
    const empty = DomUtil.parseInput('<math/>');
    const stree = new SemanticTree(empty);
    stree.mathml = empty;
    return stree;
  }

  // 从节点生成语义树
  public static fromNode(
    semantic: SemanticNode,
    opt_mathml?: Element
  ): SemanticTree {
    const stree = SemanticTree.empty();
    stree.root = semantic;
    if (opt_mathml) {
      stree.mathml = opt_mathml;
    }
    return stree;
  }
}
```

### 2.2 语义节点 (SemanticNode)
```typescript
// ts/semantic_tree/semantic_node.ts
export class SemanticNode {
  // 生成 XML
  public xml(xml: Document, brief?: boolean): Element {
    const node = xml.createElementNS('', this.type);
    if (!brief) {
      this.xmlAttributes(node);
    }
    node.textContent = this.textContent;
    if (this.contentNodes.length > 0) {
      node.appendChild(xmlNodeList('content', this.contentNodes));
    }
    if (this.childNodes.length > 0) {
      node.appendChild(xmlNodeList('children', this.childNodes));
    }
    return node;
  }
}
```

### 2.3 语义处理器 (SemanticProcessor)
```typescript
// ts/semantic_tree/semantic_processor.ts
export class SemanticProcessor {
  // 节点工厂
  private factory_: SemanticNodeFactory;

  // 获取单例实例
  public static getInstance(): SemanticProcessor {
    SemanticProcessor.instance =
      SemanticProcessor.instance || new SemanticProcessor();
    return SemanticProcessor.instance;
  }

  // 查找语义属性
  public static findSemantics(
    node: Element,
    attr: string,
    opt_value?: string
  ): boolean {
    const value = opt_value == null ? null : opt_value;
    const semantics = SemanticProcessor.getSemantics(node);
    if (!semantics) {
      return false;
    }
    if (!semantics[attr]) {
      return false;
    }
    return value == null ? true : semantics[attr] === value;
  }

  // 处理标识符节点
  public identifierNode(
    leaf: SemanticNode,
    font: SemanticFont,
    unit: string
  ): SemanticNode {
    if (unit === 'MathML-Unit') {
      leaf.type = SemanticType.IDENTIFIER;
      leaf.role = SemanticRole.UNIT;
    } else if (
      !font &&
      leaf.textContent.length === 1 &&
      (leaf.role === SemanticRole.INTEGER ||
        leaf.role === SemanticRole.LATINLETTER ||
        leaf.role === SemanticRole.GREEKLETTER) &&
      leaf.font === SemanticFont.NORMAL
    ) {
      leaf.font = SemanticFont.ITALIC;
      return SemanticHeuristics.run('simpleNamedFunction', leaf);
    }
    if (leaf.type === SemanticType.UNKNOWN) {
      leaf.type = SemanticType.IDENTIFIER;
    }
    SemanticProcessor.exprFont_(leaf);
    return SemanticHeuristics.run('simpleNamedFunction', leaf);
  }

  // 处理隐式节点
  public implicitNode(nodes: SemanticNode[]): SemanticNode {
    nodes = SemanticProcessor.getInstance().getMixedNumbers_(nodes);
    nodes = SemanticProcessor.getInstance().combineUnits_(nodes);
    if (nodes.length === 1) {
      return nodes[0];
    }
    const node = SemanticProcessor.getInstance().implicitNode_(nodes);
    return SemanticHeuristics.run('combine_juxtaposition', node);
  }

  // 处理行节点
  public row(nodes: SemanticNode[]): SemanticNode {
    nodes = nodes.filter(function (x) {
      return !SemanticPred.isType(x, SemanticType.EMPTY);
    });
    if (nodes.length === 0) {
      return SemanticProcessor.getInstance().factory_.makeEmptyNode();
    }
    nodes = SemanticProcessor.getInstance().getFencesInRow_(nodes);
    nodes = SemanticProcessor.getInstance().tablesInRow(nodes);
    nodes = SemanticProcessor.getInstance().getPunctuationInRow_(nodes);
    nodes = SemanticProcessor.getInstance().getTextInRow_(nodes);
    nodes = SemanticProcessor.getInstance().getFunctionsInRow_(nodes);
    return SemanticProcessor.getInstance().relationsInRow_(nodes);
  }
}
```

### 2.4 语义解析器接口 (SemanticParser)
```typescript
export interface SemanticParser<T> {
  // 解析方法
  parse(representation: T): SemanticNode;

  // 解析列表
  parseList(list: T[]): SemanticNode[];

  // 获取节点工厂
  getFactory(): SemanticNodeFactory;

  // 设置节点工厂
  setFactory(factory: SemanticNodeFactory): void;

  // 获取解析器类型
  getType(): string;
}
```

### 2.5 处理器工厂 (ProcessorFactory)
```typescript
// 语义处理器配置
set(
  new Processor<Element>('semantic', {
    // 处理 MathML 表达式
    processor: function (expr) {
      const mml = DomUtil.parseInput(expr);
      return Semantic.xmlTree(mml) as Element;
    },
    
    // 后处理添加语音
    postprocessor: function (xml, _expr) {
      const setting = Engine.getInstance().speech;
      if (setting === EngineConst.Speech.NONE) {
        return xml;
      }
      const clone = DomUtil.cloneNode(xml);
      let speech = SpeechGeneratorUtil.computeMarkup(clone);
      
      // 浅层语音处理
      if (setting === EngineConst.Speech.SHALLOW) {
        xml.setAttribute('speech', AuralRendering.finalize(speech));
        return xml;
      }
      
      // 深层语音处理
      const nodesXml = XpathUtil.evalXPath('.//*[@id]', xml) as Element[];
      const nodesClone = XpathUtil.evalXPath('.//*[@id]', clone) as Element[];
      for (
        let i = 0, orig, node;
        (orig = nodesXml[i]), (node = nodesClone[i]);
        i++
      ) {
        speech = SpeechGeneratorUtil.computeMarkup(node);
        orig.setAttribute('speech', AuralRendering.finalize(speech));
      }
      return xml;
    }
  })
);
```

## 3. 转换流程

### 3.1 输入处理
1. 接收 MathML XML 输入
```typescript
// ts/semantic_tree/semantic.ts
export function xmlTree(mml: Element): Element {
  return getTree(mml).xml();
}

export function getTree(mml: Element): SemanticTree {
  return new SemanticTree(mml);
}

export function getTreeFromString(expr: string): SemanticTree {
  const mml = DomUtil.parseInput(expr);
  return getTree(mml);
}
```

2. 验证 XML 结构的有效性
```typescript
// ts/semantic_tree/semantic_mathml.ts
private static getAttribute_(
  node: Element,
  attr: string,
  def: string
): string | null {
  if (!node.hasAttribute(attr)) {
    return def;
  }
  const value = node.getAttribute(attr);
  if (value.match(/^\s*$/)) {
    return null;
  }
  return value;
}
```

3. 构建语义树
```typescript
// ts/semantic_tree/semantic_tree.ts
constructor(public mathml: Element) {
  this.root = this.parser.parse(mathml);
  this.collator = this.parser.getFactory().leafMap.collateMeaning();

  const newDefault = this.collator.newDefault();
  if (newDefault) {
    // Reparse with new defaults
    this.parser = new SemanticMathml();
    this.parser.getFactory().defaultMap = newDefault;
    this.root = this.parser.parse(mathml);
  }
  unitVisitor.visit(this.root, {});
  annotate(this.root);
}
```

### 3.2 语义解析
1. 节点工厂创建
```typescript
// ts/semantic_tree/semantic_node_factory.ts
export class SemanticNodeFactory {
  public leafMap: SemanticNodeCollator = new SemanticNodeCollator();
  public defaultMap: SemanticDefault = new SemanticDefault();
  private idCounter_ = -1;

  public makeNode(id: number): SemanticNode {
    return this.createNode_(id);
  }

  public makeBranchNode(
    type: SemanticType,
    children: SemanticNode[],
    contentNodes: SemanticNode[],
    opt_content?: string
  ): SemanticNode {
    const node = this.createNode_();
    if (opt_content) {
      node.updateContent(opt_content);
    }
    node.type = type;
    node.childNodes = children;
    node.contentNodes = contentNodes;
    children.concat(contentNodes).forEach(function (x) {
      x.parent = node;
      node.addMathmlNodes(x.mathml);
    });
    return node;
  }
}
```

2. 语义属性处理
```typescript
// ts/semantic_tree/semantic_util.ts
export function addAttributes(to: SemanticNode, from: Element) {
  if (from.hasAttributes()) {
    const attrs = from.attributes;
    for (let i = attrs.length - 1; i >= 0; i--) {
      const key = attrs[i].name;
      if (key.match(/^ext/)) {
        to.attributes[key] = attrs[i].value;
        to.nobreaking = true;
      }
      if (directSpeechKeys.includes(key)) {
        to.attributes['ext-speech'] = attrs[i].value;
        to.nobreaking = true;
      }
      if (key.match(/texclass$/)) {
        to.attributes['texclass'] = attrs[i].value;
      }
      if (key.toLowerCase() === 'data-latex') {
        to.attributes['latex'] = attrs[i].value;
      }
      if (key === 'href') {
        to.attributes['href'] = attrs[i].value;
        to.nobreaking = true;
      }
    }
  }
}
```

### 3.3 语音生成
1. 处理器工厂配置
```typescript
// ts/common/processor_factory.ts
set(
  new Processor<Element>('semantic', {
    processor: function (expr) {
      const mml = DomUtil.parseInput(expr);
      return Semantic.xmlTree(mml) as Element;
    },
    postprocessor: function (xml, _expr) {
      const setting = Engine.getInstance().speech;
      if (setting === EngineConst.Speech.NONE) {
        return xml;
      }
      const clone = DomUtil.cloneNode(xml);
      let speech = SpeechGeneratorUtil.computeMarkup(clone);
      if (setting === EngineConst.Speech.SHALLOW) {
        xml.setAttribute('speech', AuralRendering.finalize(speech));
        return xml;
      }
      const nodesXml = XpathUtil.evalXPath('.//*[@id]', xml) as Element[];
      const nodesClone = XpathUtil.evalXPath('.//*[@id]', clone) as Element[];
      for (
        let i = 0, orig, node;
        (orig = nodesXml[i]), (node = nodesClone[i]);
        i++
      ) {
        speech = SpeechGeneratorUtil.computeMarkup(node);
        orig.setAttribute('speech', AuralRendering.finalize(speech));
      }
      return xml;
    }
  })
);
```

## 4. 语音规则引擎 (SpeechRuleEngine)

### 4.1 引擎核心
```typescript
// ts/rule_engine/speech_rule_engine.ts
export class SpeechRuleEngine {
  public trie: Trie = null;
  private evaluators_: {
    [key: string]: { [key: string]: (p1: Node) => AuditoryDescription[] };
  } = {};

  public static getInstance(): SpeechRuleEngine {
    SpeechRuleEngine.instance = SpeechRuleEngine.instance || new SpeechRuleEngine();
    return SpeechRuleEngine.instance;
  }

  public evaluateNode(node: Element): AuditoryDescription[] {
    updateEvaluator(node);
    let result: AuditoryDescription[] = [];
    try {
      result = this.evaluateNode_(node);
    } catch (err) {
      console.error('Something went wrong computing speech.');
    }
    return result;
  }
}
```

### 4.2 规则存储 (SpeechRuleStore)
```typescript
// ts/rule_engine/speech_rule_store.ts
export interface SpeechRuleStore {
  context: SpeechRuleContext;
  
  addRule(rule: SpeechRule): void;
  deleteRule(rule: SpeechRule): void;
  findRule(pred: (rule: SpeechRule) => boolean): SpeechRule;
  findAllRules(pred: (rule: SpeechRule) => boolean): SpeechRule[];
  
  defineRule(
    name: string,
    dynamic: string,
    action: string,
    pre: string,
    ...args: string[]
  ): SpeechRule;
}
```

### 4.3 基础规则存储 (BaseRuleStore)
```typescript
// ts/rule_engine/base_rule_store.ts
export abstract class BaseRuleStore implements SpeechRuleEvaluator, SpeechRuleStore {
  public context: SpeechRuleContext = new SpeechRuleContext();
  public parseOrder: AxisOrder = DynamicCstr.DEFAULT_ORDER;
  public parser: DynamicCstrParser = new DynamicCstrParser(this.parseOrder);
  public locale: string = DynamicCstr.DEFAULT_VALUES[Axis.LOCALE];
  public modality: string = DynamicCstr.DEFAULT_VALUES[Axis.MODALITY];
  
  public parse(ruleSet: RulesJson) {
    this.modality = ruleSet.modality || this.modality;
    this.locale = ruleSet.locale || this.locale;
    this.domain = ruleSet.domain || this.domain;
    this.context.parse((ruleSet.functions as any) || []);
    if (ruleSet.kind !== 'actions') {
      this.kind = ruleSet.kind || this.kind;
      this.inheritRules();
    }
    this.parseRules(ruleSet.rules || []);
  }
}
```

### 4.4 规则上下文 (SpeechRuleContext)
```typescript
// ts/rule_engine/speech_rule_context.ts
export class SpeechRuleContext {
  public customQueries: CustomQueries = new CustomQueries();
  public customStrings: CustomStrings = new CustomStrings();
  public contextFunctions: ContextFunctions = new ContextFunctions();
  public customGenerators: CustomGenerators = new CustomGenerators();

  public applySelector(node: Node, expr: string): Node[] {
    const result = this.applyCustomQuery(node, expr);
    return result || XpathUtil.evalXPath(expr, node);
  }
}
```

### 4.5 规则评估器 (SpeechRuleEvaluator)
```typescript
// ts/rule_engine/speech_rule_evaluator.ts
export interface SpeechRuleEvaluator {
  evaluateDefault(node: Node): void;
  evaluateWhitespace(str: string): AuditoryDescription[];
  evaluateString(str: string): AuditoryDescription[];
  evaluateCustom(str: string): AuditoryDescription;
  evaluateCharacter(str: string): AuditoryDescription;
}
```

### 4.6 语音规则 (SpeechRule)
```typescript
// ts/rule_engine/speech_rule.ts
export class SpeechRule {
  public context: SpeechRuleContext = null;

  constructor(
    public name: string,
    public dynamicCstr: DynamicCstr,
    public precondition: Precondition,
    public action: Action
  ) {}
}

export enum ActionType {
  NODE = 'NODE',
  MULTI = 'MULTI',
  TEXT = 'TEXT',
  PERSONALITY = 'PERSONALITY'
}
```

## 5. 语音规则引擎组件详解

### 5.1 SpeechRuleEngine 核心引擎
```typescript
export class SpeechRuleEngine {
  // 规则存储的前缀树
  public trie: Trie = null;

  // 添加规则存储
  public static addStore(set: RulesJson) {
    const store = storeFactory(set);
    if (store.kind !== 'abstract') {
      store.getSpeechRules().forEach((x) => 
        SpeechRuleEngine.getInstance().trie.addRule(x));
    }
    SpeechRuleEngine.getInstance().addEvaluator(store);
  }

  // 处理语法注释
  public processGrammar(
    context: SpeechRuleContext,
    node: Node,
    grammar: GrammarState
  ) {
    const assignment: GrammarState = {};
    for (const [key, val] of Object.entries(grammar)) {
      assignment[key] = typeof val === 'string' ? 
        context.constructString(node, val) : val;
    }
    Grammar.getInstance().pushState(assignment);
  }
}
```

### 5.2 语音规则 (SpeechRule)
```typescript
export class SpeechRule {
  public context: SpeechRuleContext = null;

  constructor(
    public name: string,
    public dynamicCstr: DynamicCstr,
    public precondition: Precondition,
    public action: Action
  ) {}
}

// 语音规则动作类型
export enum ActionType {
  NODE = 'NODE',    // 节点处理
  MULTI = 'MULTI',  // 多节点处理
  TEXT = 'TEXT',    // 文本处理
  PERSONALITY = 'PERSONALITY'  // 个性化处理
}
```

### 5.3 语音规则存储 (SpeechRuleStore)
```typescript
export interface SpeechRuleStore {
  // 规则上下文
  context: SpeechRuleContext;

  // 添加规则
  addRule(rule: SpeechRule): void;

  // 删除规则
  deleteRule(rule: SpeechRule): void;

  // 查找规则
  findRule(pred: (rule: SpeechRule) => boolean): SpeechRule;

  // 查找所有匹配规则
  findAllRules(pred: (rule: SpeechRule) => boolean): SpeechRule[];

  // 定义新规则
  defineRule(
    name: string,
    dynamic: string,
    action: string,
    pre: string,
    ...args: string[]
  ): SpeechRule;
}
```

### 5.4 语音生成器 (SpeechGenerator)
```typescript
export interface SpeechGenerator {
  // 生成器模态
  modality: Attribute;

  // 获取语音字符串
  getSpeech(node: Element, xml: Element, root?: Element): string;
}
```

### 5.5 树语音生成器 (TreeSpeechGenerator)
```typescript
export class TreeSpeechGenerator extends AbstractSpeechGenerator {
  public getSpeech(node: Element, xml: Element, root: Element = null) {
    // 连接动作
    if (this.getRebuilt()) {
      SpeechGeneratorUtil.connectMactions(node, xml, this.getRebuilt().xml);
    }
    
    // 生成语音
    const speech = this.generateSpeech(node, xml);
    const nodes = this.getRebuilt().nodeDict;
    
    // 处理每个节点
    for (const [key, snode] of Object.entries(nodes)) {
      const innerMml = WalkerUtil.getBySemanticId(xml, key) as Element;
      const innerNode = (WalkerUtil.getBySemanticId(node, key) as Element) ||
        ((root && WalkerUtil.getBySemanticId(root, key)) as Element);
        
      if (!innerMml || !innerNode) {
        continue;
      }

      // 添加语音或其他模态
      if (!this.modality || this.modality === Attribute.SPEECH) {
        SpeechGeneratorUtil.addSpeech(innerNode, snode, this.getRebuilt().xml);
      } else {
        SpeechGeneratorUtil.addModality(innerNode, snode, this.modality);
      }

      // 添加前缀
      if (this.modality === Attribute.SPEECH) {
        SpeechGeneratorUtil.addPrefix(innerNode, snode);
      }
    }
    return speech;
  }
}
```

## 6. 规则定义示例

### 6.1 Clearspeak 基础规则
```json
{
  "locale": "base",
  "domain": "clearspeak", 
  "modality": "speech",
  "kind": "abstract",
  "rules": [
    [
      "Rule",
      "direct-speech",
      "default",
      "[t] @ext-speech",
      "self::*[@ext-speech]",
      "priority=Infinity"
    ],
    [
      "Rule", 
      "stree",
      "default",
      "[n] ./*[1]",
      "self::stree"
    ]
  ]
}
```

### 6.2 Mathspeak 基础规则
```json
{
  "domain": "mathspeak",
  "locale": "base",
  "modality": "speech",
  "kind": "abstract",
  "rules": [
    [
      "Rule",
      "direct-speech", 
      "default",
      "[t] @ext-speech",
      "self::*[@ext-speech]",
      "priority=Infinity"
    ],
    [
      "Rule",
      "stree",
      "default", 
      "[n] ./*[1]",
      "self::stree",
      "CQFresetNesting"
    ]
  ]
}
```

## 7. 语音生成流程

1. 初始化语音规则引擎
   - 加载规则存储
   - 初始化规则前缀树
   - 设置语音生成器

2. 语音规则匹配
   - 遍历语义树节点
   - 根据节点类型和上下文匹配规则
   - 应用动态约束

3. 规则执行
   - 处理规则动作(NODE/MULTI/TEXT/PERSONALITY)
   - 应用语法注释
   - 生成语音描述

4. 后处理
   - 添加语音属性
   - 处理特殊字符
   - 格式化输出

## 8. 听觉描述系统 (Auditory Description)

### 8.1 听觉描述类
```typescript
export class AuditoryDescription {
  // 上下文，使用注释语音朗读
  public context: string;
  
  // 对象本身的文本
  public text: string;
  
  // 用户输入的文本
  public userValue: string;
  
  // 对象的角色和状态
  public annotation: string;
  
  // 额外属性
  public attributes: { [key: string]: string };
  
  // TTS个性化设置
  public personality: { [key: string]: string };
  
  // 布局注释
  public layout: string;

  // 创建听觉描述
  public static create(
    args: AudioDescr,
    flags: AudioFlags = {}
  ): AuditoryDescription {
    args.text = Grammar.getInstance().apply(args.text, flags);
    return new AuditoryDescription(args);
  }
}
```

### 8.2 听觉列表
```typescript
export class AuditoryList extends Set<AuditoryItem> {
  // 注释列表
  public annotations: AuditoryItem[] = [];
  
  // 添加项目
  public push(item: AuditoryItem) {
    item.next = this.anchor;
    item.prev = this.anchor.prev;
    item.prev.next = item;
    this.anchor.prev = item;
    super.add(item);
  }
  
  // 在指定项目后插入
  public insertAfter(descr: AuditoryDescription, item: AuditoryItem) {
    this.insertBefore(descr, item.next);
  }
  
  // 转换为列表
  public toList(): AuditoryDescription[] {
    let result = [];
    let item = this.anchor.next;
    while (item !== this.anchor) {
      result.push(item.data);
      item = item.next;
    }
    return result;
  }
}
```

## 9. 动态约束系统 (Dynamic Constraints)

### 9.1 约束轴
```typescript
export enum Axis {
  DOMAIN = 'domain',     // 领域约束
  STYLE = 'style',       // 风格约束
  LOCALE = 'locale',     // 语言约束
  TOPIC = 'topic',       // 主题约束
  MODALITY = 'modality'  // 模态约束
}

export type AxisProperties = { [key: string]: string[] };
export type AxisOrder = Axis[];
export type AxisMap = { [key: string]: string };
```

### 9.2 约束处理
```typescript
// 更新约束
private updateConstraint_() {
  const dynamic = Engine.getInstance().dynamicCstr;
  const strict = Engine.getInstance().strict;
  const trie = this.trie;
  const props: { [key: string]: string[] } = {};
  
  // 处理语言约束
  let locale = dynamic.getValue(Axis.LOCALE);
  let modality = dynamic.getValue(Axis.MODALITY);
  let domain = dynamic.getValue(Axis.DOMAIN);
  
  // 回退机制
  if (!trie.hasSubtrie([locale, modality, domain])) {
    domain = DynamicCstr.DEFAULT_VALUES[Axis.DOMAIN];
    if (!trie.hasSubtrie([locale, modality, domain])) {
      modality = DynamicCstr.DEFAULT_VALUES[Axis.MODALITY];
      if (!trie.hasSubtrie([locale, modality, domain])) {
        locale = DynamicCstr.DEFAULT_VALUES[Axis.LOCALE];
      }
    }
  }
  
  // 设置属性
  props[Axis.LOCALE] = [locale];
  props[Axis.MODALITY] = [
    modality !== 'summary' ? 
      modality : 
      DynamicCstr.DEFAULT_VALUES[Axis.MODALITY]
  ];
  props[Axis.DOMAIN] = [
    modality !== 'speech' ? 
      DynamicCstr.DEFAULT_VALUES[Axis.DOMAIN] : 
      domain
  ];
  
  // 更新约束属性
  dynamic.updateProperties(props);
}
```

## 10. 规则系统集成

### 10.1 数学存储 (MathStore)
```typescript
export class MathStore extends BaseRuleStore {
  // 添加规则特化
  public defineSpecialized(name: string, _old: string, dynamic: string) {
    const cstr = this.parseCstr(dynamic);
    if (!cstr) {
      console.error(`Dynamic Constraint Error: ${dynamic}`);
      return;
    }
    const condition = this.preconditions.get(name);
    if (!condition) {
      console.error(`Alias Error: No precondition by the name of ${name}`);
      return;
    }
    condition.addConstraint(cstr);
  }

  // 评估数学表达式
  public evaluateString(text: string): AuditoryDescription[] {
    // 将文本分割为组件
    // 创建听觉描述
    // 返回描述列表
  }
}
```

### 10.2 规则示例 (日语 Emacspeak)
```json
{
  "locale": "ja",
  "domain": "emacspeak",
  "modality": "speech",
  "rules": [
    [
      "Precondition",
      "identifier",
      "default",
      "self::identifier"
    ],
    [
      "Precondition",
      "number",
      "default", 
      "self::number"
    ],
    [
      "Precondition",
      "font",
      "default",
      "self::*",
      "@font",
      "not(contains(@grammar, \"ignoreFont\"))",
      "@font!=\"normal\""
    ]
  ]
}
```

### 10.3 规则动作示例
```json
{
  "Action": [
    [
      "binary-operation",
      "[p] (pause:100); [m] children/* (sepFunc:CTFcontentIterator, pause:100);"
    ],
    [
      "variable-addition",
      "[t] \"sum with variable number of summands\" (pause:400); [m] children/* (sepFunc:CTFcontentIterator)"
    ],
    [
      "prefix",
      "[t] \"prefix\"; [n] text(); [t] \"of\" (pause 150);[n] children/*[1]"
    ]
  ]
}
```

## 11. 配置选项

### 11.1 基本设置
```typescript
// ts/common/engine_const.ts
export enum Speech {
  NONE = 'none',
  SHALLOW = 'shallow',
  DEEP = 'deep'
}

export enum Markup {
  NONE = 'none',
  LAYOUT = 'layout',
  COUNTING = 'counting',
  PUNCTUATION = 'punctuation',
  SSML = 'ssml',
  ACSS = 'acss',
  SABLE = 'sable',
  VOICEXML = 'voicexml'
}
```

## 12. 示例流程

完整的转换示例：
```typescript
// 1. 输入 MathML
const input = '<math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>';

// 2. 解析和验证
const mml = DomUtil.parseInput(prepareMmlString(input));

// 3. 构建语义树
const semanticTree = xmlTree(mml);

// 4. 应用规则生成语音
const speech = toSpeech(input);  // 输出: "分数 1 分の 2" (日语) 或 "one half" (英语)
```

## 13. 错误处理

### 13.1 输入验证
```typescript
// ts/semantic_tree/semantic_mathml.ts
private dummy_(node: Element, _children: Element[]): SemanticNode {
  const unknown = this.getFactory().makeUnprocessed(node);
  unknown.role = node.tagName as SemanticRole;
  unknown.textContent = node.textContent;
  return unknown;
}
```

## 14. 性能考虑

### 14.1 优化策略
```typescript
// ts/rule_engine/speech_rule_engine.ts
public lookupRules(node: Node, dynamic: DynamicCstr): SpeechRule[] {
  return this.trie.lookupRules(node, dynamic.allProperties());
}
```

## 15. 调试和开发

### 15.1 调试工具
```typescript
// ts/enrich_mathml/enrich.ts
export function testTranslation(expr: string): Element {
  Debugger.getInstance().init();
  const mml = semanticMathmlSync(prepareMmlString(expr));
  Debugger.getInstance().exit();
  return mml;
}
```

## 16. 最佳实践

### 16.1 使用建议
- 规则优化
- 错误处理
- 性能调优

### 16.2 常见问题
- 规则冲突解决
- 性能问题处理
- 错误诊断方法 

## 17. 听觉描述系统 (Auditory Description)

### 17.1 听觉描述类
```typescript
// ts/audio/auditory_description.ts
export class AuditoryDescription {
  public context: string;    // 上下文，使用注释语音朗读
  public text: string;       // 对象本身的文本
  public userValue: string;  // 用户输入的文本
  public annotation: string; // 对象的角色和状态
  public attributes: { [key: string]: string };  // 附加属性
  public personality: { [key: string]: string }; // TTS个性化设置
  public layout: string;     // 布局注释

  public static create(
    args: AudioDescr,
    flags: AudioFlags = {}
  ): AuditoryDescription {
    args.text = Grammar.getInstance().apply(args.text, flags);
    return new AuditoryDescription(args);
  }
}
```

### 17.2 听觉列表
```typescript
// ts/audio/auditory_description.ts
export class AuditoryList extends Set<AuditoryItem> {
  public annotations: AuditoryItem[] = [];
  private anchor: AuditoryItem;

  constructor(descrs: AuditoryDescription[]) {
    super();
    this.anchor = new AuditoryItem();
    this.anchor.next = this.anchor;
    this.anchor.prev = this.anchor;
    descrs.forEach(d => {
      let item = new AuditoryItem(d);
      if (d.annotation) {
        this.annotations.push(item);
      }
      this.push(item);
    });
  }
}
```

## 18. 语法处理系统 (Grammar)

### 18.1 语法状态
```typescript
// ts/rule_engine/grammar.ts
export class Grammar {
  private parameters_: State = {};
  private corrections_: { [key: string]: Correction } = {};
  private preprocessors_: { [key: string]: Correction } = {};
  private stateStack_: State[] = [];

  public apply(text: string, opt_flags?: Flags): string {
    this.currentFlags = opt_flags || {};
    text = this.currentFlags.adjust || this.currentFlags.preprocess
      ? Grammar.getInstance().preprocess(text)
      : text;
    if (this.parameters_['translate'] || this.currentFlags.translate) {
      text = Grammar.translateString(text);
    }
    text = this.currentFlags.adjust || this.currentFlags.correct
      ? Grammar.getInstance().correct(text)
      : text;
    return text;
  }
}
```

### 18.2 语法状态解析
```typescript
// ts/rule_engine/grammar.ts
public static parseInput(grammar: string): State {
  const attributes: State = {};
  const components = grammar.split(':');
  for (const component of components) {
    const comp = component.split('=');
    const key = comp[0].trim();
    if (comp[1]) {
      attributes[key] = comp[1].trim();
      continue;
    }
    key.match(/^!/)
      ? (attributes[key.slice(1)] = false)
      : (attributes[key] = true);
  }
  return attributes;
}
```

## 19. 动态约束系统 (Dynamic Constraints)

### 19.1 约束轴
```typescript
// ts/rule_engine/dynamic_cstr.ts
export enum Axis {
  DOMAIN = 'domain',
  STYLE = 'style',
  LOCALE = 'locale',
  TOPIC = 'topic',
  MODALITY = 'modality'
}
```

### 19.2 约束属性
```typescript
// ts/rule_engine/dynamic_cstr.ts
export type AxisProperties = { [key: string]: string[] };
export type AxisOrder = Axis[];
export type AxisMap = { [key: string]: string };
```

## 20. 多语言支持

### 20.1 规则集示例
```json
// mathmaps/en/rules/clearspeak_english.json
{
  "domain": "clearspeak",
  "locale": "en",
  "modality": "speech",
  "inherits": "base",
  "rules": [
    // 规则定义
  ]
}
```

### 20.2 语言特定动作
```json
// mathmaps/de/rules/clearspeak_german_actions.json
{
  "locale": "de",
  "domain": "clearspeak",
  "modality": "speech",
  "kind": "actions",
  "rules": [
    [
      "Action",
      "bigop",
      "[n] children/*[1]; [t] \"über\"; [n] children/*[2] (pause:short)"
    ]
  ]
}
```

## 21. 语音生成器 (Speech Generator)

### 21.1 生成器接口
```typescript
// ts/speech_generator/speech_generator.ts
export interface SpeechGenerator {
  setOption(key: string, value: string): void;
  getOptions(): AxisMap;
  nextRules(): void;
  nextStyle(id: string): void;
  getActionable(actionable: number): string;
  getLevel(depth: string): string;
}
``` 

## 22. 语义树处理系统 (Semantic Tree Processing)

### 22.1 语义树类
```typescript
// ts/semantic_tree/semantic_tree.ts
export class SemanticTree {
  // MathML 解析器
  public parser: SemanticParser<Element> = new SemanticMathml();
  
  // 树的根节点
  public root: SemanticNode;
  
  // 语义收集器
  public collator: SemanticMeaningCollator;

  // 生成空语义树
  public static empty(): SemanticTree {
    const empty = DomUtil.parseInput('<math/>');
    const stree = new SemanticTree(empty);
    stree.mathml = empty;
    return stree;
  }

  // 从节点生成语义树
  public static fromNode(
    semantic: SemanticNode,
    opt_mathml?: Element
  ): SemanticTree {
    const stree = SemanticTree.empty();
    stree.root = semantic;
    if (opt_mathml) {
      stree.mathml = opt_mathml;
    }
    return stree;
  }
}
```

### 22.2 MathML 语义解析器
```typescript
// ts/semantic_tree/semantic_mathml.ts
export class SemanticMathml extends SemanticAbstractParser<Element> {
  private parseMap_: Map<string, (p1: Element, p2: Element[]) => SemanticNode>;

  constructor() {
    super('MathML');
    this.parseMap_ = new Map([
      [MMLTAGS.SEMANTICS, this.semantics_.bind(this)],
      [MMLTAGS.MATH, this.rows_.bind(this)],
      [MMLTAGS.MROW, this.rows_.bind(this)],
      [MMLTAGS.MFRAC, this.fraction_.bind(this)],
      [MMLTAGS.MSUB, this.limits_.bind(this)],
      [MMLTAGS.MSUP, this.limits_.bind(this)],
      [MMLTAGS.MSUBSUP, this.limits_.bind(this)],
      [MMLTAGS.MOVER, this.limits_.bind(this)],
      [MMLTAGS.MUNDER, this.limits_.bind(this)],
      [MMLTAGS.MUNDEROVER, this.limits_.bind(this)],
      // ... 其他标签映射
    ]);
  }

  public parse(mml: Element) {
    SemanticProcessor.getInstance().setNodeFactory(this.getFactory());
    const children = DomUtil.toArray(mml.childNodes);
    const tag = DomUtil.tagName(mml) as MMLTAGS;
    const func = this.parseMap_.get(tag);
    const newNode = (func ? func : this.dummy_.bind(this))(mml, children);
    SemanticUtil.addAttributes(newNode, mml);
    return newNode;
  }
}
```

### 22.3 语义处理器高级功能
```typescript
// ts/semantic_tree/semantic_processor.ts
export class SemanticProcessor {
  // 处理隐式节点（如乘法运算）
  public implicitNode(nodes: SemanticNode[]): SemanticNode {
    nodes = SemanticProcessor.getInstance().getMixedNumbers_(nodes);
    nodes = SemanticProcessor.getInstance().combineUnits_(nodes);
    if (nodes.length === 1) {
      return nodes[0];
    }
    const node = SemanticProcessor.getInstance().implicitNode_(nodes);
    return SemanticHeuristics.run(
      'combine_juxtaposition',
      node
    ) as SemanticNode;
  }

  // 处理文本节点
  public text(leaf: SemanticNode, type: string): SemanticNode {
    SemanticProcessor.exprFont_(leaf);
    leaf.type = SemanticType.TEXT;
    if (type === MMLTAGS.ANNOTATIONXML) {
      leaf.role = SemanticRole.ANNOTATION;
      return leaf;
    }
    if (type === MMLTAGS.MS) {
      leaf.role = SemanticRole.STRING;
      return leaf;
    }
    // ... 其他文本处理逻辑
    return leaf;
  }

  // 处理证明节点
  public proof(
    node: Element,
    semantics: { [key: string]: string },
    parse: (p1: Element[]) => SemanticNode[]
  ): SemanticNode {
    if (semantics['axiom']) {
      const cleaned = SemanticProcessor.getInstance().cleanInference(
        node.childNodes
      );
      const axiom = cleaned.length
        ? SemanticProcessor.getInstance().factory_.makeBranchNode(
            SemanticType.INFERENCE,
            parse(cleaned),
            []
          )
        : SemanticProcessor.getInstance().factory_.makeEmptyNode();
      axiom.role = SemanticRole.AXIOM;
      axiom.mathmlTree = node;
      return axiom;
    }
    // ... 其他证明处理逻辑
    return inference;
  }
}
```

### 22.4 语义处理器工厂
```typescript
// ts/common/processor_factory.ts
set(
  new Processor<Element>('semantic', {
    processor: function (expr) {
      const mml = DomUtil.parseInput(expr);
      return Semantic.xmlTree(mml) as Element;
    },
    postprocessor: function (xml, _expr) {
      const setting = Engine.getInstance().speech;
      if (setting === EngineConst.Speech.NONE) {
        return xml;
      }
      const clone = DomUtil.cloneNode(xml);
      let speech = SpeechGeneratorUtil.computeMarkup(clone);
      if (setting === EngineConst.Speech.SHALLOW) {
        xml.setAttribute('speech', AuralRendering.finalize(speech));
        return xml;
      }
      // 处理深层语音标记
      const nodesXml = XpathUtil.evalXPath('.//*[@id]', xml) as Element[];
      const nodesClone = XpathUtil.evalXPath('.//*[@id]', clone) as Element[];
      for (
        let i = 0, orig, node;
        (orig = nodesXml[i]), (node = nodesClone[i]);
        i++
      ) {
        speech = SpeechGeneratorUtil.computeMarkup(node);
        orig.setAttribute('speech', AuralRendering.finalize(speech));
      }
      return xml;
    }
  })
);
```

## 23. 语义API (Semantic API)

### 23.1 API 接口
```typescript
// ts/semantic_tree/semantic.ts
export type Font = SemanticFont;
export type Role = SemanticRole;
export type Type = SemanticType;
type Attr = Font | Role | Type;

export function xmlTree(mml: Element): Element {
  return getTree(mml).xml();
}

export function getTree(mml: Element): SemanticTree {
  return new SemanticTree(mml);
}

export function getTreeFromString(expr: string): SemanticTree {
  const mml = DomUtil.parseInput(expr);
  return getTree(mml);
}
```

### 23.2 语义类型和角色
```typescript
// ts/semantic_tree/semantic_meaning.ts
export enum SemanticType {
  IDENTIFIER = 'identifier',
  NUMBER = 'number',
  TEXT = 'text',
  OPERATOR = 'operator',
  FENCED = 'fenced',
  MATRIX = 'matrix',
  VECTOR = 'vector',
  CASES = 'cases',
  ROW = 'row',
  CELL = 'cell',
  FRACTION = 'fraction',
  SQRT = 'sqrt',
  ROOT = 'root',
  SUPERSCRIPT = 'superscript',
  SUBSCRIPT = 'subscript',
  SUBSUP = 'subsup',
  UNDERSCRIPT = 'underscript',
  OVERSCRIPT = 'overscript',
  OVERSCORE = 'overscore',
  UNDERSCORE = 'underscore',
  TENSOR = 'tensor',
  PUNCTUATION = 'punctuation',
  RELSEQ = 'relseq',
  MULTIREL = 'multirel',
  TABLE = 'table',
  MULTILINE = 'multiline',
  UNKNOWN = 'unknown'
}

export enum SemanticRole {
  UNKNOWN = 'unknown',
  IDENTIFIER = 'identifier',
  NUMBER = 'number',
  TEXT = 'text',
  MIXED = 'mixed',
  OPERATOR = 'operator',
  RELATION = 'relation',
  PUNCTUATION = 'punctuation',
  UNIT = 'unit',
  OPEN = 'open',
  CLOSE = 'close',
  MIDDLE = 'middle',
  NEUTRAL = 'neutral',
  FENCE = 'fence',
  SEPARATOR = 'separator',
  SPACE = 'space',
  STRING = 'string',
  ANNOTATION = 'annotation',
  IMPLICIT = 'implicit'
}
``` 