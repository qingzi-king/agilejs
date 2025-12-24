import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: '极致轻量',
    Svg: require('@site/static/img/banner05.svg').default,
    description: (
      <ul>
        <li>纯 Canvas 内核，不依赖任何第三方渲染库；</li>
        <li>采用模块化结构与独立渲染器/插件注册机制，可按需裁剪功能；</li>
        <li>节点与边的快照及 Path2D 结果缓存减少重复计算，在中大型场景下降低绘制开销。</li>
      </ul>
    ),
  },
  {
    title: '深度可定制',
    Svg: require('@site/static/img/banner02.svg').default,
    description: (
      <ul>
        <li>统一的 Graph 数据模型、RendererRegistry 与 PluginManager 构成扩展主干；</li>
        <li>节点、锚点、连线样式、交互策略及序列化协议均可在不修改内核的情况下增量扩展；</li>
        <li>命令历史与事件总线支持撤销/重做、操作追踪以及构建回放与审计能力。</li>
      </ul>
    ),
  },
  {
    title: '高性能渲染',
    Svg: require('@site/static/img/banner07.svg').default,
    description: (
      <ul>
        <li>通过视口裁剪、可选四叉树空间索引、离屏边快照层以及 Path2D/图像缓存等手段降低无效绘制；</li>
        <li>拖拽、平移及大规模场景下基于阈值的条件降质策略（跳过边与标签）保障交互帧率；</li>
        <li>可结合命令历史调试快照与自定义采样扩展性能分析。</li>
      </ul>
    ),
  },
  {
    title: '数据驱动与动效',
    Svg: require('@site/static/img/banner03.svg').default,
    description: (
      <ul>
        <li>支持基于数据的节点/边属性驱动，实现声明式动画效果；</li>
        <li>内置平滑过渡、缓动函数及关键帧插值，轻松构建流动的连线与动态拓扑；</li>
        <li>支持节点闪烁、流动虚线等视觉增强，提升图表的信息表达力</li>
        <li>支持移动端渲染和部分编辑场景。</li>
      </ul>
    ),
  },
  {
    title: '工程级稳定性',
    Svg: require('@site/static/img/banner01.svg').default,
    description: (
      <ul>
        <li>插件、渲染器、命令三层均采用可插拔设计；</li>
        <li>插件暴露 setup、dispose、beforeRender、render*、afterRender 钩子以明确侧效应边界；</li>
        <li>Graph 序列化配合 CommandHistory 使状态持久化与协作审计可实现；</li>
        <li>内置选择、框选、连接、缩放/平移、网格吸附、参考线、剪贴板、图像、最小地图、文本内联编辑等常用功能。</li>
      </ul>
    ),
  },
  {
    title: '生态兼容性',
    Svg: require('@site/static/img/banner08.svg').default,
    description: (
      <ul>
        <li>仅依赖标准 DOM 与 Canvas，可在 React、Vue、Angular 中封装为受控组件并接入 Zustand、MobX 等状态管理；</li>
        <li>支持嵌入 Electron 与 WebView；</li>
        <li>纯 Node 场景可通过 DOM 适配层接入。</li>
      </ul>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
        <Heading as="h3">{title}</Heading>
      </div>
      <div className="padding-horiz--md">
        <div style={{ color: '#4b5563' }}>{description}</div>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
