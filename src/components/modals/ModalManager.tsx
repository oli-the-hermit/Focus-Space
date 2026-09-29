import React, { useRef } from 'react';
import { ActiveModal } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { SessionModal } from './SessionModal';
import { TaskModal } from './TaskModal';
import { ListModal } from './ListModal';
import { CalendarEventModal } from './CalendarEventModal';
import { GoalModal } from './GoalModal';
import { LandmarkModal } from './LandmarkModal';
import { RewardModal } from './RewardModal';
import { ConfirmModal } from './ConfirmModal';
import { NotificationModal } from './NotificationModal';
import { strings } from '../../constants/strings';

export const ModalManager: React.FC = () => {
  const { activeModal: current, closeModal } = useApp();

  // Keep rendering the last modal while it plays its exit animation, and give
  // every opening its own key so form state never leaks into the next one.
  const lastRef = useRef<ActiveModal | null>(null);
  const openIdRef = useRef(0);
  if (current && current !== lastRef.current) openIdRef.current += 1;
  if (current) lastRef.current = current;
  const activeModal = current || lastRef.current;
  const isOpen = !!current;

  if (!activeModal) return null;

  if (activeModal.type === 'NOTIFICATIONS') {
    return <NotificationModal key={openIdRef.current} isOpen={isOpen} onClose={closeModal} />;
  }

  let title = '';
  let content: React.ReactNode = null;
  let wide = false;

  switch (activeModal.type) {
    case 'NEW_SESSION':
      title = strings.modals.newSession;
      content = <SessionModal initialTaskListIds={activeModal.payload?.taskListIds} onClose={closeModal} />;
      wide = true;
      break;

    case 'EDIT_SESSION':
      title = strings.modals.editSession;
      content = <SessionModal session={activeModal.payload?.session} onClose={closeModal} />;
      wide = true;
      break;

    case 'NEW_LIST':
      title = strings.modals.newList;
      content = <ListModal onClose={closeModal} />;
      break;

    case 'RENAME_LIST':
      title = strings.modals.renameList;
      content = <ListModal list={activeModal.payload?.list} onClose={closeModal} />;
      break;

    case 'NEW_TASK':
      title = strings.modals.newTask;
      content = <TaskModal listId={activeModal.payload.listId} onClose={closeModal} />;
      break;

    case 'RENAME_TASK':
      title = strings.modals.renameTask;
      content = (
        <TaskModal
          listId={activeModal.payload.listId}
          task={activeModal.payload?.task}
          onClose={closeModal}
        />
      );
      break;

    case 'SCHEDULE_EVENT':
      title = strings.modals.scheduleEvent;
      wide = true;
      content = (
        <CalendarEventModal
          defaultDate={activeModal.payload?.date}
          defaultTime={activeModal.payload?.time}
          onClose={closeModal}
        />
      );
      break;

    case 'EDIT_EVENT':
      title = strings.modals.editEvent;
      wide = true;
      content = <CalendarEventModal event={activeModal.payload?.event} onClose={closeModal} />;
      break;

    case 'DUPLICATE_EVENT':
      title = strings.modals.duplicateEvent;
      wide = true;
      content = <CalendarEventModal copyFrom={activeModal.payload.event} onClose={closeModal} />;
      break;

    case 'NEW_GOAL':
      title = strings.modals.newGoal;
      content = <GoalModal onClose={closeModal} />;
      break;

    case 'EDIT_GOAL':
      title = strings.modals.editGoal;
      content = <GoalModal goal={activeModal.payload?.goal} onClose={closeModal} />;
      break;

    case 'NEW_LANDMARK':
      title = strings.modals.newLandmark;
      content = <LandmarkModal goalId={activeModal.payload.goalId} onClose={closeModal} />;
      break;

    case 'EDIT_LANDMARK':
      title = strings.modals.editLandmark;
      content = (
        <LandmarkModal
          goalId={activeModal.payload.goalId}
          landmark={activeModal.payload?.landmark}
          onClose={closeModal}
        />
      );
      break;

    case 'NEW_REWARD':
      title = strings.modals.newReward;
      content = <RewardModal onClose={closeModal} />;
      break;

    case 'EDIT_REWARD':
      title = strings.modals.editReward;
      content = <RewardModal reward={activeModal.payload?.reward} onClose={closeModal} />;
      break;

    case 'CONFIRM_DELETE':
      title = activeModal.payload?.title || strings.modals.confirmDeleteTitle;
      content = (
        <ConfirmModal
          message={activeModal.payload?.message || strings.modals.confirmDeleteDefaultMsg}
          confirmLabel={activeModal.payload?.confirmLabel || strings.common.delete}
          onConfirm={activeModal.payload?.onConfirm || (() => {})}
          onClose={closeModal}
        />
      );
      break;

    default:
      return null;
  }

  return (
    <Modal
      key={openIdRef.current}
      isOpen={isOpen}
      title={title}
      wide={wide}
      dismissible={activeModal.type === 'CONFIRM_DELETE'}
      onClose={closeModal}
    >
      {content}
    </Modal>
  );
};
