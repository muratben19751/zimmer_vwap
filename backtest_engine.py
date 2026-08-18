"""
Dynamic Swing Anchored VWAP (Zeiierman) — Backtesting Engine.

Provides event-driven strategy simulation with realistic execution modeling,
stop loss, take profit, trailing stops, transaction fees, and institutional risk metrics.

Wiki References:
- Bkz: [[backtest_engine]] (Varlık Dokümantasyonu)
- Bkz: [[backtesting_strategy]] (Strateji ve Risk Yönetimi)
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Literal, Optional

import numpy as np
import pandas as pd


@dataclass
class Trade:
    trade_id: int
    entry_time: int
    exit_time: int
    direction: Literal["LONG", "SHORT"]
    entry_price: float
    exit_price: float
    size: float
    pnl: float
    pnl_pct: float
    commission: float
    exit_reason: str
    bars_held: int


@dataclass
class BacktestResult:
    initial_capital: float
    final_capital: float
    net_profit: float
    net_profit_pct: float
    benchmark_return_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    profit_factor: float
    max_drawdown_pct: float
    max_drawdown_usd: float
    sharpe_ratio: float
    sortino_ratio: float
    avg_trade_pnl_pct: float
    avg_win_pct: float
    avg_loss_pct: float
    win_loss_ratio: float
    equity_curve: List[Dict[str, Any]]
    trades: List[Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def run_dsavwap_backtest(
    df: pd.DataFrame,
    out: pd.DataFrame,
    strategy_type: str = "pivot_flip",  # "pivot_flip", "price_cross", "pullback_bounce"
    trade_mode: str = "long_and_short",  # "long_and_short", "long_only", "short_only"
    initial_capital: float = 10000.0,
    position_size_pct: float = 100.0,  # % of current equity
    stop_loss_pct: Optional[float] = None,  # e.g., 3.0 for 3%
    take_profit_pct: Optional[float] = None,  # e.g., 6.0 for 6%
    trailing_stop_pct: Optional[float] = None,  # e.g., 2.5 for 2.5%
    commission_pct: float = 0.05,  # 0.05% per trade (entry and exit)
    pullback_threshold_pct: float = 1.0,  # for pullback_bounce strategy
) -> BacktestResult:
    """
    Run backtest simulation for Dynamic Swing Anchored VWAP.

    Parameters
    ----------
    df : pd.DataFrame
        OHLCV DataFrame.
    out : pd.DataFrame
        Output from `dynamic_swing_anchored_vwap`.
    strategy_type : str
        'pivot_flip', 'price_cross', or 'pullback_bounce'.
    trade_mode : str
        'long_and_short', 'long_only', or 'short_only'.
    initial_capital : float
        Starting portfolio capital in USD.
    position_size_pct : float
        Percentage of portfolio equity per trade (1.0 to 100.0).
    stop_loss_pct : Optional[float]
        Stop loss percentage from entry price.
    take_profit_pct : Optional[float]
        Take profit percentage from entry price.
    trailing_stop_pct : Optional[float]
        Trailing stop loss percentage from peak favorable price.
    commission_pct : float
        Commission & slippage percentage per side (0.05% = 0.0005).
    pullback_threshold_pct : float
        Distance percentage from DSAVWAP to trigger pullback entry.

    Returns
    -------
    BacktestResult
    """
    n = len(df)
    if n < 2:
        return _empty_backtest_result(initial_capital)

    col_map = {c.lower(): c for c in df.columns}
    open_arr = df[col_map["open"]].to_numpy(dtype=float)
    high_arr = df[col_map["high"]].to_numpy(dtype=float)
    low_arr = df[col_map["low"]].to_numpy(dtype=float)
    close_arr = df[col_map["close"]].to_numpy(dtype=float)

    dsavwap_arr = out["dsavwap"].to_numpy(dtype=float)
    dir_arr = out["dir"].to_numpy(dtype=int)
    anchor_arr = out["anchor"].to_numpy(dtype=bool)

    timestamps = []
    for idx in df.index:
        if isinstance(idx, pd.Timestamp):
            timestamps.append(int(idx.timestamp()))
        else:
            try:
                dt = pd.to_datetime(idx)
                timestamps.append(int(dt.timestamp()))
            except Exception:
                timestamps.append(0)

    # Convert percentage inputs
    fee_rate = commission_pct / 100.0
    sl_rate = (stop_loss_pct / 100.0) if (stop_loss_pct and stop_loss_pct > 0) else None
    tp_rate = (take_profit_pct / 100.0) if (take_profit_pct and take_profit_pct > 0) else None
    ts_rate = (trailing_stop_pct / 100.0) if (trailing_stop_pct and trailing_stop_pct > 0) else None

    # Benchmark calculation
    bench_initial = close_arr[0]
    bench_final = close_arr[-1]
    benchmark_return_pct = ((bench_final - bench_initial) / bench_initial * 100.0) if bench_initial > 0 else 0.0

    # Simulation State
    cash = initial_capital
    position_dir = 0  # +1 for Long, -1 for Short, 0 for Flat
    position_size = 0.0
    entry_price = 0.0
    entry_idx = 0
    entry_time = 0
    peak_price = 0.0  # for trailing stop
    trades: List[Trade] = []
    equity_curve: List[Dict[str, Any]] = []

    trade_id_counter = 1

    for i in range(n):
        curr_time = timestamps[i]
        curr_open = open_arr[i]
        curr_high = high_arr[i]
        curr_low = low_arr[i]
        curr_close = close_arr[i]
        curr_vwap = dsavwap_arr[i]
        curr_dir = dir_arr[i]

        # 1. Manage Active Position (Check SL, TP, Trailing Stop, or End of Data)
        if position_dir != 0:
            exit_triggered = False
            exit_price_val = 0.0
            exit_reason = ""

            if position_dir == 1:  # LONG
                peak_price = max(peak_price, curr_high)

                # Stop Loss
                if sl_rate and curr_low <= entry_price * (1.0 - sl_rate):
                    exit_triggered = True
                    exit_price_val = min(curr_open, entry_price * (1.0 - sl_rate))
                    exit_reason = "STOP_LOSS"
                # Take Profit
                elif tp_rate and curr_high >= entry_price * (1.0 + tp_rate):
                    exit_triggered = True
                    exit_price_val = max(curr_open, entry_price * (1.0 + tp_rate))
                    exit_reason = "TAKE_PROFIT"
                # Trailing Stop
                elif ts_rate and curr_low <= peak_price * (1.0 - ts_rate):
                    exit_triggered = True
                    exit_price_val = min(curr_open, peak_price * (1.0 - ts_rate))
                    exit_reason = "TRAILING_STOP"

            elif position_dir == -1:  # SHORT
                peak_price = min(peak_price, curr_low)

                # Stop Loss
                if sl_rate and curr_high >= entry_price * (1.0 + sl_rate):
                    exit_triggered = True
                    exit_price_val = max(curr_open, entry_price * (1.0 + sl_rate))
                    exit_reason = "STOP_LOSS"
                # Take Profit
                elif tp_rate and curr_low <= entry_price * (1.0 - tp_rate):
                    exit_triggered = True
                    exit_price_val = min(curr_open, entry_price * (1.0 - tp_rate))
                    exit_reason = "TAKE_PROFIT"
                # Trailing Stop
                elif ts_rate and curr_high >= peak_price * (1.0 + ts_rate):
                    exit_triggered = True
                    exit_price_val = max(curr_open, peak_price * (1.0 + ts_rate))
                    exit_reason = "TRAILING_STOP"

            # Execute Exit if hit during bar
            if exit_triggered:
                # Fee on exit
                exit_val = position_size * exit_price_val
                exit_fee = exit_val * fee_rate
                gross_pnl = (exit_price_val - entry_price) * position_size if position_dir == 1 else (entry_price - exit_price_val) * position_size
                entry_fee = (position_size * entry_price) * fee_rate
                net_pnl = gross_pnl - (entry_fee + exit_fee)
                pnl_pct = (net_pnl / (position_size * entry_price)) * 100.0

                cash += (position_size * entry_price) + net_pnl

                trades.append(
                    Trade(
                        trade_id=trade_id_counter,
                        entry_time=entry_time,
                        exit_time=curr_time,
                        direction="LONG" if position_dir == 1 else "SHORT",
                        entry_price=round(entry_price, 2),
                        exit_price=round(exit_price_val, 2),
                        size=round(position_size, 4),
                        pnl=round(net_pnl, 2),
                        pnl_pct=round(pnl_pct, 2),
                        commission=round(entry_fee + exit_fee, 2),
                        exit_reason=exit_reason,
                        bars_held=i - entry_idx,
                    )
                )
                trade_id_counter += 1
                position_dir = 0
                position_size = 0.0

        # 2. Evaluate Entry / Reversal Signals
        sig_long = False
        sig_short = False

        if not np.isnan(curr_vwap) and i > 0:
            prev_vwap = dsavwap_arr[i - 1]
            prev_close = close_arr[i - 1]
            prev_dir = dir_arr[i - 1]

            if strategy_type == "pivot_flip":
                # Signal on direction flip or anchor confirmation
                if curr_dir == 1 and prev_dir == -1:
                    sig_long = True
                elif curr_dir == -1 and prev_dir == 1:
                    sig_short = True

            elif strategy_type == "price_cross":
                # Close crossing DSAVWAP
                if prev_close <= prev_vwap and curr_close > curr_vwap:
                    sig_long = True
                elif prev_close >= prev_vwap and curr_close < curr_vwap:
                    sig_short = True

            elif strategy_type == "pullback_bounce":
                # In Bullish regime, pullback to DSAVWAP with bullish bar
                dist_pct = abs(curr_low - curr_vwap) / curr_vwap * 100.0
                if curr_dir == 1 and dist_pct <= pullback_threshold_pct and curr_close > curr_open:
                    sig_long = True

                # In Bearish regime, rally to DSAVWAP with bearish bar
                dist_high_pct = abs(curr_high - curr_vwap) / curr_vwap * 100.0
                if curr_dir == -1 and dist_high_pct <= pullback_threshold_pct and curr_close < curr_open:
                    sig_short = True

        # Filter by trade mode
        if trade_mode == "long_only":
            sig_short = False
        elif trade_mode == "short_only":
            sig_long = False

        # 3. Process Signals
        # Case A: Exit existing position if opposite signal occurs
        if position_dir == 1 and (sig_short or (trade_mode == "long_only" and dir_arr[i] == -1 and strategy_type == "pivot_flip")):
            exit_price_val = curr_close
            exit_val = position_size * exit_price_val
            exit_fee = exit_val * fee_rate
            entry_fee = (position_size * entry_price) * fee_rate
            net_pnl = (exit_price_val - entry_price) * position_size - (entry_fee + exit_fee)
            pnl_pct = (net_pnl / (position_size * entry_price)) * 100.0

            cash += (position_size * entry_price) + net_pnl

            trades.append(
                Trade(
                    trade_id=trade_id_counter,
                    entry_time=entry_time,
                    exit_time=curr_time,
                    direction="LONG",
                    entry_price=round(entry_price, 2),
                    exit_price=round(exit_price_val, 2),
                    size=round(position_size, 4),
                    pnl=round(net_pnl, 2),
                    pnl_pct=round(pnl_pct, 2),
                    commission=round(entry_fee + exit_fee, 2),
                    exit_reason="SIGNAL_REVERSAL",
                    bars_held=i - entry_idx,
                )
            )
            trade_id_counter += 1
            position_dir = 0
            position_size = 0.0

        elif position_dir == -1 and (sig_long or (trade_mode == "short_only" and dir_arr[i] == 1 and strategy_type == "pivot_flip")):
            exit_price_val = curr_close
            exit_val = position_size * exit_price_val
            exit_fee = exit_val * fee_rate
            entry_fee = (position_size * entry_price) * fee_rate
            net_pnl = (entry_price - exit_price_val) * position_size - (entry_fee + exit_fee)
            pnl_pct = (net_pnl / (position_size * entry_price)) * 100.0

            cash += (position_size * entry_price) + net_pnl

            trades.append(
                Trade(
                    trade_id=trade_id_counter,
                    entry_time=entry_time,
                    exit_time=curr_time,
                    direction="SHORT",
                    entry_price=round(entry_price, 2),
                    exit_price=round(exit_price_val, 2),
                    size=round(position_size, 4),
                    pnl=round(net_pnl, 2),
                    pnl_pct=round(pnl_pct, 2),
                    commission=round(entry_fee + exit_fee, 2),
                    exit_reason="SIGNAL_REVERSAL",
                    bars_held=i - entry_idx,
                )
            )
            trade_id_counter += 1
            position_dir = 0
            position_size = 0.0

        # Case B: Enter New Position (if flat)
        if position_dir == 0 and i < n - 1:  # don't enter on very last bar
            if sig_long:
                position_dir = 1
                alloc_cash = cash * (position_size_pct / 100.0)
                entry_price = curr_close
                entry_fee = alloc_cash * fee_rate
                position_size = (alloc_cash - entry_fee) / entry_price
                cash -= alloc_cash
                entry_time = curr_time
                entry_idx = i
                peak_price = curr_high

            elif sig_short:
                position_dir = -1
                alloc_cash = cash * (position_size_pct / 100.0)
                entry_price = curr_close
                entry_fee = alloc_cash * fee_rate
                position_size = (alloc_cash - entry_fee) / entry_price
                cash -= alloc_cash
                entry_time = curr_time
                entry_idx = i
                peak_price = curr_low

        # Calculate current equity at close of bar
        unrealized_pnl = 0.0
        if position_dir == 1:
            unrealized_pnl = (curr_close - entry_price) * position_size
        elif position_dir == -1:
            unrealized_pnl = (entry_price - curr_close) * position_size

        invested_capital = (position_size * entry_price) if position_dir != 0 else 0.0
        current_equity = cash + invested_capital + unrealized_pnl
        bench_equity = initial_capital * (curr_close / bench_initial)

        equity_curve.append(
            {
                "time": curr_time,
                "equity": round(current_equity, 2),
                "benchmark": round(bench_equity, 2),
                "in_position": position_dir,
            }
        )

    # Close any open position on the last bar
    if position_dir != 0:
        last_close = close_arr[-1]
        gross_pnl = (last_close - entry_price) * position_size if position_dir == 1 else (entry_price - last_close) * position_size
        entry_fee = (position_size * entry_price) * fee_rate
        exit_fee = (position_size * last_close) * fee_rate
        net_pnl = gross_pnl - (entry_fee + exit_fee)
        pnl_pct = (net_pnl / (position_size * entry_price)) * 100.0
        cash += (position_size * entry_price) + net_pnl

        trades.append(
            Trade(
                trade_id=trade_id_counter,
                entry_time=entry_time,
                exit_time=timestamps[-1],
                direction="LONG" if position_dir == 1 else "SHORT",
                entry_price=round(entry_price, 2),
                exit_price=round(last_close, 2),
                size=round(position_size, 4),
                pnl=round(net_pnl, 2),
                pnl_pct=round(pnl_pct, 2),
                commission=round(entry_fee + exit_fee, 2),
                exit_reason="END_OF_DATA",
                bars_held=n - 1 - entry_idx,
            )
        )
        position_dir = 0
        if equity_curve:
            equity_curve[-1]["equity"] = round(cash, 2)

    # 4. Comprehensive Metrics Calculation
    final_capital = cash
    net_profit = final_capital - initial_capital
    net_profit_pct = (net_profit / initial_capital) * 100.0

    eq_series = np.array([e["equity"] for e in equity_curve])
    running_max = np.maximum.accumulate(eq_series)
    drawdowns = (eq_series - running_max) / running_max
    max_drawdown_pct = float(abs(drawdowns.min()) * 100.0) if len(drawdowns) > 0 else 0.0
    max_drawdown_usd = float(abs((eq_series - running_max).min())) if len(eq_series) > 0 else 0.0

    # Add drawdown pct to equity curve points
    for idx, pt in enumerate(equity_curve):
        pt["drawdown_pct"] = round(float(drawdowns[idx] * 100.0), 2)

    total_trades = len(trades)
    winning_trades_list = [t for t in trades if t.pnl > 0]
    losing_trades_list = [t for t in trades if t.pnl <= 0]

    winning_trades = len(winning_trades_list)
    losing_trades = len(losing_trades_list)
    win_rate_pct = (winning_trades / total_trades * 100.0) if total_trades > 0 else 0.0

    gross_profit = sum(t.pnl for t in winning_trades_list)
    gross_loss = abs(sum(t.pnl for t in losing_trades_list))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (999.0 if gross_profit > 0 else 0.0)

    avg_win_pct = (sum(t.pnl_pct for t in winning_trades_list) / winning_trades) if winning_trades > 0 else 0.0
    avg_loss_pct = (sum(t.pnl_pct for t in losing_trades_list) / losing_trades) if losing_trades > 0 else 0.0
    avg_trade_pnl_pct = (sum(t.pnl_pct for t in trades) / total_trades) if total_trades > 0 else 0.0
    win_loss_ratio = (abs(avg_win_pct / avg_loss_pct)) if abs(avg_loss_pct) > 0 else 0.0

    # Sharpe & Sortino (per-bar returns annualized)
    returns = np.diff(eq_series) / eq_series[:-1] if len(eq_series) > 1 else np.array([0.0])
    mean_ret = np.mean(returns) if len(returns) > 0 else 0.0
    std_ret = np.std(returns) if len(returns) > 0 else 0.0
    downside_returns = returns[returns < 0]
    std_downside = np.std(downside_returns) if len(downside_returns) > 0 else 0.0

    # Assuming 252 trading days per year
    annual_factor = math.sqrt(252)
    sharpe_ratio = float((mean_ret / std_ret) * annual_factor) if std_ret > 0 else 0.0
    sortino_ratio = float((mean_ret / std_downside) * annual_factor) if std_downside > 0 else 0.0

    return BacktestResult(
        initial_capital=round(initial_capital, 2),
        final_capital=round(final_capital, 2),
        net_profit=round(net_profit, 2),
        net_profit_pct=round(net_profit_pct, 2),
        benchmark_return_pct=round(benchmark_return_pct, 2),
        total_trades=total_trades,
        winning_trades=winning_trades,
        losing_trades=losing_trades,
        win_rate_pct=round(win_rate_pct, 2),
        profit_factor=round(profit_factor, 2),
        max_drawdown_pct=round(max_drawdown_pct, 2),
        max_drawdown_usd=round(max_drawdown_usd, 2),
        sharpe_ratio=round(sharpe_ratio, 2),
        sortino_ratio=round(sortino_ratio, 2),
        avg_trade_pnl_pct=round(avg_trade_pnl_pct, 2),
        avg_win_pct=round(avg_win_pct, 2),
        avg_loss_pct=round(avg_loss_pct, 2),
        win_loss_ratio=round(win_loss_ratio, 2),
        equity_curve=equity_curve,
        trades=[asdict(t) for t in trades],
    )


def _empty_backtest_result(initial_capital: float) -> BacktestResult:
    return BacktestResult(
        initial_capital=round(initial_capital, 2),
        final_capital=round(initial_capital, 2),
        net_profit=0.0,
        net_profit_pct=0.0,
        benchmark_return_pct=0.0,
        total_trades=0,
        winning_trades=0,
        losing_trades=0,
        win_rate_pct=0.0,
        profit_factor=0.0,
        max_drawdown_pct=0.0,
        max_drawdown_usd=0.0,
        sharpe_ratio=0.0,
        sortino_ratio=0.0,
        avg_trade_pnl_pct=0.0,
        avg_win_pct=0.0,
        avg_loss_pct=0.0,
        win_loss_ratio=0.0,
        equity_curve=[],
        trades=[],
    )
