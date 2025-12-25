import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'AgileJS Graph',
  tagline: '一个轻量级、零依赖的 Canvas 可视化引擎',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://agilejs.funenc.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'agilejs',
  projectName: 'agilejs',

  onBrokenLinks: 'throw',
  trailingSlash: true,
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/qingzi-king/agilejs/tree/main/packages/docs/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'ignore',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    // algolia搜索配置
    algolia: {
      appId: "3VEKI0PJZR",
      apiKey: "88c2d7baf11fe4b6660336ad14f9f539",
      indexName: "agilejsDoc",
      contextualSearch: false // v3版本默认为true（未成功），设置为 false 可禁用基于上下文的搜索
    },
    navbar: {
      title: 'AgileJS Graph',
      logo: {
        alt: 'AgileJS Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '文档',
        },
        // {
        //   type: 'doc',
        //   docId: 'canvas/api-reference',
        //   position: 'left',
        //   label: 'API 参考',
        // },
        {
          type: 'dropdown',
          label: '示例',
          position: 'left',
          items: [
            {
              label: '在线编辑',
              href: 'https://agilejs-editor.funenc.com/#/editor',
            },
            {
              label: '在线预览',
              href: 'https://agilejs-editor.funenc.com/#/preview',
            },
          ],
        },
        {
          to: 'blog',
          position: 'left',
          label: 'Blog'
        },
        {
          href: 'https://github.com/qingzi-king/agilejs',
          label: 'Github',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {
              label: '快速开始',
              to: '/docs',
            },
            {
              label: 'Canvas 引擎',
              to: '/docs/canvas',
            },
            {
              label: 'Web 编辑器',
              to: '/docs/editor',
            },
          ],
        },
        {
          title: '社区',
          items: [
            {
              label: 'Github',
              href: 'https://github.com/qingzi-king/agilejs',
            },
            {
              label: 'Issues',
              href: 'https://github.com/qingzi-king/agilejs/issues',
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: 'Canvas 包',
              href: 'https://www.npmjs.com/package/@fnt-agilejs/core',
            },
            {
              label: 'Web 编辑器',
              to: '/docs/editor',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AgileJS · Powered by Funenc`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
