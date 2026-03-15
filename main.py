"""遗留 CLI 兼容入口。"""

import json
from datetime import datetime
from pathlib import Path

from backend import runtime_config
from backend.services.crawler_service import crawler_service
from backend.services.feishu_service import push_accounts
from backend.services.wechat_auth import AuthError, get_credentials


def _write_summary_file(result: dict) -> None:
    today = datetime.now().strftime('%Y-%m-%d')
    summary_path = Path('output') / f'{today} AI-summary.json'
    summary_data = []
    for account in result['accounts']:
        for article in account.get('articles', []):
            if article.get('summary'):
                summary_data.append(
                    {
                        'account': account.get('name', ''),
                        'title': article.get('title', ''),
                        'url': article.get('url', ''),
                        'publish_time': article.get('publish_time', ''),
                        'summary': article['summary'],
                    }
                )
    if summary_data:
        summary_path.parent.mkdir(parents=True, exist_ok=True)
        summary_path.write_text(json.dumps(summary_data, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'AI 摘要已保存到: {summary_path.as_posix()}')


def _push_feishu_if_needed(result: dict) -> None:
    webhook = runtime_config.FEISHU_WEBHOOK
    if not webhook or not result.get('accounts'):
        return

    try:
        push_accounts(webhook, result['accounts'])
        print('飞书推送成功')
    except Exception as exc:
        print(f'飞书推送失败: {exc}')


def main():
    if runtime_config.COOKIE and runtime_config.TOKEN:
        cookie, token = runtime_config.COOKIE, runtime_config.TOKEN
        print('使用环境变量中的手动凭证')
    else:
        try:
            credentials = get_credentials()
            cookie, token = credentials['cookie'], credentials['token']
        except AuthError as exc:
            print(f'登录失败: {exc}')
            return
        except ImportError:
            print('=' * 50)
            print('错误: 自动登录需要安装 playwright')
            print()
            print('请运行以下命令安装:')
            print('  pip3 install playwright')
            print('  playwright install chromium')
            print()
            print('或者设置环境变量 WECHAT_COOKIE / WECHAT_TOKEN')
            print('=' * 50)
            return

    crawler_service.set_credentials(cookie, token)
    crawler_service.apply_runtime_settings(runtime_config.REQUEST_INTERVAL)

    print(f'开始爬取 {len(runtime_config.ACCOUNTS)} 个公众号，每个 {runtime_config.ARTICLE_COUNT} 篇文章')
    print(f'请求间隔: {runtime_config.REQUEST_INTERVAL} 秒')

    accounts = crawler_service.crawl_accounts(runtime_config.ACCOUNTS, runtime_config.ARTICLE_COUNT)
    result = {
        'fetch_time': datetime.now().isoformat(),
        'accounts': accounts,
    }

    output_path = Path('output') / 'articles.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    _write_summary_file(result)

    print(f"\n{'=' * 50}")
    print('爬取完成！')
    print(f"共获取 {sum(len(account['articles']) for account in result['accounts'])} 篇文章")
    print(f'结果已保存到: {output_path.as_posix()}')

    _push_feishu_if_needed(result)


if __name__ == '__main__':
    main()
