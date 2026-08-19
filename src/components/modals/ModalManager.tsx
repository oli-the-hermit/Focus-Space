import React from 'react';
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

export const ModalManager: React.FC = () => {
  const { activeModal, closeModal } = useApp();

  if (!activeModal) return null;

  let title = '';
  let content: React.ReactNode = null;
  let wide = false;

  switch (activeModal.type) {
    case 'NEW_SESSION':
      title = 'New Session';
      content = <SessionModal onClose={closeModal} />;
      break;

    case 'EDIT_SESSION':
      title = 'Edit Session';
      content = <SessionModal session={activeModal.payload?.session} onClose={closeModal} />;
      break;

    case 'NEW_LIST':
      title = 'New Task List';
      content = <ListModal onClose={closeModal} />;
      break;

    case 'RENAME_LIST':
      title = 'Rename List';
      content = <ListModal list={activeModal.payload?.list} onClose={closeModal} />;
      break;

    case 'NEW_TASK':
      title = 'New Task';
      content = <TaskModal listId={activeModal.payload?.listId} onClose={closeModal} />;
      break;

    case 'RENAME_TASK':
      title = 'Rename Task';
      content = (
        <TaskModal
          listId={activeModal.payload?.listId}
          task={activeModal.payload?.task}
          onClose={closeModal}
        />
      );
      break;

    case 'SCHEDULE_EVENT':
      title = 'Schedule Session';
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
      title = 'Edit Scheduled Session';
      wide = true;
      content = <CalendarEventModal event={activeModal.payload?.event} onClose={closeModal} />;
      break;

    case 'NEW_GOAL':
      title = 'New Goal';
      content = <GoalModal onClose={closeModal} />;
      break;

    case 'EDIT_GOAL':
      title = 'Edit Goal';
      content = <GoalModal goal={activeModal.payload?.goal} onClose={closeModal} />;
      break;

    case 'NEW_LANDMARK':
      title = 'Add Landmark';
      content = <LandmarkModal goalId={activeModal.payload?.goalId} onClose={closeModal} />;
      break;

    case 'EDIT_LANDMARK':
      title = 'Edit Landmark';
      content = (
        <LandmarkModal
          goalId={activeModal.payload?.goalId}
          landmark={activeModal.payload?.landmark}
          onClose={closeModal}
        />
      );
      break;

    case 'NEW_REWARD':
      title = 'New Reward';
      content = <RewardModal onClose={closeModal} />;
      break;

    case 'EDIT_REWARD':
      title = 'Edit Reward';
      content = <RewardModal reward={activeModal.payload?.reward} onClose={closeModal} />;
      break;

    case 'CONFIRM_DELETE':
      title = activeModal.payload?.title || 'Confirm Delete';
      content = (
        <ConfirmModal
          message={activeModal.payload?.message || 'Are you sure you want to delete this item?'}
          confirmLabel={activeModal.payload?.confirmLabel || 'Delete'}
          onConfirm={activeModal.payload?.onConfirm || (() => {})}
          onClose={closeModal}
        />
      );
      break;

    default:
      return null;
  }

  return (
    <Modal isOpen={!!activeModal} title={title} wide={wide} onClose={closeModal}>
      {content}
    </Modal>
  );
};
