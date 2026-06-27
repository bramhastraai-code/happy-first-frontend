'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export interface ChartPoint {
  label: string;
  value: number;
  tooltipLabel?: string;
}

interface ActivityChartProps {
  data: ChartPoint[];
  variant?: 'bar' | 'line';
  height?: number;
  color?: string;
  selectedIndex?: number;
  onBarClick?: (label: string, index: number) => void;
}

const BAR_GRADIENT = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: '#fb923c' },
  { offset: 1, color: '#ea580c' },
]);

const BAR_SELECTED_GRADIENT = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: '#fdba74' },
  { offset: 1, color: '#c2410c' },
]);

function isDenseLineChart(variant: string, count: number) {
  return variant === 'line' && count > 10;
}

function labelStep(count: number) {
  if (count <= 10) return 1;
  if (count <= 20) return 2;
  if (count <= 28) return 4;
  return 5;
}

function shouldShowAxisLabel(index: number, count: number, selectedIndex: number) {
  if (count <= 10) return true;
  if (index === 0 || index === count - 1) return true;
  if (index === selectedIndex) return true;
  return index % labelStep(count) === 0;
}

function zoomWindow(dataLength: number, selectedIndex: number) {
  const windowSize = Math.min(14, dataLength);
  const focus = selectedIndex >= 0 ? selectedIndex : dataLength - 1;
  const startIndex = Math.max(0, Math.min(focus - Math.floor(windowSize / 2), dataLength - windowSize));
  const endIndex = Math.min(dataLength - 1, startIndex + windowSize - 1);
  return {
    start: dataLength <= windowSize ? 0 : (startIndex / dataLength) * 100,
    end: dataLength <= windowSize ? 100 : ((endIndex + 1) / dataLength) * 100,
  };
}

function numericValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'value' in value) {
    const inner = (value as { value?: unknown }).value;
    return typeof inner === 'number' ? inner : 0;
  }
  return 0;
}

export default function ActivityChart({
  data,
  variant = 'bar',
  height = 220,
  color = '#ea580c',
  selectedIndex = -1,
  onBarClick,
}: ActivityChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const dense = isDenseLineChart(variant, data.length);
    const zoom = dense ? zoomWindow(data.length, selectedIndex) : null;

    const barData =
      variant === 'bar'
        ? data.map((d, index) => ({
            value: d.value,
            itemStyle: {
              color: index === selectedIndex ? BAR_SELECTED_GRADIENT : BAR_GRADIENT,
              borderRadius: [8, 8, 0, 0],
              borderColor: index === selectedIndex ? '#1c1917' : 'transparent',
              borderWidth: index === selectedIndex ? 2 : 0,
            },
          }))
        : data.map((d) => d.value);

    const lineData =
      variant === 'line'
        ? data.map((d, index) => {
            const isSelected = index === selectedIndex;
            const hasPoints = d.value > 0;
            const showDot = !dense || isSelected || hasPoints;

            return {
              value: d.value,
              symbol: showDot ? 'circle' : 'none',
              symbolSize: isSelected ? 14 : hasPoints ? 10 : 0,
              itemStyle: {
                color: isSelected ? '#c2410c' : hasPoints ? color : 'transparent',
                borderColor: isSelected ? '#1c1917' : '#ffffff',
                borderWidth: isSelected ? 2 : hasPoints ? 1.5 : 0,
              },
            };
          })
        : data.map((d) => d.value);

    const option: EChartsOption = {
      animationDuration: 600,
      animationEasing: 'cubicOut',
      grid: {
        left: 8,
        right: 8,
        top: 16,
        bottom: dense ? 28 : 8,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1c1917',
        borderWidth: 0,
        textStyle: { color: '#fafaf9', fontSize: 12 },
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          const idx = typeof p.dataIndex === 'number' ? p.dataIndex : -1;
          const name = (idx >= 0 && data[idx]?.tooltipLabel) || p.name;
          return `<strong>${name}</strong><br/>${numericValue(p.value)} pts`;
        },
      },
      ...(dense && zoom
        ? {
            dataZoom: [
              {
                type: 'inside',
                xAxisIndex: 0,
                start: zoom.start,
                end: zoom.end,
                minValueSpan: 6,
                zoomOnMouseWheel: false,
                moveOnMouseMove: true,
                moveOnMouseWheel: true,
              },
            ],
          }
        : {}),
      xAxis: {
        type: 'category',
        data: data.map((d) => d.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: dense ? 10 : 11,
          rotate: dense ? 0 : data.length > 7 ? 35 : 0,
          hideOverlap: true,
          interval: (index: number) => shouldShowAxisLabel(index, data.length, selectedIndex),
          color: (value?: string | number) => {
            const idx = data.findIndex((d) => d.label === String(value));
            return idx === selectedIndex ? '#c2410c' : '#78716c';
          },
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f5f5f4' } },
        axisLabel: { color: '#a8a29e', fontSize: 11 },
      },
      series: [
        variant === 'bar'
          ? {
              type: 'bar',
              data: barData,
              barMaxWidth: 28,
            }
          : {
              type: 'line',
              data: lineData,
              smooth: dense ? 0.35 : true,
              connectNulls: true,
              symbol: 'circle',
              showSymbol: true,
              lineStyle: { color, width: dense ? 2 : 3 },
              emphasis: {
                focus: 'series',
                scale: true,
                itemStyle: {
                  borderColor: '#1c1917',
                  borderWidth: 2,
                },
              },
              areaStyle: dense
                ? undefined
                : {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: 'rgba(234,88,12,0.25)' },
                      { offset: 1, color: 'rgba(234,88,12,0)' },
                    ]),
                  },
            },
      ],
    };

    instanceRef.current.setOption(option, true);

    if (dense && selectedIndex >= 0) {
      instanceRef.current.dispatchAction({
        type: 'showTip',
        seriesIndex: 0,
        dataIndex: selectedIndex,
      });
    }

    instanceRef.current.off('click');
    if (onBarClick) {
      instanceRef.current.on('click', (params) => {
        if (typeof params.dataIndex === 'number') {
          onBarClick(data[params.dataIndex].label, params.dataIndex);
        }
      });
    }

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, variant, color, onBarClick, selectedIndex]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return (
    <div className="w-full touch-pan-x">
      <div ref={chartRef} style={{ width: '100%', height }} />
      {isDenseLineChart(variant, data.length) && (
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          Swipe chart to browse days · dots show logged days
        </p>
      )}
    </div>
  );
}
