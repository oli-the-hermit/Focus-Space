import React, { useState } from 'react';
import { strings } from '../../constants/strings';
import { format } from '../../lib/i18n';
import { hasFlagEmoji } from '../../lib/platform';
import { loadRecentEmoji, pushRecentEmoji } from '../../lib/storage';
import { EmojiField } from '../ui/EmojiField';

export interface RewardEmojiFieldProps {
  value: string;
  onChange: (emoji: string) => void;
  id?: string;
}

/** The reward's emoji field: remembers picks on this device and hides flags where Windows can't draw them. */
export const RewardEmojiField: React.FC<RewardEmojiFieldProps> = ({ value, onChange, id }) => {
  const [recent, setRecent] = useState(loadRecentEmoji);
  return (
    <EmojiField
      id={id}
      value={value}
      onChange={emoji => {
        onChange(emoji);
        setRecent(pushRecentEmoji(emoji));
      }}
      recent={recent}
      hideFlags={!hasFlagEmoji()}
      buttonLabel={format(strings.modals.emojiButtonAria, { emoji: value })}
      pickLabel={strings.modals.emojiPick}
    />
  );
};
