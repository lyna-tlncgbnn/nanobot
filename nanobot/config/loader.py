"""Configuration loading utilities."""

import json
from pathlib import Path

from nanobot.config.schema import Config


def get_config_path() -> Path:
    """Get the default configuration file path."""
    # 总是优先使用项目根目录的配置文件路径
    # 即使文件不存在，也返回项目路径（用于创建新配置）
    return Path.cwd() / "config.json"


def get_global_config_path() -> Path:
    """Get the global configuration file path in user home directory."""
    return Path.home() / ".nanobot" / "config.json"


def get_data_dir() -> Path:
    """Get the nanobot data directory."""
    from nanobot.utils.helpers import get_data_path
    return get_data_path()


def load_config(config_path: Path | None = None) -> Config:
    """
    Load configuration from file or create default.

    Args:
        config_path: Optional path to config file. Uses default if not provided.

    Returns:
        Loaded configuration object.
    """
    if config_path:
        path = config_path
    else:
        # 尝试加载配置：优先项目目录，回退到全局
        project_config = Path.cwd() / "config.json"
        global_config = get_global_config_path()
        
        if project_config.exists():
            path = project_config
        elif global_config.exists():
            path = global_config
        else:
            # 都不存在，返回默认配置
            return Config()

    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            data = _migrate_config(data)
            return Config.model_validate(data)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Warning: Failed to load config from {path}: {e}")
            print("Using default configuration.")

    return Config()


def save_config(config: Config, config_path: Path | None = None) -> None:
    """
    Save configuration to file.

    Args:
        config: Configuration to save.
        config_path: Optional path to save to. Uses default if not provided.
    """
    path = config_path or get_config_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    data = config.model_dump(by_alias=True)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _migrate_config(data: dict) -> dict:
    """Migrate old config formats to current."""
    # Move tools.exec.restrictToWorkspace → tools.restrictToWorkspace
    tools = data.get("tools", {})
    exec_cfg = tools.get("exec", {})
    if "restrictToWorkspace" in exec_cfg and "restrictToWorkspace" not in tools:
        tools["restrictToWorkspace"] = exec_cfg.pop("restrictToWorkspace")
    return data
