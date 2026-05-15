"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, CandlestickData, HistogramData, Time } from "lightweight-charts";
import { getTradingSocket } from "@/lib/tradingSocket";
import type { OhlcvCandle, TradingAsset } from "@/types";

interface Props {
  asset: TradingAsset | null;
}

const RESOLUTIONS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
];

export default function TradingChart({ asset }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [resolution, setResolution] = useState("5m");
  const [candles, setCandles] = useState<OhlcvCandle[]>([]);

  // Fetch history
  useEffect(() => {
    if (!asset) return;
    fetch(`/api/trading/history/${asset.id}/${resolution}`)
      .then((r) => r.json())
      .then(setCandles)
      .catch(() => {});
  }, [asset, resolution]);

  // Init chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 420,
      layout: {
        background: { color: "transparent" },
        textColor: "#64748b",
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.06)" },
        horzLines: { color: "rgba(148,163,184,0.06)" },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "rgba(147,51,234,0.4)", width: 1, style: 2 },
        horzLine: { color: "rgba(147,51,234,0.4)", width: 1, style: 2 },
      },
      timeScale: {
        borderColor: "rgba(148,163,184,0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "rgba(148,163,184,0.1)",
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (candles.length === 0) return;

    candleSeriesRef.current.setData(
      candles.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close } as CandlestickData))
    );

    volumeSeriesRef.current.setData(
      candles.map((c) => ({ time: c.time as Time, value: c.volume, color: c.close >= c.open ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" } as HistogramData))
    );
  }, [candles]);

  // Real-time update via socket
  useEffect(() => {
    if (!asset) return;
    const socket = getTradingSocket();

    const handleTick = (tick: { assetId: number; price: number; volume: number }) => {
      if (tick.assetId !== asset.id) return;
      if (!candleSeriesRef.current) return;

      const now = Math.floor(Date.now() / 1000) as Time;
      candleSeriesRef.current.update({ time: now, open: tick.price, high: tick.price, low: tick.price, close: tick.price });
    };

    socket.on("market:tick", handleTick);
    return () => {
      socket.off("market:tick", handleTick);
    };
  }, [asset]);

  if (!asset) {
    return (
      <div className="flex items-center justify-center h-[420px] rounded-sm border border-white/5 bg-bg-dark/50">
        <p className="text-text-muted/40 text-sm font-mono">Select an asset to view chart</p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-white/5 bg-bg-dark/50 overflow-hidden">
      {/* Resolution toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
        {RESOLUTIONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setResolution(r.value)}
            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm transition-all ${
              resolution === r.value
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "text-text-muted/50 hover:text-white/70 border border-transparent"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div ref={chartContainerRef} />
    </div>
  );
}
