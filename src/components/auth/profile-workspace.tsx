"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import styles from "./profile.module.css";

export const profileSections = {
  profile: { label: "Public profile", description: "Choose how you appear across aviation.wiki." },
  email: { label: "Email addresses", description: "Manage where you receive account messages and verification codes." },
  security: { label: "Password & security", description: "Keep your account secure and control access on other devices." },
  connections: { label: "Connected accounts", description: "Review the accounts linked to your aviation.wiki sign-in." },
};
export type ProfileSection = keyof typeof profileSections;
type IconName = ProfileSection | "collapse" | "keys" | "exit";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    profile: <><circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></>,
    email: <><rect x="3" y="5" width="18" height="14"/><path d="m3 6 9 7 9-7"/></>,
    security: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="M12 9v5m0 2v1"/></>,
    connections: <><path d="m9 15 6-6m-5-3 2-2a5 5 0 0 1 7 7l-2 2M7 11l-2 2a5 5 0 0 0 7 7l2-2"/></>,
    collapse: <><rect x="3" y="4" width="18" height="16"/><path d="M9 4v16"/></>,
    keys: <><circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-5-5 3-3m-1 5 3-3"/></>,
    exit: <><path d="M9 3H3v18h6m5-14 5 5-5 5m-7-5h12"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{paths[name]}</svg>;
}

export function ProfileWorkspace({ section, onSectionChange, username, imageUrl, busy, onSignOut, children }: {
  section: ProfileSection; onSectionChange: (section: ProfileSection) => void;
  username: string; imageUrl: string; busy: boolean; onSignOut: () => void; children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const reducedMotion = useReducedMotion();
  return <main className={styles.page}>
    <div className={styles.breadcrumb}><Link href="/">Aviation.wiki</Link><span>/</span><span>Account settings</span></div>
    <div className={styles.workspace} data-collapsed={collapsed}>
      <motion.aside layout className={styles.sidebar} transition={{ duration: reducedMotion ? 0 : .22, ease: [.77, 0, .175, 1] }}>
        <div className={styles.sidebarTop}><span className={styles.sidebarLabel}>Your account</span><button type="button" className={styles.collapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="profile-navigation" onClick={() => setCollapsed(!collapsed)}><Icon name="collapse"/></button></div>
        <nav id="profile-navigation" aria-label="Profile settings" className={styles.navigation}>
          {Object.entries(profileSections).map(([key, item]) => <button key={key} type="button" aria-current={section === key ? "page" : undefined} aria-label={item.label} title={item.label} onClick={() => onSectionChange(key as ProfileSection)}><Icon name={key as ProfileSection}/><span className={styles.sidebarLabel}>{item.label}</span></button>)}
          <div className={styles.navDivider}/>
          <Link href="/settings/api-keys" aria-label="API keys" title="API keys"><Icon name="keys"/><span className={styles.sidebarLabel}>API keys</span></Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.identity}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} width={32} height={32} alt=""/>
            <div className={styles.sidebarLabel}><strong>{username || "Your account"}</strong><span>Aviation.wiki member</span></div>
          </div>
          <button className={styles.signOut} type="button" disabled={busy} onClick={onSignOut} aria-label="Sign out" title="Sign out"><Icon name="exit"/><span className={styles.sidebarLabel}>Sign out</span></button>
        </div>
      </motion.aside>
      <div className={styles.content}>
        <header className={styles.heading}><p>Account settings</p><h1>{profileSections[section].label}</h1><div>{profileSections[section].description}</div></header>
        {children}
        <footer className={styles.footer}><span>Your account, your contribution.</span><div><Link href="/terms">Terms of service</Link><Link href="/privacy">Privacy policy</Link></div></footer>
      </div>
    </div>
  </main>;
}

export function ProfileSkeleton() {
  return <main className={styles.page} aria-busy="true" aria-label="Loading account settings" role="status"><div className={styles.loading}><div/><div><div/><div/><div/></div></div><span className="sr-only">Loading account settings</span></main>;
}
