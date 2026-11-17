"""CLI советника.

python3 -m finmetrics report [--config PATH] [--today YYYY-MM-DD]   # JSON с метриками в stdout
python3 -m finmetrics notify --file message.txt                   # себе в Telegram (обычный текст)
python3 -m finmetrics retro-put YYYY-MM --file retro.json         # записать ретроспективу месяца

Секреты: env FINTREE_PAT / FINTREE_BASE_URL; локально подхватываются из .claude/finance/secrets.env.
Конфиг: --config, иначе env FIN_CONFIG_JSON, иначе .claude/finance/config.json.
Каждая команда самодостаточна — между вызовами не нужно хранить состояние оболочки.
"""

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from .api import ApiError, FinTreeClient
from .config import load_config
from .metrics import _last_full_months, parse_transactions
from .report import build_report, parse_invest_split

FINANCE_DIR = Path(__file__).resolve().parents[2] / "finance"  # .claude/finance
DEFAULT_BASE_URL = "https://fin-tree.ru"
FETCH_DAYS = 120  # контекст операций (13 недель) и история категорий с запасом; счётчик правила берёт данные от start_date


def load_local_secrets(path: str | os.PathLike) -> None:
    """Подхватить KEY=VALUE из локального файла, не перетирая уже заданные переменные."""
    try:
        lines = Path(path).read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _config_path(explicit: str | None) -> str | None:
    if explicit or os.environ.get("FIN_CONFIG_JSON"):
        return explicit
    local = FINANCE_DIR / "config.json"
    return str(local) if local.exists() else None


def _read_text(path: str) -> str:
    return Path(path).read_text(encoding="utf-8").strip()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="finmetrics")
    sub = parser.add_subparsers(dest="command", required=True)
    report = sub.add_parser("report", help="посчитать метрики и вывести JSON")
    report.add_argument("--config", help="путь к config.json")
    report.add_argument("--today", help="дата отчёта YYYY-MM-DD (по умолчанию — сегодня в часовом поясе из конфига)")
    notify = sub.add_parser("notify", help="отправить текст себе в Telegram")
    notify.add_argument("--file", required=True, help="файл с текстом сообщения")
    retro = sub.add_parser("retro-put", help="записать ретроспективу месяца")
    retro.add_argument("month", help="YYYY-MM")
    retro.add_argument("--file", required=True, help="JSON с полями ретроспективы")
    args = parser.parse_args(argv)

    load_local_secrets(FINANCE_DIR / "secrets.env")
    token = os.environ.get("FINTREE_PAT")
    if not token:
        print("Нет токена: задайте FINTREE_PAT", file=sys.stderr)
        return 2
    client = FinTreeClient(os.environ.get("FINTREE_BASE_URL", DEFAULT_BASE_URL), token)

    try:
        if args.command == "notify":
            client.notify(_read_text(args.file))
            return 0
        if args.command == "retro-put":
            client.put_retrospective(args.month, json.loads(_read_text(args.file)))
            return 0
        return _report(client, args)
    except (ApiError, ValueError, OSError) as e:
        print(str(e), file=sys.stderr)
        return 2


def _invest_plan(client: FinTreeClient, today: date) -> str | None:
    """Текст `nextMonthPlan` с планом пополнений: прошлый месяц, иначе позапрошлый; старше не смотрим."""
    for month in reversed(_last_full_months(today, 2)):
        try:
            retro = client.retrospective(month)
        except ApiError:
            continue  # план нужен только для подсказки «куда направить»; отчёт из-за него не падает
        text = (retro or {}).get("nextMonthPlan")
        if parse_invest_split(text) is not None:
            return text
    return None


def _report(client: FinTreeClient, args) -> int:
    cfg = load_config(_config_path(args.config))
    today = (date.fromisoformat(args.today) if args.today
             else datetime.now(timezone(timedelta(hours=cfg.tz_offset_hours))).date())

    categories = client.categories()
    raw = client.transactions(min(cfg.start_date, today - timedelta(days=FETCH_DAYS)))

    txs = [t for t in parse_transactions(raw, categories, cfg.tz_offset_hours) if t.day <= today]
    result = build_report(txs, cfg, today, invest_plan=_invest_plan(client, today))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
