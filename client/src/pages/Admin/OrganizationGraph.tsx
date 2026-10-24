import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';

import type { OrganizationResponse, UserLevel } from '@shared/api.interface';

interface GraphPalette {
  label: string;
  line: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const LIGHT_PALETTE: GraphPalette = {
  label: '#1F2937',
  line: '#CBD5E1',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E5E7EB',
  tooltipText: '#1F2937',
};

const DARK_PALETTE: GraphPalette = {
  label: '#E5E7EB',
  line: '#475569',
  tooltipBg: '#1F2937',
  tooltipBorder: '#374151',
  tooltipText: '#F3F4F6',
};

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() =>
    document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const sync = (): void => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', sync);
    };
  }, []);

  return isDark;
}

interface OrganizationGraphProps {
  data: OrganizationResponse;
  onSelectGroup: (groupId: string) => void;
}

const LEVEL_COLORS: Record<UserLevel, string> = {
  super_admin: '#DC2626',
  level_1: '#7C3AED',
  level_2: '#2563EB',
  level_3: '#0E9F6E',
};

const LEVEL_LABELS: Record<UserLevel, string> = {
  super_admin: '超级管理员',
  level_1: '一级管理员',
  level_2: '组长',
  level_3: '成员',
};

interface GraphNode {
  id: string;
  name: string;
  category: number;
  symbol: string;
  symbolSize: number | number[];
  value: number;
  groupId?: string;
  level?: UserLevel;
  nodeType: 'group' | 'person';
  itemStyle: { color: string };
  label?: { show: boolean };
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export function OrganizationGraph({
  data,
  onSelectGroup,
}: OrganizationGraphProps) {
  const isDark = useIsDark();
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const personSeen = new Set<string>();

  for (const group of data.groups) {
    nodes.push({
      id: `group:${group.id}`,
      name: group.name,
      category: 0,
      symbol: 'roundRect',
      symbolSize: [96 + Math.min(group.members.length, 10) * 8, 36],
      value: group.members.length,
      groupId: group.id,
      nodeType: 'group',
      itemStyle: { color: '#0A2540' },
      label: { show: true },
    });

    for (const member of group.members) {
      const personId = `person:${member.id}`;
      if (!personSeen.has(member.id)) {
        personSeen.add(member.id);
        nodes.push({
          id: personId,
          name: member.nickname,
          category: 1,
          symbol: 'circle',
          symbolSize: member.level === 'level_3' ? 16 : 22,
          value: 1,
          level: member.level,
          nodeType: 'person',
          itemStyle: { color: LEVEL_COLORS[member.level] },
        });
      }
      links.push({ source: `group:${group.id}`, target: personId, value: 1 });
    }
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      textStyle: { color: palette.tooltipText },
      formatter: (params: TopLevelFormatterParams) => {
        const single = Array.isArray(params) ? params[0] : params;
        const node = single.data as GraphNode | undefined;
        if (!node || node.nodeType !== 'group') {
          const level = node?.level ? LEVEL_LABELS[node.level] : '成员';
          return `${node?.name ?? ''}<br/>${level}`;
        }
        const group = data.groups.find((item) => item.id === node.groupId);
        const leader = group?.leaderName ? `组长：${group.leaderName}` : '未设置组长';
        return `${node.name}<br/>${leader}<br/>成员 ${node.value} 人`;
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      textStyle: { color: palette.label },
      data: ['分组', '超级管理员', '一级管理员', '组长', '成员'],
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        categories: [
          { name: '分组', itemStyle: { color: '#0A2540' } },
          { name: '超级管理员', itemStyle: { color: LEVEL_COLORS.super_admin } },
          { name: '一级管理员', itemStyle: { color: LEVEL_COLORS.level_1 } },
          { name: '组长', itemStyle: { color: LEVEL_COLORS.level_2 } },
          { name: '成员', itemStyle: { color: LEVEL_COLORS.level_3 } },
        ],
        force: {
          repulsion: 420,
          edgeLength: [50, 160],
          gravity: 0.08,
        },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          color: palette.label,
        },
        lineStyle: {
          color: palette.line,
          width: 1,
          curveness: 0.12,
        },
        emphasis: {
          focus: 'adjacency',
          label: { color: palette.label },
          lineStyle: { width: 2, color: '#2563EB' },
        },
        data: nodes,
        links,
      },
    ],
  };

  return (
    <div className="rounded-lg border bg-card p-2">
      <ReactECharts
        option={option}
        theme="ud"
        className="h-[560px]"
        onEvents={{
          click: (params: unknown): void => {
            const payload = params as {
              dataType?: string;
              data?: GraphNode;
            };
            const groupId = payload.data?.groupId;
            if (payload.dataType === 'node' && groupId) {
              onSelectGroup(groupId);
            }
          },
        }}
      />
    </div>
  );
}
