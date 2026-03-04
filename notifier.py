"""飞书群机器人推送模块"""

import requests
import config


def notify(result):
    """将爬取结果推送到飞书群（交互卡片），未配置 Webhook 则静默跳过"""
    webhook = getattr(config, "FEISHU_WEBHOOK", "")
    if not webhook:
        return

    accounts = result.get("accounts", [])
    if not accounts:
        print("没有爬取到文章，跳过飞书推送")
        return

    # 构建交互卡片元素
    elements = []
    for idx_account, account in enumerate(accounts):
        name = account.get("name", "未知公众号")
        articles = account.get("articles", [])

        # 公众号名称
        elements.append({"tag": "markdown", "content": f"**【{name}】**"})

        # 文章列表
        lines = []
        for idx, article in enumerate(articles, 1):
            title = article.get("title", "无标题")
            url = article.get("url", "")
            summary = article.get("summary", "")

            if url:
                line = f"{idx}. [{title}]({url})"
            else:
                line = f"{idx}. {title}"
            if summary:
                line += f"\n概要：{summary}"
            lines.append(line)

        if lines:
            elements.append({"tag": "markdown", "content": "\n".join(lines)})

        # 公众号之间加分割线（最后一个不加）
        if idx_account < len(accounts) - 1:
            elements.append({"tag": "hr"})

    payload = {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {"tag": "plain_text", "content": "公众号文章更新"},
                "template": "blue",
            },
            "elements": elements,
        },
    }

    try:
        resp = requests.post(webhook, json=payload, timeout=10)
        resp.raise_for_status()
        print("飞书推送成功")
    except Exception as e:
        print(f"飞书推送失败: {e}")
