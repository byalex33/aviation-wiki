import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck, BookmarkCheck, PencilLine } from "lucide-react";
import styles from "./auth.module.css";

const perks = [
  { icon: PencilLine, title: "Edit any article", body: "Every change is checked by a moderator before it goes live." },
  { icon: BadgeCheck, title: "Track your milestones", body: "From your first edit to your thousandth, all on your profile." },
  { icon: BookmarkCheck, title: "Save your research", body: "Keep the aircraft and operators you're following in one place." },
];

export function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className={styles.shell}><div className={styles.layout}>
    <section className={styles.panel} aria-label={title}>{children}<div className={styles.footer}><Link className={styles.link} href="/terms">Terms of service</Link><span aria-hidden="true"> · </span><Link className={styles.link} href="/privacy">Privacy policy</Link></div></section>
    <header className={styles.intro}>
      <p className={styles.eyebrow}>Aviation.wiki / Your account</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <div className={styles.aside}>
        <ul className={styles.perks}>
          {perks.map(({ icon: Icon, title: perkTitle, body }) => (
            <li key={perkTitle} className={styles.perk}>
              <span className={styles.perkIcon}><Icon className="size-4" aria-hidden="true" /></span>
              <span><span className={styles.perkTitle}>{perkTitle}</span><span className={styles.perkBody}>{body}</span></span>
            </li>
          ))}
        </ul>
        <Link href="/contribute" className={styles.exploreLink}>Explore contribution missions</Link>
      </div>
    </header>
  </div></main>;
}
export function AuthSkeleton() {
  return <div role="status" aria-label="Loading account form" aria-busy="true"><div className={styles.skeleton}/><div className={styles.skeleton}/><div className={styles.skeleton}/><span className="sr-only">Loading account form</span></div>;
}
