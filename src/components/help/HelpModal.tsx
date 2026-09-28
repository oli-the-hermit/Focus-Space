import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { strings } from '../../constants/strings';
import { GITHUB_URL, githubIssueUrl } from '../../constants/links';
import { isTauri, openExternal } from '../../lib/desktop';
import {
  IconBug,
  IconChevronLeft,
  IconChevronRight,
  IconExternal,
  IconGithub,
  IconInfo,
  IconKeyboard,
  IconLock,
  IconSparkle,
  IconStar,
  IconTimer
} from '../ui/icons';
import { TextButton } from '../ui/TextButton';

type HelpView = 'home' | 'shortcuts' | 'whatsNew' | 'about';

const version = __APP_VERSION__;
const platformLabel = () => (isTauri() ? 'Desktop (Windows)' : `Web (${navigator.userAgent})`);

interface RowProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  external?: boolean;
  onClick: () => void;
}

const HelpRow: React.FC<RowProps> = ({ icon, title, desc, external, onClick }) => (
  <button type="button" className="help-row" onClick={onClick}>
    <span className="help-row-icon">{icon}</span>
    <span className="help-row-text">
      <span className="help-row-title">{title}</span>
      <span className="help-row-desc">{desc}</span>
    </span>
    <span className="help-row-trail">{external ? <IconExternal size={16} /> : <IconChevronRight size={18} />}</span>
  </button>
);

/** Help hub: tour, shortcuts, what's new, about and GitHub links. */
export const HelpModal: React.FC = () => {
  const { helpOpen, setHelpOpen, startTour } = useApp();
  const [view, setView] = useState<HelpView>('home');

  // Always reopen on the list, not on the last sub-view.
  useEffect(() => {
    if (helpOpen) setView('home');
  }, [helpOpen]);

  const close = () => setHelpOpen(false);
  const open = (url: string) => void openExternal(url).catch(() => {});

  const titles: Record<HelpView, string> = {
    home: strings.help.title,
    shortcuts: strings.help.shortcutsTitle,
    whatsNew: strings.help.whatsNewTitle,
    about: strings.help.aboutTitle
  };

  return (
    <Modal isOpen={helpOpen} title={titles[view]} onClose={close} dismissible>
      {view !== 'home' && (
        <TextButton className="help-back" onClick={() => setView('home')}>
          <IconChevronLeft size={16} />
          {strings.help.back}
        </TextButton>
      )}

      {view === 'home' && (
        <div className="help-list" key="home">
          <HelpRow
            icon={<IconTimer size={20} />}
            title={strings.help.tourTitle}
            desc={strings.help.tourDesc}
            onClick={startTour}
          />
          <HelpRow
            icon={<IconKeyboard size={20} />}
            title={strings.help.shortcutsTitle}
            desc={strings.help.shortcutsDesc}
            onClick={() => setView('shortcuts')}
          />
          <HelpRow
            icon={<IconSparkle size={20} />}
            title={strings.help.whatsNewTitle}
            desc={strings.help.whatsNewDesc.replace('{version}', version)}
            onClick={() => setView('whatsNew')}
          />
          <HelpRow
            icon={<IconInfo size={20} />}
            title={strings.help.aboutTitle}
            desc={strings.help.aboutDesc}
            onClick={() => setView('about')}
          />
          {GITHUB_URL && (
            <>
              <HelpRow
                icon={<IconBug size={20} />}
                title={strings.help.reportTitle}
                desc={strings.help.reportDesc}
                external
                onClick={() =>
                  open(
                    githubIssueUrl(
                      strings.help.reportBody.replace('{version}', version).replace('{platform}', platformLabel())
                    )
                  )
                }
              />
              <HelpRow
                icon={<IconStar size={20} />}
                title={strings.help.starTitle}
                desc={strings.help.starDesc}
                external
                onClick={() => open(GITHUB_URL)}
              />
            </>
          )}
        </div>
      )}

      {view === 'shortcuts' && (
        <div className="help-sub" key="shortcuts">
          <ul className="shortcut-list">
            {strings.help.shortcuts.map(s => (
              <li key={s.label} className="shortcut-row">
                <span>{s.label}</span>
                <span className="shortcut-keys">
                  {s.keys.map(k => (
                    <kbd key={k} className="kbd">{k}</kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="help-note">{strings.help.shortcutsNote}</p>
        </div>
      )}

      {view === 'whatsNew' && (
        <div className="help-sub" key="whatsNew">
          <p className="help-version">{strings.help.versionLabel.replace('{version}', version)}</p>
          <ul className="whats-new-list">
            {strings.help.whatsNew.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {view === 'about' && (
        <div className="help-sub" key="about">
          <div className="about-head">
            <span className="about-logo" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15.5 14" />
              </svg>
            </span>
            <div>
              <div className="about-name">{strings.app.title}</div>
              <div className="about-version">{strings.help.versionLabel.replace('{version}', version)}</div>
            </div>
          </div>
          <p className="about-desc">{strings.app.description}</p>
          <div className="about-privacy">
            <IconLock size={18} />
            <div>
              <div className="about-privacy-title">{strings.help.privacyTitle}</div>
              <p>{strings.help.privacyBody}</p>
            </div>
          </div>
          <p className="help-note">
            {strings.help.credits}
            {GITHUB_URL && (
              <TextButton className="about-github" onClick={() => open(GITHUB_URL)}>
                <IconGithub size={15} />
                GitHub
              </TextButton>
            )}
          </p>
        </div>
      )}
    </Modal>
  );
};
