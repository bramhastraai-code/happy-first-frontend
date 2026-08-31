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
import { chartPalette } from '@/lib/theme/mascotTheme';
import { useMascotThemeColor } from '@/lib/hooks/useMascotThemeColor';

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
  displayValue?: string;
}

export interface ChartBarGroup {
  name: string;
  color: string;
  values: number[];
}

interface ActivityChartProps {
  data: ChartPoint[];
  variant?: 'bar' | 'line';
  height?: number;
  color?: string;
  selectedIndex?: number;
  onBarClick?: (label: string, index: number) => void;
  tooltipUnit?: string;
  yAxisLabelFormatter?: (value: number) => string;
  showBarLabels?: boolean;
  showLineLabels?: boolean;
  enableInsideZoom?: boolean;
  barGroups?: ChartBarGroup[];
}

function barGradient(top: string, bottom: string) {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: top },
    { offset: 1, color: bottom },
  ]);
}

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
  color,
  selectedIndex = -1,
  onBarClick,
  tooltipUnit = 'pts',
  yAxisLabelFormatter,
  showBarLabels = false,
  showLineLabels = false,
  enableInsideZoom = true,
  barGroups,
}: ActivityChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const themeColor = useMascotThemeColor();
  const seriesColor = color || themeColor;
  const palette = chartPalette(seriesColor);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const dense = isDenseLineChart(variant, data.length);
    const zoom = dense && enableInsideZoom ? zoomWindow(data.length, selectedIndex) : null;
    const fill = barGradient(palette.light, palette.primary);
    const selectedFill = barGradient(palette.light, palette.selected);

    const groupedBars = variant === 'bar' && (barGroups?.length ?? 0) > 0;
    const barLabel = showBarLabels
      ? {
          show: true,
          position: 'top' as const,
          fontSize: 10,
          fontWeight: 600,
          color: '#57534e',
          formatter: (params: { dataIndex?: number; value?: unknown }) => {
            const idx = typeof params.dataIndex === 'number' ? params.dataIndex : -1;
            if (!groupedBars && idx >= 0 && data[idx]?.displayValue) {
              return data[idx].displayValue;
            }
            const n = numericValue(params.value);
            return Number.isInteger(n) ? String(n) : n.toFixed(1);
          },
        }
      : undefined;

    const barData =
      variant === 'bar' && !groupedBars
        ? data.map((d, index) => ({
            value: d.value,
            itemStyle: {
              color: index === selectedIndex ? selectedFill : fill,
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
                color: isSelected ? palette.selected : hasPoints ? seriesColor : 'transparent',
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
        top:
          groupedBars || (showBarLabels && variant === 'bar') || (showLineLabels && variant === 'line')
            ? 36
            : 16,
        bottom: dense && zoom ? 28 : 8,
        containLabel: true,
      },
      ...(groupedBars
        ? {
            legend: {
              top: 0,
              left: 0,
              itemWidth: 10,
              itemHeight: 10,
              textStyle: { fontSize: 11, color: '#57534e' },
            },
          }
        : {}),
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1c1917',
        borderWidth: 0,
        textStyle: { color: '#fafaf9', fontSize: 12 },
        formatter: (params) => {
          const list = Array.isArray(params) ? params : [params];
          const idx = typeof list[0]?.dataIndex === 'number' ? list[0].dataIndex : -1;
          const name = (idx >= 0 && data[idx]?.tooltipLabel) || list[0]?.name || '';
          if (groupedBars) {
            const rows = list
              .map((item) => `${item.marker || ''}${item.seriesName}: ${numericValue(item.value).toFixed(1)}`)
              .join('<br/>');
            return `<strong>${name}</strong><br/>${rows}`;
          }
          const p = list[0];
          const unit = tooltipUnit ? ` ${tooltipUnit}` : '';
          const display =
            idx >= 0 && data[idx]?.displayValue
              ? data[idx].displayValue
              : `${numericValue(p.value)}${unit}`;
          return `<strong>${name}</strong><br/>${display}`;
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
            return idx === selectedIndex ? palette.selected : '#78716c';
          },
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f5f5f4' } },
        axisLabel: {
          color: '#a8a29e',
          fontSize: 11,
          formatter: yAxisLabelFormatter ? (value: number) => yAxisLabelFormatter(value) : undefined,
        },
      },
      series: groupedBars
        ? (barGroups || []).map((group) => ({
            type: 'bar' as const,
            name: group.name,
            data: group.values.map((value, index) => ({
              value,
              itemStyle: {
                color: group.color,
                borderRadius: [6, 6, 0, 0],
                borderColor: index === selectedIndex ? '#1c1917' : 'transparent',
                borderWidth: index === selectedIndex ? 2 : 0,
              },
            })),
            barMaxWidth: 18,
            ...(barLabel ? { label: barLabel } : {}),
          }))
        : [
            variant === 'bar'
              ? {
                  type: 'bar' as const,
                  data: barData,
                  barMaxWidth: 28,
                  ...(barLabel ? { label: barLabel } : {}),
                }
              : {
                  type: 'line' as const,
                  data: lineData,
                  smooth: dense ? 0.35 : true,
                  connectNulls: true,
                  symbol: 'circle',
                  showSymbol: true,
                  lineStyle: { color: seriesColor, width: dense ? 2 : 3 },
                  ...(showLineLabels
                    ? {
                        label: {
                          show: true,
                          position: 'top' as const,
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#57534e',
                          formatter: (params: { dataIndex?: number; value?: unknown }) => {
                            const idx = typeof params.dataIndex === 'number' ? params.dataIndex : -1;
                            if (idx >= 0 && data[idx]?.displayValue) return data[idx].displayValue;
                            return String(numericValue(params.value));
                          },
                        },
                      }
                    : {}),
                  emphasis: {
                    focus: 'series' as const,
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
                          { offset: 0, color: palette.areaTop },
                          { offset: 1, color: palette.areaBottom },
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
  }, [
    data,
    variant,
    seriesColor,
    palette.light,
    palette.primary,
    palette.selected,
    palette.areaTop,
    palette.areaBottom,
    onBarClick,
    selectedIndex,
    tooltipUnit,
    yAxisLabelFormatter,
    showBarLabels,
    showLineLabels,
    enableInsideZoom,
    barGroups,
  ]);

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return (
    <div
      className={
        enableInsideZoom && isDenseLineChart(variant, data.length)
          ? 'w-full touch-pan-x'
          : onBarClick
            ? 'w-full cursor-pointer touch-pan-y'
            : 'w-full touch-pan-y'
      }
    >
      <div
        ref={chartRef}
        style={{
          width: '100%',
          height,
          touchAction: enableInsideZoom && isDenseLineChart(variant, data.length) ? 'pan-x' : 'pan-y',
        }}
      />
      {enableInsideZoom && isDenseLineChart(variant, data.length) && (
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          Swipe chart to browse days · dots show logged days
        </p>
      )}
    </div>
  );
}
