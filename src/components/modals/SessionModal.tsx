import React, { useState } from 'react';
import { FormActions } from '../ui/FormActions';
import { useDirty } from '../../hooks/useDirty';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';
import { strings } from '../../constants/strings';
import { Select } from '../ui/Select';
import { Stepper } from '../ui/Stepper';
import { IconList } from '../ui/icons';
import { ChipSet, InputChip } from '../ui/InputChip';
import { FormHint, FormRow, ModalForm, Subform } from '../ui/FormLayout';
import { TextButton } from '../ui/TextButton';
import { Field, TextArea, TextInput } from '../ui/Field';
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES, DEFAULT_REWARD_EMOJI } from '../../constants/defaults';
import { EmojiField } from '../rewards/EmojiField';

export interface SessionModalProps {
  session?: Session | null;
  /** Lists preselected for a new session (e.g. when created from the New List dialog). */
  initialTaskListIds?: string[];
  onClose: () => void;
}

interface RewardDraft {
  name: string;
  emoji: string;
  description: string;
}

export const SessionModal: React.FC<SessionModalProps> = ({ session, initialTaskListIds, onClose }) => {
  const { state, createSession, updateSession, createList, addReward } = useApp();

  const [name, setName] = useState(session ? session.name : '');
  const [focusMinutes, setFocusMinutes] = useState(session ? session.focusMinutes : DEFAULT_FOCUS_MINUTES);
  const [breakMinutes, setBreakMinutes] = useState(session ? session.breakMinutes : DEFAULT_BREAK_MINUTES);
  const [taskListIds, setTaskListIds] = useState<string[]>(
    session ? (session.taskListIds || []) : (initialTaskListIds || [])
  );

  const [rewardId, setRewardId] = useState<string>(session?.rewardId ?? '');
  // A reward typed here is only created on submit, so cancelling leaves nothing behind.
  const [rewardDraft, setRewardDraft] = useState<RewardDraft | null>(null);

  const listsById = new Map(state.taskLists.map(l => [l.id, l]));
  const attachedLists = taskListIds.map(id => listsById.get(id)).filter(Boolean) as typeof state.taskLists;
  const availableLists = state.taskLists.filter(l => !taskListIds.includes(l.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || strings.modals.untitledSession;
    const focus = Math.max(1, Number(focusMinutes) || DEFAULT_FOCUS_MINUTES);
    const brk = Math.max(1, Number(breakMinutes) || DEFAULT_BREAK_MINUTES);
    const draft = rewardDraft && rewardDraft.name.trim() ? rewardDraft : null;
    const finalReward = draft ? null : (rewardId || null);

    const payload = {
      name: finalName,
      focusMinutes: focus,
      breakMinutes: brk,
      rewardId: finalReward,
      taskListIds: attachedLists.map(l => l.id)
    };

    let sessionId: string;
    if (session) {
      updateSession(session.id, payload);
      sessionId = session.id;
    } else {
      sessionId = createSession(payload);
    }

    if (draft) {
      const emoji = draft.emoji.trim() || DEFAULT_REWARD_EMOJI;
      addReward({
        name: draft.name.trim(),
        description: draft.description.trim(),
        emoji,
        frequency: 'daily',
        status: 'locked',
        claimedAt: null
      }, { sessionId });
    }
    onClose();
  };

  const dirty = useDirty([name, focusMinutes, breakMinutes, taskListIds, rewardId, rewardDraft]);

  return (
    <ModalForm onSubmit={handleSubmit}>
      <Field label={strings.modals.sessionNameLabel} htmlFor="sessionName">
        <TextInput
          id="sessionName"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={strings.modals.sessionNamePlaceholder}
          autoFocus
        />
      </Field>

      <FormRow>
        <Field label={strings.modals.focusLabel} htmlFor="sessionFocus">
          <Stepper
            id="sessionFocus"
            value={focusMinutes}
            onChange={setFocusMinutes}
            min={1}
            max={240}
            step={5}
            suffix={strings.modals.minutesSuffix}
          />
        </Field>
        <Field label={strings.modals.breakLabel} htmlFor="sessionBreak">
          <Stepper
            id="sessionBreak"
            value={breakMinutes}
            onChange={setBreakMinutes}
            min={1}
            max={120}
            step={5}
            suffix={strings.modals.minutesSuffix}
          />
        </Field>
      </FormRow>

      <Field label={strings.modals.taskListsLabel} group>
        {attachedLists.length > 0 ? (
          <ChipSet>
            {attachedLists.map(list => (
              <InputChip
                key={list.id}
                icon={<IconList size={14} />}
                label={list.name}
                meta={list.tasks.filter(t => !t.completed).length}
                onRemove={() => setTaskListIds(ids => ids.filter(id => id !== list.id))}
                removeLabel={`${strings.modals.removeFromSession}: ${list.name}`}
              />
            ))}
          </ChipSet>
        ) : (
          <FormHint>{strings.modals.noTaskListsHint}</FormHint>
        )}
        <Select
          value=""
          onChange={val => val && setTaskListIds(ids => [...ids, val])}
          placeholder={strings.modals.addTaskListPlaceholder}
          ariaLabel={strings.modals.addTaskListPlaceholder}
          options={availableLists.map(l => ({
            value: l.id,
            label: l.name,
            meta: `${l.tasks.filter(t => !t.completed).length} left`
          }))}
          createOption={{
            label: strings.modals.newTaskListOption,
            placeholder: strings.modals.newTaskListPlaceholder,
            onCreate: listName => {
              const newId = createList(listName, { activate: false });
              setTaskListIds(ids => [...ids, newId]);
            }
          }}
        />
      </Field>

      <Field label={strings.rewards.rewardOnCompletion} group>
        {rewardDraft ? (
          <Subform
            title={strings.modals.newRewardTitle}
            action={
              <TextButton onClick={() => setRewardDraft(null)}>
                {strings.modals.pickExistingReward}
              </TextButton>
            }
          >
            <FormRow variant="emoji">
              <EmojiField value={rewardDraft.emoji} onChange={emoji => setRewardDraft({ ...rewardDraft, emoji })} />
              <TextInput
                value={rewardDraft.name}
                onChange={e => setRewardDraft({ ...rewardDraft, name: e.target.value })}
                placeholder={strings.modals.rewardNamePlaceholder}
                aria-label={strings.modals.rewardNameLabel}
              />
            </FormRow>
            <TextArea
              value={rewardDraft.description}
              onChange={e => setRewardDraft({ ...rewardDraft, description: e.target.value })}
              placeholder={strings.modals.descriptionPlaceholder}
              aria-label={strings.modals.descriptionLabel}
              rows={2}
            />
          </Subform>
        ) : (
          <Select
            value={rewardId}
            onChange={val => setRewardId(val)}
            placeholder={strings.rewards.noReward}
            ariaLabel={strings.rewards.rewardOnCompletion}
            options={[
              { value: '', label: strings.rewards.noReward },
              ...state.rewards.map(r => ({
                value: r.id,
                label: r.name,
                icon: <span className="emoji-glyph">{r.emoji}</span>,
                meta: r.status === 'claimed' ? strings.rewards.claimed : undefined
              }))
            ]}
            createOption={{
              label: strings.modals.createRewardOption,
              placeholder: strings.modals.newRewardPlaceholder,
              onCreate: rewardName => setRewardDraft({ name: rewardName, emoji: DEFAULT_REWARD_EMOJI, description: '' })
            }}
          />
        )}
      </Field>

      <FormActions
        dirty={dirty}
        onCancel={onClose}
        primaryLabel={session ? strings.common.saveChanges : strings.modals.createSessionBtn}
      />
    </ModalForm>
  );
};
