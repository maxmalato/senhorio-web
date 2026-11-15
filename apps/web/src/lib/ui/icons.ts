// Ícones em SVG, descritos como dados (sem HTML cru). Decorativos: o texto ao lado diz o que é.

type Node = { tag: 'path' | 'rect' | 'circle'; attrs: Record<string, string | number> };
export interface IconDef {
  viewBox?: string;
  fill?: boolean;
  width?: number;
  nodes: Node[];
}

const path = (d: string, attrs: Record<string, string | number> = {}): Node => ({
  tag: 'path',
  attrs: { d, ...attrs },
});
const rect = (attrs: Record<string, string | number>): Node => ({ tag: 'rect', attrs });
const circle = (attrs: Record<string, string | number>): Node => ({ tag: 'circle', attrs });

export const ICONS = {
  menu: { width: 2.4, nodes: [path('M4 7h16M4 12h16M4 17h16')] },
  minimize: { width: 2.6, nodes: [path('M6 12h12')] },
  back: { width: 2.6, nodes: [path('M15 5l-7 7 7 7')] },
  left: { width: 2.6, nodes: [path('M15 5l-7 7 7 7')] },
  right: { width: 2.6, nodes: [path('M9 5l7 7-7 7')] },
  board: {
    width: 2,
    nodes: [
      rect({ x: 3.5, y: 3.5, width: 17, height: 17, rx: 2 }),
      path('M8 3.5v17M16 3.5v17M3.5 8h17M3.5 16h17'),
    ],
  },
  people: {
    width: 2,
    nodes: [
      circle({ cx: 9, cy: 8, r: 3.2 }),
      path('M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5'),
      circle({ cx: 17, cy: 9, r: 2.4 }),
      path('M16.5 14c2.4.2 4 1.6 4.5 4'),
    ],
  },
  device: {
    width: 2,
    nodes: [rect({ x: 6, y: 2.5, width: 12, height: 19, rx: 2.5 }), path('M10.5 18.5h3')],
  },
  devices: {
    width: 2,
    nodes: [
      rect({ x: 2.5, y: 5, width: 8, height: 14, rx: 2 }),
      rect({ x: 13.5, y: 5, width: 8, height: 14, rx: 2 }),
    ],
  },
  info: { nodes: [circle({ cx: 12, cy: 12, r: 9 }), path('M12 11v6M12 7.5v.2')] },
  hammer: { nodes: [path('M3 21l9-9M12.5 4.5l7 7-2.5 2.5-7-7z')] },
  tag: {
    nodes: [
      path('M3.5 12.5V4h8.5l8.5 8.5-8 8z'),
      circle({ cx: 8, cy: 8.5, r: 1.4, fill: 'currentColor' }),
    ],
  },
  bank: { nodes: [path('M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18')] },
  key: { nodes: [circle({ cx: 8, cy: 15, r: 4 }), path('M11 12l9-9M17 6l3 3M15 8l2 2')] },
  swap: { nodes: [path('M4 8h14l-3.5-3.5M20 16H6l3.5 3.5')] },
  pause: {
    fill: true,
    nodes: [
      rect({ x: 6.5, y: 5, width: 3.6, height: 14, rx: 1 }),
      rect({ x: 13.9, y: 5, width: 3.6, height: 14, rx: 1 }),
    ],
  },
  exit: { nodes: [path('M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10')] },
  crown: { fill: true, nodes: [path('M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z')] },
  house: { fill: true, viewBox: '0 0 10 10', nodes: [path('M5 1 9.4 4.8V9H.6V4.8z')] },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
