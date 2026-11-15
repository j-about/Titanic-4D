import { SUPPORT_PATH } from './support.ts';

export interface NavigationItem {
  readonly label: string;
  /** Root-relative address. */
  readonly href: string;
}

/** Entries of the site menu, shown in the header of every page. */
export const navigation: readonly NavigationItem[] = [
  { label: '3D reconstruction', href: '/' },
  { label: 'The night in words', href: '/narrative/' },
  { label: 'About', href: '/about/' },
  { label: 'Support Titanic 4D', href: SUPPORT_PATH },
  { label: 'Legal Notice', href: '/legal-notice/' },
];

/** Root-relative address of the Legal Notice, linked from the footer of every page. */
export const LEGAL_NOTICE_PATH = '/legal-notice/';
