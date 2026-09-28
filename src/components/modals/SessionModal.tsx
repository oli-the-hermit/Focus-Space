import React, { useState } from 'react';
import { FormActions } from '../ui/FormActions';
import { useDirty } from '../../hooks/useDirty';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';
import { strings } from '../../constants/strings';
import { Select } from '../ui/Select';
import { Stepper } from '../ui/Stepper';
import { IconClose, IconList } from '../ui/icons';
import { TextButton } from '../ui/TextButton';
import { Field, TextArea, TextInput } from '../ui/Field';
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES, DEFAULT_REWARD_EMOJI } from '../../constants/defaults';

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

  const initialRewardId = () => {
    if (session?.rewardId) return session.rewardId;
    if (session?.id) {
      const linked = state.rewards.find(
        r => r.linkedSessionId === session.id || (r.trigger === 'session' && r.linkedId === session.id)
      );
      if (linked) return linked.id;
    }
    return '';
  };

  const [rewardId, setRewardId] = useState<string>(initialRewardId);
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
        trigger: 'session',
        linkedSessionId: sessionId,
        linkedId: sessionId,
        linkedGoalId: null,
        status: 'locked',
        claimedAt: null
      });
    }
    onClose();
  };

  const dirty = useDirty([name, focusMinutes, breakMinutes, taskListIds, rewardId, rewardDraft]);

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <Field label={strings.modals.sessionNameLabel} htmlFor="sessionName">
        <TextInput
          id="sessionName"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={strings.modals.sessionNamePlaceholder}
          autoFocus
        />
      </Field>

      <div className="form-row">
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
      </div>

      <Field label={strings.modals.taskListsLabel} group>
        {attachedLists.length > 0 ? (
          <div className="chip-set">
            {attachedLists.map(list => (
              <span key={list.id} className="input-chip">
                <IconList size={14} />
                <span className="input-chip-label">{list.name}</span>
                <span className="input-chip-meta">{list.tasks.filter(t => !t.completed).length}</span>
                <button
                  type="button"
                  className="input-chip-remove"
                  onClick={() => setTaskListIds(ids => ids.filter(id => id !== list.id))}
                  aria-label={`${strings.modals.removeFromSession}: ${list.name}`}
                >
                  <IconClose size={13} strokeWidth={2.4} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="form-hint">{strings.modals.noTaskListsHint}</p>
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
          <div className="inline-subform">
            <div className="inline-subform-head">
              <span className="inline-subform-title">{strings.modals.newRewardTitle}</span>
              <TextButton onClick={() => setRewardDraft(null)}>
                {strings.modals.pickExistingReward}
              </TextButton>
            </div>
            <div className="form-row form-row--emoji">
              <TextInput
                className="emoji-input"
                value={rewardDraft.emoji}
                onChange={e => setRewardDraft({ ...rewardDraft, emoji: e.target.value })}
                maxLength={4}
                aria-label={strings.modals.emojiLabel}
              />
              <TextInput
                value={rewardDraft.name}
                onChange={e => setRewardDraft({ ...rewardDraft, name: e.target.value })}
                placeholder={strings.modals.rewardNamePlaceholder}
                aria-label={strings.modals.rewardNameLabel}
              />
            </div>
            <TextArea
              value={rewardDraft.description}
              onChange={e => setRewardDraft({ ...rewardDraft, description: e.target.value })}
              placeholder={strings.modals.descriptionPlaceholder}
              aria-label={strings.modals.descriptionLabel}
              rows={2}
            />
          </div>
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
    </form>
  );
};
