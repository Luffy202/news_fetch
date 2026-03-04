"""微信公众号文章爬取 - 主入口"""

import json
import time
from datetime import datetime

from config import ACCOUNTS, ARTICLE_COUNT, COOKIE, TOKEN, REQUEST_INTERVAL
from fetcher import fetch_account_articles, set_credentials
from parser import enrich_articles_with_content
from notifier import notify
from summarizer import enrich_articles_with_summary


def main():
    # 获取凭证：优先使用 config 中的手动配置，否则自动登录
    if COOKIE and TOKEN:
        cookie, token = COOKIE, TOKEN
        print("使用 config.py 中的手动凭证")
    else:
        try:
            from auth import get_credentials, AuthError
        except ImportError:
            print("=" * 50)
            print("错误: 自动登录需要安装 playwright")
            print()
            print("请运行以下命令安装:")
            print("  pip3 install playwright")
            print("  playwright install chromium")
            print()
            print("或者在 config.py 中手动填入 COOKIE 和 TOKEN")
            print("=" * 50)
            return

        try:
            creds = get_credentials()
            cookie, token = creds["cookie"], creds["token"]
        except AuthError as e:
            print(f"登录失败: {e}")
            return

    set_credentials(cookie, token)

    print(f"开始爬取 {len(ACCOUNTS)} 个公众号，每个 {ARTICLE_COUNT} 篇文章")
    print(f"请求间隔: {REQUEST_INTERVAL} 秒")

    result = {
        "fetch_time": datetime.now().isoformat(),
        "accounts": [],
    }

    for i, name in enumerate(ACCOUNTS):
        account_data = fetch_account_articles(name, ARTICLE_COUNT)
        if account_data:
            # 抓取正文内容
            print(f"  开始抓取正文内容...")
            enrich_articles_with_content(account_data["articles"])

            # 将 Unix 时间戳转为可读格式
            for article in account_data["articles"]:
                ts = article.get("publish_time", 0)
                if isinstance(ts, int) and ts > 0:
                    article["publish_time"] = datetime.fromtimestamp(ts).strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )

            # 生成 AI 摘要
            enrich_articles_with_summary(account_data["articles"])

            result["accounts"].append(account_data)

        # 公众号之间的间隔
        if i < len(ACCOUNTS) - 1:
            print(f"\n等待 {REQUEST_INTERVAL} 秒后处理下一个公众号...")
            time.sleep(REQUEST_INTERVAL)

    # 保存结果
    output_path = "output/articles.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # 保存 AI 摘要文件
    today = datetime.now().strftime("%Y-%m-%d")
    summary_path = f"output/{today} AI-summary.json"
    summary_data = []
    for account in result["accounts"]:
        for article in account.get("articles", []):
            if article.get("summary"):
                summary_data.append({
                    "account": account.get("name", ""),
                    "title": article.get("title", ""),
                    "url": article.get("url", ""),
                    "publish_time": article.get("publish_time", ""),
                    "summary": article["summary"],
                })
    if summary_data:
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(summary_data, f, ensure_ascii=False, indent=2)
        print(f"AI 摘要已保存到: {summary_path}")

    print(f"\n{'=' * 50}")
    print(f"爬取完成！")
    print(f"共获取 {sum(len(a['articles']) for a in result['accounts'])} 篇文章")
    print(f"结果已保存到: {output_path}")

    # 推送到飞书群
    notify(result)


if __name__ == "__main__":
    main()
