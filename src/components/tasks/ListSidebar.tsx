import React from 'react';
import { useApp } from '../../context/AppContext';
import { TaskList } from '../../types';
import { strings } from '../../constants/strings';
import { IconCopy, IconEdit, IconList, IconPlus, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { Button } from '../ui/Button';
import { QueuePanel } from '../ui/QueuePanel';
import { QueueItem } from '../ui/QueueItem';
import { useDragReorder } from '../../hooks/useDragReorder';

/** The Tasks tab's side panel: task lists as a queue, like Sessions, without a details row. */
export const ListSidebar: React.FC = () => {
  const { state, setActiveList, openModal, deleteList, duplicateList, reorderTaskLists } = useApp();
  const contextMenu = useContextMenu();
  const drag = useDragReorder(reorderTaskLists);

  const renameList = (list: TaskList) => openModal('RENAME_LIST', { list });

  const confirmDeleteList = (list: TaskList) => {
    openModal('CONFIRM_DELETE', {
      title: strings.tasks.deleteListTitle,
      message: `${strings.modals.confirmDeleteDefaultMsg.replace('item', `"${list.name}"`)}`,
      confirmLabel: strings.common.delete,
      onConfirm: () => deleteList(list.id)
    });
  };

  const openListMenu = (e: React.MouseEvent, list: TaskList) => {
    contextMenu(e, [
      { key: 'open', label: strings.actions.open, icon: <IconList size={15} />, onSelect: () => setActiveList(list.id) },
      { key: 'new-task', label: strings.actions.newTask, icon: <IconPlus size={15} />, onSelect: () => openModal('NEW_TASK', { listId: list.id }) },
      { key: 'rename', label: strings.tasks.renameTooltip, icon: <IconEdit size={15} />, onSelect: () => renameList(list) },
      { key: 'dup', label: strings.tasks.duplicateTooltip, icon: <IconCopy size={15} />, onSelect: () => duplicateList(list.id) },
      { key: 'd1', divider: true },
      { key: 'delete', label: strings.tasks.deleteTooltip, icon: <IconTrash size={15} />, danger: true, onSelect: () => confirmDeleteList(list) }
    ]);
  };

  return (
    <QueuePanel
      title={strings.tasks.sidebarTitle}
      action={
        <Button variant="tonal" size="sm" id="addListBtn" icon={<IconPlus size={15} strokeWidth={2.4} />} onClick={() => openModal('NEW_LIST')}>
          {strings.tasks.newListBtn}
        </Button>
      }
      ids={state.taskLists.map(l => l.id)}
      emptyMessage={strings.tasks.emptyLists}
      listId="listNav"
    >
      {isNew =>
        state.taskLists.map(list => {
          const done = list.tasks.filter(t => t.completed).length;
          return (
            <QueueItem
              key={list.id}
              id={list.id}
              title={list.name}
              active={list.id === state.activeListId}
              onSelect={() => setActiveList(list.id)}
              trailing={`${done}/${list.tasks.length}`}
              actions={[
                { key: 'rename', label: strings.tasks.renameTooltip, icon: <IconEdit size={14} />, onClick: () => renameList(list) },
                { key: 'dup', label: strings.tasks.duplicateTooltip, icon: <IconCopy size={14} />, onClick: () => duplicateList(list.id) },
                { key: 'delete', label: strings.tasks.deleteTooltip, icon: <IconTrash size={14} />, danger: true, onClick: () => confirmDeleteList(list) }
              ]}
              dragLabel={strings.common.dragToReorder}
              drag={drag.itemProps(list.id)}
              isDragging={drag.isDragging(list.id)}
              isDragOver={drag.isDragOver(list.id)}
              isNew={isNew(list.id)}
              onContextMenu={e => openListMenu(e, list)}
            />
          );
        })
      }
    </QueuePanel>
  );
};
