import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./auth.module.css";

export function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className={styles.shell}><div className={styles.layout}>
    <header className={styles.intro}><p className={styles.eyebrow}>Aviation.wiki / Your account</p><h1 className={styles.title}>{title}</h1><p className={styles.description}>{description}</p><div className={styles.aside}>An encyclopedia built by people who know aviation.<br/><Link href="/contribute" className={styles.link}>Explore contribution missions</Link></div></header>
    <section className={styles.panel} aria-label={title}>{children}<div className={styles.footer}><Link className={styles.link} href="/terms">Terms of service</Link><span aria-hidden="true"> · </span><Link className={styles.link} href="/privacy">Privacy policy</Link></div></section>
  </div></main>;
}
export function AuthSkeleton() {
  return <div role="status" aria-label="Loading account form" aria-busy="true"><div className={styles.skeleton}/><div className={styles.skeleton}/><div className={styles.skeleton}/><span className="sr-only">Loading account form</span></div>;
}
