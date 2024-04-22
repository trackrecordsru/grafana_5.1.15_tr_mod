import React, { FC } from 'react';

import { config } from '@grafana/runtime';
import { Icon, IconName } from '@grafana/ui';

export interface FooterLink {
  text: string;
  id?: string;
  icon?: IconName;
  url?: string;
  target?: string;
}

export let getFooterLinks = (): FooterLink[] => {
  return [];
};

export let getVersionLinks = (): FooterLink[] => {
  const { buildInfo, licenseInfo } = config;
  const links: FooterLink[] = [];
  const stateInfo = licenseInfo.stateInfo ? ` (${licenseInfo.stateInfo})` : '';

  return links;
};

export function setFooterLinksFn(fn: typeof getFooterLinks) {
  getFooterLinks = fn;
}

export function setVersionLinkFn(fn: typeof getFooterLinks) {
  getVersionLinks = fn;
}

export const Footer: FC = React.memo(() => {
  const links = getFooterLinks().concat(getVersionLinks());

  return (
    <footer className="footer">
      <div className="text-center">
        <ul>
          {links.map((link) => (
            <li key={link.text}>
              <a href={link.url} target={link.target} rel="noopener" id={link.id}>
                {link.icon && <Icon name={link.icon} />} {link.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
