# 下载 DOCX 选项 Spec

## Why
当前系统缺少导出为 Word 文档（.docx）的能力，用户需要将内容手动复制到本地编辑器再保存。新增 DOCX 下载选项可以降低操作成本并提升交付效率。

## What Changes
- 在导出能力中新增 `docx` 格式选项，并在界面中提供可见入口。
- 实现服务端或现有导出链路中的 DOCX 文件生成与下载响应。
- 统一下载文件命名规则、内容编码与错误提示，保证和现有导出选项一致。
- 为 DOCX 导出增加必要校验与回归验证。

## Impact
- Affected specs: 导出能力、下载交互能力、错误处理能力
- Affected code: 前端导出入口与请求层、后端导出接口/服务层、测试用例

## ADDED Requirements
### Requirement: DOCX 下载能力
系统 SHALL 提供 DOCX 格式导出能力，使用户能够直接下载 `.docx` 文件。

#### Scenario: 成功下载 DOCX
- **WHEN** 用户在导出入口选择 DOCX 并触发下载
- **THEN** 系统返回可下载的 `.docx` 文件
- **AND** 文件扩展名、MIME 类型与文件内容格式正确

#### Scenario: 内容为空或不合法
- **WHEN** 用户触发 DOCX 导出但输入内容为空或不满足导出前置条件
- **THEN** 系统阻止下载并返回明确错误信息

## MODIFIED Requirements
### Requirement: 统一导出入口
现有导出入口 SHALL 扩展为支持 DOCX，并保持与其他格式一致的交互体验（入口位置、触发方式、加载态与失败提示规则）。

## REMOVED Requirements
### Requirement: 仅支持非 DOCX 导出
**Reason**: 现有能力不足以满足 Word 文档交付场景。  
**Migration**: 将导出格式白名单更新为包含 DOCX，并对调用方保持向后兼容。
