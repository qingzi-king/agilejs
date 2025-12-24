import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // 主侧边栏
  tutorialSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Canvas 引擎',
      link: {
        type: 'doc',
        id: 'canvas/index',
      },
      items: [
        'canvas/architecture',
        'canvas/configuration',
        'canvas/nodes',
        'canvas/edges',
        'canvas/themes',
        'canvas/commands',
        'canvas/events',
        'canvas/custom-renderers',
        'canvas/utilities',
        'canvas/mobile-support',
        'canvas/interaction/config',
        {
          type: 'category',
          label: 'API 参考',
          link: {
            type: 'doc',
            id: 'canvas/api/index',
          },
          items: [
            'canvas/api/canvas-engine',
            'canvas/api/graph',
            'canvas/api/commands',
            'canvas/api/command-history',
            'canvas/api/plugin-manager',
            'canvas/api/animation-manager',
          ],
        },
        {
          type: 'category',
          label: '插件参考',
          link: {
            type: 'doc',
            id: 'canvas/plugins/index',
          },
          items: [
            {
              type: 'category',
              label: '交互类插件',
              items: [
                'canvas/plugins/pan-zoom',
                'canvas/plugins/drag',
                'canvas/plugins/selection-overlay',
                'canvas/plugins/box-select',
                'canvas/plugins/hover-cursor',
              ],
            },
            {
              type: 'category',
              label: '编辑类插件',
              items: [
                'canvas/plugins/resize-rotate',
                'canvas/plugins/inline-text-edit',
                'canvas/plugins/group-resize-rotate',
                'canvas/plugins/edge-edit',
                'canvas/plugins/polyline-node-edit',
              ],
            },
            {
              type: 'category',
              label: '连接和辅助类插件',
              items: [
                'canvas/plugins/connect',
                'canvas/plugins/grid',
                'canvas/plugins/guides',
                'canvas/plugins/snap-to-grid',
                'canvas/plugins/port-overlay',
              ],
            },
            {
              type: 'category',
              label: '功能类插件',
              items: [
                'canvas/plugins/keyboard',
                'canvas/plugins/clipboard',
                'canvas/plugins/label-overlay',
                'canvas/plugins/minimap',
                'canvas/plugins/blink',
              ],
            },
            {
              type: 'category',
              label: '高级类插件',
              items: [
                'canvas/plugins/group',
                'canvas/plugins/data-driven-motion',
                'canvas/plugins/data-tooltip',
                'canvas/plugins/flow-dash',
                'canvas/plugins/node-flow-dash',
              ],
            },
          ],
        }
      ],
    },
    {
      type: 'category',
      label: 'Web 编辑器',
      link: {
        type: 'doc',
        id: 'editor/index',
      },
      items: [
        'editor/architecture',
        // 'editor/components',
        'editor/development-guide',
        'editor/api-integration',
        'editor/use',
      ],
    },
  ],
};

export default sidebars;
