# MathML 到语音字符串的转换流程

本文档展示了 Speech Rule Engine 将 MathML 转换为语音字符串的完整流程。

## 流程图

```mermaid
flowchart TB
    %% 主流程
    Start([开始]) --> parseInput["DomUtil.parseInput(expr)
    将 MathML 字符串解析为 DOM 树"]
    parseInput --> semanticMathmlSync["semanticMathmlSync(expr)
    同步处理 MathML 并创建语义树"]
    semanticMathmlSync --> SemanticTree["new SemanticTree(mml)
    创建语义树实例并初始化解析器"]
    
    %% 本地化初始化
    Start --> LocaleInit["setLocale()
    初始化本地化设置"]
    LocaleInit --> GetLocale["getLocale()
    获取当前语言环境"]
    GetLocale --> LoadMessages["加载语言消息
    (MESSAGES/NUMBERS/ALPHABETS)"]
    LoadMessages --> SetSubiso["setSubiso()
    设置子语言代码"]
    
    %% 语义树构建
    SemanticTree --> SemanticMathml["SemanticMathml.parse(node)
    解析 MathML 节点生成语义节点"]
    SemanticMathml --> SemanticProcessor["SemanticProcessor.getInstance()
    获取语义处理器单例"]
    
    %% 语义处理
    SemanticProcessor --> processNode["processNode(node)
    处理各类节点(标识符/数字/运算符等)"]
    processNode --> implicitNode["implicitNode(nodes)
    处理隐式节点(如乘法)"]
    processNode --> text["text(leaf, type)
    处理文本节点"]
    
    %% 规则引擎
    SemanticTree --> SpeechRuleEngine["SpeechRuleEngine.getInstance()
    获取语音规则引擎实例"]
    SpeechRuleEngine --> evaluateNode["evaluateNode(node)
    评估节点并生成语音描述"]
    
    %% 规则匹配和应用
    evaluateNode --> lookupRule["lookupRule(node, dynamicCstr)
    查找适用的语音规则"]
    lookupRule --> evaluateTree["evaluateTree_(node)
    递归应用规则生成语音"]
    
    %% 语音生成器工厂
    evaluateTree --> SpeechGeneratorFactory["SpeechGeneratorFactory.generator()
    创建适当的语音生成器"]
    
    %% 语音生成器
    SpeechGeneratorFactory --> AbstractSpeechGenerator["AbstractSpeechGenerator
    语音生成器基类"]
    
    AbstractSpeechGenerator --> TreeSpeechGenerator["TreeSpeechGenerator
    处理整个表达式树"]
    AbstractSpeechGenerator --> NodeSpeechGenerator["NodeSpeechGenerator
    处理单个节点及其子树"]
    AbstractSpeechGenerator --> DirectSpeechGenerator["DirectSpeechGenerator
    直接获取语音属性"]
    AbstractSpeechGenerator --> AdhocSpeechGenerator["AdhocSpeechGenerator
    非递归即时生成语音"]
    AbstractSpeechGenerator --> SummarySpeechGenerator["SummarySpeechGenerator
    生成折叠状态的语音"]
    AbstractSpeechGenerator --> DummySpeechGenerator["DummySpeechGenerator
    返回空语音串"]
    AbstractSpeechGenerator --> ColorGenerator["ColorGenerator
    生成颜色标注"]
    
    %% 语音生成
    TreeSpeechGenerator --> processGrammar["processGrammar(context, node, grammar)
    处理语法注释"]
    TreeSpeechGenerator --> applyAction["applyAction(component)
    应用规则动作(NODE/MULTI/TEXT/PERSONALITY)"]
    
    %% 听觉描述生成
    applyAction --> AuditoryDescription["AuditoryDescription.create()
    创建听觉描述对象"]
    AuditoryDescription --> processAnnotations["processAnnotations(descrs)
    处理语音注释"]
    
    %% 本地化转换器
    processAnnotations --> Transformers["应用本地化转换器
    (identityTransformer/
    prefixCombiner/
    postfixCombiner等)"]
    
    %% 后处理
    Transformers --> Grammar["Grammar.getInstance()
    获取语法处理器实例"]
    Grammar --> finalize["AuralRendering.finalize(speech)
    最终化语音输出"]
    
    finalize --> End([结束])

    %% 样式
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef process fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef major fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef generator fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
    classDef locale fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    
    class Start,End default;
    class parseInput,semanticMathmlSync,SemanticTree,SemanticMathml,SemanticProcessor process;
    class SpeechRuleEngine,evaluateNode,evaluateTree,AuditoryDescription major;
    class AbstractSpeechGenerator,TreeSpeechGenerator,NodeSpeechGenerator,DirectSpeechGenerator,AdhocSpeechGenerator,SummarySpeechGenerator,DummySpeechGenerator,ColorGenerator,SpeechGeneratorFactory generator;
    class LocaleInit,GetLocale,LoadMessages,SetSubiso,Transformers locale;
```

## 流程说明

1. **输入处理**
   - 将 MathML 字符串解析为 DOM 树
   - 同步处理 MathML 并创建语义树

2. **本地化初始化**
   - 初始化本地化设置
   - 加载语言消息和规则
   - 设置子语言代码

3. **语义处理**
   - 解析 MathML 节点生成语义节点
   - 处理各类节点(标识符/数字/运算符等)
   - 处理隐式节点和文本节点

4. **规则引擎**
   - 获取语音规则引擎实例
   - 评估节点并生成语音描述
   - 查找和应用适用的语音规则

5. **语音生成**
   - 使用不同类型的语音生成器
   - 处理语法注释
   - 应用规则动作

6. **后处理**
   - 创建听觉描述对象
   - 应用本地化转换器
   - 最终化语音输出 