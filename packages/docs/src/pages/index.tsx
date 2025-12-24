import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      {/* 背景装饰元素 */}
      <div className={styles.heroBg}>
        <svg className={styles.bgShape1} viewBox="0 0 300 250" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="25" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <rect x="200" y="20" width="80" height="50" rx="5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <path d="M 75 50 Q 135 30, 200 45" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)" />
          <polygon points="50,140 80,160 50,180 20,160" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <rect x="200" y="130" width="70" height="60" rx="8" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <path d="M 80 160 L 130 160 L 130 160 L 200 160" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" fill="none" strokeDasharray="5,3" markerEnd="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="rgba(255,255,255,0.4)" />
            </marker>
          </defs>
        </svg>
        <svg className={styles.bgShape2} viewBox="0 0 300 250" xmlns="http://www.w3.org/2000/svg">
          <rect x="30" y="30" width="60" height="50" rx="5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <circle cx="230" cy="55" r="28" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <line x1="90" y1="55" x2="202" y2="55" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" markerEnd="url(#arrowhead2)" />
          <polygon points="50,150 80,150 65,180" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <rect x="200" y="135" width="85" height="55" rx="8" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <path d="M 80 165 Q 140 120, 200 162" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" fill="none" strokeDasharray="4,4" markerEnd="url(#arrowhead2)" />
          <path d="M 258 55 L 300 55 L 300 162 L 285 162" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none" strokeDasharray="6,2" />
          <defs>
            <marker id="arrowhead2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="rgba(255,255,255,0.4)" />
            </marker>
          </defs>
        </svg>
      </div>
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div style={{ display: 'flex', gap: '16px', textAlign: 'center', justifyContent: 'center' }}>
          <Link to="/docs" className={clsx(styles.btn, styles.btnPrimary)}>
            快速开始
          </Link>
          <Link
            className={clsx(styles.btn, styles.btnGhost)}
            to="https://agilejs-editor.funenc.com">
            在线Demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="一个轻量级、零依赖的 Canvas 可视化引擎">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
